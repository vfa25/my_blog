# 路由(react-navigation)

## Reference

- [Commonjs模块的值拷贝和ES模块的值引用](https://www.jianshu.com/p/1cfc5673e61d)

## 多层 navigator 嵌套

问题: 子级路由调用`navigation.navigate(page, params)`跳转父级路由的兄弟路由无反应.

解决: navigation丢失. 封装`NavigatorUtil工具类, 备份父级navigation`, 实现同级跳转.

```js
class NavigationUtil {
  static goPage(params, page) {
    // 旧代码依赖于 子级navigation 传入: const { navigation } = params;
    const navigation = NavigationUtil.navigation;
    navigation.navigate(
      page,
      params,
    );
  }
}
// 在父级路由, 以 NavigationUtil类 的静态属性备份 navigation.
NavigationUtil.navigation = this.props.navigation;
```
