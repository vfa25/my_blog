---
title: 'Node.js架构'
date: '2020-01-21'
sidebarDepth: 3
---

Node.js系统架构如下（图片来源于网络）：
![The Node.js System](../../../.imgs/the-nodejs-system.png)

- 图左：Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行环境。
- 图右：Node.js 使用了一个事件驱动、非阻塞式 I/O 的模型。

如图示：内置模块提供了 JS App $\Longleftrightarrow$ V8引擎 $\Longleftrightarrow$ 操作系统 的能力。

## 异步

### Node.js的非阻塞I/O

- I/O即Input/Output，一个系统的输入和输出。、
- 阻塞I/O和非阻塞I/O的区别就在于系统接收输入再到输出期间，能不能就收其他输入。

## Reference

- [Node.js机制及原理理解初步](https://blog.csdn.net/leftfist/article/details/41891407)
- [NodeJS底层原理](https://blog.csdn.net/flying_rat_/article/details/81673558)
