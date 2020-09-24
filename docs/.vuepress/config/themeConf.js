const sidebar = require('./sidebar')

module.exports = {
  docsDir: 'docs',
  repo: 'vfa25/my_doc',
  navbar: true,
  editLinks: true,
  editLinkText: '在 GitHub 上编辑此页',
  lastUpdated: '更新于',
  sidebar,
  nav: [{
      text: '最新',
      link: '/guide/'
    },
    {
      text: '偏前端',
      items: [{
          text: '日常总结',
          link: '/frontend/base/'
        },
        {
          text: '源码笔记',
          link: '/frontend/origin-code/'
        }
      ]
    },
    {
      text: 'Server',
      items: [{
          text: 'Python3',
          link: '/backend/python/'
        },
        // { text: 'Node', link: '/backend/node/' },
        {
          text: 'Linux',
          link: '/backend/linux/'
        }
      ]
    },
    {
      text: '通用',
      items: [
        // { text: 'What?Why?', link: '/general/nav/' },
        {
          text: '数据结构',
          link: '/general/dataStructure/'
        },
        {
          text: '算法',
          link: '/general/algorithm/'
        }
      ]
    }
  ]
};
