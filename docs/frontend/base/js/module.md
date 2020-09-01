---
title: '前端模块化'
sidebarDepth: 3
---

重点关注`CommonJS模块规范`和`ESModule`。其余如`AMD`和`CMD`，由于`Webpack`的垄断，俱往矣（不过由于异步加载的优势，Webpack支持这些语法并转化）。

## CommonJS

### NodeJS源码看按值拷贝以及exports与module.exports的区别

先说结论：**module.exports才是真正的模块导出API**。只不过默认情况下，变量`exports`与其指向了同一块内存。

若仅且对`module.exports`的重新赋值，对于引用者caller来说，此前种种对`exports`的属性修改都是无意义的。因为 `exports`和`module.exports`二者已然分别指向了不同内存。

那么，开发者应该知道什么情况下可以修改这二者的引用。

NodeJS（v10.16.3）JS源码部分在[/lib/internal/modules/cjs/loader.js(Github)](https://github.com/nodejs/node/blob/v10.x/lib/internal/modules/cjs/loader.js)。

```js
// module构造器
function Module(id, parent) {
  this.id = id;
  this.exports = {};
  this.parent = parent;
  updateChildren(parent, this, false);
  this.filename = null;
  this.loaded = false;
  this.children = [];
}
```

```js
// require：public接口
Module.prototype.require = function(id) {
  return Module._load(id, this, /* isMain */ false);
};
```

```js
Module._load = function(request, parent, isMain) {
  // 内部调用了path.resolve，返回载入文件的绝对路径
  var filename = Module._resolveFilename(request, parent, isMain);
   // 缓存
  var cachedModule = Module._cache[filename];
  if (cachedModule) {
    updateChildren(parent, cachedModule, true);
    return cachedModule.exports;
  }
  // 匹配原生模块，如path, fs, http等，该分支暂不关注
  if (NativeModule.nonInternalExists(filename)) {
    debug('load native module %s', request);
    return NativeModule.require(filename);
  }

  // Don't call updateChildren(), Module constructor already does.
  var module = new Module(filename, parent);

  Module._cache[filename] = module;

  // 模块载入逻辑
  tryModuleLoad(module, filename);
  return module.exports;
};

function tryModuleLoad(module, filename) {
  module.load(filename);
}
```

```js
Module.prototype.load = function(filename) {
  this.filename = filename;
  // 这里会返回一个数组，即通常提到的“路径查找规则”
  // 概括：从路径的最后一个字符开始遍历，如果找到“/”，且其后面不是node_modules，数组则追加path，最后返回paths数组
  // 如 "/a/b" => ["/a/b/node_modules", "/a/node_modules", "/node_modules"]
  this.paths = Module._nodeModulePaths(path.dirname(filename));
  // 获取扩展名，这里仅关注 .js 后缀
  var extension = findLongestRegisteredExtension(filename);
  // 匹配js后缀文件策略
  Module._extensions[extension](this, filename);
  // ...
}
// 解析完路径后，开始读取文件内容并执行
Module._extensions['.js'] = function(module, filename) {
  var content = fs.readFileSync(filename, 'utf8');
  module._compile(stripBOM(content), filename);
};
```

JS解析，核心逻辑登场

```js
const vm = require('vm');
const { compileFunction } = internalBinding('contextify');
// Run the file contents in the correct scope or sandbox. Expose
// the correct helper variables (require, module, exports) to
// the file.
// Returns exception, if any.
Module.prototype._compile = function(content, filename) {
  content = stripShebang(content); // 边界情况
  let compiledWrapper;
  // 全局变量patched是根据是否有改写wrapper包裹函数，一般不会改写，即此处为false，那么这个判断会进入else逻辑，
  // 不过，compileFunction函数是C++暴露的接口！--https://github.com/nodejs/node/blob/master/src/node_contextify.h
  // 为方便分析，暂且进入该处的if逻辑。
  if (patched) {
    // nodejs在加载用户自定义模块文件时，会将后者包裹在一个函数字符串里，并在vm.runInThisContext时执行
    /**
     *let wrap = function(script) {
        return Module.wrapper[0] + script + Module.wrapper[1];
      };
      const wrapper = [
        '(function (exports, require, module, __filename, __dirname) { ',
        '\n});'
      ];
    */
    const wrapper = Module.wrap(content);
    compiledWrapper = vm.runInThisContext(wrapper, {
      filename,
      lineOffset: 0,
      displayErrors: true,
      importModuleDynamically: experimentalModules ? async (specifier) => {
        if (asyncESM === undefined) lazyLoadESM();
        const loader = await asyncESM.loaderPromise;
        return loader.import(specifier, normalizeReferrerURL(filename));
      } : undefined,
    });
  } else {
    compiledWrapper = compileFunction(
      content,
      filename,
      0,
      0,
      undefined,
      false,
      undefined,
      [],
      [
        'exports',
        'require',
        'module',
        '__filename',
        '__dirname',
      ]
    );
  }
  var dirname = path.dirname(filename);
  // 带有上下文的require，该辅助函数在下文
  var require = makeRequireFunction(this);
  // -----------------我来调用了 start-------------------
  var result = compiledWrapper.call(this.exports, this.exports, require, this,
                  filename, dirname);
  // -----------------我来调用了 end-------------------
  return result;
};
```

<details>
<summary>makeRequireFunction辅助函数</summary>

```js
// 辅助函数：带有上下文的require
// Invoke with makeRequireFunction(module) where |module| is the Module object
// to use as the context for the require() function.
function makeRequireFunction(mod) {
  const Module = mod.constructor;

  function require(path) {
    try {
      exports.requireDepth += 1;
      return mod.require(path);
    } finally {
      exports.requireDepth -= 1;
    }
  }

  function resolve(request, options) {
    validateString(request, 'request');
    return Module._resolveFilename(request, mod, false, options);
  }

  require.resolve = resolve;

  function paths(request) {
    validateString(request, 'request');
    return Module._resolveLookupPaths(request, mod, true);
  }

  resolve.paths = paths;

  require.main = process.mainModule;

  // Enable support to add extra extension types.
  require.extensions = Module._extensions;

  require.cache = Module._cache;

  return require;
}
```

</details>

根据Module.prototype._compile，可得出以下结论。

- 模块文件在载入时，整个文件代码、其实是被wrap函数包裹了一下，前者成为后者的函数体。这也是可以直接访问`module.exports`和`exports`的原因。
- compiledWrapper函数，形参exports与形参module的exports属性默认指向同一内存。若业务代码里，前者更改指向且后者未显式赋值，则无法正常导出数据。
- 模块文件在载入时会缓存（`Module._cache[filename] = module;`），因此不会多次重复载入。
- **按值拷贝**。
  - 对Module的实例化module.exports = {}，该值作为实参传入compiledWrapper，并在后者的函数体里添加了前者的属性并进行赋值。
  - 对于基本类型来说，赋值即值拷贝；对于引用类型来说，赋值即值引用。所以`CommonJS规范的模块化`的导出，应当认为是一种浅拷贝。
  - 即假如导出的属性为基本类型，模块内部的变化不会影响到该导出值。

### 从Webpack打包看按值拷贝

问题现象：依赖于同一模块，其中一个的数据更改，会影响其他模块，好像并非值拷贝吖？

```js
// a.js
var originObj = {
  name: 'old',
  getName() {
    return originObj.name
  },
  setName(name) {
    originObj.name = name
    return name
  }
}

module.exports = {
  getName: originObj.getName,
  setName: originObj.setName
}
// b.js
var a = require('./a')

console.log('a-before', a.getName()) // old
console.log('a-set', a.setName('new')) // new
console.log('a-new', a.getName()) // new
// test.js
var a = require('./a')
var b = require('./b')

console.log('a-in-test', a.getName()) // new
```

上文中有分析nodejs的js部分源码，这里分析`Webpack打包的方式，看按值拷贝`。先简化demo代码：

```js
// a.js
var originObj = {
  name: 'old',
  getName() {
    return originObj.name
  }
}
exports.getName = getName
module.exports = {
  getName: originObj.getName
}
// test.js
var a = require('./a')
console.log('a-in-test', a.getName())
```

使用webpack打包：`webpack --devtool none --mode development --target node test.js`，
打包后的文件，保留核心逻辑，如下：

```js
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache // 缓存策略
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
 // --------------------标记①--------------------
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {} // 关键！初始化了一个空对象
/******/ 		};
/******/ 		// Execute the module function
 // --------------------标记②--------------------
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/******/ ([
/* 0 */
 // --------------------标记③--------------------
/***/ (function(module, exports, __webpack_require__) {
var a = __webpack_require__(1)
console.log('a-in-test', a.getName())
/***/ }),
/* 1 */
/***/ (function(module, exports) {
var originObj = {
  name: 'old',
  getName() {
    return originObj.name
  }
}
exports.getName = getName
// 其实就是新创建了个module对象，对其exports属性赋值
module.exports = {
  getName: originObj.getName
}
/***/ })
/******/ ]);
```

故，Commonjs 模块导出（姑且默认为导出的是对象）

- 在Acorn（Webpack解析器）的打包实现上：
  - 各模块独立作用域：每个模块的代码逻辑，都会是一个module function的函数体（标记③处，该函数通过`__webpack_require__函数`间接调用）。
  - 模块导出的本质：是对标记①处，`新创建的module.exports对象的属性`进行了`赋值`。
  - `module.exports`和`exports`，仅在前者未被业务逻辑重新赋值时，指向同一内存（标记②处）。
- 引申：
  - 为导出对象属性`module.exports`赋值（对于基本类型来说，赋值即值拷贝；对于引用类型来说，赋值即值引用），可以看做`对module.exports各属性的浅拷贝`。
  - 引用者（caller）对导入对象的属性修改，会影响到原模块（callee）本身的`module.exports`对象，二者根本就是一块内存，但是变量`exports`未必。

### module.exports的循环引用问题

来看一下这个[issues](https://github.com/nodejs/node/issues/2923)。

根据[Node文档/Cycles](https://nodejs.org/api/modules.html#modules_cycles)描述中，提及的**unfinished copy**。

那么，当index.js加载Test.js时，Test.js依次加载Test2.js。这时，Test2.js试图加载Test.js。
为了防止无限循环，将Test.js导出对象的`unfinished copy(未完成拷贝)`（该例中，即`{}`）返回给Test2.js模块。
然后Test2.js完成加载，并将其`exports`对象提供给Test.js模块。

注意：是**exports**，而不是`module.exports`！

所以这样写，就不会报`TypeError: test.oneFunction is not a function`了，而是期望的`RangeError: Maximum call stack size exceeded`。

```js
// index.js文件：
var test = require('./Test');
test.oneFunction(' from index ');

// Test.js文件：
var two = require('./Test2');
module.exports.oneFunction = function(from) {
    two.twoFunction(' one ');
    console.log('function two from '+from);
}

// Test2.js文件：
var one = require('./Test');
/* 此时，one依然是个空对象 */
module.exports.twoFunction = function(from) {
    /* 函数调用时，one已然不是空对象了 */
    one.oneFunction(' two ');
    console.log('function one from '+from);
};
```

## ESModule

### ESModule的按值引用

按值引用，在原始值改变时 import 的加载值也会随之变化

```js
// b.mjs
export let count = 1;
export function add() {
  count++;
}
export function get() {
  return count;
}
// a.mjs
import { count, add, get } from './b.mjs';
console.log(count); // 1
add();
console.log(count); // 2
console.log(get()); // 2
```

### 模块私有变量

- Symbol()作key

尽管Symbol()作为对象属性名时并非私有属性，但是在做模块化时，可以操作成私有属性。

```js
// a.js
var _symbol = Symbol()
class Person {
  constructor() {
    this[_symbol] = 'xxx'
  }
  getName() {
    console.log(this[_symbol])
  }
  changeName(name) {
    this[_symbol] = name
  }
}
```

- 工厂方法

```js
// a.js
function Person() {
  var _name = ''
  var PersonProto = {
    getName() {
      console.log(_name)
    },
    changeName(name) {
      _name = name
    }
  }
  return PersonProto
}
module.exports = Perosn
```

## Reference

- [深入浅出 Node.js（三）：深入 Node.js 的模块机制](https://www.infoq.cn/article/nodejs-module-mechanism)
- [如何正确证明 Commonjs 模块导出是值的拷贝，而 ES module 是值的引用？](https://www.jianshu.com/p/1cfc5673e61d)