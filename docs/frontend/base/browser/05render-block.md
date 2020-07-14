---
title: '渲染流程：阻塞'
date: '2020-7-13'
---

- 本篇可以视为`specification`（规范）层面，而不是`implementation`（对规范的实现）。
- 不同浏览器有各自的预请求优化（如CSS外链下载阻塞不会影响JS外链的下载）和渲染优化, 但并不会改变主线程对dom树的解析。

<details>
<summary>测试Demo：本地启node服务</summary>

```js
var http = require('http');
var URL = require('url');
var fs = require('fs');

var server = http.createServer(function (req, res) {
  if (req.method != 'GET') {
    return res.end('send me a get request\n');
  } else {
    var url = URL.parse(req.url, true);
    var params = url.query;
    console.log(url);
    if (url.pathname === '/index.html' || url.pathname === '/') {
      res.writeHead(200, {'Content-Type': 'text/html'});
      fs.createReadStream('index.html').pipe(res);
    } else if (url.pathname === '/test.css') {
      res.writeHead(200, {'Content-Type': 'text/css'});
      if (params.defer) {
        setTimeout(function(){fs.createReadStream('test.css').pipe(res)}, 3000);
      } else {
        fs.createReadStream('test.css').pipe(res);
      }
    } else if (url.pathname === '/test.js') {
      res.writeHead(200, {'Content-Type': 'application/javascript'});
      if (params.defer) {
        setTimeout(function(){fs.createReadStream('test.js').pipe(res)}, 3000);
      } else {
        fs.createReadStream('test.js').pipe(res);
      }
    } else if (url.pathname === '/test.png') {
      res.writeHead(200, {'Content-Type': 'image/png'});
      fs.createReadStream('test.png').pipe(res);
    }
  }
});
server.listen(9999);
console.log('sever start');
```

html文件类似如下代码块

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="test.css?defer=true">
</head>
<body>
  <p>
    Hello
    <span>web performance</span>
    students
  </p>
  <div>
    <img src="./test.png" alt="">
  </div>
  <script src="./test.js"></script>
</body>
</html>
```

</details>

1. 当从服务器接收HTML页面的第一批数据时，DOM解析器就开始工作了
2. 在解析过程中（即DOM树构建，由GUI渲染线程执行）
   - 如果遇到了JS脚本（内嵌），那么DOM解析器会先执行JavaScript脚本，执行完成之后，再继续往下解析。
   - 如果遇到了JS脚本（外链），会先暂停DOM解析，并下载该JS文件，下载完成之后执行该JS文件，然后再继续往下解析DOM。
   - 如果遇到了CSS（外链），那么需要等待这个CSS文件被下载完成才能继续往下执行（要等待合并结果, 出发点即JS中可能会访问某个元素的样式）。
   <!-- - 如果遇到了CSS（内嵌）， -->
<!-- DOM树构建, 被阻塞: 
	有未加载完(即网络请求线程pending中)或正在解析的外链脚本, 无法越过script标签, 将等待脚本的下载并解析的结果.
JS, 被阻塞:
	尽管CSS的加载或解析与DOM树构建并行, 但若前方有CSS阻塞, script标签或JS外链可以加载, 却无法解析(要等待合并结果, 出发点即JS可能会获取样式).
GUI渲染线程, 被挂起: -->