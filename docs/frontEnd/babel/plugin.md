# babel-plugin-import源码解析

这里以`babel-plugin-import`分析一下转译插件的工作原理。

先来看一下`import { Button } from 'antd';`[解析后的AST](https://astexplorer.net/)（记得选择babylon）。

## 准备

### 文档

- [Babel core手册（GitHub）](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md#toc-stages-of-babel)
- [Babylon AST结点类型枚举（GitHub）](https://github.com/babel/babylon/blob/master/ast/spec.md)
- [babel-traverse（GitHub）：用于操作AST状态--Path的属性及方法](https://github.com/babel/babel/tree/master/packages/babel-traverse/src/path)
- [babel-types（Babel文档）](https://babeljs.io/docs/en/babel-types)
- [@babel/helper-module-imports（Babel文档）](https://babeljs.io/docs/en/next/babel-helper-module-imports.html)

- [ESTree规范（MDN）](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API)

## 本地调试结果

[babel-plugin-import的GitHub地址](https://github.com/ant-design/babel-plugin-import)。

先来看一下，以如下方式引用`Button组件`时的转换结果。

```js
import { Button } from 'antd';
ReactDOM.render(<Button>xxxx</Button>);
```

```js
require('@babel/register'); // node未完全支持ES6，运行时对ES6转码（dev）
const babel = require('@babel/core');
const types = require('@babel/types');
const plugin = require('../src/index.js').default;

const visitor = plugin({types});
const code = `
    import { Button } from 'antd';
    ReactDOM.render(<Button>xxxx</Button>);
`;

const result = babel.transform(code, {
    presets: ['umi'],
    plugins: [
        [
            visitor,
            {
                libraryName: 'antd',
                libraryDirectory: 'es',
                style: true
            }
        ]
    ]
});
console.log(result.code);
// "use strict";

// 这个是@babel/runtime的helper函数
// var _interopRequireDefault = require("/Users/nsky/Desktop/yaunma/babel-plugin-import/node_modules/_babel-preset-umi@1.6.1@babel-preset-umi/node_modules/@babel/runtime/helpers/interopRequireDefault");

// var _react = _interopRequireDefault(require("react"));
// require("antd/es/button/style");
// var _button = _interopRequireDefault(require("antd/es/button"));
// ReactDOM.render(_react.default.createElement(_button.default, null, "xxxx"));
```

## 源码分析

根据`webpack`的`resolve.mainFields`的默认配置，入口一般会选用`package.json`的`main`字段，
即`lib/index.js`，这是build后`comminjs规范`文件，源码入口还是在`src/index.js`。

### 入口文件 /src/index.js

已知Babel进入结点时，是以`访问者模式（visitor）`获取结点信息，并进行相关操作。

入口文件的逻辑很清晰，会导出一个函数，该函数接收一有属性types（即`babel-types`）的对象参数，

返回一个有访问者属性visitor的对象，而visitor对象中定义了对于各结点的访问函数，这样就可以获取具体结点以做出不同的处理。

```js
import assert from 'assert'; // 断言
import Plugin from './Plugin';
// babel调用插件时，会将babel-types作为参数传入
export default function ({ types }) {
  let plugins = null; // plugin数组，元素为Plugin实例

  // 注册各结点的访问方法
  function applyInstance(method, args, context) {
    for (const plugin of plugins) {
      if (plugin[method]) {
        plugin[method].apply(plugin, [...args, context]);
      }
    }
  }
  const Program = {
    // path可以看成结点的软链接，有一系列属性和操作方法；opts为插件选项。
    enter(path, { opts = {} }) {
      // Init plugin instances once.
      if (!plugins) {
        assert(opts.libraryName, 'libraryName should be provided');
        plugins = [
          new Plugin(
            opts.libraryName,
            opts.libraryDirectory,
            opts.style,
            opts.camel2DashComponentName,
            opts.camel2UnderlineComponentName,
            opts.fileName,
            opts.customName,
            opts.transformToDefaultImport,
            types
          ),
        ];
      }
      applyInstance('ProgramEnter', arguments, this); // 注册根结点enter方法
    },
    exit() {
      applyInstance('ProgramExit', arguments, this); // 注册根结点exit方法
    },
  };
  const methods = [
    'ImportDeclaration',
    'CallExpression',
    'MemberExpression',
    'Property',
    'VariableDeclarator',
    'ArrayExpression',
    'LogicalExpression',
    'ConditionalExpression',
    'IfStatement',
    'ExpressionStatement',
    'ReturnStatement',
    'ExportDefaultDeclaration',
    'BinaryExpression',
    'NewExpression',
    'ClassDeclaration',
  ];
  const ret = {
    visitor: { Program },
  };
  // 将methods数组元素映射的访问函数全部注册
  for (const method of methods) {
    ret.visitor[method] = function () { // eslint-disable-line
      applyInstance(method, arguments, ret.visitor);  // eslint-disable-line
    };
  }
  return ret; // 返回访问对象
}
```

未完待续。。。

## Reference

- [深入Babel，这一篇就够了](https://juejin.im/post/5c21b584e51d4548ac6f6c99#heading-1)
