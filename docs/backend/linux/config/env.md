# 环境搭建

## Node.js环境

- 安装依赖

  ``` sh
  sudo apt-get update
  sudo apt-get install vim openssl build-essential libssl-dev wget curl git
  ```

- nvm--Node.js的版本管理工具

  ``` sh
  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
  ```

  随后按提示，关闭并重开一个命令行窗口

  ``` sh
  nvm install v10.15.3
  nvm use v10.15.3
  nvm alias default v10.15.3
  node -v
  v10.15.3
  ```

  ::: warning glibc基础库版本更新，严重则CPU秒跪，直接跑路那种！！！
  [参考链接：libc.so.6: version `GLIBC_2.25‘ not found](https://blog.csdn.net/SHK242673/article/details/126938820)，
  但这个链接实测无效。有效链接：[Ubuntu 18.04 出现GLIBC_2.28 not found的解决方法(亲测有效)](https://betheme.net/dashuju/93611.html?action=onClick)。

  gilbc下载：`wget https://ftp.gnu.org/gnu/glibc/glibc-2.28.tar.gz`;
  :::

- 其他

  **淘宝镜像**

  ``` sh
  npm --registry=https://registry.npm.taobao.org install -g npm
  npm -v
  6.9.0
  ```

  **增加文件监控数目**

  ``` sh
  echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
  ```

  **cnpm安装**

  ``` sh
  npm --registry=https://registry.npm.taobao.org install -g cnpm
  cnpm -v
  # cnpm有15min同步周期，通过sync命令同步
  cnpm sync koa
  ```

  **pm2**

  [pm2文档](https://pm2.io/doc/en/runtime/overview/)

  [pm2 git地址](https://github.com/Unitech/pm2)

  ``` sh
  npm install pm2 -g
  ```

  - 常用命令

    ```sh
    # 启动
    pm2 start app.js
    # 多线程（是线程，所以CPU单核也行）
    pm2 start app.js -i 2
    # 扩容
    pm2 scale app +1
    # 停止
    pm2 stop 1
    # 删除
    pm2 delete 1
    # 重启
    pm2 reload app
    # 查看
    pm2 ls
    ```

  **MySQL安装**

  ``` sh
  sudo apt-get install mysql-server mysql-client
  ```
  