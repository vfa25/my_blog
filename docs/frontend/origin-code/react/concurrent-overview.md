---
title: "概览"
date: "2020-11-19"
sidebarDepth: 3
---

[React文档-启用 Concurrent 模式](https://zh-hans.reactjs.org/docs/concurrent-mode-adoption.html#why-so-many-modes)介绍了`React`当前的三种入口函数。日常开发主要使用的是`Legacy Mode`（通过`ReactDOM.render`API创建）。

> Concurrent 模式是一组 React 的新功能，可帮助应用保持响应，并根据用户的设备性能和网速进行适当的调整。

## 底层架构——Fiber架构

在[React理念一节](./idea.html)介绍了，`Concurrent Mode`的关键是：**可中断的**异步更新。

其实现的必要条件就是，React团队耗时2年时间重构完成了`Fiber架构`。

`Fiber架构`的意义在于：将单个组件作为工作单元，使以组件为粒度的“可中断的异步更新”成为可能。

## 架构的驱动力——Scheduler

如果我们同步运行`Fiber架构`（通过`ReactDOM.render`），则`Fiber架构`与重构前并无区别。

但是当我们配合`时间切片`，就能根据宿主环境性能，为每个工作单元分配一个可运行时间，实现“可中断的异步更新”。

于是，[scheduler](https://github.com/facebook/react/tree/master/packages/scheduler)（调度器）产生了。

## 架构运行策略——ExpirationTime

`React`可以控制更新在`Fiber架构`中运行/中断/继续运行。

当一次更新在运行过程中被中断，过段时间再继续运行，这就是“可中断的异步更新”。

当一次更新在运行过程中被中断，转而重新开始一次新的更新，可以称作：后一次更新打断了前一次更新。

这就是优先级的概念：后一次更新的优先级更高，它打断了正在进行的前一次更新。

多个优先级之间如何互相打断？优先级能否升降？本次更新应该赋予什么优先级？

这就需要一个统一的策略控制不同优先级之间的关系与行为。
