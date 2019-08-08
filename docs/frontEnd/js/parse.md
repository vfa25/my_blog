# JS核心

## 快速切入

`GUI渲染线程`从首行开始解析`HTML文件`以构建DOM树，当解析到`script`标签（无defer、async属性）

- 如果这是个行内标签，`GUI渲染线程`随机被挂起，`JS引擎线程`开始解析（其实这也是script标签写在`HTML结构`前面，造成白屏的原因）。
- 如果这是个外链标签，`渲染进程`会开启`http请求线程`去请求资源，在该资源`返回并解析`之前，
`GUI渲染线程`不会跨过script标签去继续构建DOM树（现代浏览器有`资源预请求优化`，但不会破坏DOM树构建规则）。

当前章节，前提都建立在这里————`JS引擎线程`开始执行。

## JS的解释阶段

**JS是解释型语言，多以它无需提前编译，而是由解释器实时运行**

处理过程可以简述如下

```md

```

## Reference

[深入理解JavaScript系列（10）：JavaScript核心（晋级高手必读篇）](https://www.cnblogs.com/TomXu/archive/2012/01/12/2308594.html)、

[从输入URL到页面加载的过程？如何由一道题完善自己的前端知识体系！](https://juejin.im/post/5aa5cb846fb9a028e25d2fb1#heading-50)、

[ECMA-262](http://dmitrysoshnikov.com/ecmascript/chapter-2-variable-object/)、

[前端性能优化原理与实践](https://juejin.im/book/5b936540f265da0a9624b04b/section/5bac3a4df265da0aa81c043c)、

[前端面试之道](https://juejin.im/book/5bdc715fe51d454e755f75ef/section/5bdc71fbf265da6128599324)。
