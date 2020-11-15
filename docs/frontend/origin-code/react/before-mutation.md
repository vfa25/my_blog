---
title: "before mutation"
date: "2020-10-15"
sidebarDepth: 3
---

## before mutation之前

主要做一些准备工作，比如：`useEffect`的触发、优先级相关的重置等。

最后取到`effectList`链表（即所有有`effectTag`的`Fiber节点`的集合）赋值给变量`firstEffect`。

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1721)。

```js
do {
  // 执行useEffect回调与其他同步任务。
  // 由于这些任务可能触发新的渲染，所以要一直遍历执行直到没有任务
  flushPassiveEffects();
} while (rootWithPendingPassiveEffects !== null);

// root 为 FiberRoot fiberRootNode。
// root.finishedWork 即 root.current.alternate，
// 指 finished 且 准备好commited 的 work-in-progress rootFiber。
const finishedWork = root.finishedWork;
// 优先级相关
const expirationTime = root.finishedExpirationTime;
if (finishedWork === null) {
  return null;
}
root.finishedWork = null;
root.finishedExpirationTime = NoWork;

// 重置root上，有关Scheduler绑定的回调函数
root.callbackNode = null;
root.callbackExpirationTime = NoWork;
root.callbackPriority = NoPriority;
root.nextKnownPendingLevel = NoWork;

startCommitTimer();

const remainingExpirationTimeBeforeCommit = getRemainingExpirationTime(
  finishedWork,
);
// 重置root上，优先级相关属性
markRootFinishedAtTime(
  root,
  expirationTime,
  remainingExpirationTimeBeforeCommit,
);

// 重置全局变量，they are finished.
if (root === workInProgressRoot) {
  workInProgressRoot = null;
  workInProgress = null;
  renderExpirationTime = NoWork;
} else {
}

// 将effectList赋值给变量firstEffect
let firstEffect;
// 根fiber有effectTag
if (finishedWork.effectTag > PerformedWork) {
  // 由于effectList设置时的规则：每个fiber的effectList只包含其子孙节点，而不包含自身。
  // 所以只需要，根fiber如果有effectTag，则将其插入到effectList的尾部；
  // 这样即可保证有effect的fiber，都在effectList集合中了。
  if (finishedWork.lastEffect !== null) {
    finishedWork.lastEffect.nextEffect = finishedWork;
    firstEffect = finishedWork.firstEffect;
  } else {
    firstEffect = finishedWork;
  }
} else {
  // 根fiber没有effectTag
  firstEffect = finishedWork.firstEffect;
}
```

## before mutation概览

该过程做了以下工作：

- **遍历`effectList`，并通过调用`commitBeforeMutationEffects`函数做处理。**
- 开发环境下，记录与`React DevTools Profiler插件`相关的时间数据。

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1812)，至1843行，为`before mutation`阶段。

```js
// 将执行上下文标记上CommitContext，作为commit阶段的标志
const prevExecutionContext = executionContext;
executionContext |= CommitContext;
ReactCurrentOwner.current = null;

// 处理focus状态：textarea, input or contentEditable node
prepareForCommit(root.containerInfo);
nextEffect = firstEffect;
do {
  commitBeforeMutationEffects();
} while (nextEffect !== null);
```

## commitBeforeMutationEffects

1. 调用`getSnapshotBeforeUpdate`生命周期钩子。
2. 调度`useEffect`。

```js
function commitBeforeMutationEffects() {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;
    if ((effectTag & Snapshot) !== NoEffect) {
      const current = nextEffect.alternate;
      // 调用生命周期函数：getSnapshotBeforeUpdate
      commitBeforeMutationEffectOnFiber(current, nextEffect);
    }
    if ((effectTag & Passive) !== NoEffect) {
      // 调度useEffect
      if (!rootDoesHavePassiveEffects) {
        rootDoesHavePassiveEffects = true;
        scheduleCallback(NormalPriority, () => {
          flushPassiveEffects();
          return null;
        });
      }
    }
    nextEffect = nextEffect.nextEffect;
  }
}
```

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L244)。

## 调用`getSnapshotBeforeUpdate`

