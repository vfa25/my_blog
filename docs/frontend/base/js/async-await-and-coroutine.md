---
title: '协程与手写async/await'
sidebarDepth: 3
date: '2020-9-5'
---

## 协程(coroutine)

已知`async/await`就是`生成器(Generator)`的语法糖，而后者的实现，则是异步编程中的`协程`模式。指路👉[阮一峰：Generator函数的异步应用](https://es6.ruanyifeng.com/#docs/generator-async)。

- 协程是什么？以该代码为例

  ```js
  function* genDemo() {
      console.log("开始执行第一段")
      yield 'generator 1'
      console.log("执行结束")
      return 'generator 2'
  }
  console.log('main 0')
  let gen = genDemo()
  console.log(gen.next().value)
  console.log('main 1')
  console.log(gen.next().value)
  console.log('main 2')
  // main 0
  // 开始执行第一段
  // generator 1
  // main 1
  // 执行结束
  // generator 2
  // main 2
  ```

  ![协程demo示意图](../../../.imgs/js-coroutine-demo-with-call-stack.png)

  1. 通过调用生成器函数genDemo来创建一个协程gen，创建之后，gen协程并没有立即执行。
  2. 要让gen协程执行，需要通过调用gen.next。
  3. 当gen协程正在执行的时候，可以通过yield关键字来暂停gen协程的执行，并返回主要信息给父协程。
  4. 如果协程在执行期间，遇到了return关键字，那么会结束当前协程，并将return后面的内容返回给父协程。

- 由于React源码中的`Fiber(纤程)`概念。参考了知乎的一篇文章[协程和纤程的区别？](https://www.zhihu.com/question/23955356)，或认为差别是每个`Fiber(纤程)`拥有自己的完整stack，而协程是共用线程的stack。
- 那么，协程共用线程的调用栈应该怎么理解呢？
  - 当在gen协程中调用了yield方法时，JS引擎会保存gen协程当前的调用栈信息，并恢复父协程的调用栈信息。
  - 同样，当在父协程中执行gen.next时，JS引擎会保存父协程的调用栈信息，并恢复gen协程的调用栈信息。

## async/await

- 作为`Promise`和`生成器(Generator)`的语法糖，本质上是`微任务`和`协程`的应用。
- 根据MDN定义，async是一个通过`异步执行`并`隐式返回Promise`作为结果的函数。

### Demo

```js
const getData = () => new Promise(resolve => setTimeout(() => resolve('data'), 1000));

async function test() {
  const data1 = await getData();
  console.log('data1: ', data1);
  const data2 = await getData();
  console.log('data2: ', data2);
  return 'success';
}
console.log('start');
test().then(res => console.log(res));
console.log('end');
/**
start
end
data1:  data    。。。在1秒后打印
data2:  data    。。。再过一秒打印
success
*/
```

### 执行流程

1. 首先，执行`console.log('start');`这个语句，打印出来“start”；
2. 执行test函数，由于test函数是被`async`标记过的，所以当进入该函数的时候，JS引擎会保存当前的调用栈等信息，同时默认创建一个Promise对象`promise_0`（注：它只有在协程done了才会resolve）；
3. 然后执行到`await getData();`，会默认创建一个Promise对象，代码如下所示：

    ```js
    let promise_1 = new Promise((resolve,reject){
      resolve(getData());
    });
    ```

    由于executor函数中调用了resolve函数，JS引擎会将该任务提交给微任务队列。然后JS引擎会暂停当前协程的执行，将主线程的控制权转交给父协程执行，同时会将 `promise_0`对象返回给父协程。
4. 主线程的控制权已经交给父协程了，此时父协程要做的一件事是调用`promise_0.then`、`promise_1.then`来监控promise状态的改变。
5. 接下来继续执行父协程的流程，执行`console.log('end');`这个语句，打印出来“end”；
6. 然后父协程将执行结束，在结束之前，会进入微任务的检查点；然后执行微任务队列，微任务队列中有`resolve(getData())`的任务等待执行，执行到这里的时候，会触发`promise_1.then`中的回调函数，如下所示：

    ```js
    promise_1.then((res) => {
      const data = res;
      console.log('data: ', data);
      const data2 = await getData();
      console.log('data2: ', data2);
      return 'success';
    })
    ```

    该回调函数被激活以后，会将主线程的控制权交给test函数的协程，并同时将value值传给该协程。

7. 随后同理，直到return（函数没有return即隐式`return undefined`）结束test函数的协程并且`promise_0.resolve`该值；`promise_0.then`的回调被执行，打印“success”。

### 手写async/await

来看一下使用生成器函数时的调用流程

```js
let getData = () => new Promise(resolve => setTimeout(() => resolve('data'), 1000));
function* testG() {
  const data1 = yield getData();
  console.log('data1: ', data1);
  const data2 = yield getData();
  console.log('data2: ', data2);
  return 'success';
}

// 生成一个执行器函数gen协程
var gen = testG();
// 通过调用gen.next，gen协程执行，
// 执行到const data = yield getData()时，
// resolve(getData())被推入微任务队列
const data1Promise = gen.next().value;
data1Promise.then(res => {
  // 继续调用next并且将拿到的data1传递下去
  const data2Promise = gen.next(res).value;
  // console.log('data1: ', data1); 进行打印
  return data2Promise;
}).then(res => {
  // 继续调用next并且将拿到的data2传递下去
  gen.next(res);
  // console.log('data2: ', data2); 进行打印
})
```

实现高阶函数`asyncToGenerator`，其接受生成器函数为参数，返回一个包装函数，后者返回Promise实例。

```js
function asyncToGenerator(generatorFunc) {
  return function() {
    const gen = generatorFunc.apply(this, arguments);
    return new Promise((resolve, reject) => {
      // step函数用于gen.next的步进，恢复gen协程
      // key参数的可选值为next和throw，分别对应gen的next和throw方法
      // arg参数则表示resolve的负载
      function step(key, arg) {
        let generatorResult;
        try {
          // 步进
          generatorResult = gen[key](arg);
        } catch (error) {
          return reject(error);
        }
        const { value, done } = generatorResult;
        // 退出条件：仅且gen协程退出，才会done
        if (done) {
          return resolve(value);
        } else {
          return Promise.resolve(value).then(val => step('next', val), err => step('throw', err));
        }
      }
      step("next");
    });
  }
}
```

测试代码

```js
const getData = () => new Promise(resolve => setTimeout(() => resolve('data'), 1000));
var test = asyncToGenerator(
    function* testG() {
      const data = yield getData();
      console.log('data: ', data);
      const data2 = yield getData();
      console.log('data2: ', data2);
      return 'success';
    }
)
test().then(res => console.log(res));
```

## Reference

- [手写async await的最简实现（20行）](https://github.com/sl1673495/blogs/issues/59)
- [async/await：使用同步的方式去写异步代码（极客时间小册）](https://time.geekbang.org/column/article/137827)
