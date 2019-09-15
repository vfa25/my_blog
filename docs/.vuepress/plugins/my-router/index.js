module.exports = {
  // 评论标识
  extendPageData($page) {
    const { frontmatter } = $page

    if (
      !frontmatter
      || JSON.stringify(frontmatter) === '{}'
      || frontmatter.single === true
    ) {
      return
    }

    // Comment.vue中根据comment(s)字段判断是否渲染评论
    frontmatter.commentid = frontmatter.permalink
  }
}
