---
title: "网络协议"
date: "2019-12-02"
---

**互联网，实际上是一套理念和协议组成的体系架构。**

## 互联网的五层协议栈

![五层协议栈示意](../../../.imgs/protocol-stack.png)

1. 应用层：构建于TCP协议之上,屏蔽网络传输细节
2. 传输层：提供可靠的端对端服务,屏蔽下层数据通信的细节
3. 网络层：为数据在结点之间传输创建逻辑链路
4. 数据链路层：在通信实体间建立数据链路连接
5. 物理层：利用物理介质传输比特流.网卡端口,网线光缆之类

```md
也有一个完整的OSI七层框架：物理层、数据链路层、网络层、传输层、会话层、表示层、应用层
  表示层：主要处理两个通信系统中交换信息的表示方式。包括数据格式交换、数据加密与解密、数据压缩与终端类型转换等
  会话层：具体管理不同用户和进程之间的对话，如控制登陆和注销过程
HTTP/2在应用层之上还有：二进制分帧层
```

## 数据传输流程

计算机的地址即IP（Internet Protocol）地址，访问任何网站实际上只是一个计算机向另外一台计算机请求信息。
这里以HTTP协议（应用层）、TCP协议（传输层）为例（二者同是TCP/IP协议簇的子集）。

![HTTP/TCP数据传输流程](../../../.imgs/transmission-process.png)

请求方要发送的数据包，需要经过一个通道，即`TCP连接`。一个完整的TCP连接的生命周期包括了`建立连接`、`传输数据`和`断开连接`三个阶段。
所以在HTTP工作开始之前，请求方需要通过TCP与应答方建立连接，
然后在TCP的传输数据阶段来实现HTTP的内容传输（依据HTTP规范构建和解析HTTP报文、顺序收发）。

