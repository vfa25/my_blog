---
title: "React理念"
date: "2020-9-13"
sidebarDepth: 3
---

> 本系列参考自[卡颂](https://github.com/BetaSu)的[React技术揭秘](https://react.iamkasong.com/)，基于[React v16.13.1](https://github.com/facebook/react/tree/v16.13.1)。

## React理念

如[官网](https://zh-hans.reactjs.org/docs/thinking-in-react.html)关于对`React 哲学`的介绍：

> React 是用 JavaScript 构建**快速响应**的大型 Web 应用程序的首选方式。它在 Facebook 和 Instagram 上表现优秀。

而制约`快速响应`的因素无外乎两种场景：

- CPU-bound：例如创建新的 DOM 节点和运行组件中的代码。前者的本质是`Browser进程`向`Render进程`的跨进程通信，后者可能会出现执行时间过长的任务；造成页面掉帧。
- IO-bound：例如从网络加载代码或数据。如在屏幕之间切换时，显示过多的中间加载状态会使切换的速度变慢。

> React官网对并发的解释，请看[这里](https://zh-hans.reactjs.org/docs/concurrent-mode-intro.html#concurrency)。

## CPU瓶颈

- 首先浏览器在渲染页面时有如下特性：

  1. `JS引擎线程`（负责执行JS脚本）与负责页面渲染的`渲染主线程`（处理“DOM、Style、Layout、Layer、Paint”）+`合成线程`（处理“分块、光栅化、合成”）互斥，即前者的执行会造成后者挂起。请看[这一节介绍](../../base/browser/05render-block.html)。
  2. 每一`帧`包含工作阶段和空闲阶段，并在该帧时间结束时，操作系统会去读取显卡的`前缓冲区`，如果工作阶段一直被JS任务（同步或异步的单个大任务）霸占，轻者出现掉帧情况，重则看不到页面任何响应。请看[这一节介绍](../../base/browser/04render-process.html#chromium是如何保证不掉帧或跳帧的)。
  3. 对于`用户交互事件`，如果该事件有回调，则会经过`渲染进程`的`I/O线程->合成线程->渲染主线程`，随后该回调被推入`用户交互事件队列`（注：一个事件循环有一个或多个事件队列），从交互友好方面看希望这是高优先级执行的。请看[这一节介绍](../../base/browser/06event-loop.html#事件循环和任务队列)。

- 针对以上特性，提出问题

  1. 如何防止动画掉帧，或执行JS同步任务时间过长、造成输入事件卡顿？
  2. 在每次帧结束时，如何避免展示出不完全的页面？

### 可中断的异步更新

**异步更新的优点：响应自然。**

- React是如何解决的

  1. **可中断的任务切片**。处理在浏览器每一帧的时间中，预留一些时间给JS线程，React利用这部分时间更新组件（在[源码](https://github.com/facebook/react/blob/v16.13.1/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L119)中，预留的初始时间是5ms）。当预留的时间不够用时，React将线程控制权交还给浏览器使其有时间渲染UI，React则等待下一帧时间到来继续被中断的工作。这样在每一帧，都有足够时间给`渲染进程`做UI绘制。

      :::tip Time Slicing
      - React doesn't block the thread while rendering
      - Feels synchronous if the device is fast
      - Feels responsive if the device is slow
      - Only the final rendered state is displayed
      - Same declarative component model
      > 参考自[Dan Abramov- Beyond React 16 - JSConf Iceland 2018](https://www.youtube.com/watch?v=v6iR3Zk4oDY)。
      :::

      开启`时间切片`的方式：入口API使用`Concurrent Mode`。

      ```js
      ReactDOM.unstable_createRoot(rootEl).render(<App/>);
      ```

      ![react-time-slice-demo](../../../.imgs/react-time-slice-demo.png)

      所以，解决CPU瓶颈的关键是实现**时间切片**，其关键是：将同步的更新变为**可中断**的异步更新。

      ::: details 同步更新 vs 异步更新 Demo
      当有个更新很耗时的大列表，来看看同步更新和异步更新时，输入框的响应速度。Demo出处React官网介绍请看[这里](https://zh-hans.reactjs.org/docs/concurrent-mode-patterns.html#deferring-a-value)。

      [同步更新](https://codesandbox.io/s/pensive-shirley-wkp46)

      [异步更新](https://codesandbox.io/s/infallible-dewdney-9fkv9)
      :::

  2. 双缓存机制。React的`Scheduler`和`Reconciler`为异步，待所有组件都完成`Reconciler`的工作，才会统一交给`Renderer`。这和显卡的`前缓冲区`与`后缓冲区`的概念类似。

## IO瓶颈

根据研究结果，帮助将人机交互研究的结果整合到真实的 UI 中。

例如，应用的两个屏幕之间导航，不再是过渡到一个空白屏或者大型的轮播图会是一个不愉快的体验，而是可以在旧屏幕上多停留一段时间，并在展示新屏幕之前“跳过”“不够好的加载状态”，不是更好吗？

> React官网对`有意的加载顺序`的解释请看[这里](https://zh-hans.reactjs.org/docs/concurrent-mode-intro.html#intentional-loading-sequences)。

为此，React实现了[Suspense](https://zh-hans.reactjs.org/docs/concurrent-mode-suspense.html)功能及配套的hook——[useDeferredValue](https://zh-hans.reactjs.org/docs/concurrent-mode-reference.html#usedeferredvalue)。

而在源码内部，为了支持这些特性，同样需要将同步的更新变为**可中断**的异步更新。
