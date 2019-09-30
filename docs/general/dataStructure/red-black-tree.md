---
title: '最负盛名——红黑树(Red-Black Tree)'
---

#### 在《算法导论》第3版中是这样定义红黑树的

A red-black tree is a binary tree that satisfies the following **red-black properties**:

1. Every node is either red or black.
2. The root is black.（注：若根结点存在，那么对应2-3树将是个2-结点或3-结点，反之，请看第3条）
3. Every leaf(NIL) is black.（注：这里叶子结点即最后的空结点，而非左右子树均为空的那个；那么这句话等价于空结点为黑色结点）
4. （红色性质）If a node is red, then both its children are black.
5. （黑色性质）For each node, all simple paths from the node
to descendant leaves contain the same number of black nodes.
（核心。已知2-3树是棵绝对平衡树，那么任一结点到叶子结点的深度将相同。易推导出：红黑树每经过一个黑色结点，将等价于2-3树的结点经过。**红黑树是保持`黑平衡`的二叉树**，严格意义上，它牺牲了平衡性，即并不是平衡二叉树）

好空洞。

在《算法(第4版)》（作者之一`Robert Sedgewick`正是红黑树的主要发明人）中是这样介绍的：
绕开了红黑树的这些基本性质，转而探索了另外一种平衡树`2-3树`（第3.3章节），这两者是有`等价性`的。

## 等价的2-3树

- 满足（二叉）搜索树的基本性质
- 结点可以存放一个元素（2-结点）或两个元素（3-结点）
![2-3树结点](../../.imgs/2-3-tree-node.png)
- 每个结点有2个或3个孩子结点，如图所示
![2-3树示意图](../../.imgs/2-3-tree-case.png)
- **2-3树是一棵绝对平衡（从根结点到后代叶子结点，所经过的结点数量相同）的树**

### 2-3树的绝对平衡性

- 结点融合

  以添加操作为例，**恒不添加到一个空的位置（NIL）**，只会和最后找到的叶子结点作融合。
  ![2-3树添加操作01](../../.imgs/2-3-tree-add-01.png)
- 结点拆解

  - 当叶子结点短暂形成`4-结点`（含3个元素）临界，将拆解为3个`2-结点`（含1个元素）的子树。
  ![2-3树添加操作02](../../.imgs/2-3-tree-add-02.png)
  - 若拆解后，整体树已不满足绝对平衡性，新的子树的根结点将向其父结点进行`结点融合`；
    1. 若后者原本是个`2-结点`，其将会融合为一个3-结点，此时整体树绝对平衡。
    ![2-3树添加操作03](../../.imgs/2-3-tree-add-03.png)
    2. 若后者原本是个`3-结点`，其将会短暂融合形成4-结点，临界拆解，此时整体树亦绝对平衡。
    ![2-3树添加操作04](../../.imgs/2-3-tree-add-04.png)

## 关联红黑树

- 假令我们先结识了2-3树，那红黑树对`2-结点`和`3-结点`如何表征
  ![红黑树与2-3树结点关系](../../.imgs/red-black-tree-equal-2-3-tree-node.png)

  - 图示中，元素b和元素c`在2-3树中是种并列关系`，这`在红黑树中以一条红色的边线`来表示。
  - 已知，每个结点与其父结点的连接，仅有一条边线；没有且无需为这条边线创建新的类。
  - 将结点b作红色标识，以表示它与父结点的连接，对应`在2-3树中并列关系`的特殊性。
  ![红黑树与2-3树等价转换](../../.imgs/red-black-tree-equal-2-3-tree-transform.png)

- 总结
  - **引入红色结点（即在结点上进行特殊定义），它将与父结点作为一个整体，来表征`2-3树的3-结点`的并列关系。**
  - **从定义角度上，红色的结点，恒向左倾斜。**

