---
title: "流程概览"
date: "2020-11-15"
sidebarDepth: 3
---

## 关键节点

几种常见的触发**状态更新**的方法是如何完成工作，以及调用路径。

### 创建Update对象

在`React`中，有如下方法可以触发状态更新（暂不考虑`SSR`相关）：

- ReactDOM.render
- this.setState
- this.forceUpdate
- useState
- useReducer

每次**状态更新**都会创建一个保存更新状态相关内容的对象，即`Update`。且在`render阶段`的`beginWork`中，会根据`Update`计算新的`state`。

### 从fiber到root

现在`触发状态更新的fiber`上已经包含`Update`对象。那么如何回溯到`Fiber rootFiber`？

调用`markUpdateTimeFromFiberToRoot`方法（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L455)），从`触发状态更新的fiber`得到`rootFiber`。该方法即从`触发状态更新的fiber`一直向上遍历到并返回`FiberRoot fiberRootNode`。

同时，由于不同更新优先级不尽相同，所以过程中还会更新遍历到的`fiber`的优先级。

### 调度更新

现在已有了一个`rootFiber`，该`rootFiber`对应的`Fiber树`中某个`Fiber节点`包含一个`Update`。

接下来通知`Scheduler`根据**更新**的优先级，决定以**同步**还是**异步**的方式调度本次更新。

这里调用的方法是`ensureRootIsScheduled`（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L567)）。

以下是`ensureRootIsScheduled`的核心代码：

```js
if (expirationTime === Sync) {
  // 任务已经过期，需要同步执行render阶段
  callbackNode = scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
} else {
  // 根据任务优先级异步执行render阶段
  callbackNode = scheduleCallback(
    priorityLevel,
    performConcurrentWorkOnRoot.bind(null, root),
    {timeout: expirationTimeToMs(expirationTime) - now()},
  );
}
```

其中，`scheduleSyncCallback`和`scheduleCallback`会调用`Scheduler`提供的调度方法，根据优先级，调度回调函数执行。

回调函数为`render阶段`的入口函数：

```js
performSyncWorkOnRoot.bind(null, root);
performConcurrentWorkOnRoot.bind(null, root);
```

### render阶段的开始

在[render阶段一节介绍](./render-overview.html#render阶段-入口)，`render`阶段开始于`performSyncWorkOnRoot`或`performConcurrentWorkOnRoot`方法的调用。这取决于本次更新是同步更新还是异步更新。

### commit阶段的开始

在[commit阶段一节介绍](./commit-overview.html)，`commit阶段`开始于`commitRoot方法`的调用。其中`FiberRoot fiberRootNode`会作为实参。

## 总结

![状态更新概览](../../../.imgs/react-state-update-overview.png)
