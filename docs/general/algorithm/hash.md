---
title: "哈希算法(Hash)"
---

- 定义和原理

**将任意长度的二进制值串映射为固定长度的二进制值串的规则**，后者即`哈希值`。

- 特点
  - 单向哈希。从哈希值不能反向推导出原始数据。
  - 篡改无效。对输入数据非常敏感，哪怕原始数据只修改了一个`Bit`，最后得到的哈希值也大不相同；
  - 散列冲突。散列冲突的概率要很小，对于不同的原始数据，哈希值相同的概率非常小；
  - 执行效率。哈希算法的执行效率要尽量高效，针对较长的文本，也能快速地计算出哈希值。

## 哈希算法应用

1. 安全加密

    常见的hash加密算法如`MD5（MD5 Message-Digest Algorithm，MD5 消息摘要算法）`、`SHA（Secure Hash Algorithm，安全散列算法）`等。

    对用于加密的哈希算法来说，有两点显得格外重要。第一点是很难根据哈希值反向推导出原始数据，第二点是散列冲突的概率要很小——[鸽巢原理](https://wiki.mbalib.com/wiki/鸽巢原理)。

    在实际开发中上，需要权衡破解难度和计算时间。

    **所有的安全措施，只是增加攻击的成本而已。**

    如何防止数据库中的用户信息被脱库？如何存储用户密码这么重要的数据吗？

    - 使用MD5进行加密
    - 字典攻击：如果用户信息被“脱库”，黑客虽然拿到的是加密之后的密文，但可以通过“猜”的方式来破解密码，这是因为，有些用户的密码太简单。
    - 针对字典攻击，可以引入一个盐（salt），跟用户密码组合在一起，增加密码的复杂度。

2. 唯一标识

    对大数据做信息摘要，通过哈希算法，以一个较短的二进制编码来表示很大的数据，以高效检索数据。

3. 数据校验

    根据哈希算法对数据很敏感的特点。通过相同的哈希算法，对文件块逐一求哈希值并比对，以保持完整性和正确的。

4. 散列函数

    - 散列函数作为设计一个散列表的关键。直接关系了散列冲突的概率和散列表的性能。
    - 散列函数的散列算法，关注散列后的值是否平均分布和算法的执行效率。

5. 负载均衡

    会话粘滞（session sticky，需要在同一个客户端上，在一次会话中的所有请求都路由到同一个服务器上）的负载均衡算法实现。

    - 最直接的方法就是，维护一张映射关系表。这张表的内容是客户端 IP 地址或者会话 ID 与服务器编号的映射关系。这种方法简单直观，但也有几个弊端：
      1. 如果客户端很多，映射表可能会很大，比较浪费内存空间；
      2. 客户端下线、上线，服务器扩容、缩容都会导致映射失效，这样维护映射表的成本就会很大。
    - 可以通过哈希算法（轮询调度算法 Round-Robin Scheduling，以CPU处理时间换取内存空间），对客户端 IP 地址或者会话 ID 计算哈希值，`将取得的哈希值与服务器列表的大小进行取模运算`（除留余数法），最终得到的值就是应该被路由到的服务器编号。这样，就可以把同一个 IP 过来的所有请求，都路由到同一个后端服务器上。

6. 数据分片（多机分布式处理）
    - 如何统计“搜索关键词”出现的次数？
      - 案例：假如有 1T 的日志文件，这里面记录了用户的搜索关键词，如何快速统计出每个关键词被搜索的次数？
      - 分析：两个难点，第一个是搜索日志很大，没办法放到一台机器的内存中。第二个难点是，如果只用一台机器来处理这么巨大的数据，处理时间会很长。
      - 解答：**可以先对数据进行分片，然后采用多台机器处理的方法，来提高处理速度**（MapReduce 的基本设计思想）。

        具体的思路是这样的：为了提高处理的速度，用 n 台机器并行处理。从搜索记录的日志文件中，依次读出每个搜索关键词，并且通过哈希函数计算哈希值，然后再跟 n 取模，最终得到的值，就是应该被分配到的机器编号。

        这样，哈希值相同的搜索关键词就被分配到了同一个机器上。也就是说，同一个搜索关键词会被分配到同一个机器上。每个机器会分别计算关键词出现的次数，最后合并起来就是最终的结果。

7. 分布式存储

    - 背景：现在互联网面对的都是海量的数据、海量的用户。为了提高数据的读取、写入能力，一般都采用分布式的方式来存储数据，比如分布式缓存。若有海量的数据需要缓存，所以一个缓存机器肯定是不够的。于是，就需要将数据分布在多台机器上。
    - 做法：该如何决定将哪个数据放到哪个机器上呢？可以借用前面数据分片的思想，即通过哈希算法对数据取哈希值，然后对机器个数取模，这个最终值就是应该存储的缓存机器编号。
    - 痛点来了——扩容。一旦扩容，增加机器，代表着所有的数据都要重新计算哈希值，然后重新搬移到正确的机器上。这样就相当于，缓存中的数据一下子就都失效了。所有的数据请求都会穿透缓存，直接去请求数据库。这样就可能发生[雪崩效应](https://zh.wikipedia.org/wiki/%E9%9B%AA%E5%B4%A9%E6%95%88%E5%BA%94)（缓存层宕掉后，流量会像奔逃的野牛一样，打向后端存储；[防雪崩利器查看：Hystrix](https://segmentfault.com/a/1190000005988895)），压垮数据库。
    - 解决：所以，需要一种方法，使得在新加入一个机器后，并不需要做大量的数据搬移——**一致性哈希算法**。

## 一致性哈希算法

解决缓存等分布式系统的扩容、缩容导致数据大量搬移的难题。

假设有 k 个机器，数据的哈希值的范围是 [0, MAX]。只需将整个范围划分成 m 个小区间（m 远大于 k），每个机器负责 m/k 个小区间。当有新机器加入的时候，我们就将某几个小区间的数据，从原来的机器中搬移到新的机器中。这样，既不用全部重新哈希、搬移数据，也保持了各个机器上数据数量的均衡。维基百科解释请看[这里](https://en.wikipedia.org/wiki/Consistent_hashing)。

## Reference

- [白话解析：一致性哈希算法 consistent hashing](http://www.zsythink.net/archives/1182)。
