---
title: 'Node.js框架'
date: '2020-04-27'
---

## Koa与Express

它们的作者是同一个人：TJ；Koa相较Express，有些类似于Python的Flask相较于Django。

### 相同点

- Request and Response
  
  两者都是提供了`http helper`来处理request（[IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)）和response（[ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse)）

### 不同点

- Koa遵循了极简的微内核模式（比如核心模块并无类似Express的Router，而需要用户自行安装，例如koa-mount），所谓`Koa is not bundled with any middleware.`

- Koa还有一个重要的特点是：`Middleware`的`async function`，一种兼容异步的`洋葱模型`。

  ```js
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
  });
  ```