`commitBeforeMutationEffectOnFiber`（等价于`commitBeforeMutationLifeCycles`）方法内会调用生命周期函数`getSnapshotBeforeUpdate`。

从`Reactv16.3`开始，`componentWillXXX`钩子前增加了`UNSAFE_`前缀。

这是因为`Stack Reconciler`重构为`Fiber Reconciler`后，`render阶段`的任务可能中断/重新开始，对应的组件在`render阶段`的生命周期钩子（即`componentWillXXX`）可能在`子阶段beginWork`触发多次。所以标记为`UNSAFE_`。

> 更详细的解释参考[深入源码剖析componentWillXXX为什么UNSAFE](https://juejin.im/post/6847902224287285255)。

为此，`React`提供了替代的生命周期钩子`getSnapshotBeforeUpdate`。

因为`getSnapshotBeforeUpdate`是在`commit阶段`内的`before mutation阶段`调用的，而`commit阶段`是同步的，所以不会出现多次调用的问题。

## 调度`useEffect`

`scheduleCallback`方法由`Scheduler`模块提供，用于以某个优先级异步调度一个回调函数。

```js
if ((effectTag & Passive) !== NoEffect) {
  if (!rootDoesHavePassiveEffects) {
    rootDoesHavePassiveEffects = true;
    scheduleCallback(NormalPriority, () => {
      // 触发useEffect
      flushPassiveEffects();
      return null;
    });
  }
}
```

那么，`useEffect`如何被异步调度，以及为什么要异步（而不是同步）调度。

### 如何异步调度

在`flushPassiveEffects`方法内部会从全局变量`rootWithPendingPassiveEffects`获取`effectList`。

在[completeWork一节介绍](./complete-work.html#effectlist)，`effectList`中保存了需要执行副作用的`Fiber节点`。其中副作用包括

- 插入DOM节点（Placement）
- 更新DOM节点（Update）
- 删除DOM节点（Deletion）

除此外，当一个`FunctionComponent`含有`useEffect`或`useLayoutEffect`，其对应的`Fiber节点`也会被赋值`effectTag`。

> `hooks`相关的`effectTag`请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactHookEffectTags.js)，设置时机请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberHooks.js#L923)。

在`flushPassiveEffects`方法内部会遍历`rootWithPendingPassiveEffects`（即`effectList`）执行`effect`回调函数。

如果在此时直接执行，`rootWithPendingPassiveEffects === null`。

那么`rootWithPendingPassiveEffects`会在何时赋值呢？

并在最后的`layout`阶段之后的代码片段中会根据`rootDoesHavePassiveEffects === true ?`决定是否赋值`rootWithPendingPassiveEffects`。

```js
const rootDidHavePassiveEffects = rootDoesHavePassiveEffects;
if (rootDoesHavePassiveEffects) {
  rootDoesHavePassiveEffects = false;
  rootWithPendingPassiveEffects = root;
  pendingPassiveEffectsExpirationTime = expirationTime;
  pendingPassiveEffectsRenderPriority = renderPriorityLevel;
}
```

所以整个`useEffect`异步调用分为三步：

- `before mutation`阶段在`scheduleCallback`中调度`flushPassiveEffects`；
- `layout`阶段之后将`effectList`赋值给`rootWithPendingPassiveEffects`；
- `scheduleCallback`触发`flushPassiveEffects`方法，以遍历`rootWithPendingPassiveEffects`。

### 为什么需要异步调用

摘自`React`文档[effect 的执行时机](https://zh-hans.reactjs.org/docs/hooks-reference.html#timing-of-effects)：

>与 componentDidMount、componentDidUpdate 不同的是，在浏览器完成布局与绘制之后，传给 useEffect 的函数会延迟调用。这使得它适用于许多常见的副作用场景，比如设置订阅和事件处理等情况，因此不应在函数中执行阻塞浏览器更新屏幕的操作。

## 总结

在`before mutation`阶段，会遍历`effectList`，依次执行：

1. 处理`DOM`节点渲染/删除后的`autoFocus`、`blur`逻辑；
2. 调用`getSnapshotBeforeUpdate`生命周期钩子；
3. 调度`useEffect`。
