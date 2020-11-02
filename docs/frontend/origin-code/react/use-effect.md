---
title: "useEffect"
date: "2020-10-27"
---

在[commit阶段概览](./before-mutation.html#before-mutation概览)中介绍了`useEffect`的工作流程。

其中提到：在`flushPassiveEffects`方法内部会从全局变量`rootWithPendingPassiveEffects`获取`effectList`。那么就从该方法开始，一探`useEffect`的工作原理。

## flushPassiveEffectsImpl

`flushPassiveEffects`内部会设置`优先级`，并执行`flushPassiveEffectsImpl`。源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L2171)。

`flushPassiveEffectsImpl`方法主要做了三件事：

- 阶段一：调用该`useEffect`在上一次`render`后的销毁函数；
- 阶段二：调用该`useEffect`在本次`render`时的回调函数；
- 如果存在同步任务，不需要等待下次事件循环的宏任务，提前执行即可。

在`v16`中第一步是同步执行的，在[官方博客](https://zh-hans.reactjs.org/blog/2020/08/10/react-v17-rc.html#effect-cleanup-timing)中提到：

> 当组件被卸载时，副作用清理函数同步运行。我们发现，对于大型应用程序来说，这不是理想选择，因为同步会减缓屏幕的过渡（例如，切换标签）。

基于这个原因，在`v17.0.0`中，`useEffect`的这两个阶段会在页面渲染后（`layout`阶段后）异步执行（事实上，`v16.13.1`中已经是异步执行了）。

## 阶段一：销毁函数的执行

`useEffect`的执行

- 需要保证所有组件`useEffect`的`销毁函数`必须都执行完后才能执行任意一个组件的`useEffect`的回调函数。
- 这是因为多个组件间可能共用同一个`ref`。如果不是按照“全部销毁”再“全部执行”的顺序，那么在某个组件`useEffect`的销毁函数中修改的`ref.current`可能影响另一个组件`useEffect`的回调函数中的同一个`ref`的`current`属性。
- 在`useLayoutEffect`中也有同样的问题，所以他们都遵循“全部销毁”再“全部执行”的顺序。

> 这部分逻辑是在执行`commitPassiveHookEffects`时，源码请看[这里](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberCommitWork.js#L433).

在该阶段，会遍历并执行所有`useEffect`的销毁函数。

```js
```
