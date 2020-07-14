---
title: "更新流程"
date: "2020-06-01"
---

> 本章基于react v16.13.1；并舍去断言、DEV环境代码，仅保留核心逻辑。

## ReactDom.render

> 作为初次将创建节点的API。流程为：创建`ReactRoot`，其承建`FiberRoot`（初始化了`Fiber`对象），并在`FiberRoot root`上创建了`expirationTime`，同时创建更新对象`update`，以之放到`root`节点后，进入更新流程。即创建更新、然后调度更新。

1. 第一步：创建ReactRoot的入口，并调度更新。

那么什么是ReactRoot实例？顾名思义，是react应用的root实例，类似军师，通过调度自身的方法、属性来操作整个应用。

API入口在路径`/packages/react-dom/src/client/ReactDOM.js`下。

```js
// /packages/react-dom/src/client/ReactDOMLegacy.js
export function render(
  element: React$Element<any>,
  container: DOMContainer,
  callback: ?Function,
) {
  return legacyRenderSubtreeIntoContainer(
    null,
    element,
    container,
    false,
    callback,
  );
}
```

通过`container._reactRootContainer`标记是否根节点，首次渲染将命中`if(!root)逻辑`，
调用`legacyCreateRootFromDOMContainer`方法、以创建`ReactRoot`。

```js
// /packages/react-dom/src/client/ReactDOMLegacy.js
function legacyRenderSubtreeIntoContainer(
  parentComponent: ?React$Component<any, any>,
  children: ReactNodeList,
  container: DOMContainer,
  /**
   * forceHydrate：仅且SSR（ReactDom.hydrate）时该参数为true，
   * 用于是否调和（复用）原来已存在的的节点（即入参container），
   * SSR的本质就是Node服务端直接返回完整的DOM结构，到浏览器端仅做事件绑定。
   */
  forceHydrate: boolean,
  callback: ?Function,
) {
  // TODO: Without `any` type, Flow says "Property cannot be accessed on any
  // member of intersection type." Whyyyyyy.
  let root: RootType = (container._reactRootContainer: any);
  let fiberRoot;
  if (!root) {
    // Initial mount
    // 初始化挂载，获取到ReactRoot root
    //（其实此时的返回值root是个空对象，FiberRoot实例挂载属性root._internalRoot上）
    // legacyCreateRootFromDOMContainer该函数贴在下文
    root = container._reactRootContainer = legacyCreateRootFromDOMContainer(
      container,
      forceHydrate,
    );
    fiberRoot = root._internalRoot;
    // 判断是否有回调函数callback，有则调用
    if (typeof callback === 'function') {
      const originalCallback = callback;
      callback = function() {
        const instance = getPublicRootInstance(fiberRoot);
        originalCallback.call(instance);
      };
    }
    // Initial mount should not be batched.
    // 批量更新
    unbatchedUpdates(() => {
      updateContainer(children, fiberRoot, parentComponent, callback);
    });
  } else {
    fiberRoot = root._internalRoot;
    if (typeof callback === 'function') {
      const originalCallback = callback;
      callback = function() {
        const instance = getPublicRootInstance(fiberRoot);
        originalCallback.call(instance);
      };
    }
    // Update
    updateContainer(children, fiberRoot, parentComponent, callback);
  }
  return getPublicRootInstance(fiberRoot);
}
```

**创建FiberRoot节点**：在上述代码块中，`legacyCreateRootFromDOMContainer`方法用于返回一个对象`ReactRoot root`，该对象的属性`_internalRoot`为`FiberRoot`实例。

- 重点来了——那么什么是`FiberRoot`?
  - 整个应用的起点
  - 包含应用挂载的目标DOM节点：即下文中`react-reconciler/inline.dom`的`createContainer`创建方法的第一参数`containerInfo: Container`
  - 记录整个应用更新过程的各种信息

<details>
<summary>平台方法 client.ReactDOM 的 legacyCreateRootFromDOMContainer 方法——函数体里调用如下函数</summary>

- 函数体内的`shouldHydrateDueToLegacyHeuristic`方法，用以判断是否应`shouldHydrate`
- 非`shouldHydrate`时，循环清空root节点下的所有子节点
- 调用`createLegacyRoot`方法

```js
// /packages/react-dom/src/client/ReactDOMLegacy.js
function legacyCreateRootFromDOMContainer(
  container: DOMContainer,
  forceHydrate: boolean,
): RootType {
  // shouldHydrate这里认为是false，本节暂不考虑SSR
  const shouldHydrate =
    forceHydrate || shouldHydrateDueToLegacyHeuristic(container);
  // First clear any existing content.
  // 命中if逻辑，循环清空root节点下的所有子节点
  if (!shouldHydrate) {
    let warned = false;
    let rootSibling;
    while ((rootSibling = container.lastChild)) {
      container.removeChild(rootSibling);
    }
  }
  // 返回 createLegacyRoot 的调用的返回值
  return createLegacyRoot(
    container,
    shouldHydrate
      ? {
          hydrate: true,
        }
      : undefined,
  );
}

// 以下两函数为辅助函数
export const ROOT_ATTRIBUTE_NAME = 'data-reactroot';
function shouldHydrateDueToLegacyHeuristic(container) {
  const rootElement = getReactRootElementInContainer(container);
  return !!(
    rootElement &&
    rootElement.nodeType === ELEMENT_NODE &&
    rootElement.hasAttribute(ROOT_ATTRIBUTE_NAME)
    // SSR时，会为root节点的firstChild、加上'data-reactroot'属性，以此标识本应用是有SSR
  );
}

export const DOCUMENT_NODE = 9; // 即window.document.nodeType
function getReactRootElementInContainer(container: any) {
  if (!container) {
    return null;
  }
  if (container.nodeType === DOCUMENT_NODE) {
    return container.documentElement;
  } else {
    return container.firstChild;
  }
}
```

