const frontEnd = [
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
    title: 'Parser：用JS解析JS',
    children: [
      'babel/base',
      'babel/AST',
      'babel/plugin',
    ]
  },
  {
    title: '网络',
    collapsable: false,
    children: [
      'internet/http-cache',
      'internet/cors',
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
  },
  // {
  //   title: 'ReactNative',
  //   children: [
  //     'reactNative/introduction',
  //     'reactNative/debug',
  //     'reactNative/layout',
  //   ]
  // }
];
const sourceCode = [
  ['', 'Introduction']
];
const serverSide = [
  ['', 'Introduction'],
  {
    title: 'Python3',
    children: [
      'python3/base',
      'python3/prdConfig',
    ]
  },
  {
    title: 'Java',
    children: [
      'java/class',
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
  },
  {
    title: 'Scrapy',
    children: [
      'scrapy/base'
    ]
  },
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
const general = [
  ['', 'Introduction'],
  {
    title: '数据结构',
    collapsable: false,
    children: [
      'dataStructure/base',
      'dataStructure/array',
      'dataStructure/linkedList',
      'dataStructure/stack',
      'dataStructure/queue',
      'dataStructure/hashTable',
      'dataStructure/skipList',
      'dataStructure/heap',
      'dataStructure/binarySearchTree',
      'dataStructure/set',
      'dataStructure/map',
      'dataStructure/segmentTree',
      'dataStructure/trie',
      'dataStructure/unionFind',
      'dataStructure/AVL',
      'dataStructure/red-black-tree'
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
];

module.exports = {
  '/frontEnd/': frontEnd,
  '/sourceCode/': sourceCode,
  '/serverSide/': serverSide,
  '/general/': general
}
