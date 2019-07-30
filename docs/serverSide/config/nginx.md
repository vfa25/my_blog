# Nginx

[Nginx文档](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/)

**出发点：**

Web 服务一般跑在 1024+ 的端口上，直接通过默认80端口无法启动，因为用户my_manager没有root权限。
当然sudo强制启动Web服务也可以，但会带来一定的风险：一是额外的配置，二是需要放大该Web服务的权限。

**解决：**

引入`Nginx`，用root级的权限启动对80端口的监听，同时把80端口的流量分配给Web服务的另外一个端口，即服务的代理。

## 安装

- 删掉阿里云服务器预装的Apache，如果用不到。

``` sh
sudo service apache2 stop
sudo update-rc.d -f apache2 remove
sudo apt-get remove apache2
```

- 安装

``` sh
sudo apt-get update
sudo apt-get install nginx
sudo vi /etc/nginx/sites-available/default
nginx -v
```

- 基本配置

``` sh
sudo vi /etc/nginx/nginx.conf
# 隐藏 HTTP响应头 里的nginx版本，把 server_tokens on 改成 server_tokens off
# 测试语法是否正确
sudo nginx -t
```

## 代理服务配置

**在`/etc/nginx/conf.d`目录下新增.conf配置文件，必须.conf后缀**
如 sudo vi /etc/nginx/conf.d/my_blog_8011.conf

```sh
# 通过 upstream 可以设定一个简单的负载均衡策略，以应对将来可能的升级
# 首先定义一个 server 集群 my_blog，里面可以加多个 server，每个 server 对应的值可以用域名，也可以直接用 IP，但通常不会用 IP 来访问，而是通过域名:

upstream my_blog {
    server 127.0.0.1:4321;
}

server {
    listen 80;
    server_name vfa25.com;

    # Gzip Compression
    gzip on;
    gzip_comp_level 6;
    gzip_vary on;
    gzip_min_length  1000;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_buffers 16 8k;

    location / {
        # remote_addr 代表客户端的 IP
        proxy_set_header X-Real-IP $remote_addr;
        # proxy_add_x_forwarded_for 获取真实的 IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # http_host 表示请求的 host 头
        proxy_set_header Host $http_host;
        proxy_set_header X-NginX-Proxy true;

        # proxy_pass 指令实现代理。把域名代理到集群名上面
        proxy_pass http://my_blog;
        proxy_redirect off;
    }
}

```

检查语法（sudo nginx -t）后，重启Nginx。

``` sh
# 重启
sudo service nginx restart
# 重载
sudo service nginx reload
```

此时，应可以不输端口号进行访问（即默认80端口）了。

## HTTP 代理(缓存)服务器 cache

```sh
proxy_cache_path /usr/local/etc/nginx/cache  levels=1:2 keys_zone=my_cache:10m;
# proxy_cache_path缓存文件夹路径,直接写磁盘上; levels二级路径; keys_zone-设置缓存名字及大小
server {
  listen       80;
  server_name  test.com;

  location / {
    proxy_cache my_cache; # 代理缓存的名字
    proxy_pass http://127.0.0.1:8888; # proxy URL
    proxy_set_header Host $host;
  }
}
```

## HTTPS(SSL证书申请)

我这里域名用的阿里云解析，在申请免费SSL证书成功后，下载Nginx版本，然后执行scp放到服务端。

命令`scp -P 端口号 ./XXXX_www.vfa25.cn_nginx.zip my_manager@XX.XX.XX.XX:`，注意结尾有个冒号。

随后服务端执行解压缩并移动：`unzip -o ~/XXXX_www.vfa25.cn_nginx.zip -d /etc/nginx/`。

```bash
server {
  listen 443; # SSL 访问端口号为 443
  server_name www.vfa25.cn; # 填写绑定证书的域名
  
  # 如果不是 https 协议，重定向到 https，同时带上所有参数
  if ($ssl_protocol = "") {
    return 301 https://$server_name$request_uri;
    # 也可以直接重写到新的 https 地址
    # rewrite ^(.*) https://$host$1 permanent;
    # return 301 https://vfa25.cn$request_uri;
    # rewrite ^ https://$host$request_uri? permanent;
  }
  ssl on; # 启用SSL功能（或者listen      443 ssl;）二选一
  ssl_certificate XXXX_www.vfa25.cn.pem; # 证书文件
  ssl_certificate_key XXXX_www.vfa25.cn.key; # 私钥文件

  # ssl_session_cache    shared:SSL:1m;
  ssl_session_timeout 5m;

  ssl_protocols TLSv1 TLSv1.1 TLSv1.2; # 使用的协议
  ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE; #配置加密套件
  ssl_prefer_server_ciphers on;

  location / {
      root   html; # 对外提供内容访问的站点目录
      index  index.html index.htm;
  }
  # location / {
  #    proxy_cache my_cache;
  #    proxy_pass http://127.0.0.1:8888;
  #    proxy_set_header Host $host;
  # }
}
```

