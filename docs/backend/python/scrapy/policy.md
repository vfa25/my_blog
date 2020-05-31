---
title: '爬虫常用策略'
date: '2019-11-30'
---

## 爬虫与反爬虫

### 基本概念

- 爬虫：自动获取网站数据的程序，`批量`的获取。
- 反爬虫：以技术手段防止爬虫程序的方法。
- 误伤：反爬技术将普通用户识别为爬虫，如果误伤过高，效果再好也不能用。
  - 以禁止IP为例。如动态IP的场景、或内部局域网一般只有一个或数个对外IP的场景。
- 成本：反爬需要人力和机器成本。
- 拦截：成功拦截爬虫；一般拦截率越高，误伤率越高。

### 反爬虫的目的

- 防止大量的初级爬虫（简单粗暴，不管服务器压力，故意弄挂网站）；
- 数据保护；
- 失控的爬虫：某些情况下，忘记或无法关闭的爬虫；
- 商业竞争对手。

### 爬虫攻防

#### 随机user-agent

- 对Request统一设置请求头的`User-Agent`字段，可通过`scrapy.downloadermiddlewares.useragent.UserAgentMiddleware`中间件、且setting中设置`USER_AGENT`字段的方式实现，其[源码](https://github.com/scrapy/scrapy/blob/master/scrapy/downloadermiddlewares/useragent.py)也很简洁。
- 随机`User-Agent`，可参考[fake-useragent(github)](https://github.com/hellysmile/fake-useragent)，
其维护了一个[User-Agent备选列表](https://fake-useragent.herokuapp.com/browsers/0.1.11)。

#### IP代理池

编写`downloadMiddleware`，定制`process_request`，对`request.mate['proxy']`字段动态设置值，
可选值通过IP代理池随机获取。

- [代理池建表、及随机获取可用的代理URL（github）](https://github.com/vfa25/scrapy_internet_worm/blob/master/tools/crawl_xici_ip.py)
- [西刺免费代理IP_高匿（官网）](https://www.xicidaili.com/nn)
- [scrapy-proxies（github）](https://github.com/aivarsk/scrapy-proxies)

## url去重策略

1. 数据库存储：将访问过的url保存在数据库中（逻辑简单的同时，缺点是效率低）。
2. set直接存储：将访问过的url保存在set中，这样只需要 $O(1)$ 的代价就可以查询url。

    假如存储 $1*10^8$（即1亿）条数据时（已知py3字符串为unicode编码），那么`10^8 * 2byte * 50个字符 / 1024 / 1024 / 1024 = 9G`。
3. **Scrapy默认**——哈希算法后存储：url经过md5等方法哈希后保存到set中。
4. ***（数据结构进阶）*** 借助bitmap——散列表数据结构。该条和第⑤条，对数据结构和算法要求颇高。

    需要自行设计**散列函数**，并处理**散列冲突**。思路就是，**将访问的url通过hash函数映射到某一bit位**。
5. ***（数据结构进阶）*** bloomfilter方法。对bitmap进行改进，多重hash函数降低散列冲突。

    那么理论上，其内存占用为`10^8bit / 1byte为8bit / 1024 / 1024 = 12M`，以Java工具类中的HashMap默认为0.75的装载因子估算，其内存占用也仅20M。

## Request的生成器模式

```py
from urllib import parse

import scrapy
from scrapy import Request

def parse(self, response):
  yield Request(url=parse.urljoin(response.url, next_url),
                  callback=self.parse)
```

general函数语义是个`可停止的函数`。

之所以没有使用`多线程`或`消息队列`，
原因是scrpy是`异步io框架`，
没有多线程（仅相对而言，基于twisted框架的事件回调+回调模式，本质只有单线程，且单线程就可完成高并发；不过为解决同步任务，亦可以启动线程池），
没有引入消息队列。
