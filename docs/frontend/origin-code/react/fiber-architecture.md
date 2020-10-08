---
title: "Fiber架构"
date: "2020-9-21"
---

## 代数效应(Algebraic Effects)

React核心团队成员[Sebastian Markbåge](https://github.com/sebmarkbage/)（React Hooks的发明者）曾说：我们在React中做的就是践行代数效应（Algebraic Effects）。

1. 什么是代数式？

    已知代数方程，是由多项式组成的方程：`2x + 3y + 4z = 10`。即该方程式的作用是加法运算（即`做什么`），至于其中x、y、z的根是什么（即`怎么做`）却无需耦合。

2. 什么是代数效应？

    - 代数，形容词，表示像代数这样；
    - 效应（Effects），对于上式x、y、z三兄弟（对应JS的函数）本身会产生的作用，被称为`效应`。
    - 代数效应，即、像是代数式中变量一样的效应。

3. 代数效应在React中的应用

    React的作用：构建快速响应的大型Web应用程序。React已然基于`Fiber`架构完成了`做什么`。对于使用者，只需要以组件的方式调用诸如`useState`、`setState`API实现`怎么做`即可。

## Why not use generator functions

在JS中，若提到恢复暂停`协程(coroutine)`，会首先想到`Generator（生成器）`API。

但是`Generator`的一些不适用的特性、使React团队放弃使用它来实现`Reconciler（协调器）`：

1. 必须使用`Generator`包裹每个函数，增加了语法开销的同时也增加了对现有实现的运行时开销；
2. 最重要的一点是**生成器是有状态的，无法在中途恢复**。

    ```js
    function* doWork(a, b, c) {
      // doExpensiveWork为占位符，表示有开销的其他有效逻辑
      var x = doExpensiveWorkA(a);
      yield;
      var y = x + doExpensiveWorkB(b);
      yield;
      var z = y + doExpensiveWorkC(c);
      return z;
    }
    ```

    如果只是做时间分片当然没有问题。然而，如果有这么一个场景：当已经完成`doExpensiveWorkA(a)`和`doExpensiveWorkB(b)`、且未完成`doExpensiveWorkC(c)`时，获取到了`b`变量的更新，那么就无法复用变量`x`。也就是说，无法直接跳到`doExpensiveWorkB`去执行时，仍然重用`doExpensiveWorkA(a)`的结果。

    那么`x`变量能缓存在内存么？不优雅。

    1. 假设以`非全局上下文`做内存缓存，但是异步代码执行时，调用栈里仅且有全局上下文。即没有机会去注入(inject memoization)；
    2. 如果使用`全局上下文`做内存缓存，则会出现`缓存失效问题(cache invalidation problems)`。这是一个传说，原文是：`There are only two hard things in Computer Science: cache invalidation and naming thing.（by Phil Karlton）`。即无法确定何时、该缓存应该失效。

> 更详细的解释请看[这个issue](https://github.com/facebook/react/issues/7942#issuecomment-254987818)。

## Fiber含义

1. 作为架构来说，`React16`的`Reconciler`基于`Fiber`节点实现，被称为`Fiber Reconciler`。对应的`React15`的`Reconciler`采用递归的方式执行，数据保存在递归调用栈中，所以被称为`Stack Reconciler`。
2. 作为静态的数据结构来说，每个`Fiber`节点对应一个`React element`，保存了该组件的类型（函数组件/类组件/原生组件...）、对应的DOM节点等信息。
3. 作为动态的工作单元来说，每个`Fiber`节点保存了本次更新中该组件改变的状态、要执行的工作（需要被删除/被插入页面中/被更新...）。

`Fiber`这一个固定的数据结构。具体请看[这里](./node-structure.html#fiber)。

## Fiber作为架构的属性

`Fiber`并非是计算机语言中的新名词，它被称为`纤程`，和`协程(coroutine)`的区别请看[这里](../../base/js/async-await-and-coroutine.html#协程-coroutine)。

::: tip React Fiber可以理解为

React内部实现的一套状态更新机制。支持任务不同`优先级`，可中断与恢复，并且恢复后可以复用之前的中间状态。

:::

因此，要遍历(traverse)`Fiber`树结构，并不能使用递归，而是基于`单向链表树的遍历算法(singly linked list tree traversal algorithm)`。这样，即使处于中间态，也可以在线程恢复时继续遍历`Fiber`树结构。

链表树结构，依靠以下三个属性

```js
// 指向父级Fiber节点，用于对当前处理完的节点的向上返回
this.return = null;
//  指向第一个子Fiber节点
this.child = null;
// 指向右边第一个兄弟Fiber节点，且所有兄弟节点return指向同一父节点
this.sibling = null;
```

::: tip Demo：Fiber如何联通整个应用

```jsx
const Input = () => <input />
const List = () => [
  <span key="a">1</span>,
  <span key="b">2</span>,
  <span key="c">3</span>
]
function App() {
  return (
    <div>
      <Input />
      <List />
    </div>
  )
}
```

![Fiber如何联通整个应用](../../../.imgs/react-fiber-data-structure.png)

:::

## Reference

- [Fiber Principles: Contributing To Fiber (#7942)](https://github.com/facebook/react/issues/7942)
