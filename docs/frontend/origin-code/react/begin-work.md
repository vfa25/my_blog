---
title: "beginWork"
date: "2020-10-5"
---

## 方法概览

`beginWork`的工作是传入`当前Fiber节点`，创建`子Fiber节点`；源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberBeginWork.js#L2874)。

### 形参

```js
function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderExpirationTime: ExpirationTime,
): Fiber | null {
  // ...省略函数体
}
```

- current：即`workInProgress.alternate`；当前组件对应的`Fiber节点`在上一次更新时的`Fiber节点`。
- workInProgress：当前组件对应的`Fiber节点`。
- renderExpirationTime：`Scheduler`优先级相关。

根据[双缓存机制](./reconciler.html#双缓存)，除`FiberRoot`（应用的起点）和`RootFiber`（由于需要`prepare a fresh stack`，请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1003)）以外，

- 组件`mount`时，由于是首次渲染，是不存在当前组件对应的`Fiber节点`在上一次更新时的`Fiber节点`，即`mount`时`current === null`。
- 组件`update`时，由于之前已经`mount`过，所以`current !== null`。

故而，可以通过`current === null ?`来区分组件是处于`mount`还是`update`。

基于此原因，`beginWork`的工作可以分为两部分：

- `update`时：如果`current`存在，在满足一定条件时可以复用`current`节点，这样就能克隆`current.child`作为`workInProgress.child`，而不需要新建`workInProgress.child`。
- `mount`时：除`FiberRoot`和`RootFiber`以外，`current === null`。会根据`fiber.tag`不同，创建不同类型的`子Fiber节点`。
