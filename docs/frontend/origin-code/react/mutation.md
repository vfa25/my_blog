---
title: "mutation"
date: "2020-11-2"
sidebarDepth: 3
---

`mutation`阶段用于执行`DOM`操作。

## 概览

类似`before mutation`阶段，`mutation`阶段也是遍历`effectList`，执行函数。这里执行的是`commitMutationEffects`。

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1865)。

```js
nextEffect = firstEffect;
do {
  try {
    commitMutationEffects(root, renderPriorityLevel);
  } catch (error) {
    invariant(nextEffect !== null, 'Should be working on an effect.');
    captureCommitPhaseError(nextEffect, error);
    nextEffect = nextEffect.nextEffect;
  }
} while (nextEffect !== null);
```

## commitMutationEffects

> 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L2063)。

```js
function commitMutationEffects(root: FiberRoot, renderPriorityLevel) {
  // 遍历effectList
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;

    // 根据 ContentReset effectTag重置文字节点
    if (effectTag & ContentReset) {
      commitResetTextContent(nextEffect);
    }

    // 更新ref
    if (effectTag & Ref) {
      const current = nextEffect.alternate;
      if (current !== null) {
        commitDetachRef(current);
      }
    }

    // 根据 effectTag 分别处理
    let primaryEffectTag =
      effectTag & (Placement | Update | Deletion | Hydrating);
    switch (primaryEffectTag) {
      // 插入DOM
      case Placement: {
        commitPlacement(nextEffect);
        nextEffect.effectTag &= ~Placement;
        break;
      }
      // 插入DOM 并 更新DOM
      case PlacementAndUpdate: {
        // 插入
        commitPlacement(nextEffect);
        nextEffect.effectTag &= ~Placement;

        // 更新
        const current = nextEffect.alternate;
        commitWork(current, nextEffect);
        break;
      }
      // SSR
      case Hydrating: {
        nextEffect.effectTag &= ~Hydrating;
        break;
      }
      // SSR
      case HydratingAndUpdate: {
        nextEffect.effectTag &= ~Hydrating;

        const current = nextEffect.alternate;
        commitWork(current, nextEffect);
        break;
      }
      // 更新DOM
      case Update: {
        const current = nextEffect.alternate;
        commitWork(current, nextEffect);
        break;
      }
      // 删除DOM
      case Deletion: {
        commitDeletion(root, nextEffect, renderPriorityLevel);
        break;
      }
    }

    nextEffect = nextEffect.nextEffect;
  }
}
```

`commitMutationEffects`会遍历`effectList`，对每个`Fiber节点`执行如下三个操作：

1. 根据`ContentReset effectTag`重置文字节点；
2. 更新`ref`；
3. 根据`effectTag`分别处理，其中`effectTag`包括`(Placement | Update | Deletion | Hydrating)`。

## Placement effect

若当前`Fiber节点`含有`Placement effectTag`，则该`Fiber节点`对应的`DOM节点`需要插入到页面中。

调用`commitPlacement`方法（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L1075)），该方法分为三步：

1. 获取父级`DOM节点`。

    ```js
    function commitPlacement(finishedWork: Fiber): void {
      // 查找最近的祖先级 host nodes
      const parentFiber = getHostParentFiber(finishedWork);
      // 父级DOM节点 或 FiberRoot fiberRootNode
      const parentStateNode = parentFiber.stateNode;
      // ...省略
    }
    ```

2. 获取`Fiber节点`的一个`相邻DOM兄弟节点`，若没有，则为`null`。

    ```js
    const before = getHostSibling(finishedWork);
    ```

    :::details 值得注意的是，getHostSibling 的执行可能很耗时

    当在同一个`父Fiber节点`下依次执行多次插入操作，可能出现$O(n^2)$的最坏情况时间复杂度。

    > 源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L1029)。

    这是由于`Fiber节点`不只包括`HostComponent`，所以`Fiber树`和渲染的`DOM树`结构并不是一一对应的。要从`Fiber树`中跨层级搜索，以找到`stateNode`属性为对应`DOM节点`的目标`Fiber节点`。

    示例如下：

    ```js
    function Item() {
      return <li><li>;
    }
    function App() {
      return (
        <div>
          <Item/>
        </div>
      );
    }
    ReactDOM.render(<App/>, document.getElementById('root'));
    ```

    对应的`Fiber树`和`DOM树`结构为：

    ```js
    // Fiber树
              child      child      child       child
    rootFiber -----> App -----> div -----> Item -----> li

    // DOM树
    #root ---> div ---> li
    ```

    当在`div`的子节点`Item`前插入一个新节点`p`，即`App`变为：

    ```js
    function App() {
      return (
        <div>
          <p></p>
          <Item/>
        </div>
      );
    }
    ```

    对应的Fiber树和DOM树结构为：

    ```js
    // Fiber树
              child      child      child
    rootFiber -----> App -----> div -----> p
                                          | sibling
                                          ↓
                                          Item -----> li
    /* DOM树 */                                 child
    #root ---> div ---> p
                |
                  ---> li
    ```

    此时`DOM节点 p`的兄弟节点为`DOM节点 li`，

    而若在`Fiber树`中查找到`Fiber节点 p`对应的`Fiber节点 li`，则需要$O(n^2)$的时间复杂度。

    `fiber_li == fiber_P.sibling.child`，即`fiber p`的`兄弟fiber Item`的`子fiber li`。
    :::

