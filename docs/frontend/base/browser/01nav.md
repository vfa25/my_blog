---
title: '前言及大纲提要'
date: '2020-3-17'
---

## 前言

为什么要了解浏览器，因为我的本职工作就是在其上绘制。

举个例子，工作中最常见的操作——DOM操作的本质是什么？

或许答案是：GUI渲染线程和JS引擎线程的桥接通信。

那JS引擎线程又是如何Update Layer Tree，什么情况下会出现DOM树构建被阻塞、JS解析被阻塞或是GUI渲染线程被挂起？

这里从现代浏览器Chrome入手，为自己对前端的认知体系添砖加瓦。

## 大纲

- 宏观视角下的浏览器（从浏览器接收url到开启网络请求线程）
  - [多进程的浏览器](./02multi-process.html)
  - 地址栏输入地址回车后，浏览器做了什么
    - [导航流程](./03navigation-process.html)
    - [渲染流程](./04render-process.html)
  - 多线程的浏览器内核
  - 解析URL
  - 网络请求都是单独的线程
  - 更多

## Reference

- [浏览器工作原理与实践](https://time.geekbang.org/column/article/118205)
- [How browsers work（汉译）](https://www.cnblogs.com/lhb25/p/how-browsers-work.html)、[How browsers work（英文版）](http://taligarsiel.com/Projects/howbrowserswork1.htm)
- [从输入URL到页面加载的过程？如何由一道题完善自己的前端知识体系！](https://juejin.im/post/5aa5cb846fb9a028e25d2fb1)
- [浏览器的渲染原理简介（CoolShell）](https://coolshell.cn/articles/9666.html)
- [从浏览器多进程到JS单线程，JS运行机制最全面的一次梳理](https://juejin.im/post/5a6547d0f265da3e283a1df7)
- [知己知彼——解锁浏览器背后的运行机制](https://juejin.im/book/5b936540f265da0a9624b04b/section/5bac3a4df265da0aa81c043c)
- [从 V8 中看 JS 性能优化](https://juejin.im/book/5bdc715fe51d454e755f75ef/section/5bdc72cbe51d450540286a9d)
- [说说标准——CSS中非常重要的可视化格式模型(visual formatting model)简介](https://bbs.csdn.net/topics/340204423)