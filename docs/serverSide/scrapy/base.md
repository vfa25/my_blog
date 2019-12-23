---
title: 'Scrapy基础'
---

- 安装框架依赖`pip install -i https://pypi.douban.com/simple/ scrapy`

    注意：其依赖中如[lxml](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml)、
    [twisted](https://www.lfd.uci.edu/~gohlke/pythonlibs/#twisted)、
    [pywin32](https://www.lfd.uci.edu/~gohlke/pythonlibs/#pywin32)
    在Windows下由于依赖了后者的开发环境，较容易出错。
    这里是[Windows环境下PY扩展包下载地址](https://www.lfd.uci.edu/~gohlke/pythonlibs/)。

- 新建项目

```sh
scrapy startproject GithubTrending
cd GithubTrending
scrapy genspider github_app(任务名) https://github.com/trending(目标域名)

```

- 调试

  - Debug断点调试入口构建

  ```sh
  # scrapy命令行启动
  scrapy crawl myTask

  # 编辑 settings.py，robots.txt协议修改为False，
  # 否则爬虫默认读取目标域名的robots协议，且将不符合的过滤掉
  # 如：https://www.baidu.com/robots.txt
  
  # Obey robots.txt rules
  ROBOTSTXT_OBEY = False

  ```

  - 简捷的cmd调试

  ```sh
  scrapy shell 目标域名
  ```

  - 源码查看

  CTRL + 鼠标左键（vscode）

- 配置item pipelines

```md
# 编辑 settings.py
ITEM_PIPELINES = {
   'ArticleSpider.pipelines.ArticlespiderPipeline': 300,
   # 添加图片加载（系统默认配置）
   'scrapy.pipelines.images.ImagesPipeline': 1
   # MySQL连接（定制函数）MysqlPipeline
   'ArticleSpider.pipelines.MysqlPipeline': 1,
}

# 添加图片加载配置，根模块下新建目录images，依赖包 pillow
import os
project_dir = os.path.abspath(os.path.dirname(__file__))
# 高亮：IMAGES_URLS_FIELD这个属性应设置为数组，查看源码里get_media_requests下载器 方法可知
IMAGES_URLS_FIELD = 'front_image_url'
IMAGES_STORE = os.path.join(project_dir, 'images')

```

- MySQL连接

```sh
# 安装mysql驱动
pip install mysqlclient

# 报错OSError: mysql_config not found，
# 解决：将mysql_config从安装目录链接到/usr/local/bin目录下
# 或linux下尝试安装：libmysqlclient-dev(Ubuntu)，python-devel和mqsql-devel(centOS）
sudo ln -s /usr/local/mysql/bin/mysql_config /usr/local/bin/mysql_config
```

`import MySQLdb`过程报错（依赖包`mysqlclient`）。

> Library not loaded：`libssl.1.0.0.dylib`、`libmysqlclient.21.dylib`等。

```md
ln -s /usr/local/mysql/lib/libmysqlclient.21.dylib /usr/local/lib/libmysqlclient.21.dylib
ln -s /usr/local/mysql/lib/libssl.1.0.0.dylib /usr/local/lib/libssl.1.0.0.dylib
ln -s /usr/local/mysql/lib/libcrypto.1.0.0.dylib /usr/local/lib/libcrypto.1.0.0.dylib
```

<details>
<summary>（备份）此处折叠是初用scrapy时Library not loaded的报错解决。</summary>

```sh
# 报错信息：Library not loaded: @rpath/libmysqlclient.21.dylib
# 这个要先关闭csrutil，具体可以百度。
# Mac重启后，执行
sudo install_name_tool -change libmysqlclient.21.dylib  /usr/local/mysql/lib/libmysqlclient.21.dylib /Users/a/.virtualenvs/py3scrapy/lib/python3.6/site-packages/MySQLdb/_mysql.cpython-37m-darwin.so
# 随后，报错信息Library not loaded: libcrypto.1.0.0.dylib，执行
sudo install_name_tool -change libcrypto.1.0.0.dylib  /usr/local/mysql/lib/libcrypto.1.0.0.dylib /Users/a/.virtualenvs/py3scrapy/lib/python3.6/site-packages/MySQLdb/_mysql.cpython-37m-darwin.so
# 最后，再开启csrutil就好。
```

</details>
