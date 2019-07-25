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
    # 多线程（CPU多核）
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
  