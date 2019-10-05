---
title: '事件循环'
---

通过给V8注入原生方法，来以JS调用。先来看一下入口文件，src目录下

```c
// src/node_main.cc
return node::Start(argc, argv);
// src/node.cc 第2865行的Start方法
bool more;
do {
  // 基于libuv；#include "uv.h"，用于维护管理事件循环；uv_run不停的跑队列
  // 参考 https://www.cnblogs.com/lsgxeva/p/9999135.html
  uv_run(env.event_loop(), UV_RUN_DEFAULT);

  v8_platform.DrainVMTasks(isolate);

  more = uv_loop_alive(env.event_loop());
  if (more)
    continue;

  RunBeforeExit(&env);

  // Emit `beforeExit` if the loop became alive either after emitting
  // event, or after running some callbacks.
  // 若more 恒!= true, 即listen可以控制server主进程一直不会退出的原因
  more = uv_loop_alive(env.event_loop());
} while (more == true); // more初始非true，do while语法

env.stop_sub_worker_contexts(); // 停止上下文
// 扫尾工作
return exit_code;
```