3. 根据`兄弟DOM节点`（变量`before`）是否存在，为是、则调用`parentNode.insertBefore(stateNode, before)`，反之则调用`parentNode.appendChild(stateNode)`，执行`DOM`插入操作。

    ```js
    // parentStateNode是否是rootFiber
    if (isContainer) {
      insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
    } else {
      insertOrAppendPlacementNode(finishedWork, before, parent);
    }
    ```

## Update effect

若当前`Fiber节点`含有`Placement effectTag`，则该`Fiber节点`对应的`DOM节点`需要更新。

调用的方法为`commitWork`（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L1356)），该方法会根据`Fiber.tag`分别处理。

这里主要关注`FunctionComponent`和`HostComponent`。

### FunctionComponent mutation

当`fiber.tag`为`FunctionComponent`，会调用`commitHookEffectListUnmount`。源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L330)。

该方法会遍历`effectList`，执行所有`useLayoutEffect hook`（由于其`effect.tag === Layout | HasEffect`）的销毁函数（仅在`Update`时）。

所谓“销毁函数”，见如下例子：

```js
useLayoutEffect(() => {
  // ...一些副作用逻辑

  return () => {
    // ...这就是销毁函数，
  }
})
```

### HostComponent mutation

当`fiber.tag`为`HostComponent`，会调用`commitUpdate`。源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-dom/src/client/ReactDOMHostConfig.js#L390)。

最终会在`updateDOMProperties`函数（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-dom/src/client/ReactDOMComponent.js#L362)）中将`render阶段completeWork`（[这一节介绍](./complete-work.html#update时)）中为`fiber.updateQueue`赋值的对应的内容渲染在页面上。

```js
/**
 * @param {*} domElement DOM节点
 * @param {*} updatePayload fiber.updateQueue
 * @param {*} wasCustomComponentTag 是否自定义DOM，一般为false
 * @param {*} isCustomComponentTag 是否自定义DOM，一般为false
 */
function updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag) {
  for (var i = 0; i < updatePayload.length; i += 2) {
    var propKey = updatePayload[i];
    var propValue = updatePayload[i + 1];

    if (propKey === STYLE) {
      // 处理style
      setValueForStyles(domElement, propValue);
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
    // 处理DANGEROUSLY_SET_INNER_HTML
      setInnerHTML(domElement, propValue);
    } else if (propKey === CHILDREN) {
    // 处理children
      setTextContent(domElement, propValue);
    } else {
    // 处理剩余 props
      setValueForProperty(domElement, propKey, propValue, isCustomComponentTag);
    }
  }
}
```

## Deletion effect

若当前`Fiber节点`含有`Deletion effectTag`，则该`Fiber节点`对应的`DOM节点`需要从页面中删除。

调用的方法为`commitDeletion`（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L1340)），该方法会执行如下操作：

`while`循环`Fiber节点`及其`子孙Fiber节点`，

1. 当`fiber.tag`为`ClassComponent`时，调用`componentWillUnmount`生命周期钩子（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L841)）；
2. 当`fiber.tag`为`HostComponent`时，从页面移除`Fiber节点`对应的`DOM节点`（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L1253)）；
3. 解绑`ref`（源码中调用了`safelyDetachRef`方法）；
4. 调度`useEffect`的销毁函数（源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L797)）。

## 总结

`mutation阶段`会遍历`effectList`，依次执行`commitMutationEffects`。该方法的主要工作是 根据`effectTag`调用不同的处理函数处理`Fiber`。