在下方代码块中，`createLegacyRoot`方法首先`new ReactDOMBlockingRoot（ReactRoot）`实例，该实例的`_internalRoot`属性，则最终将调用依赖模块`react-reconciler/inline.dom`的`createContainer`方法，进行实际创建`FiberRoot`实例。

```js
// /packages/react-dom/src/client/ReactDOMRoot.js
export const LegacyRoot = 0;
export function createLegacyRoot(
  container: DOMContainer,
  options?: RootOptions,
): RootType {
  // 实参即 container=container、LegacyRoot=0、options=undefined
  return new ReactDOMBlockingRoot(container, LegacyRoot, options);
}

function ReactDOMBlockingRoot(
  container: DOMContainer,
  tag: RootTag,
  options: void | RootOptions,
) {
  this._internalRoot = createRootImpl(container, tag, options);
}

import {createContainer} from 'react-reconciler/inline.dom';
function createRootImpl(
  container: DOMContainer,
  tag: RootTag,
  options: void | RootOptions,
) {
  // Tag is either LegacyRoot or Concurrent Root
  const hydrate = options != null && options.hydrate === true; // flase
  const hydrationCallbacks =
    (options != null && options.hydrationOptions) || null; // null
  // 这里调用的依赖函数createContainer，详情贴在下文
  const root = createContainer(container, tag, hydrate, hydrationCallbacks);
  markContainerAsRoot(root.current, container);
  if (hydrate && tag !== LegacyRoot) {
    const doc =
      container.nodeType === DOCUMENT_NODE
        ? container
        : container.ownerDocument;
    eagerlyTrapReplayableEvents(doc);
  }
  return root;
}
```

</details>

<details>
<summary>公共方法：react-reconciler/inline.dom 的 createContainer方法——return创建的FiberRoot实例</summary>

```js
// /packages/react-reconciler/src/ReactFiberReconciler.js
export function createContainer(
  containerInfo: Container,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
): OpaqueRoot {
  return createFiberRoot(containerInfo, tag, hydrate, hydrationCallbacks);
}
```

</details>

**创建、调度更新**：在上述代码块中，`react-reconciler/inline.dom`的`updateContainer`方法。

<details>
<summary>公共方法：react-reconciler/inline.dom 的 updateContainer方法</summary>

```js
/**
 * /packages/react-reconciler/src/ReactFiberReconciler.js
 * @param {*} element App组件实例
 * @param {*} container FiberRoot实例
 * @param {*} parentComponent null
 * @param {*} callback 回调函数
 */
export function updateContainer(
  element: ReactNodeList,
  container: OpaqueRoot,
  parentComponent: ?React$Component<any, any>,
  callback: ?Function,
): ExpirationTime {
  const current = container.current;
  const currentTime = requestCurrentTimeForUpdate();
  const suspenseConfig = requestCurrentSuspenseConfig();
  // 重点
  const expirationTime = computeExpirationForFiber(
    currentTime,
    current,
    suspenseConfig,
  );

  // client端忽略该逻辑，没有root节点上提供context的入口
  // getContextForSubtree函数也仅会返回空对象
  const context = getContextForSubtree(parentComponent);
  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  // update用于标记应用中需要更新的地点
  const update = createUpdate(expirationTime, suspenseConfig);
  // Caution: React DevTools currently depends on this property
  // being called "element".
  update.payload = {element};

  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    update.callback = callback;
  }

  enqueueUpdate(current, update);
  // 开始进行任务调度（基于任务优先级）
  scheduleWork(current, expirationTime);

  return expirationTime;
}
```

</details>

## FiberRoot

```js
/**
 * /packages/react-reconciler/src/ReactFiberRoot.js
 * @param {DOMContainer} containerInfo 应用挂载DOM节点
 * @param {RootTag} tag 常量LegacyRoot=0
 * @param {*} hydrate 是否SSR, false
 * @param {*} hydrationCallbacks SSR回调, null
 */
export function createFiberRoot(
  containerInfo: any,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
): FiberRoot {
  const root: FiberRoot = (new FiberRootNode(containerInfo, tag, hydrate): any);
  if (enableSuspenseCallback) {
    root.hydrationCallbacks = hydrationCallbacks;
  }

  // Cyclic construction. This cheats the type system right now because
  // stateNode is any.
  const uninitializedFiber = createHostRootFiber(tag);
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  initializeUpdateQueue(uninitializedFiber);

  return root;
}
```

在上述代码块中，`FiberRootNode`方法用于创建`FiberRoot`实例对象

<details>
<summary>FiberRootNode源码</summary>

```js
function FiberRootNode(containerInfo, tag, hydrate) {
  this.tag = tag;
  this.current = null;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.pingCache = null;
  this.finishedExpirationTime = NoWork;
  this.finishedWork = null;
  this.timeoutHandle = noTimeout;
  this.context = null;
  this.pendingContext = null;
  this.hydrate = hydrate;
  this.callbackNode = null;
  this.callbackPriority = NoPriority;
  this.firstPendingTime = NoWork;
  this.firstSuspendedTime = NoWork;
  this.lastSuspendedTime = NoWork;
  this.nextKnownPendingLevel = NoWork;
  this.lastPingedTime = NoWork;
  this.lastExpiredTime = NoWork;

  if (enableSchedulerTracing) {
    this.interactionThreadID = unstable_getThreadID();
    this.memoizedInteractions = new Set();
    this.pendingInteractionMap = new Map();
  }
  if (enableSuspenseCallback) {
    this.hydrationCallbacks = null;
  }
}
```

</details>

|  键名 | 值的语义 |
| ----- | ------ |
|  tag  | tag |