或许可设置80接口跳转

```bash
server {
  listen       80 default_server;
  listen       [::]:80 default_server;
  server_name  test.com;
  return 302 https://$server_name$request_uri; # URI (Uniform Resource Identifier) 统一资源标志符
}
```

## HTTP2配置

HTTP2有SPDY协议的历史原因，故需在HTTPS协议的前提下。

Nginx对不支持HTTP2端可自动兼容，即回退到HTTP1.1。
ALPN (Application Layer Protocol Negotiation)是TLS的扩展，允许在安全连接的基础上进行应用层协议的协商。
ALPN支持任意应用层协议的协商，目前应用最多是HTTP2的协商。

HTTP2有一个突破性特点：“信道复用”，也称“多工（Multiplexing）”。
打开chrome devtool，Network页签下勾选“Connection ID”会发现都是一样的，即同一个TCP连接。
而HTTP1.1下，一个请求会占用一个TCP连接，单TCP连接“队头阻塞”，且chrome 默认只支持同时6个TCP连接。

[HTTP2体验地址](https://http2.akamai.com/demo/http2-lab.html)

```sh
原   listen       443 ssl;
改为  listen       443 ssl http2;
```

- Server Push

  ```sh
  # http2开启推送，https://www.nginx.com/blog/nginx-1-13-9-http2-server-push/
  http2_push_preload on;
  # Link 响应头来做自动推送，nginx 会根据 Link 响应头主动推送这些资源，但需要显式标明资源路径，以绝对路径。
  add_header Link "</style.css>; as=style; rel=preload, </main.js>; as=script; rel=preload, </image.jpg>; as=image; rel=preload"
  ```

## 附：常见Nginx配置

### 本地反向代理配置

主要针对`CORS预请求`(仅跨域请求)：

介绍： 即先期发送一个请求方式为`OPTIONS`的请求。

- CORS跨域默认只允许三种方法（get, post, head），即不需要预请求。
- CORS跨域默认只允许三种content-type（text/plain即字符串，multipart/form-data即form表单，application/x-www-form-urlencoded即json格式），即不需要预请求

已设置请求头：[CORS-safelisted request-header](https://fetch.spec.whatwg.org/#cors-safelisted-request-header)中字段的值,是否需要 "CORS预请求" 是分情况的。

如下放行即可：
Access-Control-Allow-Headers允许请求头；
Access-Control-Allow-Methods允许请求方法；
Access-Control-Max-Age验证之后有效期(单位s)。

```sh
  location / {
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Credentials' 'true';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PATCH, DELETE, PUT, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,  Access-Control-Expose-Headers, Token, Authorization';

    if ($request_method = 'OPTIONS') {
      return 204;
    }
    proxy_pass https://192.168.22.97;
    proxy_set_header Host $host;
  }
```

注：
[XMLHttpRequest.withCredentials](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/withCredentials)设置为true，可为跨域请求带上cookie。但需`Access-Control-Allow-Credentials: true`且`Access-Control-Allow-Origin指定域名，不能使用泛型*`。
  - 该属性在同域请求下忽略。
  - 跨域请求，如当前站点domain1，请求domain2。
    - 无论xhr.withCredentials是什么值，xhr永远不携带 domain1的cookie，rsp永远无法设置 domain1的cookie。
    - xhr.withCredentials为false时（默认），xhr中不携带 domain2的cookie（即不携带所请求的域的cookie），rsp无法设置 domain2的cookie。
    - xhr.withCredentials==true时，xhr中携带了 domain2的cookie（即携带了所请求的域的cookie），rsp可以设置 domain2的cookie。注意：domain2的cookie，依然遵循同源策略，即domain1上无法访问domain2的cookie。
  
