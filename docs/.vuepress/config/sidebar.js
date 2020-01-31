const frontendBase = [
  ['', 'Introduction'],
  {
    title: 'JS',
    collapsable: false,
    children: [
      'js/parse',
      'js/module',
    ]
  },
  {
    title: 'ReactNative',
    children: [
      'react-native/nav',
      'react-native/startup',
      'react-native/hybrid',
      'react-native/overview',
      // 'react-native/dispatch',
    ]
  },
  {
    title: '前端性能优化',
    collapsable: false,
    children: [
      'optimize/nav',
      'optimize/01staticAsset',
    ]
  },
  {
    title: 'Parser：用JS解析JS',
    children: [
      'babel/base',
      'babel/AST',
      'babel/plugin',
    ]
  }
];
const reactList = [
  ['', '首页'],
  {
    title: '基础',
    collapsable: false,
    children: [
      'base/reactAPI',
    ]
  },
];
const frontendOther = [
  ['', '首页'],
  {
    title: '网络',
    collapsable: false,
    children: [
      'internet/shake-hands',
      'internet/http-cache',
      'internet/cors',
    ]
  },
  {
    title: '实用小例',
    collapsable: false,
    children: [
      'demo/checkin'
    ]
  },
  {
    title: 'Web 安全',
    children: [
      'webSafe/xsrf',
      'webSafe/xss',
      'webSafe/sqlInject',
      'webSafe/other'
    ]
  }
];
const nodeList = [
  ['', '首页'],
  {
    title: '基础',
    collapsable: false,
    children: [
      'base/base',
      'base/common-js',
      'base/event-loop',
    ]
  },
];
const pythonList = [
  ['', '首页'],
  {
    title: '基础',
    collapsable: false,
    children: [
      'base/base',
      'base/prdConfig',
    ]
  },
  {
    title: 'Python爬虫框架——Scrapy',
    collapsable: false,
    children: [
      'scrapy/base',
      'scrapy/policy',
      'scrapy/selenium',
      'scrapy/crawlSpider'
    ]
  },
  {
    title: 'Django',
    collapsable: false,
    children: [
      'django/base',
      'django/rest_framework',
      'django/loginStatus',
    ]
  }
];
const linuxList = [
  ['', '首页'],
  {
    title: 'Nginx',
    collapsable: false,
    children: [
      'nginx/base',
      'nginx/syntax',
    ]
  },
  {
    title: '服务器配置（操作系统Ubuntu）',
    collapsable: false,
    children: [
      'config/base',
      'config/account',
      'config/safe',
      'config/env',
      'config/nginx',
      'config/domainName',
      'config/pm2',
      'config/database',
    ]
  },
];
const dataStructure = [
  {
    title: '数据结构',
    collapsable: false,
    children: [
      ['', 'Introduction'],
      'array',
      'linkedList',
      'stack',
      'queue',
      'hashTable',
      'skipList',
      'heap',
      'binarySearchTree',
      'set',
      'map',
      'segmentTree',
      'trie',
      'unionFind',
      'AVL',
      'red-black-tree'
    ]
  },
];
const algorithm = [
  {
    title: '算法',
    collapsable: false,
    children: [
      ['', 'Introduction'],
      'recursion',
      'sort',
      'binarySearch',
      'hash',
    ]
  },
];
const algorithmVisualization = [
  ['', 'Introduction'],
  {
    title: '迷宫问题',
    collapsable: false,
    children: [
      'maze/solver',
    ]
  },
]

module.exports = {
  '/frontend/base/': frontendBase,
  '/frontend/other/': frontendOther,
  '/frontend/react/': reactList,
  '/backend/node/': nodeList,
  '/backend/python/': pythonList,
  '/backend/linux/': linuxList,
  '/general/dataStructure/': dataStructure,
  '/general/algorithm/': algorithm,
  '/general/algorithmVisualization/': algorithmVisualization
}
