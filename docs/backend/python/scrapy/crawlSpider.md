---
title: 'CrawlSpider调用流程'
date: '2020-01-06'
---

> [官网链接](https://docs.scrapy.org/en/latest/topics/spiders.html#crawlspider)、
[中文网站链接](https://www.osgeo.cn/scrapy/topics/spiders.html#crawlspider)
Scrapy V1.8.0

## 流程

1. `CrawlSpider`继承自`Spider`，后者入口函数为`start_requests`，该函数返回没有`callback实参`，
执行后将`yield`进前者的`parse`函数。
2. 进入`CrawlSpider类`。
    - `parse`函数简单调用了`_parse_response`函数，后者逻辑中可以自定义`返回拦截器：process_results`。
    - 随后进入`_requests_to_follow`逻辑，开始调用`自定义的rules（可迭代，元素为Rule实例）`。

      ```py
      # 官网案例
      rules = (
        # Extract links matching 'category.php' (but not matching 'subsection.php')
        # and follow links from them (since no callback means follow=True by default).
        Rule(LinkExtractor(allow=('category\.php', ), deny=('subsection\.php', ))),
      )
      ```

      并将`response`交给`LinkExtractor实例（可以根据传入的参数，做预处理）`，后者调用`extract_links`抽取全部`link`，在对每个link`yield Request()`时添加`_response_downloaded`回调参数。

      <details>
      mmary>LinkExtractor类</summary>

      ```py
      # Top-level imports
      # from .lxmlhtml import LxmlLinkExtractor as LinkExtractor
      class LxmlLinkExtractor(FilteringLinkExtractor):
          def __init__(self, allow=(), deny=(), allow_domains=(), deny_domains=(), restrict_xpaths=(),
                      tags=('a', 'area'), attrs=('href',), canonicalize=False,
                      unique=True, process_value=None, deny_extensions=None, restrict_css=(),
                      strip=True, restrict_text=None):
              tags, attrs = set(arg_to_iter(tags)), set(arg_to_iter(attrs))
              tag_func = lambda x: x in tags
              attr_func = lambda x: x in attrs
              lx = LxmlParserLinkExtractor(
                  tag=tag_func,
                  attr=attr_func,
                  unique=unique,
                  process=process_value,
                  strip=strip,
                  canonicalized=canonicalize
              )

              super(LxmlLinkExtractor, self).__init__(lx, allow=allow, deny=deny,
                                                      allow_domains=allow_domains, deny_domains=deny_domains,
                                                      restrict_xpaths=restrict_xpaths, restrict_css=restrict_css,
                                                      canonicalize=canonicalize, deny_extensions=deny_extensions,
                                                      restrict_text=restrict_text)

          def extract_links(self, response):
              # get_base_url函数中，会调用urllib.parse.urljoin拼接（域名+路径）
              base_url = get_base_url(response)
              # 若传入restrict_xpaths，只扫描由这些xpath选择的文本中的链接
              if self.restrict_xpaths:
                  docs = [subdoc
                          for x in self.restrict_xpaths
                          for subdoc in response.xpath(x)]
              else:
                  docs = [response.selector]
              all_links = []
              for doc in docs:
                  links = self._extract_links(doc, response.url, response.encoding, base_url)
                  all_links.extend(self._process_links(links))
              return unique_list(all_links)
      ```

      </details>

    - `_response_downloaded`通过索引取到`rule（Rule实例）`，继续`yield Request()`时添加`rule.callback`回调参数，即用户自定义业务逻辑；并深度优先，再次调用`_parse_response`。

## 源码

```py
class CrawlSpider(Spider):

    rules = ()

    def __init__(self, *a, **kw):
        super(CrawlSpider, self).__init__(*a, **kw)
        self._compile_rules()

    def parse(self, response):
        '''
        业务逻辑不应再override parse函数！！！
        在Spider.start_requests yield出一个Request实例后，将走入该处逻辑。

        函数调用及实参的语义如下：
        self._parse_response  crawlSpider的核心函数
        self.parse_start_url  回调函数，业务逻辑一般会重载该函数
        cb_kwargs 回调函数的入参
        '''
        return self._parse_response(response, self.parse_start_url, cb_kwargs={}, follow=True)

    def parse_start_url(self, response):
        '''
        @Override：一般业务逻辑可以重载该方法
        该函数的语义类似于 parse函数 的职能，同时可以 return出 Request
        '''
        return []

    def process_results(self, response, results):
        '''
        @Override
        一般业务逻辑可以重载该方法
        该函数的语义类似于 response 的拦截器
        '''
        return results

    def _build_request(self, rule, link):
        '''
        rule：Rule实例的索引
        link：单个link
        '''
        r = Request(url=link.url, callback=self._response_downloaded)
        r.meta.update(rule=rule, link_text=link.text)
        return r

    def _requests_to_follow(self, response):
        # 是否HtmlResponse实例
        if not isinstance(response, HtmlResponse):
            return
        # 去重
        seen = set()
        for n, rule in enumerate(self._rules): # 元组化，self._rules可迭代
            # LinkExtractor实例，从response中抽取（extract_links方法）link，去重
            links = [lnk for lnk in rule.link_extractor.extract_links(response)
                     if lnk not in seen]
            # @Override 自定义处理link抽取
            if links and rule.process_links:
                links = rule.process_links(links)
            for link in links:
                seen.add(link)
                request = self._build_request(n, link)
                yield rule._process_request(request, response)

    def _response_downloaded(self, response):
        '''
        深度优先，继续下载link并解析
        '''
        rule = self._rules[response.meta['rule']]
        return self._parse_response(response, rule.callback, rule.cb_kwargs, rule.follow)

    def _parse_response(self, response, callback, cb_kwargs, follow=True):
        '''
        crawlSpider的核心函数
        '''
        # 若定义了response拦截器，将拦截器处理后的 request列表 迭代，并 yield 出去
        if callback:
            cb_res = callback(response, **cb_kwargs) or ()
            cb_res = self.process_results(response, cb_res)

            from scrapy.utils.spider import iterate_spider_output
            for requests_or_item in iterate_spider_output(cb_res):
                yield requests_or_item
        # 核心逻辑
        if follow and self._follow_links: # follow：满足rule的link是否继续跟踪
            for request_or_item in self._requests_to_follow(response):
                yield request_or_item

    def _compile_rules(self):
        '''
        编译所有Rule实例
        '''
        # 浅拷贝，并调用_compile私有方法，过程会将入参赋值给Rule实例属性
        self._rules = [copy.copy(r) for r in self.rules]
        for rule in self._rules:
            rule._compile(self)

    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super(CrawlSpider, cls).from_crawler(crawler, *args, **kwargs)
        spider._follow_links = crawler.settings.getbool(
            'CRAWLSPIDER_FOLLOW_LINKS', True)
        return spider
```
