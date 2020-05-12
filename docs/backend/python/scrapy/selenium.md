---
title: 'selenium'
date: '2019-12-22'
---

## selenium模拟登陆

出发点：1.现在很多网站是动态网站（即数据通过JS动态加载），这时仅分析`.html`文件就不再适用了；2.
若大量请求只请求html，我们要绕过因之的反爬策略；那么通过`selenium`或`phantomjs`完全模拟浏览器操作可以满足爬虫需求。

- [Chrome驱动下载](http://chromedriver.storage.googleapis.com/index.html)

  <details>
  <summary>selenium模拟登陆知乎接口异常——解决方案</summary>

  在使用chromedriver模拟登陆按钮的点击事件时，会有如下报错，原因是知乎识别了该Chrome驱动。

  ```sh
  {
  error: {code: 10001, message: "10001:请求参数异常，请升级客户端后重试"}
  }
  ```

  原因：`chromedriver`中有一些js变量或请求头被识别，解决方式就是绕过检查。

  解决；以下两种方式均可：
  - （常用）手动启动chromedriver，再行以selenium接管。
    1. 启动Chrome的远程调试（注意：执行该步骤前，必须确保已关闭退出Chrome浏览器）。

      ```sh
      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
      ```

      此时，访问`http://127.0.0.1:9222/json`有返回即表示启动成功。
      > 注意，Chrome version79在登录知乎时，调试模式下仍然无法成功，这里是通过降级至V73，并禁止Chrome的自动更新解决的。
      [附Mac Chrome历史版本](https://www.applex.net/downloads/google-chrome-for-mac.25/history)

      ```sh
      # Chrome版本查看
      google-chrome --version
      # 禁止Chrome的自动更新
      cd ~/Library/Google
      sudo chown root:wheel GoogleSoftwareUpdate
      ```

    2. 创建`webdriver.Chrome`实例时，增加配置

      ```py
        from selenium.webdriver.chrome.options import Options
        options = Options()

        options.add_argument("--disable-extensions")
        options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")

        browser = webdriver.Chrome(
            executable_path='/Users/a/Documents/pythonCode/ScrapyDemo/chromedriver',
            chrome_options=options
        )
      ```

  - 使用`Chrome60`版本、`driver2.33`。

  </details>
