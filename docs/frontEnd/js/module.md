---
title: '前端模块化'
sidebarDepth: 3
---

重点关注`CommonJS模块规范`和`ESModule`。其余如`AMD`和`CMD`，因`Webpack`，俱往矣（虽然因异步加载，Webpack支持这些语法并转化）。

## CommonJS

### `exports`和`module.exports`的区别

结论：**module.exports才是真正的模块导出接口**，只不过变量`exports`与其指向了同一块内存。
基于这个原理，开发者应该知道什么情况下可以修改这二者的引用。

来一探这部分的nodejs源码吧（node-v10.16.3）

JS源码部分在/lib/internal/modules/cjs/loader.js，以下仅保留关键逻辑。

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
const { compileFunction } = internalBinding('contextify');
// Run the file contents in the correct scope or sandbox. Expose
// the correct helper variables (require, module, exports) to
// the file.
// Returns exception, if any.
Module.prototype._compile = function(content, filename) {
  content = stripShebang(content); // 边界情况
  let compiledWrapper;
  // 全局变量patched是根据是否有改写wrapper包裹函数，一般不会改写，即此处为false，所以这个判断会进入else逻辑，
  // 但是！compileFunction函数是C++暴露的接口，我看不懂吖--https://github.com/nodejs/node/blob/master/src/node_contextify.h
  // 所以直接看if逻辑效果更佳，wrap辅助函数索性直接注释在这里了
  if (patched) {
    // let wrap = function(script) {
    //   return Module.wrapper[0] + script + Module.wrapper[1];
    // };

    // const wrapper = [
    //   '(function (exports, require, module, __filename, __dirname) { ',
    //   '\n});'
    // ];

    // nodejs在加载用户自定义模块文件时，会将后者包裹在一个函数字符串里，并在vm.runInThisContext时执行
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

根据Module.prototype._compile，可知

- 模块文件在载入时，其实是被wrap函数包裹了一下。
- compiledWrapper.call时，变量exports默认与module.exports指向同一内存，若前者更改指向且后者未显式赋值，则无法正常导出数据。
- 模块文件在载入时会缓存，因此不会多次重复载入。
- module.exports是字符串转对象，即所谓的按值拷贝；在构造器中，module.exports = {}，
即导出总是指向一块内存，若在不同文件中修改其导出值，是会互相影响的。

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

### 为什么说CommonJS模块是按值拷贝

现象：依赖于同一模块，其中一个的数据更改，会影响其他模块。

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

使用webpack@3（必须，v4.+有默认插件干扰）打包：

```js
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {} // 初始化了一个空对象
/******/ 		};
/******/ 		// Execute the module function
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
module.exports = {
  getName: originObj.getName
}
/***/ })
/******/ ]);
```

故，Commonjs 模块导出，其实只是对`新module.exports空对象`进行了`赋值（exports）`或称`导出对象的浅拷贝（module.exports）`。

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
