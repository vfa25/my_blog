---
title: "Fiber Scheduler"
sidebarDepth: 3
date: "2020-9-1"
---

> 本章基于react v16.13.1；并忽略断言、DEV环境代码，仅保留核心逻辑。

## 算法概览

React 执行 work 的时候分两个阶段: render 和 commit.

在第一个 render 阶段, React 将更新应用于通过 setState 和 React.render 调度的组件, 指出在 UI 上需要更新什么. 第一次初始化渲染, React 会通过 render 方法为每一个元素都创建一个新的 fiber.在随后的更新中, 已存在的 fiber 会被重用和更新. 这个阶段会构建一个被 side-effects 标记的 fiber 节点树. effects 描述了在随后的 commit 阶段需要完成的工作.这个阶段带有 effects 的节点都会被应用到它们的实例上, 然后遍历 effects 链表执行 DOM 更新并在界面上呈现.

重要的一点是, 渲染阶段的 work 可以异步执行.React 根据可用时间处理一个或多个 fiber 节点, 当某些重要的事件发生时, 就停下来处理这些事件, 处理完成后再回来继续. 有时候它会丢弃已经完成的工作, 并从顶部重新开始.因为在此阶段对用户是不可见的, 所以才使得暂停才变成可能. 随后的 commit 阶段是同步的, 它会产生用户可见的变化, 例如 DOM 的修改. 这就是 React 需要一次性完成它们的原因.

