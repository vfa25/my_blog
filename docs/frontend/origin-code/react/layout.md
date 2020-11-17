---
title: "layout"
date: "2020-11-8"
sidebarDepth: 3
---

## layout

该阶段之所以称为`layout`，因为该阶段的代码都是在`DOM渲染`（在`mutation阶段`）完成后执行的。

已知[DOM的布局（layout）阶段一节介绍](../../base/browser/04render-process.html#布局阶段（layout）)是最早访问到已经改变后的`DOM`的时机，对应语义的`react的layout阶段`触发的生命周期钩子和`hook`，也可以直接访问到已经改变后的`DOM`。

### 概览

与前两阶段类似，`layout阶段`也是遍历`effectList`，执行函数。这里执行的是`commitLayoutEffects`。

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1880)。

```js
root.current = finishedWork;
nextEffect = firstEffect;
do {
  try {
    commitLayoutEffects(root, expirationTime);
  } catch (error) {
    invariant(nextEffect !== null, 'Should be working on an effect.');
    captureCommitPhaseError(nextEffect, error);
    nextEffect = nextEffect.nextEffect;
  }
} while (nextEffect !== null);
```

### commitLayoutEffects

- `commitLayoutEffectOnFiber`（调用生命周期钩子和`hook`相关操作）；
- `commitAttachRef`（赋值`ref`）。

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L2140)。

```js
function commitLayoutEffects(
  root: FiberRoot,
  committedExpirationTime: ExpirationTime,
) {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;

    // 调用生命周期钩子和hook
    if (effectTag & (Update | Callback)) {
      const current = nextEffect.alternate;
      commitLayoutEffectOnFiber(
        root,
        current,
        nextEffect,
        committedExpirationTime,
      );
    }

    // 赋值ref
    if (effectTag & Ref) {
      commitAttachRef(nextEffect);
    }

    nextEffect = nextEffect.nextEffect;
  }
}
```

### commitLayoutEffectOnFiber

`commitLayoutEffectOnFiber`方法会根据`fiber.tag`对不同类型的节点分别处理。

> `commitLifeCycles as commitLayoutEffectOnFiber`，源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L443)

- 对于`ClassComponent`
  - 会通过`current === null ?`区分`mount`或`update`，分别调用[componentDidMount](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L500)或[componentDidUpdate](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L539)。
  - 通过调用`commitUpdateQueue`（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactUpdateQueue.js#L527)），如果`this.setState`传了第二个实参——回调函数，也在此时调用。
- 对于`FunctionComponent`及相关类型（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L449-L464)），会调用`useLayoutEffect hook`的回调函数，调度`useEffect`的销毁与回调函数。

  > `相关类型`指特殊处理后的`FunctionComponent`，比如`ForwardRef`、`React.memo`包裹的`FunctionComponent`。

  ```js
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
    case Block: {
      // 执行useLayoutEffect的回调函数
      commitHookEffectListMount(HookLayout | HookHasEffect, finishedWork);
      // 调度useEffect的销毁函数与回调函数
      schedulePassiveEffects(finishedWork);
      return;
    }
  }
  ```

  - `useLayoutEffect`
    - 已知在`mutation阶段`且`Update effect`（[这一节介绍](./mutation.html#functioncomponent-mutation)）时，会执行（上一次更新的）`useLayoutEffect hook`的销毁函数。
    - 而此时的`layout阶段`，会**同步执行**（本次更新的）`useLayoutEffect hook`的`回调函数`（即[官网](https://zh-hans.reactjs.org/docs/hooks-reference.html#uselayouteffect)描述的调用时机：在所有的`DOM`变更之后）。
  - `useEffect`：不同的是，`useEffect`则需要先调度，在`layout阶段`完成后再异步执行。

- 对于`HostRoot`（即`rootFiber`），如果`ReactDOM.render`传了第三个实参：回调函数，则会在此时调用（`effect.callback`）。

### commitAttachRef

获取`DOM`实例，更新`fiber.ref`。

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L721)。

```js
function commitAttachRef(finishedWork: Fiber) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode;
    // 获取DOM实例
    let instanceToUse;
    switch (finishedWork.tag) {
      case HostComponent:
        instanceToUse = getPublicInstance(instance);
        break;
      default:
        instanceToUse = instance;
    }
    // Moved outside to ensure DCE works with this flag
    if (enableScopeAPI && finishedWork.tag === ScopeComponent) {
      instanceToUse = instance.methods;
    }
    if (typeof ref === 'function') {
      // 如果ref是函数形式，调用回调函数
      ref(instanceToUse);
    } else {
      // 如果ref是ref实例形式，赋值ref.current
      ref.current = instanceToUse;
    }
  }
}
```

至此，整个`layout阶段`就结束了。

## current Fiber树切换

下面来关注下这行代码：

```js
root.current = finishedWork;
```

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1880)。

