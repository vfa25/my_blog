---
title: "Fiber架构"
date: "2020-9-21"
---

## Fiber含义

1. 作为架构来说，`React16`的`Reconciler`基于`Fiber`节点实现，被称为`Fiber Reconciler`。对应的`React15`的`Reconciler`采用递归的方式执行，数据保存在递归调用栈中，所以被称为`Stack Reconciler`。
2. 作为静态的数据结构来说，每个`Fiber`节点对应一个`React element`，保存了该组件的类型（函数组件/类组件/原生组件...）、对应的DOM节点等信息。
3. 作为动态的工作单元来说，每个`Fiber`节点保存了本次更新中该组件改变的状态、要执行的工作（需要被删除/被插入页面中/被更新...）。

`Fiber`这一个固定的数据结构。具体请看[这一节介绍](./node-structure.html#fiber)。

## Fiber作为架构的属性

`Fiber`并非是计算机语言中的新名词，它被称为`纤程`，和`协程(coroutine)`的区别请看[这一节介绍](../../base/js/async-await-and-coroutine.html#协程-coroutine)。

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

## 双缓存

即`双缓存Fiber树`。

> 原理与显卡的`前缓冲区`与`后缓冲区`类似。显示器只会读取显卡的`前缓冲区`，而新生产的图片帧会提交到显卡的`后缓冲区`，待提交完成之后，`GPU`会将`后缓冲区`和`前缓冲区`互换位置，这样显示器每次都能读取到`GPU`中**最新的完整的**图片。

- React内部维护两个树结构：
  - current Fiber树（对应显卡的`前缓冲区`）：当前页面上已渲染内容对应的`Fiber树`；且其中的`Fiber节点`被称为`current fiber`。
  - workInProgress Fiber树（对应显卡的`后缓冲区`）：正在内存中构建的`Fiber树`；且其中的`Fiber节点`被称为`workInProgress fiber`。
  - 两者的`Fiber节点`通过`alternate`属性连接。

    ```js
    currentFiber.alternate === workInProgressFiber;
    workInProgressFiber.alternate === currentFiber;
    ```

- React应用的根节点`FiberRoot fiberRootNode`通过`current`指针在不同的`Fiber rootFiber`间切换来实现`Fiber树`的切换。

  :::tip Demo

  ```js
  function App() {
    const [num, add] = useState(0);
    return (
      <p onClick={() => add(num + 1)}>{num}</p>
    )
  }
  ReactDOM.render(<App/>, document.getElementById('root'));
  ```

  在该例中，首次执行`ReactDOM.render`会创建`FiberRoot fiberRootNode`和`Fiber rootFiber`（请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-dom/src/client/ReactDOMLegacy.js#L193)）。
  
  - 其中前者是整个应用的根节点（仅且一个）；
  - 后者是`<App/>`所在的组件树的`根Fiber节点`（`根Fiber节点`的数量与`ReactDOM.render`的调用次数相同）。
  :::

  - 工作区 与 已显示区 互换：当`workInProgress Fiber树`构建完成`commit`给`Renderer`渲染在页面上后，应用根节点`fiberRootNode`的`current指针`将改为指向`workInProgress Fiber树`，那么此时`workInProgress Fiber树`就变为`current Fiber树`。
  - 每次状态更新都会产生新的`workInProgress Fiber树`，通过`current`与`workInProgress`的替换，完成DOM更新。
- Demo及流程图请看[这里（卡颂原文中的Demo）](https://react.iamkasong.com/process/doubleBuffer.html#mount时)。

::: warning 注意：FiberRoot fiberRootNode
React应用的根节点`fiberRootNode`只有一个，区别于可以通过多次调用`ReactDOM.render`而可能存在多个的`rootFiber`。

- 整个应用的起点。`current`属性保存着`RootFiber fiber树`的引用，另外、后者的第一个节点有个特殊的类型：`HostRoot（容器元素）`；
- 包含应用挂载的目标DOM节点——`containerInfo`属性；
- 记录整个应用更新过程的各种信息。

> `FiberRoot fiberRootNode`数据结构请看[这一节介绍](./node-structure.html#fiberroot)。
:::

## Reference

- [Fiber Principles: Contributing To Fiber (#7942)](https://github.com/facebook/react/issues/7942)