- 一个数据包的传输过程
  - 请求方在**应用层**加上`HTTP头`后会交给**传输层**，后者增加`TCP头`（包含用于排序的序列号、目标端口和本机端口号），
  并在**网络层**增加[IP头](https://zh.wikipedia.org/wiki/传输控制协议)（包含源IP地址、目标IP地址、生存时间等），组成新的`IP数据包`，继续交给底层；
  - 应答方接收到的数据包，在**网络层**`拆开IP头`，并将拆开来的数据部分交给**传输层**；后者`拆掉TCP头`以后交给**应用层**的HTTP协议处理。

- 传输数据阶段
  - **接收确认**：接收端会对每个数据包进行确认操作，在接收到数据包之后，需要发送确认数据包给发送端。
  - **重发机制**：当发送端发送了一个数据包之后，在规定时间内没有接收到接收端反馈的确认消息，则判断为数据包丢失，并触发发送端的重发机制。
  - **Chunk transfer机制**：一个大的数据在传输时，会被拆分成若干个任意大小的数据块，最后使用一个零长度的块作为发送完毕的标志；这些数据包到达接收端后，接收端会按照TCP头中的序号为其排序，从而保证组成完整的数据。
  - **往返时延**：从发送端发送数据包开始，到发送端收到来自接收端的确认，总共经历的时延称为`RTT（Round Trip Time）`，是重要的网络性能指标。
  - **HTTP/1.1中的队头阻塞**：HTTP/1.1时代，Chrome等尝试通过整批发送请求（管线化）的技术去解决`队头阻塞`，但是最终都放弃了。所谓`队头阻塞`，是指在`同一TCP管道`的前提下，需要等待前面的请求返回之后，才能进行下一次请求；一旦前面的请求没有及时返回，那么就会阻塞后面的所有请求。这种不能并行的缺点，在HTTP/2时代通过`多路复用`解决了。
  - **HTTP/2的多路复用机制**
    - 为规避[TCP慢启动](https://zh.wikipedia.org/wiki/TCP拥塞控制)和`多个TCP连接竞争带宽`的现象，一个域名只使用一个TCP长连接来传输数据。
    - 解决HTTP/1.1中的队头阻塞。即在任何时候浏览器都可以发送请求给服务器，而并不需要等待其他请求的完成，然后服务器也可以随时返回处理好的请求给浏览器。

## TCP协议、三次握手和四次挥手

通过协议栈了解到，TCP连接发生在`传输层`。

关于TCP connection的概念。可以理解为: http request不存在连接，只有请求和响应，那么数据包传输的连接通道就是这个TCP连接。

先来看一下三次挥手概念图
![三次握手概念图](../../../.imgs/the-three-handshake.png)

使用`Wireshark`来抓取http请求包

![三次握手四次挥手](../../../.imgs/http-shake-hands.png)

## SSL/TLS协议、握手流程

SSL握手分为[RSA算法](http://www.ruanyifeng.com/blog/2013/06/rsa_algorithm_part_one.html)和[DH(Diffie-Hellman)算法](http://zh.wikipedia.org/wiki/迪菲－赫尔曼密钥交换)，区别会在下文注明。

先来抓一下https请求包（这是个DH算法的SSL协议的接口）：
![https请求包](../../../.imgs/https-shake-hands01.png)

![SSL Handshake(DH) Without Keyless SSL](http://www.ruanyifeng.com/blogimg/asset/2014/bg2014092007.png)

1. 浏览器请求建立SSL链接，并向服务端发送`第一个随机数`–Client random和客户端支持的加密方法，比如RSA加密，此时是明文传输。

    ![第一随机数](../../../.imgs/https-shake-hands02.png)
2. 服务端从中选出一组加密算法与Hash算法，回复`第二个随机数`–Server random，并将自己的身份信息以证书的形式发回给浏览器
  （证书里包含了网站地址，非对称加密的公钥，以及证书颁发机构等信息）。
    <font color=purple size=4>DH算法出于保护`第三个随机数`——`预主秘钥`的思路，将再次发送一个DH参数。</font>

    ![第二随机数](../../../.imgs/https-shake-hands03.png)
    ![证书](../../../.imgs/https-shake-hands04.png)
3. 浏览器收到服务端的证书后
    1. 验证证书的合法性（颁发机构是否合法，证书中包含的网址是否和正在访问的一样），如果证书信任，则浏览器会显示一个小锁头，否则会有提示。
    2. 用户接收证书后（不管信不信任），浏览会生产`第三个随机数`–Premaster secret（预主秘钥），然后证书中的公钥以及指定的加密方法加密`Premaster secret`，发送给服务器。

        <font color=purple size=4>DH算法出于保护Premaster secret的思路，将发送DH参数，而不是加密的`预主秘钥`。</font>

        **那么，RSA算法过于依赖第三个随机数，理论上后者的被破防程度是由公钥的长度决定的。**

        ![客户端发送DH参数](../../../.imgs/https-shake-hands05.png)

        **DH算法即由server发送server的DH参数和签名，client发送client的DH参数，client和server都能分别通过两个DH参数得到`Premaster secret`，以提高其安全性。**
    3. 利用Client random、Server random和Premaster secret通过一定的算法生成HTTP链接数据传输的对称加密key-`session key`。
    4. 使用约定好的HASH算法计算握手消息，并使用生成的`session key`对消息进行加密，最后将之前生成的所有信息发送给服务端。
4. 服务端收到浏览器的回复
    1. 利用已知的加解密方式与自己的私钥进行解密，获取`Premaster secret`。
    2. 和浏览器相同规则生成`session key`。
    3. 使用`session key`解密浏览器发来的握手消息，并验证Hash是否与浏览器发来的一致。
    4. 使用`session key`加密一段握手消息，发送给浏览器。
5. 浏览器解密并计算握手消息的HASH，如果与服务端发来的HASH一致，此时握手过程结束。
6. 之后所有的https通信数据将由之前浏览器生成的session key并利用对称加密算法进行加密。

## Reference

- [从输入URL到页面加载的过程？如何由一道题完善自己的前端知识体系！](https://juejin.im/post/5aa5cb846fb9a028e25d2fb1)
- [SSL/TLS协议运行机制的概述](http://www.ruanyifeng.com/blog/2014/02/ssl_tls.html)
- [图解SSL/TLS协议](http://www.ruanyifeng.com/blog/2014/09/illustration-ssl.html)
- [HTTP/2：如何提升网络速度？（极客时间小册）](https://time.geekbang.org/column/article/148546)