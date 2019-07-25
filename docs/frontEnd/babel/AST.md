# Acorn 和 AST

解析器是什么，稍后会更新浏览器渲染进程或JS引擎进程工作机制，基本概念请转场[浏览器的工作原理](/howbrowserswork)。

本文参考[使用 Acorn 来解析 JavaScript](https://juejin.im/post/582425402e958a129926fcb4)

## parser介绍

简单介绍下Github几款加星比较高的解析器：

- [Esprima](https://github.com/jquery/esprima)
- [Acorn](https://github.com/acornjs/acorn)
- [UglifyJS 2](https://github.com/mishoo/UglifyJS2)

Acorn的作者或许是觉着好玩，造的Esprima的轮子，却比后者代码量更少。这两个比较关键的点是解析出来的 AST 结果（只是 AST，tokens 不一样）且都是符合[The Estree Spec 规范](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API)。

**Webpack 的解析器就是 Acorn**。

`Acorn`非常快，易于使用，并且针对非标准特性(以及那些未来的标准特性) 设计了一个基于插件的架构。

Uglify有自己的代码解析器（UglifyJS 3），也可以输出 AST，但它的功能更多还是用于压缩代码。

Babylon是`Babel`的解析器。最初是从`Acorn`fork出来的。

来看一下[性能比较](https://esprima.org/test/compare.html)：
![](./imgs/speed_comparison.png)

可以在[Esprima: Parser](https://esprima.org/demo/parse.html)测试各种代码的解析结果。

用于把满足 Estree 标准的 AST 转换为 ESMAScript 代码的一个工具，：[escodegen](https://github.com/estools/escodegen)。

## API介绍

**解析 acorn.parse**

```js
let acorn = require("acorn");
console.log(acorn.parse("1 + 1"));
```

**分词 acorn.tokenizer**

```js
console.log([...acorn.tokenizer("1 + 1")])
```

## Plugins

Acorn，提供了一种扩展的方式来编写相关的插件：[Acorn Plugins](https://github.com/acornjs/acorn#plugins)。

如解析jsx语法插件[acorn-jsx](https://github.com/RReverser/acorn-jsx)
