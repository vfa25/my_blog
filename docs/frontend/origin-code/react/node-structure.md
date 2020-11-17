---
title: "React中的数据结构"
date: "2020-08-05"
sidebarDepth: 3
---

## FiberRoot

```js
// Exported FiberRoot type includes all properties,
// To avoid requiring potentially error-prone :any casts throughout the project.
// Profiling properties are only safe to access in profiling builds (when enableSchedulerTracing is true).
// The types are defined separately within this file to ensure they stay in sync.
// (We don't have to use an inline :any cast when enableSchedulerTracing is disabled.)
export type FiberRoot = {
  ...BaseFiberRootProperties,
  ...ProfilingOnlyFiberRootProperties,
  ...SuspenseCallbackOnlyFiberRootProperties,
  ...
};
type BaseFiberRootProperties = {|
  // 可选值如下：export type RootTag = 0 | 1 | 2;
  // const LegacyRoot = 0; const BlockingRoot = 1; const ConcurrentRoot = 2;
  // The type of root (legacy, batched, concurrent, etc.)
  tag: RootTag,
  
  // 应用挂载的DOM节点，render方法的第二个参数
  // Any additional information from the host associated with this root.
  containerInfo: any,
  // 仅持久更新，即不支持增量更新的平台，react-dom不会用到
  // Used only by persistent updates.
  pendingChildren: any,
  // 树结构下、当前应用对应的Fiber对象，即Root Fiber
  // The currently active root fiber. This is the mutable root of the tree.
  current: Fiber,

  pingCache:
    | WeakMap<Thenable, Set<ExpirationTime>>
    | Map<Thenable, Set<ExpirationTime>>
    | null,

  finishedExpirationTime: ExpirationTime,
  // 已经完成的任务的FiberRoot对象，如果只有一个Root，那将恒为这个Root的Fiber，或者是null
  // 在commit阶段只会处理这个值对应的业务
  // A finished work-in-progress HostRoot that's ready to be committed.
  finishedWork: Fiber | null,
  // 当任务被挂起时通过setTimeout设置的返回内容，用来下一次如果有新的任务挂起时清理还没触发的timeout
  // Timeout handle returned by setTimeout. Used to cancel a pending timeout, if
  // it's superseded by a new one.
  timeoutHandle: TimeoutHandle | NoTimeout,
  // 顶层context对象，只有主动调用 renderSubtreeIntoContainer 时才会有用
  // Top context object, used by renderSubtreeIntoContainer
  context: Object | null,
  pendingContext: Object | null,
  // 用于确定第一次渲染的时候是否需要融合（SSR）
  // Determines if we should attempt to hydrate on the initial mount
  +hydrate: boolean,
  // Node returned by Scheduler.scheduleCallback
  callbackNode: *,
  // Expiration of the callback associated with this root
  callbackExpirationTime: ExpirationTime,
  // Priority of the callback associated with this root
  callbackPriority: ReactPriorityLevel,
  // 以下优先级用于区分
  // 1. 没有提交(committed)的任务
  // 2. 没有提交的挂起任务
  // 3. 没有提交的可能被挂起的任务

  // 最早的pending优先级（所有任务进来一开始都是这个状态）
  // The earliest pending expiration time that exists in the tree
  firstPendingTime: ExpirationTime,
  // 最早和最晚的 在提交的时候被 挂起（suspended） 的任务
  // The earliest suspended expiration time that exists in the tree
  firstSuspendedTime: ExpirationTime,
  // The latest suspended expiration time that exists in the tree
  lastSuspendedTime: ExpirationTime,
  // The next known expiration time after the suspended range
  nextKnownPendingLevel: ExpirationTime,
  // 最晚的通过一个Promise被resolve并且可以重新尝试的优先级
  // The latest time at which a suspended component pinged the root to
  // render again
  lastPingedTime: ExpirationTime,
  lastExpiredTime: ExpirationTime,
|};

// 开发环境 React DevTools Profiler plugin相关
type ProfilingOnlyFiberRootProperties = {|
  interactionThreadID: number,
  memoizedInteractions: Set<Interaction>,
  pendingInteractionMap: PendingInteractionMap,
|};

// The follow fields are only used by enableSuspenseCallback for hydration.
type SuspenseCallbackOnlyFiberRootProperties = {|
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
|};
```

## Fiber

- 每一个`ReactElement`都会对应一个`Fiber`对象。
- 记录节点的各种状态（这也是`hooks`的基础。因为状态记录在`fiber`上，并在更新节点后再行更新`class component`对象；而`functional component`尽管没有`this`，应用也有能力记录状态）。
- 借助树结构的性质：串联整个应用。

