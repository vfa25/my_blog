---
title: "流程概览"
date: "2020-10-14"
---

`Renderer`工作的阶段被称为`commit阶段`。

- 入口

  正如上节末尾介绍，`commitRoot(root)`是`commit阶段`的入口，其中参数`root`为`FiberRoot fiberRootNode`。
- 该阶段做了什么

  在`rootFiber.firstEffect`上保存了一条需要执行副作用的`Fiber节点`的单向链表`effectList`，这些`Fiber节点`的`updateQueue`中保存了变化的`props`。

  这些副作用对应的`DOM`操作在`commit阶段`执行。

  除此之外，一些生命周期钩子（比如`componentDidXXX`）、`hook`（比如`useEffect`）需要在`commit阶段`执行。

- 子阶段：在源码中`commit阶段`（即`Renderer`的工作流程）被分为三个子阶段（sub-phases）：

  - `before mutation阶段`（执行`DOM`操作前）
  - `mutation阶段`（执行`DOM`操作）
  - `layout阶段`（执行`DOM`操作后）

> `commit阶段`的源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1720)。
