---
title: '多进程的浏览器'
date: '2020-3-17'
sidebarDepth: 3
---

## 进程和线程的区别

- 进程好比一个工厂，工厂有它独立的资源；即**操作系统分配的独立的一块内存（存放代码、数据、文件、主线程等）**，
当一个进程关闭之后，操作系统也会回收进程所占用的内存。
- 工厂之间相互独立；即**进程之间相互独立（但可以通过IPC`Inter-Process Communication`机制进行通信）**。
- 线程是工厂中的工人，多个工人协作完成任务；即**多个线程在进程中协作完成任务**，进程中的任意一线程执行出错，都会导致整个进程的崩溃。
- 工厂内有一个或多个工人；即**一个进程由一个或多个线程组成（故、`单线程与多线程`，都是指在一个进程内的单和多）**。
- 工人之间共享空间；即**同一进程下的各个线程之间共享程序的内存空间（包括代码、数据、堆等）**。

那么再来看规范的定义：

- **进程（Process）是CPU资源分配的最小单位（是能拥有资源和独立运行的最小单位）。**
- **线程（thread）是CPU调度的最小单位（线程是依附于进程的基础上的一次程序运行单位，而进程中使用多线程并行处理能提升运算效率）。**

## Chromium的多进程架构

![任务管理器](../../../.imgs/process-mgmt.png)

1. 浏览器进程（Browser）。仅且一个。浏览器的主进程（负责协调、主控）。作用有：
    - 负责浏览器界面显示、用户交互。如前进，后退等；
    - 负责其他进程（如标签页）管理（创建和销毁）；
    - 将Renderer进程得到的内存中的Bitmap，绘制到用户界面上；
    - 网络资源的管理，下载；
    - 提供文件存储等功能。
2. GPU 进程。仅且一个。用于3D绘制。
3. 网络进程（NetWork）。仅且一个。直至最近，才从Browser进程中独立出来的。作用有：
    - 面向渲染进程和浏览器进程等提供网络资源下载。
    > 统一处理网络通信，这样做不仅可以控制每个渲染进程对网络的访问，同时在进程之间保持一致的会话状态，如cookie和缓存数据。并且，网络服务可能运行在“网络进程”，也可能运行在“浏览器进程”，后者是为减少RAM。[参考：Life of a URLRequest](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/net/docs/life-of-a-url-request.md#request-starts-in-some-non_network_process)
4. 渲染进程（Renderer）。默认为每个Tab标签创建一个渲染进程（且会在sandbox模式下，以防止恶意代码利用浏览器漏洞对系统进行攻击）。作用有：
    - 页面渲染（排版引擎[Blink](https://www.chromium.org/blink)），脚本执行、事件处理（JS引擎V8）。
5. 插件进程。每种类型的插件对应一个进程（部分系统支持sandbox），仅当使用该插件时才创建。

### 线程

每个Chrome进程都有

- 一个主线程
  - 在浏览器进程中 (BrowserThread::UI)：更新UI；
  - 在渲染器进程中（Blink主线程）：大部分时间在运行Blink。
- 一个 IO 线程
  - 在所有进程中：所有 IPC 消息都到达此线程。然后再派发给具体的处理消息的应用程序逻辑所在的线程；
  - 大多数异步 I/O 发生在这个线程上（例如，通过 base::FileDescriptorWatcher）；
  - 在浏览器进程中：这称为 BrowserThread::IO。
- 一些特殊用途的线程；
- 一个通用线程池。

大多数线程都有一个从队列中获取任务并运行它们的循环（队列可能在多个线程之间共享）

## Reference

- [Multi-process Architecture](https://www.chromium.org/developers/design-documents/multi-process-architecture)
- [从浏览器多进程到JS单线程，JS运行机制最全面的一次梳理](https://segmentfault.com/a/1190000012925872)
- [浏览器工作原理与实践（极客时间小册）](https://time.geekbang.org/column/article/118205)
- [Threading and Tasks in Chrome](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/threading_and_tasks.md)
