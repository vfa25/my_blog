# 转译插件

## Reference

- [Babel插件手册](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md#toc-stages-of-babel)
- [深入Babel，这一篇就够了](https://juejin.im/post/5c21b584e51d4548ac6f6c99#heading-1)

### 文档

- [babel-traverse：用于操作AST状态--Path的属性及方法](https://github.com/babel/babel/tree/master/packages/babel-traverse/src/path)
- [babel-types：Babel官网](https://babeljs.io/docs/en/babel-types)、[The core Babylon AST node types](https://github.com/babel/babylon/blob/master/ast/spec.md)

- [ESTree规范](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API)

附：将代码解析成AST（[在线工具](https://astexplorer.net/)）。

前两篇文章很详细，这儿不再搬运，在其基础上，以一个例子分析一下：`babel-plugin-import`。

## babel-plugin-import

[源码GitHub地址](https://github.com/ant-design/babel-plugin-import)

先从`package.json`查看入口`main`字段为`lib/index.js`，这是个build后的`comminjs规范`文件，定位到入口`src/index.js`。

先来看一下依赖`src/Plugins.js`文件的辅助函数：

```js
// src/Plugins.js
import { join } from 'path';
// 用于导入node文件模块，文档查看 https://babeljs.io/docs/en/next/babel-helper-module-imports.html
import { addSideEffect, addDefault, addNamed } from '@babel/helper-module-imports';

// 转换函数，如 transCamel('MySelect', '-')，返回'my-select'
function transCamel(_str, symbol) {
  const str = _str[0].toLowerCase() + _str.substr(1);
  return str.replace(/([A-Z])/g, ($1) => `${symbol}${$1.toLowerCase()}`);
}

// 路径兼容Windows操作系统
function winPath(path) {
  return path.replace(/\\/g, '/');
}

// 路径加载资源
function normalizeCustomName(originCustomName) {
  // If set to a string, treat it as a JavaScript source file path.
  if (typeof originCustomName === 'string') {
    const customNameExports = require(originCustomName);
    return typeof customNameExports === 'function'
      ? customNameExports : customNameExports.default;
  }
  return originCustomName;
}
```

未完待续。。。
