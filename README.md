# MyDoc

- 本地启动

``` sh
# 仓库clone
git clone https://github.com/vfa25/my_doc.git
# 依赖包下载
npm install
# 本地服务
npm run dev
```

- PM2 服务端部署

根目录下新建文件`ecosystem.yaml`

```
deploy:
  production:
    # 服务器登录账号，可提前配置本地无密码ssh登录
    user: my_manager
    # 服务器host
    host:
      - xx.xx.xx.xx
    # 服务器端口号，linux默认22
    port: '22'
    # 自己的 git 分支
    ref: origin/master
    # 自己的 git 地址，私人仓库格式如https://[username]:[password]@github.com/vfa25/my_doc.git
    repo: https://github.com/vfa25/my_doc.git
    # 服务端目录
    path: /自定义/path/production
    
    ssh_options: StrictHostKeyChecking=no
    pre-deploy: git fetch --all
    post-deploy: cnpm install && npm run build
    env:
      NODE_ENV: production
```

然后，本地执行以下命令：

```
# 构建服务端目录
npm run prd:setup
# 发布
npm run prd:deploy
```

- 该静态资源Nginx配置

服务端执行`sudo vi /etc/nginx/conf.d/XXXX.conf`，[HTTP2配置说明](http://doc.vfa25.cn/doc/server/nginx.html#http2%E9%85%8D%E7%BD%AE)。

```
server {
  listen 80;
  server_name doc.vfa25.cn;


  # Gzip Compression
  gzip on;
  gzip_comp_level 6;
  gzip_vary on;
  gzip_min_length  1000;
  gzip_proxied any;
  gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;
  gzip_buffers 16 8k;

  location ^~ /doc/ {
    alias   /自定义/path/production/current/dist/;
    autoindex   on;
  }

  location / {
    root   /自定义/path/production/current/dist;
    autoindex   on;
  }
}
```
