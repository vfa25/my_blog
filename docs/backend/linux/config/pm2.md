---
title: 'PM2'
date: '2019-9-14'
sidebarDepth: 3
---

[PM2文档](https://pm2.io/doc/en/runtime/quick-start/?utm_source=pm2&utm_medium=website&utm_campaign=rebranding)

## 部署项目目录

这里通过pm2、以本地配置文件进行服务端部署。避免了繁琐的通过命令行`scp`或者登陆服务端`git`拉取代码。

参考[Easy Deploy with SSH](https://pm2.io/doc/en/runtime/guide/easy-deploy-with-ssh/)。

新建一个文件`ecosystem.yaml`

```md
apps:
  # 启动路径
  - script: app.js
    # pm2进程名字
    name: app
    env:
      COMMON_VARIABLE: true
    env_production:
      NODE_ENV: production
deploy:
  production:
    # 服务器登录账号
    user: my_manager
    # 服务器主机
    host:
      - 47.110.224.7
    # 服务器端口，linux默认22
    port: '12345'
    # git分支名
    ref: origin/master
    # 私有仓库添加"loginname:password@"
    repo: https://loginname:password@github.com/vfa25/node-blog-express.git
    # 服务器上项目部署的目录，会在/www/node-blog-express下初始化一个production文件夹
    # 配置文件会自动从git上面拉取静态网站代码到此路径
    path: /www/node-blog-express/production

    ssh_options: StrictHostKeyChecking=no
    pre-deploy: git fetch --all
    post-deploy: cnpm install && pm2 startOrRestart ecosystem.yaml --env production
    env:
      NODE_ENV: production
```

命令行执行，setup构建项目目录：

``` sh
pm2 deploy ecosystem.yaml production setup
```

来看一下文件夹production：其内部又创建了 3 个子文件夹：
source 是 clone 下来的源码，shared 里面是日志文件和 pid 之类，current 是 source 的软连接，两者是一样的代码。

## Linux文件权限

> 无创建目录权限：mkdir: cannot create directory ‘/www/node-blog-express’: Permission denied

- 赋予拥有者权限：`sudo chown -R my_manager /www/` (或者同时赋予组：`sudo chown -R $USER:$GROUP /www`)
- 开放用户rwx权限：`sudo chmod 755 /www/node-blog-express`（其中`7`表示用户的`rwx`权限与第一个`5`的用户组`rw`权限）

这里注意：一旦更改了部署目录，比如更改为`/var/www`，可重新`chmod`权限设置下：

```sh
sudo mkdir /var/www

# Let's add deploy user to group www-data as a standard practice.
sudo adduser deploy www-data

sudo chown -R www-data:www-data /var/www  # 表示所有者为用户www-data，使用者为用户组www-data
sudo chmod -R g+wr /var/www # 其中 -R 表示递归
```

## 构建编译发布 Node.js 项目

注意：如上述操作，setup构建项目目录后，不要重复执行setup操作，git不能往已有.git目录里重复clone，
如果想删除目录，可以添加钩子`pre-setup: rm -rf /www/node-blog-express/production/source`。

那么：日常代码变更的重新部署怎么操作呢？

1. git提交到远端仓库。

2. 本地执行`pm2 deploy ecosystem.yaml production`，注意`post-deploy`钩子，它在远端服务器执行，
可以按需求配置。

***下面介绍基本配置：***

- 防火墙/阿里云的安全配置组记得要开

  ```sh
  配置规则
  sudo vi /etc/network/iptables.up.rules

  # 加入这两行
  -A INPUT -s 127.0.0.1 -p tcp --destination-port 5000 -m state --state NEW,ESTABLISHED -j ACCEPT
  -A OUTPUT -d 127.0.0.1 -p tcp --source-port 5000 -m state --state ESTABLISHED -j ACCEPT

  # 重新加载防火墙
  sudo iptables-restore < /etc/network/iptables.up.rules
  # 我这里用的 iptables-persistent，为服务器重启备份
  sudo netfilter-persistent save
  ```

- pm2发布任务

  ``` sh
  pm2 deploy ecosystem.yaml production
  ```

- 自动启动脚本

  ``` sh
  pm2 startup ubuntu
  ```

- 开机自启动（非root用户）

  - pm2 startup（添加一个systemd条目，开机之后就可以去读取当前用户更目录的下面存储的配置文件）

  会出现以下提示，直接复制粘贴将`sudo env PATH=$PATH:...`执行即可。

  ```md
  [PM2] Init System found: systemd
  [PM2] To setup the Startup Script, copy/paste the following command:
  sudo env PATH=$PATH:...
  ```

  - pm2 save（配置现在运行的程序开机启动，保存在用户目录下，开机启动会读取该文件并启动应用），执行后会提示

  ```md
  [PM2] Saving current process list...
  [PM2] Successfully saved in /home/user1/.pm2/dump.pm2
  ```

  - systemctl status pm2-user1.service（查看配置是否开启）
  - pm2 unstartup systemd（如果需要取消开机启动条目）

***报错解决***

- npm: command not found \n post-deploy hook failed，可是服务端明明有npm。

  ```sh
  sudo vi ~/.bashrc

  把下面五行加#注释掉。

  # If not running interactively, don't do anything
  case $- in
    *i*) ;;
    *) return;;
  esac

  # .bashrc重载，执行
  source ~/.bashrc
  ```
