module.exports = {
  // markdown-it-anchor 的选项
  anchor: {
    permalink: true
  },
  // markdown-it-toc 的选项
  toc: {
    includeLevel: [1, 2, 3]
  },
  lineNumbers: true,
  extendMarkdown: md => {
    md.set({html: true})
    md.use(require("markdown-it-katex"))
  }
}
