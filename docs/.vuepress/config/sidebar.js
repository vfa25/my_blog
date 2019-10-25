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
    title: 'ReactNative',
    collapsable: false,
    children: [
      'react-native/nav',
      'react-native/hybrid',
    ]
  },
  {
    title: 'Node',
    collapsable: false,
    children: [
      'node/base',
      'node/event-loop',
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
  }
];
const sourceCode = [
  ['', 'Introduction'],
  {
    title: 'React',
    children: [
      'react/render',
      'react/vdom',
    ]
  }
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

module.exports = {
  '/frontEnd/': frontEnd,
  // '/sourceCode/': sourceCode,
  '/serverSide/': serverSide,
  '/general/dataStructure/': dataStructure,
  '/general/algorithm/': algorithm
}
