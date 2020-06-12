---
title: '渲染流程：解析与阻塞'
date: '2020-6-1'
---

<!-- 1. 浏览器会解析三种：
    - HTML/SVG/XHTML。以之构建`DOM Tree`（Webkit有三个C++类对应这三类文档）。
    - CSS。以之解析为`Style Rules`。
    - JavaScript，脚本语言，主要通过`DOM API`和`CSSOM API`来操作`DOM Tree`和`CSS Rule Tree`（本章节会略过JS部分，以后会详述JS的Event Loop机制及介入渲染）。
2. 解析完成后，Render进程会通过`DOM Tree`和`CSS Rule Tree`来构造`Rendering Tree`。
    - Rendering Tree 渲染树并不等同于DOM树，因为一些像Header或display:none的东西就没必要放在渲染树中了。
    - CSS 的 Rule Tree主要是为了完成匹配并把CSS Rule附加上Rendering Tree上的每个Element。也就是DOM结点。也就是所谓的Frame。
    - 然后，计算每个Frame（也就是每个Element）的位置，这又叫layout和reflow过程。
3. 最后通过调用操作系统`Native GUI线程`的API绘制。 -->

## 浏览器内核渲染引擎简介

- 浏览器内核可以分成两部分：渲染引擎（`Layout Engine`或者`Rendering Engine`）和`JS引擎`；随着`JS引擎`越来越独立，`内核`也成了`渲染引擎`的代称。
- 渲染引擎包括：HTML解释器、CSS解释器、布局、网络、存储、图形、音视频、图片解码器等。

现代浏览器内核一般是这四种：Trident（IE）、Gecko（火狐）、Blink（Chrome、Opera）、Webkit（Safari）。

尽管Chrome内核早已迭代为了`Blink`。但是后者也是基于`Webkit`衍生而来的，因此，`Webkit`内核可称最流行。

## 浏览器渲染过程解析

浏览器器内核拿到内容后，渲染大概可以划分成以下几个步骤：

1. 解析HTML，构建`DOM Tree`。
2. 解析CSS，生成`CSS Rule Tree`。
3. 合并DOM树和CSS规则，生成`Rendering Tree`。
4. 布局渲染树（Layout/reflow），负责各元素尺寸、位置的计算。
5. 绘制渲染树（paint），绘制页面像素信息。
6. 浏览器会将各层的信息发送给GPU，GPU会将各层合成（composite），显示在屏幕上

### 构建DOM树

**通过解析HTML，将HTML转换为浏览器能够理解的结构——DOM树。**

解析HTML到构建出DOM数过程可以简述如下：

Bytes → characters → tokens → nodes → DOM

以该demo为例
