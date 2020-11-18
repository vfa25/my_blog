---
title: "Update"
date: "2020-11-17"
sidebarDepth: 3
---

已知，每次状态更新流程开始后，会首先会创建`Update`对象，可以将其类比于版本控制的一次commit。

## Update的分类

首先，将可以触发更新的方法所隶属的组件分类：

- ReactDOM.render —— HostRoot
- this.setState —— ClassComponent
- this.forceUpdate —— ClassComponent
- useState —— FunctionComponent
- useReducer —— FunctionComponent

可以看到，一共三种组件`HostRoot | ClassComponent | FunctionComponent`可以触发更新。

由于不同类型组件工作方式不同，所以存在两种不同结构的`Update`

- 其中`ClassComponent`与`HostRoot`共用一套`Update`结构，本章讲述；
- `FunctionComponent`单独使用一种`Update`结构，请看[Hooks一节](./hooks.html)。

## Update的结构

`ClassComponent`与`HostRoot`（为`rootFiber.tag`对应类型）共用一种`Update`结构，请看[这一节](./node-structure.html#classcomponent与hostroot)。

> `Update`由`createUpdate`方法返回，源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactUpdateQueue.js#L184)。

## Update与Fiber的联系

`Update`存在一个连接其他`Update`形成链表的字段`next`。

根据[双缓存机制一节介绍](./fiber-architecture.html#双缓存)，`Fiber节点`组成`Fiber树`，页面中最多同时存在两棵`Fiber树`：

- 代表当前页面状态的`current Fiber树`；
- 代表正在`render阶段`的`workInProgress Fiber树`。

类似`Fiber节点`组成`Fiber树`，`Fiber节点`上的多个`Update`会形成环形链表并赋值给`fiber.updateQueue`。

:::warning 一个Fiber节点存在多个Update的情况

```js
onClick() {
  this.setState({
    a: 1
  })
  this.setState({
    b: 2
  })
}
```

在一个`ClassComponent`中触发`this.onClick`方法，方法内部调用了两次`this.setState`，将在该`fiber`中产生两个`Update`。
:::

`Fiber节点`最多同时存在两个`updateQueue`：

- `current fiber`保存的`updateQueue`（即`current updateQueue`）；
- `workInProgress fiber`保存的`updateQueue`（即`workInProgress updateQueue`）。

在`commit阶段`完成页面渲染后，`workInProgress Fiber树`变为`current Fiber树`，`workInProgress Fiber树`内`Fiber节点`的`updateQueue`就变成`current updateQueue`。

## UpdateQueue的结构

`UpdateQueue`有三种类型，其中针对`HostComponent`，在[completeWork一节](./complete-work.html#update时)有介绍。

剩余的两种类型分别与`Update`的两种类型对应。

`ClassComponent`与`HostRoot`使用的`UpdateQueue`结构请看[这一节](./node-structure.html#classcomponent与hostroot)。

> `UpdateQueue`由`initializeUpdateQueue`方法返回，源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactUpdateQueue.js#L154)。

## updateQueue在render阶段工作流程

> `render阶段`的`Update`操作由`processUpdateQueue`完成，源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactUpdateQueue.js#L335)。

下文对`updateQueue.baseQueue`和`updateQueue.shared.pending`两个单向环形链表的工作流程做下介绍。

1. 两个环形链表的merge操作

    假设有一个`fiber`刚经历`commit阶段`完成渲染。

    该`fiber`上有两个由于优先级过低所以在上次的`render阶段`并没有处理的`Update`。他们会成为下次更新的`baseUpdate`。姑且称其为`UpdateOldFirst`和`UpdateOldLast`。

    ```js
    fiber.updateQueue.baseQueue === UpdateOldLast
    UpdateOldLast.next === UpdateOldFirst
    UpdateOldFirst.next === UpdateOldLast
    // 即如下图所示，其中 --> 表示 next 指向
    fiber.updateQueue.baseQueue: UpdateOldLast --> UpdateOldFirst
                                     ^                  |
                                     |__________________|
    ```

    现在在`fiber`上触发两次状态更新，这会产生两个新的`Update`。姑且称其为`UpdateNewFirst`和`UpdateNewLast`。

    ```js
    fiber.updateQueue.shared.pending === UpdateNewLast
    UpdateNewLast.next === UpdateNewFirst
    UpdateNewFirst.next === UpdateNewLast
    // 即如下图所示，其中 --> 表示 next 指向
    fiber.updateQueue.shared.pending: UpdateNewLast --> UpdateNewFirst
                                          ^                  |
                                          |__________________|
    ```

    更新调度完成后进入`render阶段`。

    此时需进行两个环形链表的merge：

    ```js
    fiber.updateQueue.shared.pending: UpdateNewLast --> UpdateOldFirst --> UpdateOldLast -->  UpdateNewFirst
                                            ^                                                      |
                                            |______________________________________________________|
    ```

    这样，只需要取`fiber.updateQueue.shared.pending.next`，即能拿到结点`UpdateOldFirst`，类似于**带头链表**。

2. 处理新的环形链表时，终止条件：`update === null || update === first ?`，其中`update = update.next`。
