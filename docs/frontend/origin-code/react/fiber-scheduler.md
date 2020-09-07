---
title: "Fiber Scheduler"
date: "2020-9-1"
---

## scheduleWork

- if (expirationTime === Sync) {
  - 初始化mount（if`executionContext==LegacyUnbatchedContext`并非渲染态），此时进入同步逻辑，即并不在空闲时间处理更新。这儿的依据是由于[事件循环和任务队列-动态调度策略](../../base/browser/06event-loop.html#chromium是如何解决队头阻塞的)。
  - else逻辑
    - `if(executionContext === NoContext)`判断，是兼容业务逻辑异步（包括但不限于fetch或setTimeout）修改state的场景。每次`setState`都将执行`flushSyncCallbackQueue`修改DOM，故必要时请使用`unstable_batchedUpdates`（react-dom包）包裹业务逻辑。
- else，进入异步调度逻辑，底层使用了`window.requestIdleCallback`。这儿的依据是由于[事件循环和任务队列-空闲时间](../../base/browser/06event-loop.html#chromium是如何保证不卡顿或丢帧的)。

> 引申：setState的批量更新状态问题。首先该API的调用自然是同步逻辑，但是状态更新需要结合执行环境的上下文来判断，并非只有批量更新逻辑一种。

```js
// /packages/react-reconciler/src/ReactFiberWorkLoop.js
export const scheduleWork = scheduleUpdateOnFiber;
export function scheduleUpdateOnFiber(
  fiber: Fiber,
  expirationTime: ExpirationTime,
) {
  // 断言防止componentWillUpdate钩子里反复setState
  checkForNestedUpdates();
  // 断言防止无效更新，在DEV环境
  warnAboutInvalidUpdatesOnClassComponentsInDEV(fiber);

  // 找到FiberRoot，并且更新源fiber的所有祖先fiber的expirationTime，如果后者优先级小于前者
  const root = markUpdateTimeFromFiberToRoot(fiber, expirationTime);
  // 断言FiberRoot必然存在
  if (root === null) {
    warnAboutUpdateOnUnmountedFiberInDEV(fiber);
    return;
  }

  // DEV环境记录interruption。用于devtools-performance tracking
  checkForInterruption(fiber, expirationTime);
  // DEV环境记录ScheduleUpdate
  recordScheduleUpdate();

  // TODO: computeExpirationForFiber also reads the priority. Pass the
  // priority as an argument to that function and this one.
  const priorityLevel = getCurrentPriorityLevel();

  if (expirationTime === Sync) {
    // 在入口的unbatchedUpdates函数里，把executionContext赋值为LegacyUnbatchedContext(0b001000)，故命中判断
    if (
      // Check if we're inside unbatchedUpdates
      (executionContext & LegacyUnbatchedContext) !== NoContext &&
      // Check if we're not already rendering
      (executionContext & (RenderContext | CommitContext)) === NoContext
    ) {
      // Register pending interactions on the root to avoid losing traced interaction data.
      schedulePendingInteractions(root, expirationTime);

      // This is a legacy edge case. The initial mount of a ReactDOM.render-ed
      // root inside of batchedUpdates should be synchronous, but layout updates
      // should be deferred until the end of the batch.
      performSyncWorkOnRoot(root);
    } else {
      ensureRootIsScheduled(root);
      schedulePendingInteractions(root, expirationTime);
      if (executionContext === NoContext) {
        // Flush the synchronous work now, unless we're already working or inside
        // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
        // scheduleCallbackForFiber to preserve the ability to schedule a callback
        // without immediately flushing it. We only do this for user-initiated
        // updates, to preserve historical behavior of legacy mode.
        flushSyncCallbackQueue();
      }
    }
  } else {
    ensureRootIsScheduled(root);
    schedulePendingInteractions(root, expirationTime);
  }

  if (
    (executionContext & DiscreteEventContext) !== NoContext &&
    // Only updates at user-blocking priority or greater are considered
    // discrete, even inside a discrete event.
    (priorityLevel === UserBlockingPriority ||
      priorityLevel === ImmediatePriority)
  ) {
    // This is the result of a discrete event. Track the lowest priority
    // discrete update per root so we can flush them early, if needed.
    if (rootsWithPendingDiscreteUpdates === null) {
      rootsWithPendingDiscreteUpdates = new Map([[root, expirationTime]]);
    } else {
      const lastDiscreteTime = rootsWithPendingDiscreteUpdates.get(root);
      if (lastDiscreteTime === undefined || lastDiscreteTime > expirationTime) {
        rootsWithPendingDiscreteUpdates.set(root, expirationTime);
      }
    }
  }
}

export const HostRoot = 3; // Root of a host tree. Could be nested inside another node.
// This is split into a separate function so we can mark a fiber with pending
// work without treating it as a typical update that originates from an event;
// e.g. retrying a Suspense boundary isn't an update, but it does schedule work
// on a fiber.
function markUpdateTimeFromFiberToRoot(fiber, expirationTime) {
  // Update the source fiber's expiration time
  // 更新源fiber的expirationTime；已知优先级越小，expirationTime越小
  if (fiber.expirationTime < expirationTime) {
    fiber.expirationTime = expirationTime;
  }
  let alternate = fiber.alternate;
  if (alternate !== null && alternate.expirationTime < expirationTime) {
    alternate.expirationTime = expirationTime;
  }
  // Walk the parent path to the root and update the child expiration time.
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

  if (root !== null) {
    if (workInProgressRoot === root) {
      // Received an update to a tree that's in the middle of rendering. Mark
      // that's unprocessed work on this root.
      markUnprocessedUpdateTime(expirationTime);

      if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
        // The root already suspended with a delay, which means this render
        // definitely won't finish. Since we have a new update, let's mark it as
        // suspended now, right before marking the incoming update. This has the
        // effect of interrupting the current render and switching to the update.
        // TODO: This happens to work when receiving an update during the render
        // phase, because of the trick inside computeExpirationForFiber to
        // subtract 1 from `renderExpirationTime` to move it into a
        // separate bucket. But we should probably model it with an exception,
        // using the same mechanism we use to force hydration of a subtree.
        // TODO: This does not account for low pri updates that were already
        // scheduled before the root started rendering. Need to track the next
        // pending expiration time (perhaps by backtracking the return path) and
        // then trigger a restart in the `renderDidSuspendDelayIfPossible` path.
        markRootSuspendedAtTime(root, renderExpirationTime);
      }
    }
    // Mark that the root has a pending update.
    markRootUpdatedAtTime(root, expirationTime);
  }

  return root;
}
```
