const {
  mdConf,
  themeConf
} = require('./myConfig/')
const { secret } = require('../../app.config')

module.exports = {
  // base: '/doc/',
  dest: 'dist',
  title: 'Coding积分',
  navbar: true,
  editLinks: true,
  editLinkText: '在 GitHub 上编辑此页',
  lastUpdated: '更新于',
  themeConfig: themeConf,
  markdown: mdConf,
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/katex.min.css' }],
    ['link', { rel: "stylesheet", href: "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/2.10.0/github-markdown.min.css" }]

  ],
  description: '愉快的记录学习日常吧',
  plugins: [
    require('./plugins/my-router'),
    require('./plugins/my-loader'),
    require('vuepress-plugin-viewer'),
    '@vuepress/back-to-top',
    [
      '@vuepress/google-analytics', { 'ga': 'UA-124601890-1' }
    ],
    [
      '@vuepress/pwa',
      {
        serviceWorker: true,
        updatePopup: {
          message: "发现页面有新内容",
          buttonText: "刷新"
        }
      }
    ],
    [
      'vuepress-plugin-comment',
      {
        choosen: 'gitalk',
        options: {
          clientID: 'Iv1.39128e29ffdd6890',
          clientSecret: secret || process.env.clientSecret,
          repo: 'my_doc',
          owner: 'vfa25',
          admin: ['vfa25'],
          id: '<%- frontmatter.commentid || frontmatter.permalink %>',      // Ensure uniqueness and length less than 50
          distractionFreeMode: false,  // Facebook-like distraction free mode
          labels: ['Gitalk', 'Comment'],
          title: '「评论」<%- frontmatter.title %>',
          body: '<%- frontmatter.title %>：<%- window.location.origin %><%- frontmatter.to.path || window.location.pathname %>'
        }
      }
    ]
  ]
};

