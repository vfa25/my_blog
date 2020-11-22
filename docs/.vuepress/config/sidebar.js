const frontendBase = [
  ['', 'Introduction'],
  {
    title: 'JS',
    collapsable: true,
    children: [
      'js/life-cycle',
      'js/execution-rule',
      'js/module',
      'js/promise',
      'js/async-await-and-coroutine'
    ]
  },
  {
    title: '浏览器工作原理（Chrome）',
    collapsable: true,
    children: [
      'browser/02multi-process',
      'browser/03navigation-process',
      'browser/04render-process',
      'browser/05render-block',
      'browser/06event-loop',
      'browser/07-visual-formatting-model',
    ]
  },
  {
    title: '前端性能优化',
    collapsable: true,
    children: [
      'optimize/image',
    ]
  },
  {
    title: '网络',
    collapsable: true,
    children: [
      'internet/internet-protocol',
      'internet/http-cache',
      'internet/cors',
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
    title: 'ReactNative',
    collapsable: true,
    children: [
      'react-native/hybrid',
      'react-native/log',
      'react-native/push',
    ]
  },
  {
    title: '实用小例',
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
const originCodeList = [
  ['', '首页'],
  {
    title: 'React',
    collapsable: false,
    children: [
      {
        title: '理念',
        collapsable: false,
        children: [
          'react/idea',
          'react/react-mental-model',
          'react/constructure',
          'react/fiber-architecture',
        ]
      },
      {
        title: '架构',
        children: [
          {
            title: 'render阶段',
            children: [
              'react/render-overview',
              'react/begin-work',
              'react/complete-work',
            ]
          },
          {
            title: 'commit阶段',
            children: [
              'react/commit-overview',
              'react/before-mutation',
              'react/mutation',
              'react/layout',
            ]
          },
        ]
      },
      {
        title: '实现',
        children: [
          // {
          //   title: 'Diff算法',
          //   children: [
          //     'react/diff-overview',
          //   ]
          // },
          {
            title: '状态更新',
            children: [
              'react/state-overview',
              'react/update-style',
              'react/update',
              'react/priority'
            ]
          },
          // {
          //   title: 'Hooks',
          //   children: [
          //     'react/use-effect',
          //   ]
          // },
          {
            title: 'Concurrent Mode',
            children: [
              'react/concurrent-overview',
              'react/scheduler',
            ]
          },
          'react/node-structure',
        ]
      },
      // {
      //   title: '源码流程',
      //   children: [
      //     'react/update',
      //     'react/fiber-scheduler'
      //   ]
      // }
    ]
  },
  {
    title: 'ReactNative',
    children: [
      'react-native/overview',
      'react-native/startup',
      // 'react-native/dispatch',
    ]
  },
];
const nodeList = [
  ['', '首页'],
  {
    title: '基础',
    collapsable: true,
    children: [
      'base/base',
      'base/system',
      'base/express-and-koa'
    ]
  },
  // {
  //   title: '模块化',
  //   collapsable: true,
  //   children: [
  //     'module/built-in-modules',
  //   ]
  // },
];
const pythonList = [
  ['', '首页'],
  {
    title: '基础',
    collapsable: true,
    children: [
      'base/base',
      'base/prdConfig',
    ]
  },
  {
    title: 'Python爬虫框架——Scrapy',
    collapsable: true,
    children: [
      'scrapy/base',
      'scrapy/overview',
      'scrapy/policy',
      'scrapy/selenium',
      'scrapy/crawlSpider'
    ]
  },
  {
    title: 'Django',
    collapsable: true,
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
    collapsable: true,
    children: [
      'nginx/base',
      'nginx/syntax',
    ]
  },
  {
    title: '服务器配置（操作系统Ubuntu）',
    collapsable: true,
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
      {
        title: '基础',
        collapsable: false,
        children: [
          'array',
          'linkedList',
          // 'skipList',
          'stack',
          'queue',
          'hashTable',
          'set',
          'map',
        ]
      },
      {
        title: 'Tree',
        collapsable: false,
        children: [
          'binarySearchTree',
          'heap',
          'segmentTree',
          'trie',
          'unionFind',
          'AVL',
          'red-black-tree'
        ]
      },
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
      'bfs-and-dfs',
      'backtracking',
      'dynamic-programming',
    ]
  },
  {
    title: '可视化',
    collapsable: true,
    children: [
      'visualization/maze-solver',
    ]
  }
];

module.exports = {
  '/frontend/base/': frontendBase,
  '/frontend/origin-code/': originCodeList,
  '/backend/node/': nodeList,
  '/backend/python/': pythonList,
  '/backend/linux/': linuxList,
  '/general/dataStructure/': dataStructure,
  '/general/algorithm/': algorithm
}