这时候再回到[该章节首部](#在《算法导论》第3版中是这样定义红黑树的)，再来看红黑树的五个特性就简单极了。

### 红黑树的性能

由于`规则5`，可知红黑树的最大高度为$2logn$，那么增删改查也将是$O(logn)$的时间复杂度。

红黑树相比AVL树，优势在于增删，而查询性能相对弱势于后者。

总而言之，**统计性能更优**（综合增删改查所有的操作）。

## 难度橙色预警：添加元素

### 添加新元素默认为红色结点

往红黑树中添加元素，那么默认其为`红色结点`。Why？

这可以从两点切入理解，一是与2-3树的等价性，或是根据本章节开篇的5条规则。

- 结合红黑树规则，插入黑色结点会改变黑色高度，必然违背`规则5`；插入红色结点只有一半几率违背`规则4`。

- 等价2-3树的添加元素——融合进已有结点：已知2-3树添加一个新元素时

  - 或者添加进2-结点，形成一个3-结点
  - 或者添加进3-结点，暂时形成一个4-结点

### 颜色翻转（flipColors）

这里依然可以从两个角度

- 结合红黑树规则

如果是首次插入，由于原树为空，将只会违反`规则2`，此时仅需涂黑根结点即可；如果插入结点的父结点是黑色的，将不违背红黑树的规则，什么也不需要做；但是遇到如下三种情况时，就要开始变色和旋转了

1. 插入结点的父结点和其叔叔结点（祖父结点的另一个子结点）均为红色的；

2. 插入结点的父结点是红色，叔叔结点是黑色，且插入结点是其父结点的右子结点；

3. 插入结点的父结点是红色，叔叔结点是黑色，且插入结点是其父结点的左子结点。

- 等价2-3树

**约定：红黑树中，所有红色结点都是左倾斜的；即左倾红黑树**（注：该约定是为了后续操作简单，并非红黑树规则，红黑树的规则只有开篇的5个，即右倾红黑树可存在）。

已知2-3树在添加元素时，一旦某个结点形成临时4-结点，其将拆解为三个2-结点构成的子树。
那么这个子树的根结点将会涂成红色（因为其将向上融合），
在当其恰巧是整颗树的根结点时，则需保持整棵树的根结点是黑色的。

![3-结点添加元素-before](../../.imgs/red-black-tree-3-node-transform-color-before.png)

那么此时仅需将结点42的两个子结点涂黑即可，而这棵子树的根结点要向上融合，故而涂为红色。

![3-结点添加元素-finished](../../.imgs/red-black-tree-3-node-transform-color-finished.png)

```pascal
Function void flipColors(Node node)
  node.color := RED
  node.left.color := BLACK
  node.right.color := BLACK
End flipColors
```

**声明：本章节将继续以等价2-3树的思路，以下旋转时机但请务必代入2-3的特性（另一种，结合红黑树规则的思路，参考文末链接）。**

### 左旋转

![RBTree左旋转-before](../../.imgs/red-black-tree-left-rotate-before.png)
$\Rightarrow$
![RBTree左旋转-finished](../../.imgs/red-black-tree-left-rotate-finished.png)

```pascal

Function Node leftRotate(Node node)
  x := node.right

  node.right := x.left
  x.left := node

  x.color := node.color // node原来的颜色，左旋转过程中暂不维护红黑树的性质（If a node is red, then both its children are black.）
  node.color := RED

  return x
End leftRotate
```

### 右旋转

![RBTree右旋转-before](../../.imgs/red-black-tree-right-rotate-before.png)
$\Rightarrow$
![RBTree右旋转-finished](../../.imgs/red-black-tree-right-rotate-finished.png)

```pascal
Function Node rightRotate(Node node)
  x := node.left

  node.left := x.right
  x.right := node

  x.color := node.color
  node.color := RED

  return x
End rightRotate
```

### 整体论之

[Java实现丐版红黑树](https://github.com/vfa25/dataStructure-algorithm/blob/master/datastructure/src/tree/RedBlackTree.java)

对于等价2-3树中的3-结点添加元素，无外乎以下三种路径方式。

![等价3-结点添加元素概览](../../.imgs/red-black-tree-3-node-add-node-overview.png)

```pascal
// 维护黑平衡
if isRed(node.right) and !isRed(node.left)
  then node := leftRotate(node)

if isRed(node.left) and isRed(node.left.left)
  then node := rightRotate(node)

if isRed(node.left) and isRed(node.right)
  then flipColors(node)
```

维护时机：添加结点后回溯向上维护。

### 更多关于红黑树

基于红黑树的Map和Set等等，都作为很多后端语言的标准库存在，如Java的TreeMap和TreeSet。

作为统计性能更优的代表，并列的还有：

- 伸展树(Splay Tree)。
  局部性原理：刚被访问的内容下次高概率被再次访问。

## Reference

[【数据结构和算法05】 红-黑树](https://blog.csdn.net/eson_15/article/details/51144079)
