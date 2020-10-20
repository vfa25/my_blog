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

根据[双缓存机制](./reconciler.html#双缓存)，除`fiberRootNode`（应用的起点）和`rootFiber`（由于需要`prepare a fresh stack`，请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1003)）以外，

- 组件`mount`时，由于是首次渲染，是不存在当前组件对应的`Fiber节点`在上一次更新时的`Fiber节点`，即`mount`时`current === null`。
- 组件`update`时，由于之前已经`mount`过，所以`current !== null`。

故而，可以通过`current === null ?`来区分组件是处于`mount`还是`update`。

基于此原因，`beginWork`的工作可以分为两部分：

- `update`时：如果`current`存在，在满足一定条件时可以复用`current`节点，这样就能克隆`current.child`作为`workInProgress.child`，而不需要新建`workInProgress.child`。
- `mount`时：除`fiberRootNode`和`rootFiber`以外，`current === null`。会根据`fiber.tag`不同，创建不同类型的`子Fiber节点`。

```js
// 省略边缘逻辑
function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderExpirationTime: ExpirationTime,
): Fiber | null {

  // update时：如果current存在可能的优化路径，就复用current（即上一次更新完毕的Fiber节点）
  if (current !== null) {
    // 复用current
    return bailoutOnAlreadyFinishedWork(
      current,
      workInProgress,
      renderExpirationTime,
    );
  } else {
    didReceiveUpdate = false;
  }

  // mount时：根据tag不同，创建不同的子Fiber节点
  switch (workInProgress.tag) {
    case IndeterminateComponent:
      // 省略
    case LazyComponent:
      // 省略
    case FunctionComponent:
      // 省略
    case ClassComponent:
      // 省略
    case HostRoot:
      // 省略
    case HostComponent:
      // 省略
    case HostText:
      // 省略
    case SuspenseComponent:
      // 省略
    case HostPortal:
      // 省略
    // 省略其他类型
  }
}
```

## update时

当满足如下任一情况时，变量赋值`didReceiveUpdate === false`（即可以直接复用前一次更新的`子Fiber`，不需要新建`子Fiber`）。

1. `oldProps === newProps && workInProgress.type === current.type`，即`props`和`fiber.type`不变；
2. `updateExpirationTime < renderExpirationTime`，即当前`Fiber节点`update优先级不够，这与`Scheduler`相关。

```js
if (current !== null) {
  const oldProps = current.memoizedProps;
  const newProps = workInProgress.pendingProps;

  if (
    oldProps !== newProps ||
    hasLegacyContextChanged() ||
    (__DEV__ ? workInProgress.type !== current.type : false)
  ) {
    didReceiveUpdate = true;
  } else if (updateExpirationTime < renderExpirationTime) {
    didReceiveUpdate = false;
    switch (workInProgress.tag) {
      // 省略处理过程
    }
    return bailoutOnAlreadyFinishedWork(
      current,
      workInProgress,
      renderExpirationTime,
    );
  } else {
    // 该处逻辑用于匹配no new props nor legacy context，本章下文会叙述
    didReceiveUpdate = false;
  }
} else {
  didReceiveUpdate = false;
}
```

## mount时

当不满足优化路径的条件时，将根据`fiber.tag`的不同（对应的组件类型，请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/shared/ReactWorkTags.js#L35)），进入不同类型的`子Fiber`的创建逻辑。

```js
switch (workInProgress.tag) {
  case IndeterminateComponent:
    // 省略
  case LazyComponent:
    // 省略
  case FunctionComponent:
    // 省略
  case ClassComponent:
    // 省略
  case HostRoot:
    // 省略
  case HostComponent:
    // 省略
  case HostText:
    // 省略
  case SuspenseComponent:
    // 省略
  case HostPortal:
    // 省略
  // 省略其他类型
}
```

对于常见的组件类型，如`FunctionComponent`、`ClassComponent`、`HostComponent`，最终会进入[reconcileChildren](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberBeginWork.js#L212)方法。

## reconcileChildren

这是`Reconciler`模块的核心逻辑。

- 对于`mount`的组件，会创建新的`子Fiber节点`；
- 对于`update`的组件，会将当前组件与其在上次更新时对应的`Fiber节点`相比较（即`Diff算法`），将比较的结果生成`新Fiber节点`。

```js
export function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any,
  renderExpirationTime: ExpirationTime,
) {
  if (current === null) {
    // 对于mount的组件
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderExpirationTime,
    );
  } else {
    // 对于update的组件
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderExpirationTime,
    );
  }
}
```

该逻辑会生成新的`子Fiber节点`，并赋值给`workInProgress.child`，后者作为`beginWork`的返回值（请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberBeginWork.js#L969)），并作为下次`performUnitOfWork`执行时`workInProgress`的传参（请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1470)）。

:::tip Demo
借助上一节的[Demo](./reconciler.html#demo)，第一个进入`beginWork`方法的`Fiber节点`即`rootFiber`，其`alternate`指向`current rootFiber`而非`null`（即存在`current`，该属性是在`ReactDOM.render`调用时赋值的）。

由于存在`current`，`rootFiber`在`reconcileChildren`时会走`reconcileChildFibers`逻辑。

而之后通过`beginWork`创建的`Fiber节点`不存在`current`（即`fiber.alternate === null`），会走`mountChildFibers`逻辑。
:::

::: warning 注意
`mountChildFibers`与`reconcileChildFibers`两方法的逻辑基本一致。唯一的区别是：后者会为生成的`Fiber节点`带上`effectTag`属性，而前者不会（即`not tracking side-effects`）。
:::

## effectTag

用来记录`side-effects`。这是由于`render阶段`的工作在内存中进行，当其完成后，会通知`Renderer`执行`DOM操作`，且具体类型（请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/shared/ReactSideEffectTags.js)）就保存在`fiber.effectTag`中。

比如：

```js
// DOM需要插入
export const Placement = /*                */ 0b00000000000010;
// DOM需要更新
export const Update = /*                   */ 0b00000000000100;
// DOM需要插入并更新
export const PlacementAndUpdate = /*       */ 0b00000000000110;
// DOM需要删除
export const Deletion = /*                 */ 0b00000000001000;
```

> 以二进制表示`effectTag`，可以方便的通过位操作为`fiber.effectTag`赋值多个`effect`。

::: tip 举个例子

如果要通知`Renderer`将`Fiber节点`对应的`DOM节点`插入页面中，需要同时满足两个条件：

1. `fiber.stateNode`存在，即`Fiber节点`中保存了对应的`DOM节点`；
2. `(fiber.effectTag & Placement) !== 0`，即`Fiber节点`存在`Placement effectTag`。

:::

然而`mount`时，由于`fiber.stateNode === null`（因为`benginWork`时仅创建`子Fiber节点`，请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiber.js#L735)），且在`reconcileChildren`中调用的`mountChildFibers`不会为`Fiber节点`赋值`effectTag`。那么首屏渲染如何完成呢？

1. 对于第一个问题：`fiber.stateNode`会在`completeWork`中创建，将会在下一节介绍。
2. 对于第二个问题：

    - 假设`mountChildFibers`也会赋值`effectTag`，那么可以预见`mount`时整棵`Fiber树`所有节点都会有`Placement effectTag`。这样在`commit阶段`执行`DOM`操作时每个节点都会执行一次插入操作，十分低效。
    - 为了解决这个问题，在`mount`时只有`RootFiber`会赋值`Placement effectTag`，在`commit阶段`只会执行一次插入操作。

## 总结

![beginWork流程图](./imgs/begin-work.png)
<center>beginWork流程图（该图暂忽略Scheduler相关）</center>
