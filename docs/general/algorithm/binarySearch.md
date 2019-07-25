# 二分查找(Binary Search)

<h3 style="color: purple;">二分查找很难写，主要原因或许是太追求完美、简洁的写法吧。概括下易错细节：终止条件、区间上下界更新方法、返回值选择。</h3>

二分查找针对的是一个有序的数据集合，查找思想有点类似分治思想。
每次都通过跟区间的中间元素对比，将待查找的区间缩小为之前的一半，直到找到要查找的元素，或者区间被缩小为 0。

**盛名之下：O(logn)的时间复杂度**

假设数据大小是 n，每次查找后数据都会缩小为原来的一半，也就是会除以 2。最坏情况下，直到查找区间被缩小为空，才停止。
即被查找区间的大小变化：n, n/2, n/4, n/8, … ,n/2<sup>k</sup>, … ；
其中，k值为总共缩小的次数，且当n/2<sup>k</sup>等于1时，即k=log<sub>2</sub>n，所以时间复杂度为`O(logn)`。

## 二分查找青春版

简单的二分查找并不难写，因为马上会引出二分查找的变体问题。

***有序数组中不存在重复元素***

- 以循环方法 [Python实现](https://github.com/vfa25/leetcode_notes/blob/master/bsearch/bsearch_circle.py)：

    链接中，low、high、mid 都是指数组下标，其中 low 和 high 表示当前查找的区间范围。mid 表示该范围的中间位置。通过对比其值与 value 的大小，去更新下一次循环要查找的区间范围，直到找到或者区间缩小为 0，既退出循环。

    1. **退出条件**。
    low<=high，二者相等时也要执行一次循环。

    2. **mid的取值**。
    mid=(low+high)/2 的隐患问题：如果 low 和 high 比较大（指数级）的话，两者之和就有可能会溢出。改进的方法是将 mid 的计算方式写成 low+(high-low)/2。更进一步，如果要将性能优化到极致的话，可以将这里的除以 2 操作转化成位运算 low+((high-low)>>1)，注意括号细节。

    3. **low和high的更新**。
    low=mid+1，high=mid-1；而不是 low=mid 或 high=mid，后者可能会死循环。

- 以递归方法 [Python实现](https://github.com/vfa25/leetcode_notes/blob/master/bsearch/bsearch_recursion.py)：

## 二分查找适用范围及局限

1. 二分查找依赖的是顺序表结构，简单点说就是数组（因为数组通过下标访问，时间复杂度仅为O(1)）。
2. 二分查找针对的是有序数据（只能用在插入、删除操作不频繁，一次排序多次查找的场景中，即静态数据）。
3. 数据量太小不适合二分查找（但也有例外，当数据的比较操作非常耗时，比如每个元素非常长）。
4. 数据量太大也不适合二分查找（因为二分查找底层需要依赖数组这种数据结构，而数组为了支持随机访问的特性，要求内存空间连续，对内存的要求比较苛刻）。

## 4种常见的二分查找变形问题

链接：[Python实现](https://github.com/vfa25/leetcode_notes/blob/master/bsearch/bs_variants.py)

**查找第一个值等于给定值的元素**

low和high总是趋向于相等，关键在nums[mid] == target时的处理，因为不知道是否左起第一个，
索性就执行 `high = mid - 1`，若发现准备跳出循环`low == high`，给它加回来就是。最后存在且输出。

这个思路不太直观，另一版见链接的`bsearch_left_direct`。

```py
def bsearch_left_indirect(nums: List[int], target: int) -> int:
    '''
    查找第一个值等于给定值的元素，若没有则返回-1
    '''
    low, high = 0, len(nums) - 1

    while low <= high:
        mid = (high + low) >> 1
        if (nums[mid] >= target):
            high = mid - 1
        else:
            low = mid + 1

    if low < len(nums) and nums[low] == target:
        return low
    else:
        return -1
```

**查找最后一个值等于给定值的元素**

**查找第一个大于等于给定值的元素**

**查找最后一个小于等于给定值的元素**

## 二分查找优缺点

凡是用二分查找能解决的，绝大部分会更倾向于用散列表或者二叉查找树。即便是二分查找在内存使用上更节省，但是毕竟内存如此紧缺的情况并不多。

求“值等于给定值”，并不能体验二分查找的优点，其更适合用在“近似”查找问题，比如上述变体问题，用其他数据结构，比如散列表、二叉树，就比较难实现了。