```js
// Fiber对应组件的处理态，且前者非唯一
// A Fiber is work on a Component that needs to be done or was done. There can
// be more than one per component.
export type Fiber = {|
  // These first fields are conceptually members of an Instance. This used to
  // be split into a separate type and intersected with the other Fiber fields,
  // but until Flow fixes its intersection bugs, we've merged them into a
  // single type.

  // An Instance is shared between all versions of a component. We can easily
  // break this out into a separate object to avoid copying so much to the
  // alternate versions of the tree. We put this on a single object for now to
  // minimize the number of objects created during the initial render.

  // 标识不同的组件类型（23种）—— /packages/shared/ReactWorkTags.js
  // 定义 fiber 的类型. 它在 reconciliation 算法中用来确定需要完成的工作.
  // work 的种类取决于 React element 的类型.
  // createFiberFromTypeAndProps 函数将React element 映射到相关的 fiber 节点类型.
  // Tag identifying the type of fiber.
  tag: WorkTag,

  // ReactElement里面的key，一组子元素中的唯一标识
  // Unique identifier of this child.
  key: null | string,

  // ReactElement.type，也就是我们调用`createElement`的第一个参数
  // The value of element.type which is used to preserve the identity during
  // reconciliation of this child.
  elementType: any,

  // 相关联的 fiber 类型, 函数或是类；
  // 对于class组件, 指向构造函数；对于DOM元素则为HTML标签名
  // The resolved function/class/ associated with this fiber.
  type: any,

  // 与当前Fiber相关的本地状态
  // ClassComp的new实例、DOM组件的DOM节点、Fun Comp则为null，HostFiber则为FiberRoot
  // The local state associated with this fiber.
  stateNode: any,

  // Conceptual aliases
  // parent : Instance -> return The parent happens to be the same as the
  // return fiber since we've merged the fiber and instance.

  // Remaining fields belong to Fiber

  // 指向他在Fiber节点树中的`parent`，用来在处理完这个节点之后向上返回
  // The Fiber to return to after finishing processing this one.
  // This is effectively the parent, but there can be multiple parents (two)
  // so this is only the parent of the thing we're currently processing.
  // It is conceptually the same as the return address of a stack frame.
  return: Fiber | null,
  
  // 单链表树结构
  // Singly Linked List Tree Structure.
  // 指向自己的第一个子节点
  child: Fiber | null,
  // 指向自己的兄弟结构
  // 兄弟节点的return指向同一个父节点
  sibling: Fiber | null,
  index: number,

  // ref属性
  // The ref last used to attach this node.
  // I'll avoid adding an owner field for prod and model that as functions.
  ref:
    | null
    | (((handle: mixed) => void) & {_stringRef: ?string, ...})
    | RefObject,

  // Input is the data coming into process this fiber. Arguments. Props.
  // 新的变动带来的新的props
  pendingProps: any, // This type will be more specific once we overload the tag.
  // 上一次渲染完成之后的老的props
  memoizedProps: any, // The props used to create the output.

  // 该Fiber对应的组件产生的Update会存放在这个队列里面
  // A queue of state updates and callbacks.
  updateQueue: UpdateQueue<any> | null,

  // 上一次渲染完成时候的state
  // The state used to create the output
  memoizedState: any,

  // 一个列表，存放这个Fiber依赖的context
  // Dependencies (contexts, events) for this fiber, if it has any
  dependencies: Dependencies | null,

  // 用来描述当前Fiber和他子树的`Bitfield`
  // 并发模式表示这个子树是否默认是异步渲染的
  // Fiber被创建的时候他会继承父Fiber的mode
  // 其他的标识也可以在创建的时候被设置
  // 但是在创建之后不应该再被修改，特别是他的子Fiber创建之前
  /**
  export type TypeOfMode = number;
  export const NoMode = 0b0000;
  export const StrictMode = 0b0001;
  export const BlockingMode = 0b0010;
  export const ConcurrentMode = 0b0100;
  export const ProfileMode = 0b1000;
  */
  // Bitfield that describes properties about the fiber and its subtree. E.g.
  // the ConcurrentMode flag indicates whether the subtree should be async-by-
  // default. When a fiber is created, it inherits the mode of its
  // parent. Additional flags can be set at creation time, but after that the
  // value should remain unchanged throughout the fiber's lifetime, particularly
  // before its child fibers are created.
  mode: TypeOfMode,

  // 用来记录Side Effect，即除了更新之外的 effects
  // Effect
  effectTag: SideEffectTag,

  // 单链表用来快速查找下一个side effect
  // Singly linked list fast path to the next fiber with side-effects.
  nextEffect: Fiber | null,
  // The first and last fiber with side-effect within this subtree. This allows
  // us to reuse a slice of the linked list when we reuse the work done within
  // this fiber.
  // 子树中第一个side effect
  firstEffect: Fiber | null,
  // 子树中最后一个side effect
  lastEffect: Fiber | null,

  // 代表任务在未来的哪个时间点应该被完成
  // 不包括他的子树产生的任务
  // Represents a time in the future by which this work should be completed.
  // Does not include work found in its subtree.
  expirationTime: ExpirationTime,
  
  // 快速确定子树中是否有不在等待的变化
  // This is used to quickly determine if a subtree has no pending changes.
  childExpirationTime: ExpirationTime,

  // 当前的fiber 和 处于工作中的fiber（workInProgress），二者的alternate分别指向彼此
  // 在渲染完成之后他们会交换位置
  // This is a pooled version of a Fiber. Every fiber that gets updated will
  // eventually have a pair. There are cases when we can clean up pairs to save
  // memory if we need to.
  alternate: Fiber | null,

  // 下面是调试相关的，收集每个Fiber和子树渲染时间的

  // Time spent rendering this Fiber and its descendants for the current update.
  // This tells us how well the tree makes use of sCU for memoization.
  // It is reset to 0 each time we render and only updated when we don't bailout.
  // This field is only set when the enableProfilerTimer flag is enabled.
  actualDuration?: number,

  // If the Fiber is currently active in the "render" phase,
  // This marks the time at which the work began.
  // This field is only set when the enableProfilerTimer flag is enabled.
  actualStartTime?: number,

  // Duration of the most recent render time for this Fiber.
  // This value is not updated when we bailout for memoization purposes.
  // This field is only set when the enableProfilerTimer flag is enabled.
  selfBaseDuration?: number,

  // Sum of base times for all descendants of this Fiber.
  // This value bubbles up during the "complete" phase.
  // This field is only set when the enableProfilerTimer flag is enabled.
  treeBaseDuration?: number,

  // Conceptual aliases
  // workInProgress : Fiber ->  alternate The alternate used for reuse happens
  // to be the same as work in progress.
  // __DEV__ only
  _debugID?: number,
  _debugSource?: Source | null,
  _debugOwner?: Fiber | null,
  _debugIsCurrentlyTiming?: boolean,
  _debugNeedsRemount?: boolean,

  // Used to verify that the order of hooks does not change between renders.
  _debugHookTypes?: Array<HookType> | null,
|};
```

