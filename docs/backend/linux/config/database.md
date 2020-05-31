# 数据库(MySQL)

## Mac本地下载及安装

- [MySQL 下载地址](https://dev.mysql.com/downloads/mysql/)，执行安装时，会提示输入root密码，密码最好拿本本记住。

  - 如果需要开放远程连接权限，[MySQL数据库设置远程连接权限](https://help.aliyun.com/knowledge_detail/40792.html?spm=5176.2000002.0.0.3fd84d651GI1Zn)。

- MySQL可视化工具[MySQL Workbench 下载地址](https://dev.mysql.com/downloads/workbench/)。

  MySQL Workbench连接`阿里云数据库`注意事项：

  - 云数据库需要开放公网IP白名单（cmd键入`ifconfig`不可以、这是内网IP）。[点击查看本地公网IP](http://ip.vfa25.cn)或百度搜索关键字`本地IP`。

  <details>
  <summary>代码：python服务——查看公网IP</summary>

  服务端部署直接用pm2的进程守护即可`pm2 start simple_server.py -i 2 -x --interpreter python`。

  ```py
  # -*- coding: utf-8 -*-
  # 参考 https://github.com/python/cpython/blob/3.6/Lib/http/server.py
  '''
  Very simple HTTP server in python.
  Usage::
    ./simple_server.py [<port>]
  Send a GET request::
    curl http://localhost:9999
  Send a HEAD request::
    curl -I http://localhost:9999
  Send a POST request::
    curl -d "fot=bar&bin=baz" http://localhost:9999
  '''

  from http.server import BaseHTTPRequestHandler, HTTPServer


  class S(BaseHTTPRequestHandler):
      def _set_headers(self):
          self.send_response(200)
          self.send_header('Content-Type', 'text/html;charset=utf-8')
          self.end_headers()

      def _handle_fun(self):
          self._set_headers()
          add_str = self.headers.get('X-Real-Ip', '')
          if not add_str:
              add_str = self.address_string()
          print(add_str)
          self.wfile.write(
              '<html><body><h1>当前IP地址为：{}</h1></body></html>'.format(add_str).encode())

      def do_GET(self):
          self._handle_fun()

      def do_HEAD(self):
          self._set_headers()

      def do_POST(self):
          self._handle_fun()


  def run(server_class=HTTPServer, handle_class=S, port=9999):
      server_address = ('', port)
      with server_class(server_address, handle_class) as httpd:
          print('Starting httpd')
          httpd.serve_forever()
          httpd


  if __name__ == '__main__':
      from sys import argv
      if len(argv) == 2:
          run(port=int(argv[1]))
      else:
          run()

  ```

  </details>

## Reference

- [RDS for MySQL或MariaDB TX如何定位本地公网IP地址](https://help.aliyun.com/knowledge_detail/41754.html?spm=5176.2020520104.0.0.2b4b14502CFYGn)。
