---
title: "React心智模型"
date: "2020-11-21"
---

## 代数效应(Algebraic Effects)

React核心团队成员[Sebastian Markbåge](https://github.com/sebmarkbage/)（Hooks和Suspense的提出者）曾说：我们在React中做的就是践行代数效应（Algebraic Effects）。

> 代数效应就像函数式编程的开挂模式。——[Sebastian Markbåge推文](https://mobile.twitter.com/sebmarkbage/status/776883429400915968)

1. 什么是代数式？

    已知代数方程，是由多项式组成的方程：`2x + 3y + 4z = 10`。即该方程式的作用是加法运算（即`做什么`），至于其中x、y、z的解是什么（即`怎么做`）却无需耦合。

2. 什么是代数效应？

    - 代数，形容词，表示像代数这样；
    - 效应（Effects），对于上式中未知数x、y、z（对应JS，就是函数）本身会产生的作用，被称为`效应`。
    - 代数效应，即、像是代数式中未知数一样的效应。

3. 代数效应在React中的应用：**恢复执行**。

    已知React的作用：构建快速响应的大型Web应用程序。
    - 其内部已然通过`Fiber架构`完成了`做什么`（`效应`），即渲染页面；
    - 对于使用者，只需要以组件的方式调用诸如`useState`、`setState`API实现`怎么做`即可（代数式中的未知数）。

    1. 比如问题：`Hooks`中，`useState`执行的时候怎么知道它指向哪一个组件（去**恢复执行**）？

        正如React对象有个`当前调度器`的属性`currentDispatcher`用于指向当前正在使用的实现（比如`react-dom`里的实现），类似的，有一个“当前组件”属性，指向该组件的内部数据结构。

        那么，从概念上，可以认为`useState()`是一个`perform State()`效应。而`React`内部则实现了效应处理器（[mounts 和 updates](https://github.com/facebook/react/blob/v16.13.1/packages/react-reconciler/src/ReactFiberHooks.js#L1390-L1424)）。

    2. 官方提供的[Suspense Demo](https://codesandbox.io/s/frosty-hermann-bztrp?file=/src/index.js:152-160)。

        在Demo中`ProfileDetails`用于展示`用户名称`。而`用户名称`是异步请求的。

        但是Demo中完全是同步的写法。

        ```js
        function ProfileDetails() {
          const user = resource.user.read();
          return <h1>{user.name}</h1>;
        }
        ```

        `read()`调用会抛出一个`Promise`。这“暂停”了执行。`React`捕获这个`Promise`，并且记得在`Promise`解决后重试组件树的渲染。从`React`的角度来看，在`Promise`解决的时候重渲染组件树跟**恢复执行**没什么区别。

> 代数效应更详细的诠释请看[Dan Abramov's blog —— Algebraic Effects for the Rest of Us](https://overreacted.io/zh-hans/algebraic-effects-for-the-rest-of-us/)。

## Why not use generator functions

在JS中，若提到恢复暂停`协程(coroutine)`，会首先想到`Generator（生成器）`API。

但是`Generator`的一些不适用的特性、使React团队放弃使用它来实现`Reconciler（协调器）`：

1. 必须使用`Generator`包裹每个函数，增加了语法开销的同时也增加了对现有实现的运行时开销；
2. 最重要的一点是**生成器是有状态的，无法在中途恢复**。

    ```js
    function* doWork(a, b, c) {
      // doExpensiveWork为占位符，表示有开销的其他有效逻辑
      var x = doExpensiveWorkA(a);
      yield;
      var y = x + doExpensiveWorkB(b);
      yield;
      var z = y + doExpensiveWorkC(c);
      return z;
    }
    ```

    如果只是做时间分片当然没有问题。然而，如果有这么一个场景：当已经完成`doExpensiveWorkA(a)`和`doExpensiveWorkB(b)`、且未完成`doExpensiveWorkC(c)`时，获取到了`b`变量的更新，那么就无法复用变量`x`。也就是说，无法直接跳到`doExpensiveWorkB`去执行时，仍然重用`doExpensiveWorkA(a)`的结果。

    那么`x`变量能缓存在内存么？不优雅。

    1. 假设以`非全局上下文`做内存缓存，但是异步代码执行时，调用栈里仅且有全局上下文。即没有机会去注入(inject memoization)；
    2. 如果使用`全局上下文`做内存缓存，则会出现`缓存失效问题(cache invalidation problems)`。这是一个传说，原文是：`There are only two hard things in Computer Science: cache invalidation and naming thing.（by Phil Karlton）`。即无法确定何时、该缓存应该失效。

> 更详细的解释请看[这个issue](https://github.com/facebook/react/issues/7942#issuecomment-254987818)。
