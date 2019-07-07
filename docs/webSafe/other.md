# 其他

## CSP

内容安全策略（[Content-Security-Policy](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP)，简称CSP，是在请求即限制），有效防止跨站脚本攻击（XSS攻击），或数据注入攻击。可在`响应头`或`HTML的meta标签`添加设置。

- 限制资源获取

  - 限制全局链接请求：`default-src`。
  - 定制：`connect-src`、`font-src`、`frame-src`、`img-src`、`media-src`、`script-src`、`manifest-src`、`style-src`。
  - 如`'Content-Security-Policy': 'default-src \'self\''`，将限制inline script和所有src外链的跨域请求（注意：不包括form）。

- report资源获取权限

  - `'Content-Security-Policy': 'script-src \'self\'; report-uri /report'`，如果出现规则限制，浏览器端会发送一个report请求。