根据[双缓存机制一节介绍](./fiber-architecture.html#双缓存)，`workInProgress Fiber`树在`commit阶段`完成渲染后，会变为`current Fiber树`。这行代码的作用就是切换`fiberRootNode`指向的`current Fiber树`。

那么这行代码为什么在这里呢？（在`mutation阶段`结束后，`layout阶段`开始前。）

`componentWillUnmount`会在`mutation阶段`执行。此时`current Fiber树`还指向前一次更新的`Fiber树`，在生命周期钩子内获取的`DOM`还是更新前的。

`componentDidMount`和`componentDidUpdate`会在`layout阶段`执行。此时`current Fiber树`已经指向更新后的`Fiber树`，在生命周期钩子内获取的DOM就是更新后的。

## layout之后

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1943-L2033)。

1. 处理`useEffect`，等待调度。
2. 性能跟踪相关。

    源码里有很多和[interaction](https://gist.github.com/bvaughn/8de925562903afd2e7a12554adcdda16#overview)相关的变量。他们都和追踪React渲染时间、性能相关，在[Profiler API](https://zh-hans.reactjs.org/docs/profiler.html)和[DevTools](https://github.com/facebook/react-devtools/pull/1069)中使用。
3. 在`commit阶段`会触发一些生命周期钩子（如`componentDidXXX`）和`hook`（如`useLayoutEffect`、`useEffect`）。

    其中可能触发新的更新（`setState`），那么新的更新会开启新的`render-commit`流程，而后者是同步执行的（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L2032)）。如[该例](https://code.h5jun.com/kakoy/1/edit?js,output)中，页面并不会出现过渡态：“0”。

```js
const rootDidHavePassiveEffects = rootDoesHavePassiveEffects;

// useEffect相关 Stash，等待调度
if (rootDoesHavePassiveEffects) {
  rootDoesHavePassiveEffects = false;
  rootWithPendingPassiveEffects = root;
  pendingPassiveEffectsExpirationTime = expirationTime;
  pendingPassiveEffectsRenderPriority = renderPriorityLevel;
} else {
  // GC
  nextEffect = firstEffect;
  while (nextEffect !== null) {
    const nextNextEffect = nextEffect.nextEffect;
    nextEffect.nextEffect = null;
    nextEffect = nextNextEffect;
  }
}
// 性能优化相关
const remainingExpirationTime = root.firstPendingTime;
if (remainingExpirationTime !== NoWork) {
  if (enableSchedulerTracing) {
    // 省略
  }
} else {
  // 省略
}

// 性能优化相关
if (enableSchedulerTracing) {
  // 省略
}

// 检测无限循环的同步任务
if (remainingExpirationTime === Sync) {
  // 省略
}

// REACT_DEVTOOLS相关
onCommitRoot(finishedWork.stateNode, expirationTime);

// 在离开commitRoot函数前调用，触发一次新的调度，确保任何附加的任务被调度
ensureRootIsScheduled(root);

// 处理未捕获错误
if (hasUncaughtError) {
  // 省略
}

// 处理老版本遗留的边界问题
if ((executionContext & LegacyUnbatchedContext) !== NoContext) {
  // 省略
}

// 执行同步任务，这样同步任务不需要等到下次事件循环再执行
// 比如在 componentDidMount 或 useLayoutEffect 中执行“状态改变”创建的更新会在这里被同步执行
flushSyncCallbackQueue();
return null;
```

## 总结

`layout阶段`会遍历`effectList`，依次执行`commitLayoutEffects`。该方法的主要工作是，根据`effectTag`调用不同的处理函数处理`Fiber`并更新`fiber.ref`。
