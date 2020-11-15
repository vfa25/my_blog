---
title: "React16架构"
date: "2020-9-13"
---

> 本系列参考自[卡颂](https://github.com/BetaSu)的[React技术揭秘](https://react.iamkasong.com/)，基于[React v16.13.1](https://github.com/facebook/react/tree/v16.13.1)。

## React源码概念入门

- 实现简版的React（包括实现Concurrent Mode）👉[原文：Build your own React](https://pomb.us/build-your-own-react/)、[GitHub](https://github.com/pomber/didact)。

## 可中断的异步更新

**异步更新的优点：响应自然。**

- 首先浏览器在渲染页面时有如下特性：

  1. `JS引擎线程`（负责执行JS脚本）与`渲染主线程`（处理“DOM、Style、Layout、Layer、Paint”）、`合成线程`（处理“分块、光栅化、合成”）互斥，即前者的执行会造成后者挂起。请看[这一节介绍](../../base/browser/05render-block.html)。
  2. 对于`用户交互事件`，如果该事件有回调，则会经过`渲染进程`的`I/O线程->合成线程->渲染主线程`，随后该回调被推入`用户交互事件队列`（注：一个事件循环有一个或多个事件队列），请看[这一节介绍](../../base/browser/06event-loop.html#事件循环和任务队列)。
  3. 每一`帧`包含工作阶段和空闲阶段，并在该帧时间结束时，操作系统会去读取显卡的`前缓冲区`，请看[这一节介绍](../../base/browser/04render-process.html#chromium是如何保证不掉帧或跳帧的)。

- 针对以上特性，提出问题

  1. 如何防止动画掉帧，或执行JS同步任务时间过长、造成输入事件卡顿？
  2. 在每次帧结束时，如何避免展示出不完全的页面？

- React是如何解决的

  1. **可中断的任务切片**。处理在浏览器每一帧的时间中，预留一些时间给JS线程，React利用这部分时间更新组件（在[源码](https://github.com/facebook/react/blob/v16.13.1/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L119)中，预留的初始时间是5ms）。当预留的时间不够用时，React将线程控制权交还给浏览器使其有时间渲染UI，React则等待下一帧时间到来继续被中断的工作。这样在每一帧，都有足够时间给`渲染进程`做UI绘制。

      ::: details 同步更新 vs 异步更新 Demo
      当有个更新很耗时的大列表，来看看同步更新和异步更新时，输入框的响应速度。Demo出处React官网介绍请看[这里](https://zh-hans.reactjs.org/docs/concurrent-mode-patterns.html#deferring-a-value)。

      [同步更新](https://codesandbox.io/s/pensive-shirley-wkp46)

      [异步更新](https://codesandbox.io/s/infallible-dewdney-9fkv9)
      :::

  2. React的`Scheduler`和`Reconciler`为异步，待所有组件都完成`Reconciler`的工作，才会统一交给`Renderer`。

## React16架构

- Scheduler（调度器）—— 调度任务的优先级，高优任务优先进入Reconciler
- Reconciler（协调器）—— 负责找出变化的组件
- Renderer（渲染器）—— 负责将变化的组件渲染到页面上

相较于React15，同时也是相较于大部分UI框架，React16新增了**Scheduler（调度器）**。

## Scheduler（调度器）

在了解`Scheduler`前，会想到一些已有的浏览器API：

- ES6的`Generator（生成器函数）`，它是通过创建、恢复、暂停协程的方式，来实现任务中断及恢复。
- 保证帧对齐的API[requestAnimationFrame](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame)，不过后来React也移除了[(#17252)](https://github.com/facebook/react/commit/a2e05b6c148b25590884e8911d4d4acfcb76a487#diff-3856e885394723dea203587a10ea16b3)。
- 浏览器API[requestIdleCallback](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback)则是通过在空闲时间里执行回调（关于空闲时间请看[这一节介绍](../../base/browser/04render-process.html#chromium是如何保证不掉帧或跳帧的)）。

但是由于以下因素，React放弃使用该API：

- 浏览器兼容性；
- 触发频率不稳定，受很多因素影响。比如当浏览器切换标签页后，之前标签页注册的`requestIdleCallback`触发的频率会变得很低。
    ::: details requestIdleCallback Demo

    查看控制台-Performance，在该浏览器标签页切入后台约10s后，`requestIdleCallback`回调将基本不再执行。

    ```html
    <!DOCTYPE html>
    <title>Scheduling background tasks using requestIdleCallback</title>
    <script>
    var requestId = 0;
    var pointsTotal = 0;
    var pointsInside = 0;

    function piStep() {
      var r = 10;
      var x = Math.random() * r * 2 - r;
      var y = Math.random() * r * 2 - r;
      return (Math.pow(x, 2) + Math.pow(y, 2) < Math.pow(r, 2))
    }
    function refinePi(deadline) {
      while (deadline.timeRemaining() > 0) {
        if (piStep())
          pointsInside++;
        pointsTotal++;
      }
      currentEstimate = (4 * pointsInside / pointsTotal);
      textElement = document.getElementById("piEstimate");
      textElement.innerHTML="Pi Estimate: " + currentEstimate;
      requestId = window.requestIdleCallback(refinePi);
    }
    function start() {
      requestId = window.requestIdleCallback(refinePi);
    }
    function stop() {
      if (requestId)
        window.cancelIdleCallback(requestId);
      requestId = 0;
    }
    </script>
    <button onclick="start()">Click me to start!</button>
    <button onclick="stop()">Click me to stop!</button>
    <div id="piEstimate">Not started</div>
    ```

    :::

基于以上原因，React实现了功能更完备的`requestIdleCallback`polyfill，即**Schedule**。
除了在空闲时触发回调外，还提供了多种优先级供任务设置。这更像`message loop`。

## Reconciler（协调器）

可以看到[Reconciler](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1466)的更新工作，在每次循环时会调用`shouldYield`判断当前是否有剩余时间。

因此`Scheduler`、`Reconciler`随时可能由于以下原因被中断：

- 有其他更高优任务需要先更新
- 当前帧没有剩余时间

那么对于开篇提出的：React16是如何解决中断更新时DOM渲染不完全的问题呢？

当`Scheduler`将任务交给`Reconciler`后，`Reconciler`内部采用了`Fiber`的架构，并会为变化的虚拟DOM打上代表`增/删/更新`等标记，类似这样：

```js
export const Placement = /*             */ 0b0000000000010;
export const Update = /*                */ 0b0000000000100;
export const PlacementAndUpdate = /*    */ 0b0000000000110;
export const Deletion = /*              */ 0b0000000001000;
```

> 全部的标记见[这里](https://github.com/facebook/react/blob/v16.13.1/packages/shared/ReactSideEffectTags.js)。

整个`Scheduler`与`Reconciler`的工作都在内存中进行。只有当所有组件都完成`Reconciler`的工作，才会进入`Renderer`流程。

> React官方对React16`Reconciler`的解释，见[这里](https://zh-hans.reactjs.org/docs/codebase-overview.html#fiber-reconciler)。

## Renderer（渲染器）

`Renderer`根据`Reconciler`为虚拟DOM打的标记，同步执行对应的DOM操作。
