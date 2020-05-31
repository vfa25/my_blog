---
title: "自动签到"
date: "2019-12-02"
---

Demo场景：某VPN应用每日签到领取流量。

## 需求提出

实现自动打卡，并发送提示邮件。

## 案例分析

1. 191202初版实现：是通过登录接口分析，在登陆成功后获取服务端响应头`set-cookie`字段，通过获取cookie并缓存，在签到接口配置请求头`cookie`字段，实现签到功能。
    - 模仿请求头。可以将请求头`Accept-Encoding`字段去掉，否则服务端会返回gzip格式。
2. 200510新版实现：直接selenium模拟用户登录，且增加对滑动验证码的处理，诸如：
    - 获取canvas图片
    - 像素对比，确定滑动验证码图片缺失位置的像素点
    - 模拟滑动轨迹
3. selenium实现截屏。
    - 由于selenium将要移除webdriver.PhantomJS接口，这里使用webdriver.Chrome（[chromedriver下载地址](http://chromedriver.storage.googleapis.com/index.html)），同时需要安装Chrome浏览器。
4. stmp发送通知邮件。
    - 阿里云ECS禁用了基于非SSL/TLS协议的端口号25，可以通过`telnet stmp.163.com 25`查看连接状态。
    这里选用SSL协议，端口号587（465、994都可以）。

## 效果图

<img width="300" src="../../../.imgs/py-demo-checkin.jpeg" />

## python实现

- 安装python依赖：`pillow`（Image）、`selenium`。
- 新的目标站点增加了滑动验证码，为加快滑动轨迹的速度，需要在`selenium`源码里改个配置（selenium高版本原因，我使用的3.141.0版本未提供参数传入，必须源码修改）

```py
# /usr/local/lib/python3.6/dist-packages/selenium/webdriver/common/actions/pointer_input.py
# ~/.virtualenvs/py3scrapy/lib/python3.6/site-packages/selenium/webdriver/common/actions/pointer_input.py
class PointerInput(InputDevice):

    DEFAULT_MOVE_DURATION = 2 # 改默认值250为2，酌情修改
```

- py请求文件（新版增加了对滑动验证码的处理）

```py
import time
import smtplib
import base64
from random import randint
from io import BytesIO
from PIL import Image
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
# from password import my_password

my_password = {
    "email": "xx",
    "chaoxi": "xx"
}


class Checkin:
    def __init__(self):
        self.smtp_server = 'smtp.163.com'  # smtp服务
        self.smtp_port = 587  # SSl协议下的端口号
        self.user = 'heermosi39@163.com'  # 登录账号
        self.pw = my_password['email']  # 登录密码
        self.sender = 'heermosi39@163.com'  # 邮件发送账号
        self.receive = ['heermosi39@163.com', 'xxx']  # 邮件接收账号
        self.msg = '提示信息'  # 邮件内容
        self.chaoxi_username = "xxx@163.com"  # 潮汐账号
        self.send_status = 0
        # 模拟body标签的鼠标滑动轨迹：在实操时，发现滑动验证码触发按钮点击前，有个提前scroll到目标位置、并触发鼠标移动事件的机制
        self.mouse_move_track = self.drag_operation(100)

        self.domain = 'chaoxi.us'
        self.login_url = 'https://chaoxi.us/auth/login'
        self.checkin_url = 'https://chaoxi.us/user'

    def generalDriver(self):
        '''
        配置Chrome选项
        '''
        options = Options()
        options.add_argument('--no-sandbox')
        options.add_argument('--headless')
        options.add_argument('--kiosk')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('disable-infobars')
        options.add_argument('window-size=1366x1800')
        options.add_argument('lang=zh_CN.UTF-8')
        user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36'
        options.add_argument('user-agent=%s' % user_agent)

        options.binary_location = "/usr/bin/google-chrome"
        chrome_driver_binary = '/home/xxx/py_checkin/chromedriver'
        # options.binary_location = "~/Desktop/Google Chrome.app/Contents/MacOS/Google Chrome"
        # chrome_driver_binary = './chromedriver'
        self.browser = webdriver.Chrome(
            executable_path=chrome_driver_binary, chrome_options=options)

    def loginAndCheckin(self):
        '''
        模拟登录及签到
        '''
        self.action = ActionChains(self.browser)
        try:
            self.browser.maximize_window()
        except:
            pass

        # 模拟登陆，并记录滑动验证码验证次数
        login_count = 0

        while not self.is_finished_validate():
            if login_count >= 20:
                raise Exception('登录页面，调起滑动验证码已失败20次，程序终止')
            login_count += 1
            print('登录页面，第{}次验证滑动验证码。'.format(login_count))
            self.browser.get(self.login_url)
            self.mouse_validate(200)
            email_ele = self.browser.find_element_by_css_selector('#email')
            password_ele = self.browser.find_element_by_css_selector('#passwd')
            email_ele.send_keys(self.chaoxi_username)
            password_ele.send_keys(my_password['chaoxi'])
            time.sleep(5)
            try:
                validate_ele = self.browser.find_element_by_css_selector(
                    '.geetest_holder.geetest_wind')
                validate_ele.click()
                time.sleep(3)
                self.though_validate()
            except:
                pass
        print('登录页面，滑动验证码验证成功。')
        login_ele = self.browser.find_element_by_css_selector('#login')
        login_ele.click()
        time.sleep(7)

        # 模拟签到，并记录滑动验证码验证次数
        check_count = 0
        while not self.is_finished_validate():
            if check_count >= 20:
                raise Exception('签到页面，调起滑动验证码已失败20次，程序终止。')
            check_count += 1
            print('签到页面，第{}次验证滑动验证码。'.format(check_count))
            self.browser.get(self.checkin_url)
            self.mouse_validate(600)
            try:
                validate_ele = self.browser.find_element_by_css_selector(
                    '.geetest_holder.geetest_wind')
                validate_ele.click()
                time.sleep(3)
                self.though_validate()
            except:
                pass
        print('签到页面，滑动验证码验证成功。')
        time.sleep(5)
        self.msg = '签到成功。详情请查看截图。'
        try:
            msg_str = self.browser.find_element_by_css_selector('#msg').text
            if msg_str:
                self.msg = '签到成功。{}'.format(msg_str)
        except:
            pass

        try:
            msg_str = self.browser.find_element_by_css_selector(
                '#checkin-msg').text
            if msg_str:
                self.msg = '签到成功。{}'.format(msg_str)
        except:
            pass

        try:
            result_ok_ele = self.browser.find_element_by_css_selector(
                '#result_ok')
            result_ok_ele.click()
            time.sleep(2)
        except:
            pass

        try:
            checkin_ele = self.browser.find_element_by_css_selector('#checkin')
            checkin_ele.click()
        except:
            pass
        self.msg = '''<p style="color:#52c41a;">{}</p><br/>
        <p style="color:#1890ff">本次通过滑动验证码，登录页面共尝试了{}次、签到页面共尝试了{}次。</p>
        '''.format(self.msg, login_count, check_count)

        self.browser.execute_script(
            'document.documentElement.scrollTop = 0;')

    def mouse_validate(self, scrollTop):
        # 触发body标签的鼠标移动。实操发现：滑动验证码的按钮，必须先显示，后续才能点击出来
        self.browser.execute_script(
            'document.documentElement.scrollTop = {};'.format(scrollTop))
        body = self.browser.find_element_by_css_selector('body')
        ActionChains(self.browser).move_to_element(body).perform()
        for x in self.mouse_move_track:
            ActionChains(self.browser).move_by_offset(
                xoffset=x, yoffset=x).perform()
        time.sleep(0.5)
        ActionChains(self.browser).release().perform()
        time.sleep(2)

    def though_validate(self):
        # 获取验证码canvas图片
        img_info1 = self.browser.execute_script(
            'return document.querySelector(".geetest_canvas_fullbg.geetest_fade.geetest_absolute").toDataURL("image/png");')
        image1 = self.get_image(img_info1, 'chatcha1.png')
        img_info2 = self.browser.execute_script(
            'return document.querySelector(".geetest_canvas_bg.geetest_absolute").toDataURL("image/png");')
        image2 = self.get_image(img_info2, 'chatcha2.png')
        # 获取拖动距离
        drag_distance = self.img_contrast(image1, image2)
        # 随机拖动曲线
        drag_track = self.drag_operation(drag_distance)

        slider = self.browser.find_element_by_css_selector(
            '.geetest_slider_button')
        ActionChains(self.browser).click_and_hold(slider).perform()
        for x in drag_track:
            ActionChains(self.browser).move_by_offset(
                xoffset=x, yoffset=0).perform()
        time.sleep(0.5)
        ActionChains(self.browser).release().perform()
        time.sleep(3)

    def is_finished_validate(self):
        try:
            self.browser.find_element_by_css_selector(
                '.geetest_ghost_success.geetest_success_animate')
            return True
        except:
            return False

    def get_image(self, base64_str, image_file_name):
        # 获取验证码图片
        img_base64 = base64_str.split(',')[1]
        img_bytes = base64.b64decode(img_base64)
        img = Image.open(BytesIO(img_bytes))
        # img.save(image_file_name)
        return img

    def img_contrast(self, image1, image2):
        # 图片对比
        left = 60
        has_find = False
        for i in range(left, image1.size[0]):
            if has_find:
                break
            for j in range(image1.size[1]):
                if not self.compare_pixel(image1, image2, i, j):
                    left = i
                    has_find = True
                    break

        left -= 6
        return left

    def compare_pixel(self, image1, image2, i, j):
        # 判断两个像素是否相同，RGB
        pixel1 = image1.load()[i, j]
        pixel2 = image2.load()[i, j]
        threshold = 60
        if abs(pixel1[0] - pixel2[0]) < threshold and abs(pixel1[1] - pixel2[1]) < threshold and abs(pixel1[2] - pixel2[2]) < threshold:
            return True
        return False

    def drag_operation(self, distance):
        '''
        开始加速，然后减速，生长曲线，且加入随机变动
        '''
        # 移动轨迹
        track = []
        # 当前位移
        current = 0
        # 减速阈值
        mid = distance * 3 / 4
        # 间隔时间
        t = 0.1
        v = 0
        while current < distance:
            if current < mid:
                a = randint(2, 3)
            else:
                a = - randint(6, 7)
            v0 = v
            # 当前速度
            v = v0 + a * t
            # 移动距离
            move = v0 * t + 1 / 2 * a * t * t
            # 当前位移
            current += move
            track.append(round(move))

        return track

    def screen(self):
        '''
        截屏
        '''
        # self.browser.execute_script(
        #     'window.location.href="{}";'.format(self.checkin_url))
        self.browser.maximize_window()
        time.sleep(2)
        try:
            picture_url = self.browser.get_screenshot_as_png()
            print('截图成功！！！')
        except BaseException as msg:
            print(msg)
        self.browser.quit()
        return picture_url

    def setMessage(self, pic):
        '''
        拼接邮件的提示内容及截图附件
        '''
        msg = MIMEMultipart(_subtype='mixed')
        msg['Subject'] = 'VPN签到'
        msg['From'] = self.sender
        msg['To'] = ','.join(self.receive)
        text = MIMEText(
            '<html><p>{}<p></html>'.format(self.msg), 'html', 'utf-8')
        msg.attach(text)
        if pic:
            pic = BytesIO(pic).getvalue()
            img = MIMEImage(pic)
            img['Content-Disposition'] = 'attachment; filename="detail.png"'
            msg.attach(img)
        return msg.as_string()

    def sendEmail(self, msg):
        '''
        发送邮件
        '''
        try:
            smtp = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            smtp.ehlo()
            smtp.login(self.user, self.pw)
            self.send_status = smtp.sendmail(self.sender, self.receive, msg)
            smtp.quit()
        except BaseException as msg:
            print(msg)


if __name__ == '__main__':
    print()
    print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
    try:
        checkin = Checkin()
        checkin.generalDriver()
        frame = None
        try:
            checkin.loginAndCheckin()
            frame = checkin.screen()
        except Exception as err:
            print(err)
            err_str = ','.join(err.args)
            frame = checkin.screen()
            checkin.msg = '<span style="color:#ff4d4f;">自动签到失败！！！提示信息：{}</span>'.format(
                err_str)
        message = checkin.setMessage(frame)
        checkin.sendEmail(message)
        print('邮件发送成功')
    except BaseException as msg:
        print(msg)

```

<details>
<summary>第一版（无滑动验证码）</summary>

```py
import time
import json

import smtplib
from io import BytesIO
from PIL import Image
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import requests
from requests.cookies import RequestsCookieJar


class Checkin:
    def __init__(self):
        self.smtp_server = 'smtp.163.com' # smtp服务
        self.smtp_port = 587 # SSl协议下的端口号
        self.user = 'heermosi39@163.com' # 登录账号
        self.pw = 'xxx' # 登录密码
        self.sender = 'heermosi39@163.com'  # 邮件发送账号
        self.receive = 'heermosi39@163.com' # 邮件接收账号
        self.msg = '提示信息' # 邮件内容
        self.send_status = 0

        self.login_url = 'https://chaoxi.website/auth/login'
        self.checkin_url = 'https://chaoxi.website/user/checkin'
        self.login_headers = {'accept': 'application/json, text/javascript, */*; q=0.01', 'accept-language': 'zh-CN,zh;q=0.9', 'cache-control': 'no-cache', 'content-length': '0', 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'origin': 'https://chaoxi.website', 'pragma': 'no-cache',
                              'referer': 'https://chaoxi.website/auth/login', 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin', 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36', 'x-requested-with': 'XMLHttpRequest'}
        self.checkin_headers = {'accept': 'application/json, text/javascript, */*; q=0.01', 'accept-language': 'zh-CN,zh;q=0.9', 'cache-control': 'no-cache', 'content-length': '0', 'origin': 'https://chaoxi.website', 'pragma': 'no-cache', 'referer': 'https://chaoxi.website/auth/login',
                                'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin', 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36', 'x-requested-with': 'XMLHttpRequest'}


    def generalDriver(self):
        '''
        配置Chrome选项
        '''
        options = Options()
        options.add_argument('--no-sandbox')
        options.add_argument('--headless')
        options.add_argument('--kiosk')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('disable-infobars')
        options.add_argument('window-size=1366x1800')
        options.add_argument('lang=zh_CN.UTF-8')
        user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36'
        options.add_argument('user-agent=%s'%user_agent)
        prefs = {
            'profile.default_content_setting_values': {
                'images': 2
            }
        }
        options.add_experimental_option('prefs', prefs)

        # options.binary_location = "/usr/bin/google-chrome"
        # chrome_driver_binary = '/home/xxx/test_py/chromedriver'
        options.binary_location = "/Users/nsky/Desktop/Google Chrome.app/Contents/MacOS/Google Chrome"
        chrome_driver_binary = './chromedriver'
        self.driver = webdriver.Chrome(
            executable_path=chrome_driver_binary, chrome_options=options)

    def loginAndCheckin(self):
        '''
        登录及签到接口调用
        '''
        payload = {'email': self.user, 'passwd': 'xxx', 'code': ''}
        login_res = requests.post(
            url=self.login_url, data=payload, headers=self.login_headers)
        cookie_jar = RequestsCookieJar()
        resd = requests.utils.dict_from_cookiejar(login_res.cookies)

        self.driver.get("https://chaoxi.website/auth/login")
        # cookie写入
        for key in resd:
            self.driver.add_cookie(
                cookie_dict={'name': key,
                             'value': resd[key],
                             'domain': 'chaoxi.website'}
            )
            cookie_jar.set(key, resd[key], domain='chaoxi.website')

        checkin_res = requests.post(
            url=self.checkin_url, headers=self.checkin_headers, cookies=cookie_jar)
        status = checkin_res.status_code
        message = json.loads(checkin_res.text)['msg']
        status_msg = '成功' if status == 200 else '失败'
        self.msg = '接口调用{}，状态码{}，提示信息：{}'.format(status_msg, status, message)

    def screen(self):
        '''
        截屏
        '''
        self.driver.execute_script('window.location.href="https://chaoxi.website/user";')
        self.driver.maximize_window()
        time.sleep(2)
        try:
            picture_url = self.driver.get_screenshot_as_png()
            print('截图成功！！！')
        except BaseException as msg:
            print(msg)
        self.driver.quit()
        return picture_url

    def setMessage(self, pic):
        '''
        拼接邮件的提示内容及截图附件
        '''
        msg = MIMEMultipart(_subtype='mixed')
        msg['Subject'] = 'VPN签到'
        msg['From'] = self.sender
        msg['To'] = self.receive
        text = MIMEText(
            '<html><p>{}<p></html>'.format(self.msg), 'html', 'utf-8')
        msg.attach(text)
        pic = BytesIO(pic).getvalue()
        img = MIMEImage(pic)
        img['Content-Disposition'] = 'attachment; filename="detail.png"'
        msg.attach(img)
        return msg.as_string()

    def sendEmail(self, msg):
        '''
        发送邮件
        '''
        try:
            smtp = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            smtp.ehlo()
            smtp.login(self.user, self.pw)
            self.send_status = smtp.sendmail(self.sender, self.receive, msg)
            smtp.quit()
        except BaseException as msg:
            print(msg)


if __name__ == '__main__':
    print()
    print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
    try:
        checkin = Checkin()
        checkin.generalDriver()
        checkin.loginAndCheckin()
        frame = checkin.screen()
        message = checkin.setMessage(frame)
        checkin.sendEmail(message)
        print('邮件发送成功')
    except BaseException as msg:
        print(msg)
```

</details>

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

# 意为每年每月每天08:00 执行/home/xx/myfile/checkin.py文件，并将print的控制台打印，以标准输出，追加到/home/xx/myfile/checkin.log文件
00 08 * * * python3 /home/xx/myfile/checkin.py 0 >> /home/xx/myfile/checkin.log
```

## Reference

- [Python3+Selenium 配置Chrome选项](https://www.cnblogs.com/clement-jiao/p/10889234.html)
- [linux解决xhost: unable to open display ""](https://www.cnblogs.com/gaosq/p/8965155.html)
- [Linux crontab命令：循环执行定时任务（详解版）](http://c.biancheng.net/view/1092.html)
- [Shell 输入/输出重定向](https://www.runoob.com/linux/linux-shell-io-redirections.html)
- [Python Django MySQL，时区、日期、时间戳（USE_TZ=True时的时间存储问题）](https://www.cnblogs.com/shilxfly/p/9436981.html)
