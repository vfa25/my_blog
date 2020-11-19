---
title: '回溯算法(Backtracking)'
date: '2020-11-18'
sidebarDepth: 3
---

已知`贪心算法`可以做到`局部最优`，却无法满足`全局最优`。那么如何实现`最优解`呢？

回溯的处理思想，有点类似枚举搜索。即枚举所有的解，找到满足期望的解。

- 为了有规律地枚举所有可能的解，避免遗漏和重复，需要把问题求解的过程分为多个阶段。
- 每个阶段，都会面对一个岔路口，先随意选一条路走，当发现这条路走不通的时候（不符合期望的解），就回退到上一个岔路口，另选一种走法继续走。

## 八皇后问题

- 问题描述：

  有一个 8x8 的棋盘，希望往里放 8 个棋子（皇后），每个棋子所在的行、列、对角线都不能有另一个棋子。
  
  期望找到所有满足这种要求的放棋子方式。
- 问题分析：

  把这个问题划分成 8 个阶段，依次将 8 个棋子放到第一行、第二行、第三行...第八行。在放置的过程中，不停地检查当前放法，是否满足要求。如果满足，则跳到下一行继续放置棋子；如果不满足，那就再换一种放法，继续尝试。

- 代码实现

  ```py
  from typing import List

  result = [None for _ in range(8)]  # 下标表示行,值表示queen存储在哪一列


  def cal8queens(row: int) -> None:
      if row == 8:  # 8个棋子都放置好了，打印结果
          printQueens(result)
          return
      for column in range(8):  # 每一行都有8种放法
          if isOk(row, column):  # 如果row行column列放置满足情况
              result[row] = column  # 记录row行的棋子放到了column列
              cal8queens(row + 1)  # 考察下一行


  # 判断row行column列放置是否满足情况
  def isOk(row: int, column: int) -> bool:
      leftUp, rightUp = column - 1, column + 1
      for i in range(row - 1, -1, -1):  # 逐行往上考察每一行
          if result[i] == column:  # 考察正上方
              return False
          if leftUp >= 0 and result[i] == leftUp:  # 考察左上对角线
              return False
          if rightUp < 8 and result[i] == rightUp:  # 考察右上对角线
              return False
          leftUp -= 1
          rightUp -= 1
      return True


  def printQueens(result: List[int]) -> None:
      print(result)
      for row in range(8):
          for column in range(8):
              if result[row] == column:
                  print("Q ", end='')
              else:
                  print("* ", end='')
          print()
      print()


  if __name__ == '__main__':
      cal8queens(0)
  ```

## 0-1 背包问题

回溯算法解决`0-1 背包问题`。

- 问题描述：

  有一个背包，背包总的承载重量是 Wkg。现在有 n 个物品，每个物品的重量不等，并且不可分割。现在期望选择几件物品，装载到背包中。在不超过背包所能装载重量的前提下，如何让背包中物品的总重量最大？
- 问题分析：

  每个物品都是不可分割的，且只能选择装或者不装。那么 n 个物品会有$2^n$种装法。如何才能不重复地穷举出这$2^n$种装法呢？

  可以把物品依次排列，整个问题就分解为了 n 个阶段，每个阶段对应一个物品怎么选择。
  
  先对第一个物品进行处理，选择装进去或者不装进去，然后再递归地处理剩下的物品。

- 代码实现
  - 对于一个物品而言，只有两种情况，不装入背包和装入背包两种情况。分别对应`cw`和`cw + items[i]`，其中`cw`表示该物品装包之前已经装进去的重量，`items[i]`表示该物品重量；
  - 递归终止条件：当背包装满，或者考察完所有的物品。
  - 搜索剪枝：当装入的物品已经大于背包的容量了，就不再装了。

```java
class Bag {

    public int maxW = Integer.MIN_VALUE; // 用于存储背包中物品总重量的最大值
    private int w; // 背包的最大可承受重量
    private int[] items; // 每个物品的重量
    private int n; // 物品个数

    public Bag(int w, int[] items, int n) {
        this.w = w;
        this.items = items;
        this.n = n;
    }

    // cw表示当前已经装进去的物品的重量和；i表示考察到哪个物品了；
    public void f(int i, int cw) {
        if (cw == w || i == n) { // cw==w表示装满了；i==n表示已经考察完所有的物品
            if (cw > maxW) maxW = cw;
            return;
        }
        f(i + 1, cw); // 选择不装第i个物品
        if (cw + items[i] <= w) { // 搜索剪枝：已经超过可以背包承受的重量的时候，就不再装了
            f(i + 1, cw + items[i]); // 选择装第i个物品
        }
    }

    public static void main(String[] args) {
        int[] items = { 2, 2, 4, 6, 3 };
        Bag bag = new Bag(9, items, 5);
        bag.f(0, 0);
        System.out.println(bag.maxW); // 9
    }
}
```

该例的回溯求解过程，用递归树表示如下

```java
//                          f(0,0)
//                  /                    \
//            f(1,0)                     f(1,2)
//          /        \                 /        \
//     f(2,0)        f(2,2)        f(2,2)        f(2,4)
//     /   \         /   \         /   \         /   \
// f(3,0) f(3,4) f(3,2) f(3,6) f(3,2) f(3,6) f(3,4) f(3,8)
//      ...           ...           ...           ...
```

备忘录优化，避免指数级增长。每个`f(i,cw)`都是一个状态，不论其之前的路径是什么，只要`i`和`cw`都相同，即状态相同，都不再影响最终的最大重量。

```java
private boolean[][] mem = new boolean[5][10]; // 备忘录，默认值false

public void f(int i, int cw) {
    if (cw == w || i == n) {
        if (cw > maxW) maxW = cw;
        return;
    }
    if (mem[i][cw]) return; // 重复状态，
    mem[i][cw] = true; // 记录(i, cw)这个状态
    f(i + 1, cw);
    if (cw + items[i] <= w) {
        f(i + 1, cw + items[i]);
    }
}
```

## 总结

- 回溯算法的思想较简单，大部分情况下，都是用来解决广义的搜索问题，也就是，从一组可能的解中，选择出一个满足要求的解。
- 回溯算法非常适合用递归来实现；
- 在实现的过程中，剪枝操作是提高回溯效率的一种技巧。利用剪枝，并不需要穷举搜索所有的情况，从而提高搜索效率。
