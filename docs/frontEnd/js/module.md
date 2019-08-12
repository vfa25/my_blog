# 前端模块化

重点关注`CommonJS模块规范`和`ESModule`。其余如`AMD`和`CMD`，因`Webpack`，俱往矣（虽然因异步加载，Webpack支持这些语法并转化）。

## CommonJS

[深入浅出 Node.js（三）：深入 Node.js 的模块机制](https://www.infoq.cn/article/nodejs-module-mechanism)

### `exports`和`module.exports`的区别

**module.exports才是真正的模块导出接口**，只不过`exports`与其指向了同一个内存。
基于这个原理，前端开发者应该知道什么情况下可以修改这二者的引用。

### CommonJS模块是按值拷贝，这是什么意思

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

这里选用分析`Webpack打包的方式，看按值拷贝`，随即简化代码：

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

使用webpack@3（必须）打包：

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

故，Commonjs 模块导出，其实只是对`新module.exports空对象`进行了`赋值（exports）`或`导出对象的浅拷贝（module.exports）`。

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
