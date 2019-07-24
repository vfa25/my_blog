module.exports = {
  base: '/doc/',
  dest: 'dist',
  title: '日常手记',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  description: '一起愉快的coding吧',
  themeConfig: {
    editLinks: false,
    docsDir: 'docs',
    nav: [],
    sidebar: [
      {
        title: '开场白',
        collapsable: false,
        children: [
          ['nav/', 'Introduction']
        ]
      },
      {
        title: 'Python3',
        collapsable: false,
        children: [
          'python3/base',
          'python3/function'
        ]
      },
      {
        title: 'Django',
        collapsable: false,
        children: [
          'django/base',
          'django/rest_framework',
        ]
      },
      {
        title: 'Nginx',
        collapsable: false,
        children: [
          'nginx/base'
        ]
      },
      {
        title: '数据结构',
        collapsable: false,
        children: [
          'dataStructure/base',
          'dataStructure/array',
          'dataStructure/linkedList',
          'dataStructure/stack',
          'dataStructure/queue',
          'dataStructure/skipList',
        ]
      },
      {
        title: '算法',
        collapsable: false,
        children: [
          'algorithm/base',
          'algorithm/recursion',
          'algorithm/sort',
          'algorithm/binarySearch',
        ]
      },
      {
        title: 'Web 安全',
        collapsable: false,
        children: [
          'webSafe/xsrf',
          'webSafe/other'
        ]
      },
      {
        title: '服务器配置（操作系统Ubuntu）',
        collapsable: false,
        children: [
          'server/base',
          'server/account',
          'server/safe',
          'server/env',
          'server/nginx',
          'server/domainName',
          'server/pm2',
          'server/database',
        ]
      },
      {
        title: 'Scrapy',
        collapsable: false,
        children: [
          'scrapy/base'
        ]
      },
      // {
      //   title: 'ReactNative',
      //   collapsable: false,
      //   children: [
      //     'reactNative/introduction',
      //     'reactNative/debug',
      //     'reactNative/layout',
      //     'reactNative/navigation'
      //   ]
      // }
    ]
  }
}
