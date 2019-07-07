# XSRF

XSRF 又名 [CSRF](https://developer.mozilla.org/en-US/docs/Learn/Server-side/First_steps/Website_security#Cross-Site_Request_Forgery_(CSRF))，跨站请求伪造，是前端常见的一种攻击方式，先通过一张图来认识它的攻击手段。

![xsrf](../.imgs/xsrf.png)

## 如何进行XSRF伪造
1. 表单提交（action指向受攻击网站A）

## XSRF防御

包括但不限于：

- referer验证，但是 referer请求头 也是可以伪造的。
- `XSRF-token`，`token`不在前端生成，而是在每次访问站点的时候服务端生成。由于`token`很难伪造，所以就能区分这个请求是否是用户正常发起的。服务端通过 `set-cookie` 的方式回塞到客户端，然后客户端发送请求的时候，从 `cookie` 中对应的字段读取出 `token`后：
  1. 添加到请求 `headers` 中。这样服务端就可以从请求 `headers` 中读取这个 `token` 并验证（如axios库即是以`xsrfCookieName`表示存储token的`cookie`名称，`xsrfHeaderName`表示请求headers中token对应的`header`名称）。
  2. 添加到表单隐藏元素中（如Python的Django框架中，模板语法`{% csrf_token %}`就是使用的该方法插入了隐藏表单元素）。

  ***为什么cookie可以token？*** 因为XSRF攻击的思想在于`借用cookie`，而cookie中具体是什么，攻击者是不可预知的，亦无法伪造。但前提是站点不存在XSS漏洞且`token`是`httponly`属性（即不可操作）。
