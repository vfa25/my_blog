# Scrapy基础

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
   # Obey robots.txt rules
   ROBOTSTXT_OBEY = False

   ```

   - 简捷的命令行shell调试

   ```sh
   scrapy shell 目标域名
   ```

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
# IMAGES_URLS_FIELD这个属性应  设置为数组，查看源码里get_media_requests下载器 方法可知
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

有些伤脑筋的MySQLdb报错，ArticleSpider.pipelines.MysqlPipeline拦截器定制，

依赖包`mysqlclient`。

```sh
# 报错信息：Library not loaded: @rpath/libmysqlclient.21.dylib

# 这个要先关闭csrutil，具体可以百度。
# Mac重启后，执行

sudo install_name_tool -change libmysqlclient.21.dylib  /usr/local/mysql/lib/libmysqlclient.21.dylib /Users/a/.virtualenvs/py3scrapy/lib/python3.6/site-packages/MySQLdb/_mysql.cpython-37m-darwin.so

# 随后，报错信息Library not loaded: libcrypto.1.0.0.dylib，执行

sudo install_name_tool -change libcrypto.1.0.0.dylib  /usr/local/mysql/lib/libcrypto.1.0.0.dylib /Users/a/.virtualenvs/py3scrapy/lib/python3.6/site-packages/MySQLdb/_mysql.cpython-37m-darwin.so

# 最后，再开启csrutil就好。
```
