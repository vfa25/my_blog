const frontEndBase = [
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
      'react-native/startup',
      'react-native/hybrid',
      'react-native/overview',
      // 'react-native/dispatch',
    ]
  },
  {
    title: 'Node',
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
  }
];
const frontEndOther = [
  ['', 'Introduction'],
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
  '/frontEnd/base/': frontEndBase,
  '/frontEnd/other/': frontEndOther,
  '/serverSide/': serverSide,
  '/general/dataStructure/': dataStructure,
  '/general/algorithm/': algorithm,
  '/general/algorithmVisualization/': algorithmVisualization
}
