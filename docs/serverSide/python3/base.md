---
title: 'Python基础'
---

***注：该笔记均默认python3.6虚拟环境下。***

## Reference

- [Python官网](https://www.python.org)
- [Anaconda官方下载地址](https://www.anaconda.com/download)
- [Python编码风格指南](https://python.freelycode.com/contribution/detail/47)

- MAC下命令行输入`IDLE3`打开python3 IDLE。

- Python豆瓣源`https://pypi.douban.com/simple/`。

  ``` sh
  pip install -i https://pypi.douban.com/simple/ 安装包名
  pip list # 查看安装情况
  ```

- 编辑器(VSCode)插件及扩展

  [用VSCode写python的插件推荐](https://www.jianshu.com/p/5ba8586c7819)，[用VSCode写python的正确姿势](https://www.cnblogs.com/0to9/p/6361474.html)。

- 附[Windows下资源包](https://www.lfd.uci.edu/~gohlke/pythonlibs/)，解决安装错误，下载好直接pip链到安装目录即可。

## 虚拟环境安装及配置

- 基于不同Python版本的管理工具`virtualenv`。

  ```sh
  pip3 install virtualenv

  # -p 指定Python不同版本安装包路径
  virtualenv testpath

  cd testpath/bin
  # 进入
  source activate
  # 退出
  deactivate
  ```

- **虚拟环境管理工具`virtualenvwrapper`（virtualenv加强版）**

  优势在于不需要区别于不同平台而执行不同的命令，亦无需每次cd到环境目录下执行激活。

  ```sh
  pip3 install virtualenvwrapper

  sudo find / -name 'virtualenvwrapper.sh'
  # 找到 /Library/Frameworks/Python.framework/Versions/3.6/bin/virtualenvwrapper.sh

  # 编辑环境变量
  vim ~/.bash_profile

  # which python3 的输出，这个不配置会报以下错误/usr/local/opt/python@2/bin/python2.7: No module named virtualenvwrapper
  export VIRTUALENVWRAPPER_PYTHON=/Library/Frameworks/Python.framework/Versions/3.6/bin/python3
  # 虚拟环境保存位置，不同于项目目录，每当创建新环境，都会在这个目录(WORKON_HOME=~/.virtualenvs)
  export WORKON_HOME=$HOME/.virtualenvs
  # 上一步找到的source路径，这个不配置相关命令行无法使用
  source /Library/Frameworks/Python.framework/Versions/3.6/bin/virtualenvwrapper.sh

  # 最后，执行完后重启命令行窗口
  source ~/.bash_profile
  ```

  - 使用方式
    - 列出所有虚拟环境 workon
    - 创建基本环境 mkvirtualenv [环境名]
    - 创建基本环境（指定安装路径） mkvirtualenv --python=/Library/Frameworks/Python.framework/Versions/3.6/bin/python3 [环境名]
    - 创建基本环境（指定安装路径） mkvirtualenv -p /Library/Frameworks/Python.framework/Versions/3.6/bin/python3 [环境名]
    - 激活环境 workon [环境名]
    - 退出环境 deactivate [环境名]
    - 删除环境 rmvirtualenv [环境名]

  附：VScode配置（virtualenvwrapper）

  ```md
  # 编辑settings。json
  "python.venvPath": "~/.virtualenvs",
  "python.venvFolders": [
      "envs",
      ".pyenv",
      ".direnv",
      ".env"
  ],
  # 然后，shift+command+p打开命令面板，输入Python: Select Interpreter，选择虚拟环境
  ```

## 字符串编码

  1. 计算机只能处理数字，文本转换为数字才能处理。计算机中8个`bit`作为一个`字节`，所以一个字节表示的最大数字就是`255`。
  2. 美国人设计计算机语言时，`一个字节就可以表示所有的字符`，所以`ASCII`（一个字节）编码成为了美国人的标准编码。
  3. 由于中文不止255个汉字，所以中国制定了`GB2312`编码，`用两个字节表示一个汉字`，2^16-1之多。并把ASCII包含进去了。随后世界范围上，编码标准开始混乱。
  4. 终结者：`unicode`出现了，将所有语言统一到一套编码。

      来看一下ASCII和unicode编码：
      - 字母A用ASCII编码，十进制是65，二进制是0100 0001。
      - 汉字“中”已超出ASCII编码的范围，用unicode编码是20013，二进制是01001110 00101101。
      - 字母A用unicode编码只需要在前面补0，二进制是00000000 01000001。

      unicode随之带来的问题，如果全是英文，unicode编码比ASCII多一倍的存储空间和损失的传输效率。
  5. 可变长的编码`utf-8`，英文1个字节，汉字3个字节，特别生僻的变成4-6个字节。如果传输大量的英文，utf-8的作用就很明显了。

  **内存中以“Unicode编码”，文件中以“UTF-8编码”；**

  **文件读取：转换为unicode编码(decode)，文件保存：转换为utf-8编码(encode)**。

  [不要在MySQL中使用UTF-8](https://mp.weixin.qq.com/s/lnbkyJbPW5NIczum_5mlTg)

  `Python2`中`中文字符串`，在window是gb2312，在linux是utf-8；该环境下，下方例子会报错。

  ``` py
  s = '我用python'
  su = u'我用python'
  s.encode('utf-8') # 会报错
  s.decode('utf-8').encode('utf-8') # 这样才对
  ```
  
  `Python3`中所有字符已经全内置为unicode了。

## 函数的多态

- [Design Pattern: Not Just Mixin Pattern](http://www.cnblogs.com/fsjohnhuang/p/4634039.html)
- [关于python中多态的理解](https://www.cnblogs.com/opw3n/p/8035297.html)
