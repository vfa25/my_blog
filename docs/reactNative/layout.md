# 布局

## FlexBox差异(对比RN和Web CSS)

* `flexDirection` : RN中默认是`flexDirection: 'column'`, Web CSS中默认是`flex-direction: 'row'`
* `alignItems` : RN中默认是`alignItems: 'stretch'`, Web CSS中默认是`align-items: 'flex-start'`
* `flex` : RN中flex只接受一个参数, Web CSS中flex接受多个参数, 如`flex: 2 2 10%`
* RN中不支持属性: `align-content`, `flex-basis`, `order`, `flex-basis`, `flex-flow`, `flex-grow`, `flex-shrink`