<!-- - 目的
  - 使得每一帧里，React渲染不大于一个特定值，且后者不大于空闲时间。浏览器每一帧做了什么工作，可参考👉[事件循环和任务队列-空闲时间](../../base/browser/04render-process.html#chromium是如何保证不掉帧或跳帧的)。
- 核心功能
  - 维护时间片
  - 模拟requestIdleCallback
  - 调度列表和超时判断 -->

## Render

### scheduleWork

`reconciliation`算法总是使用`renderRoot`方法从最顶端的`HostRoot`节点开始。

<details>
<summary>scheduleWork函数作为调度入口</summary>

```js
// /packages/react-reconciler/src/ReactFiberWorkLoop.js
export const scheduleWork = scheduleUpdateOnFiber;
export function scheduleUpdateOnFiber(
  fiber: Fiber,
  expirationTime: ExpirationTime,
) {
  // 找到HostRoot，并且更新源fiber的所有祖先fiber的expirationTime，如果后者优先级小于前者
  const root = markUpdateTimeFromFiberToRoot(fiber, expirationTime);
  // 断言HostRoot必然存在
  if (root === null) {
    return;
  }
  const priorityLevel = getCurrentPriorityLevel();

  if (expirationTime === Sync) {
    // 在入口的unbatchedUpdates函数里，把executionContext赋值为LegacyUnbatchedContext(0b001000)，故命中判断
    if (
      (executionContext & LegacyUnbatchedContext) !== NoContext &&
      (executionContext & (RenderContext | CommitContext)) === NoContext
    ) {
      schedulePendingInteractions(root, expirationTime);
      performSyncWorkOnRoot(root);
    } else {
      ensureRootIsScheduled(root);
      schedulePendingInteractions(root, expirationTime);
      if (executionContext === NoContext) {
        flushSyncCallbackQueue();
      }
    }
  } else {
    ensureRootIsScheduled(root);
    schedulePendingInteractions(root, expirationTime);
  }
}

export const HostRoot = 3;
function markUpdateTimeFromFiberToRoot(fiber, expirationTime) {
  // 更新源fiber的expirationTime；已知优先级越小，expirationTime越小
  if (fiber.expirationTime < expirationTime) {
    fiber.expirationTime = expirationTime;
  }
  let alternate = fiber.alternate;
  if (alternate !== null && alternate.expirationTime < expirationTime) {
    alternate.expirationTime = expirationTime;
  }
  let node = fiber.return;
  let root = null;
  // 有且仅有FiberRoot的 fiber.return === null 且 fiber.tag === HostRoot
  if (node === null && fiber.tag === HostRoot) {
    root = fiber.stateNode;
  } else {
    // 已知fiber.return即父fiber
    while (node !== null) {
      alternate = node.alternate;
      // node.childExpirationTime即 父fiber的子树里 优先级最高的任务
      if (node.childExpirationTime < expirationTime) {
        node.childExpirationTime = expirationTime;
        if (
          alternate !== null &&
          alternate.childExpirationTime < expirationTime
        ) {
          alternate.childExpirationTime = expirationTime;
        }
      } else if (
        alternate !== null &&
        alternate.childExpirationTime < expirationTime
      ) {
        alternate.childExpirationTime = expirationTime;
      }
      // while直到找到FiberRoot节点
      if (node.return === null && node.tag === HostRoot) {
        root = node.stateNode;
        break;
      }
      node = node.return;
    }
  }
  return root;
}
```

</details>

### Current & work in progress trees

- 在第一次渲染时，React会得到一个fiber树，它映射着程序的状态，并渲染到界面上。这个树被称为**current**。
- 当React开始更新，会重新构建一棵树，称为**workInProgress**，所有的状态更新都会新被应用到这棵树上，完成之后刷新到界面上。
- 所有的work都是在**workInProgress**上进行的，当 React 开始遍历 current 树，会对每个 fiber 节点创建一个`备份(alternate)`来构成`workInProgress`树。当所有的更新和相关的work完成, 这个备份树就会被刷新到界面上，`workInProgress`树就会变为`current`树。原理和显示器与显卡的前缓冲区与后缓冲区工作原理类似，`workInProgress`是用户不可见的“草稿”，待处理完成后将它的更改再刷新到界面上。

> 初始化挂载时，创建`workInProgress`的调用栈为：
>> `performSyncWorkOnRoot(root);`->
>>> `prepareFreshStack(root, expirationTime);`->
>>>> `createWorkInProgress(root.current, null, expirationTime)`。

### work loop 的主要步骤

所有的fiber节点都会在`workLoop`方法中被处理, 下面是代码的同步实现部分:

```js
function workLoopSync() {
  // Already timed out, so perform work without checking if we need to yield.
  while (workInProgress !== null) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}
```

上述代码中，React在`workLoopSync()`里面构建树，如从`<App>`节点开始，向子组件节点递归，并在子组件中向兄弟节点迭代。`workInprogress`保存了指向下一个拥有要做的任务的fiber节点的引用。

```js
function performUnitOfWork(unitOfWork: Fiber): Fiber | null {
  // The current, flushed, state of this fiber is the alternate. Ideally
  // nothing should rely on this, but relying on it here means that we don't
  // need an additional field on the work in progress.
  const current = unitOfWork.alternate;

  startWorkTimer(unitOfWork);
  setCurrentDebugFiberInDEV(unitOfWork);

  let next;
  if (enableProfilerTimer && (unitOfWork.mode & ProfileMode) !== NoMode) {
    startProfilerTimer(unitOfWork);
    next = beginWork(current, unitOfWork, renderExpirationTime);
    stopProfilerTimerIfRunningAndRecordDelta(unitOfWork, true);
  } else {
    next = beginWork(current, unitOfWork, renderExpirationTime);
  }

  resetCurrentDebugFiberInDEV();
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    // If this doesn't spawn new work, complete the current work.
    next = completeUnitOfWork(unitOfWork);
  }

  ReactCurrentOwner.current = null;
  return next;
}
```

<!-- 随后，跳过已经处理过的节点直到带有未完成`work`的节点。例如，当在组件树深处调用`setState`方法的时候，React会从顶部开始快速的跳过所有父级节点直接到调用`setState`方法的节点. -->

<!-- - if (expirationTime === Sync) {
  - 初始化mount（if`executionContext==LegacyUnbatchedContext`并非渲染态），此时进入同步逻辑，即并不在空闲时间处理更新。这儿的依据是由于[事件循环和任务队列-动态调度策略](../../base/browser/06event-loop.html#chromium是如何解决队头阻塞的)。
  - else逻辑
    - `if(executionContext === NoContext)`判断，是兼容业务逻辑异步（包括但不限于fetch或setTimeout）修改state的场景。每次`setState`都将执行`flushSyncCallbackQueue`修改DOM，故必要时请使用`unstable_batchedUpdates`（react-dom包）包裹业务逻辑。
- else，进入异步调度逻辑，底层模拟了`window.requestIdleCallback`。

> 引申：setState的批量更新状态问题。首先该API的调用自然是同步逻辑，但是状态更新需要结合执行环境的上下文来判断，并非只有批量更新逻辑一种。


```js
// Use this function to schedule a task for a root. There's only one task per
// root; if a task was already scheduled, we'll check to make sure the
// expiration time of the existing task is the same as the expiration time of
// the next level that the root has work on. This function is called on every
// update, and right before exiting a task.
function ensureRootIsScheduled(root: FiberRoot) {
  const lastExpiredTime = root.lastExpiredTime;
  if (lastExpiredTime !== NoWork) {
    // Special case: Expired work should flush synchronously.
    root.callbackExpirationTime = Sync;
    root.callbackPriority = ImmediatePriority;
    root.callbackNode = scheduleSyncCallback(
      performSyncWorkOnRoot.bind(null, root),
    );
    return;
  }

  const expirationTime = getNextRootExpirationTimeToWorkOn(root);
  const existingCallbackNode = root.callbackNode;
  if (expirationTime === NoWork) {
    // There's nothing to work on.
    if (existingCallbackNode !== null) {
      root.callbackNode = null;
      root.callbackExpirationTime = NoWork;
      root.callbackPriority = NoPriority;
    }
    return;
  }

  // TODO: If this is an update, we already read the current time. Pass the
  // time as an argument.
  const currentTime = requestCurrentTimeForUpdate();
  const priorityLevel = inferPriorityFromExpirationTime(
    currentTime,
    expirationTime,
  );

  // If there's an existing render task, confirm it has the correct priority and
  // expiration time. Otherwise, we'll cancel it and schedule a new one.
  // 若存在渲染任务，需确定优先级和expiration time，否则取消并调度一个新的任务
  if (existingCallbackNode !== null) {
    const existingCallbackPriority = root.callbackPriority;
    const existingCallbackExpirationTime = root.callbackExpirationTime;
    if (
      // Callback must have the exact same expiration time.
      existingCallbackExpirationTime === expirationTime &&
      // Callback must have greater or equal priority.
      existingCallbackPriority >= priorityLevel
    ) {
      // Existing callback is sufficient.
      return;
    }
    // Need to schedule a new task.
    // TODO: Instead of scheduling a new task, we should be able to change the
    // priority of the existing one.
    cancelCallback(existingCallbackNode);
  }

  root.callbackExpirationTime = expirationTime;
  root.callbackPriority = priorityLevel;

  let callbackNode;
  if (expirationTime === Sync) {
    // Sync React callbacks are scheduled on a special internal queue
    callbackNode = scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
  } else if (disableSchedulerTimeoutBasedOnReactExpirationTime) {
    callbackNode = scheduleCallback(
      priorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
    );
  } else {
    // 重点来了，执行并发任务
    callbackNode = scheduleCallback(
      priorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
      // Compute a task timeout based on the expiration time. This also affects
      // ordering because tasks are processed in timeout order.
      {timeout: expirationTimeToMs(expirationTime) - now()},
    );
  }

  // 备份callbackNode属性，以便取消，作为方法cancelCallback的实参
  root.callbackNode = callbackNode;
}
```

```js
function unstable_scheduleCallback(priorityLevel, callback, options) {
  // getCurrentTime = () => performance.now();
  var currentTime = getCurrentTime();

  var startTime;
  var timeout;
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay;
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
    timeout =
      typeof options.timeout === 'number'
        ? options.timeout
        : timeoutForPriorityLevel(priorityLevel);
  } else {
    timeout = timeoutForPriorityLevel(priorityLevel);
    startTime = currentTime;
  }

  var expirationTime = startTime + timeout;

  var newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };
  if (enableProfiling) {
    newTask.isQueued = false;
  }

  if (startTime > currentTime) {
    // This is a delayed task.
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // All tasks are delayed, and this is the task with the earliest delay.
      if (isHostTimeoutScheduled) {
        // Cancel an existing timeout.
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      // Schedule a timeout.
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    newTask.sortIndex = expirationTime;
    // 维护了一个二叉小顶堆
    push(taskQueue, newTask);
    if (enableProfiling) {
      markTaskStart(newTask, currentTime);
      newTask.isQueued = true;
    }
    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}

type Heap = Array<Node>;
type Node = {|
  id: number,
  sortIndex: number,
|};
``` -->
