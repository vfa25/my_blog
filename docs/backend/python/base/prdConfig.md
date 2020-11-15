# Ubuntu线上环境：Nginx + uwsgi

- 不要用root用户发布Web应用，且下级用户一般至少赋予sudo权限。
- uwsgi需要项目暴露`application`，可参考[Another Do-It-Yourself Framework](https://docs.pylonsproject.org/projects/webob/en/latest/do-it-yourself.html)、[WSGI规范：Python Web Server Gateway Interface](https://www.python.org/dev/peps/pep-0333/)、[python WSGI框架详解
 ](https://www.cnblogs.com/-wenli/p/10884168.html)。

## pm2可以守护python进程

[pm2一节介绍](../../linux/config/pm2.html)

```sh
# python项目启动
pm2 start simple_server.py -i 2 -x --interpreter python
```

## Nginx基础命令

```sh
nginx -v # 查看版本
ps aux|grep nginx # 查看进程
sudo kill PID # 杀指定进程
```

## 服务器本地MySQL

- 修改IP绑定：配置文件在`/etc/mysql/conf.d/mysql.cnf`，`bind-address`：`0.0.0.0`(dev)、`127.0.0.1`(prd)。
- 重启MySQL：`sudo service mysql restart`。
- 权限配置：

  先进入mysql：`mysql -u root -p`。再开放权限`GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'root' WITH GRANT OPTION;`和刷新权限`FLUSH PRIVILEGES`。配置完成，退出即可`exit;`。

## Python虚拟环境

```sh
pip install virtualenv
pip install virtualenvwrapper
# 添加配置环境变量，先检索 find / -name 'virtualenvwrapper.sh'，找到 virtualenvwrapper.sh 的路径
vim ~/.bashrc
# 添加这两行配置
export WORKON_HOME=$HOME/.virtualenvs
source /usr/local/bin/virtualenvwrapper.sh
# 更新，这时候 virtualenvwrapper 的命令就可用了
source ~/.bashrc
# 创建虚拟环境时候带上 python版本，其中/usr/bin/python3 是 which python3 的输出
mkvirtualenv -p /usr/bin/python3 django_py36
```

### Copy虚拟环境：导出及安装pip依赖包

开发环境需要的pip包不再一一枚举，去对应官网很容易找到，而且依赖包不存在的错误提示也很友好。

执行`pip freeze > requirements.md`导出依赖包，在当前目录下。

在目标虚拟环境下，执行`pip install -r requirements.md`批量安装。

## uwsgi配置

- 安装`pip install uwsgi`。
- 测试：项目目录下`uwsgi --http :8000 --module djangoServer.wsgi`

新建uwsgi.ini 配置文件，路径随意，内容如下：

```md
    # mysite_uwsgi.ini file
    [uwsgi]
    # plugins-dir = /插件路径/plugins
    # plugin = python36

    # Django-related settings
    # the base directory (full path)
    chdir           = /项目目录
    # Django's wsgi file
    module          = 项目初始化目录.wsgi
    # the virtualenv (full path)
    virtualenv = /虚拟环境目录/django_py36

    # process-related settings
    # master
    master          = true
    # maximum number of worker processes
    processes       = 10
    # the socket (use the full path to be safe
    socket          = 127.0.0.1:端口号
    # ... with appropriate permissions - may be needed
    # chmod-socket    = 664
    # clear environment on exit
    vacuum          = true

```

```sh
进入虚拟环境后，uwsgi -i 目录/uwsgi.ini &    # 开启
ps aux|grep uwsgi # 查看
pkill -f uwsgi #重启
killall -HUP uwsgi #所有的uwsgi实例都重启
killall -INT uwsgi #关闭所有uwsgi实例
```

- uwsgi 服务器开机自启动（使用update-rc.d命令）

  1. 在目录`/etc/init.d/`路径下新建shell`uwsgi.sh`，内容如下：

  ```md
  #!/bin/bash -e
  ### BEGIN INIT INFO
  # Provides:          adbd
  # Required-Start:
  # Required-Stop:
  # Default-Start:
  # Default-Stop:
  # Short-Description:
  # Description:       Linux ADB
  ### END INIT INFO

  source /root/.virtualenvs/django_py36/bin/activate # 进入虚拟环境，代替 workon django_py36
  uwsgi --ini /www/conf/django/uwsgi.ini &
  ```

  错误解决：如果`source: not found`。尝试执行`dpkg-reconfigure dash`（需要root权限），在界面中选择`no`，
  再运行`ls -l /bin/sh`后，显示`/bin/sh -> bash`。

  2. 添加进`/etc/rc*.d`（即开机自启动）

  ```sh
  cd /etc/init.d/
  # 添加可执行权限，linux下文件颜色会由灰变绿
  chmod +x uwsgi.sh
  update-rc.d uwsgi.sh defaults 99
  ```

  查看目录`/etc/rc*.d/`下是否有`*uwsgi.sh`，如果没有，即代表未生效。尝试执行`update-rc.d uwsgi.sh enable`。

## Nginx配置

```md
# the upstream component nginx needs to connect to
upstream django {
  # server unix:///path/to/your/mysite/mysite.sock; # for a file socket
  server 127.0.0.1:8000; # for a web port socket (we'll use this first)
}
server {
  listen       80;
  # listen       [::]:80 default_server;
  server_name  www.vfa25.cn;

  return 302 https://$server_name$request_uri;
}
server {
  listen 443 ssl http2; # SSL 访问端口号为 443
  server_name *.vfa25.cn; # 填写绑定证书的域名

  charset     utf-8;

  error_log  logs/443-error.log;

  # max upload size
  client_max_body_size 75M;   # adjust to taste
  # 如果不是 https 协议，重定向到 https，同时带上所有参数
  if ($host ~* "^vfa25.cn$") {
    rewrite ^/(.*)$ https://www.vfa25.cn/ permanent;
    # 也可以直接重写到新的 https 地址
    # return 301 https://$server_name$request_uri;
    # rewrite ^(.*) https://$host$1 permanent;  
    # rewrite ^ https://$host$request_uri?permanent;
  }
  # ssl on; # 启用SSL功能
  ssl_certificate 2160396_www.vfa25.cn.pem; # 证书文件
  ssl_certificate_key 2160396_www.vfa25.cn.key; # 私钥文件
  ssl_session_timeout 5m;
  ssl_protocols XXX; # 使用的协议
  ssl_ciphers XXX; #配置加密>套件
  ssl_prefer_server_ciphers on;
  # http2_push_preload    on;
  # add_header Link "</style.css>; as=style; rel=preload, </main.js>; as=script; rel=preload, </image.jpg>; as=image; rel=preload";

  # Gzip Compression
  gzip on;
  gzip_comp_level 6;
  gzip_vary on;
  gzip_min_length  1000;
  gzip_proxied any;
  gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;
  gzip_buffers 16 8k;

  location ^~ /static/ {
    alias   /www/django_web_server/static/;
    autoindex   on;
  }

  location ^~ /media/ {
    alias   /www/django_web_server/media/;
    autoindex   on;
  }

  # Finally, send all non-media requests to the Django server.
  location / {
    uwsgi_pass  django;
    include     uwsgi_params; # the uwsgi_params file you installed
  }
}

```

## 生产环境预备

- 静态文件归并到同一个目录

  `setting.py`配置`STATIC_ROOT = os.path.join(BASE_DIR, 'static')`（prd env），且该字段与`STATICFILES_DIRS`（dev env）互斥。

  执行`python manage.py collectstatic`
