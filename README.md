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

- 图片资源压缩（该文档站点尽量做到图片资源较小的流量消耗）

```sh
npm run img:compress
```

- PM2 服务端部署

根目录下新建文件`ecosystem.yaml`

```md
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

```sh
# 构建服务端目录
npm run prd:setup
# 发布
npm run prd:deploy
```
