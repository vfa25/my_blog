---
title: "自动签到"
date: "2019-12-02"
---

Demo场景：某VPN应用每日签到领取流量。

## 需求提出

实现自动打卡，并发送提示邮件。

## 案例分析

1. 登录接口分析，在登陆成功后服务端响应头，会设置`set-cookie`字段，以维持浏览器端的登录态。
2. 通过获取cookie并缓存，在签到接口配置请求头`cookie`字段，实现签到功能。
    - 模仿请求头。可以将请求头`Accept-Encoding`字段去掉，否则服务端会返回gzip格式。
3. 发送通知邮件。

## 效果图

![邮件接收效果图](./imgs/py-demo-checkin.png)

## 代码实现

- 安装python依赖：`django`、`requests`。
- py请求文件

```py
import os
# 引入同级目录下的settings.py配置文件
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
import django
django.setup()

import json
import time
import requests
from requests.cookies import RequestsCookieJar
from django.core.mail import send_mail
from settings import EMAIL_FROM


try:
    login_url = 'https://chaoxi.website/auth/login'
    checkin_url = 'https://chaoxi.website/user/checkin'

    headers1 = {'accept': 'application/json, text/javascript, */*; q=0.01','accept-language': 'zh-CN,zh;q=0.9','cache-control': 'no-cache','content-length': '0','content-type': 'application/x-www-form-urlencoded; charset=UTF-8','origin': 'https://chaoxi.website','pragma': 'no-cache','referer': 'https://chaoxi.website/auth/login','sec-fetch-mode': 'cors','sec-fetch-site': 'same-origin','user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36','x-requested-with': 'XMLHttpRequest'}
    headers2 = {'accept': 'application/json, text/javascript, */*; q=0.01','accept-language': 'zh-CN,zh;q=0.9','cache-control': 'no-cache','content-length': '0','origin': 'https://chaoxi.website','pragma': 'no-cache','referer': 'https://chaoxi.website/auth/login','sec-fetch-mode': 'cors','sec-fetch-site': 'same-origin','user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36','x-requested-with': 'XMLHttpRequest'}

    # 写入账密
    payload = {'email': 'xxx','passwd': 'xxx','code': ''}
    login_res = requests.post(url=login_url, data=payload, headers=headers1)
    cookie_jar = RequestsCookieJar()
    resd = requests.utils.dict_from_cookiejar(login_res.cookies)

    for key in resd:
        cookie_jar.set(key, resd[key], domain='chaoxi.website')

    checkin_res = requests.post(url=checkin_url, headers=headers2, cookies=cookie_jar)

    status = checkin_res.status_code
    message = json.loads(checkin_res.text)['msg']

    status_msg = '成功' if status == 200 else '失败'
    
    result = '接口调用{}，状态码{}，提示信息：{}'.format(status_msg, status, message)
except Exception as e:
    result = '接口跪了' + str(e)

# 发送邮件至目标邮箱
send_status = send_mail('VPN签到信息', result, EMAIL_FROM, ['xxx@163.com'])

print()
print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
print(result)
print('短信发送成功' if send_status == 1 else '短信发送失败')
```

- 同级添加setting.py

执行`django-admin startproject myDjango`，将模版默认生成settings.py文件做如下修改。

```py
# log日志打印东八区时间
TIME_ZONE = 'Asia/Shanghai' # 默认'UTC'

# 邮件配置项
EMAIL_HOST = "smtp.163.com"
EMAIL_PORT = 587
EMAIL_HOST_USER = "heermosi39@163.com"
EMAIL_HOST_PASSWORD = "xxx"
EMAIL_USE_TLS = False
EMAIL_USE_SSL = True
EMAIL_FROM = EMAIL_HOST_USER
```

## Linux定时任务

```sh
# 选择编辑器
select-editor
# 输入2。即选择/usr/bin/vim.basic

# 编辑Linux crontab脚本
crontab -e
```

```sh
# Each task to run has to be defined through a single line
# indicating with different fields when the task will be run
# and what command to run for the task
# 
# To define the time you can provide concrete values for
# minute (m), hour (h), day of month (dom), month (mon),
# and day of week (dow) or use '*' in these fields (for 'any').# 
# Notice that tasks will be started based on the cron's system
# daemon's notion of time and timezones.
# 
# Output of the crontab jobs (including errors) is sent through
# email to the user the crontab file belongs to (unless redirected).
# 
# For example, you can run a backup of all your user accounts
# at 5 a.m every week with:
# 0 5 * * 1 tar -zcf /var/backups/home.tgz /home/
# 
# For more information see the manual pages of crontab(5) and cron(8)
# 
# m h  dom mon dow   command

# 意为每年每月每天09:00 执行./myfile/checkin.py文件，并将print的控制台打印，以标准输出，追加到./myfile/checkin.log文件
00 09 * * * python3 myfile/checkin.py 0 >> myfile/checkin.log
```

## 阿里云ECS邮件不能发送debug

阿里云ECS禁用了基于非SSL/TLS协议的端口号25，可以通过`telnet stmp.163.com 25`查看连接状态。

这里选用SSL协议，端口号587（465、994都可以）。

```sh
EMAIL_HOST = "smtp.163.com"
EMAIL_PORT = 587 # 不再使用25
EMAIL_HOST_USER = "heermosi39@163.com"
EMAIL_HOST_PASSWORD = "xxx"
# 下面两项不要同时为True
EMAIL_USE_TLS = False
EMAIL_USE_SSL = True
EMAIL_FROM = EMAIL_HOST_USER
```

## Reference

- [Linux crontab命令：循环执行定时任务（详解版）](http://c.biancheng.net/view/1092.html)
- [Shell 输入/输出重定向](https://www.runoob.com/linux/linux-shell-io-redirections.html)
- [Python Django MySQL，时区、日期、时间戳（USE_TZ=True时的时间存储问题）](https://www.cnblogs.com/shilxfly/p/9436981.html)