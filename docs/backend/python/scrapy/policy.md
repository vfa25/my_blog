---
title: '爬虫常用策略'
date: '2019-11-30'
---

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