## react-update 和 updateQueue

### ClassComponent与HostRoot

```js
export type Update<State> = {|
  // 更新的过期时间，表示优先级。类比于需求的紧急程度
  expirationTime: ExpirationTime,
  // Suspense相关
  suspenseConfig: null | SuspenseConfig,
  /** 更新类型
   * export const UpdateState = 0;
   * export const ReplaceState = 1;
   * export const ForceUpdate = 2;
   * export const CaptureUpdate = 3; error boundary
   */
  tag: 0 | 1 | 2 | 3,
  // 更细内容，如挂载时的根组件实例、或更新时`setState`的第一个参数
  payload: any,
  // 对应的更新回调，`setState`的第二个参数
  callback: (() => mixed) | null,
  // next指针指向下一个Update，UpdateQueue是单向链表
  next: Update<State>,
  // DEV only
  priority?: ReactPriorityLevel,
|};

type SharedQueue<State> = {|pending: Update<State> | null|};

export type UpdateQueue<State> = {|
  // 本次更新前该Fiber节点的state，Update基于该state计算更新。类比于master分支
  baseState: State,
  // 本次更新前该Fiber节点已保存的Update，单向环状链表
  // 之所以在更新产生前该Fiber节点内就存在Update，
  // 是由于某些Update优先级较低，所以在上次render阶段由Update计算state时被跳过
  // 类比于执行git rebase基于的commit
  baseQueue: Update<State> | null,
  // 本次触发更新，产生的Update会保存在shared.pending中形成单向环状链表。
  // 当由Update计算state时这个环会被剪开
  // 类比于本次需要合并commit的新的feature
  shared: SharedQueue<State>,
  // 数组。保存update.callback !== null的Update
  effects: Array<Update<State>> | null,
|};
```

<!-- ### Hooks

```js
type SharedQueue<State> = {|pending: Update<State> | null|};

export type UpdateQueue<State> = {|
  // 本次更新前该Fiber节点的state，Update基于该state计算更新。类比于master分支
  baseState: State,
  // 更新基于哪个Update开始，形成的链表
  baseQueue: Update<State> | null,
  // shared.pending：本次更新的单或多个Update形成的链表
  // 其中baseQueue + shared.pending会作为本次更新需要执行的Update。
  shared: SharedQueue<State>,
  effects: Array<Update<State>> | null,
  // 第一个`side effect`
  firstEffect: Update<State> | null,
  // 最后一个`side effect`
  lastEffect: Update<State> | null,
|};
``` -->
