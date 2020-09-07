---
title: 'Promise/A+规范及手写'
sidebarDepth: 3
date: '2020-9-4'
---

## Promise出现的背景

- 解决嵌套回调问题
  - **Promise实现了回调函数的延时绑定**。即先创建Promise对象，通过Promise的构造函数来执行业务逻辑；创建好Promise对象之后，再使用以then方法来设置回调函数。
  - **将回调函数onResolve的返回值穿透到最外层**。根据`onFulfill`函数的传入值来决定创建什么类型的Promise任务，创建好的 Promise对象需要返回到最外层。
- 冒泡机制实现异常的集中处理。异常将向后冒泡，直到被`onReject`函数处理或`catch`语句捕获为止。
- 微任务的异步机制。兼顾了回调函数延迟绑定情况下的调用、代码执行效率。

## 手写Promise

[【Promise/A+ 规范】指路👉](http://www.ituring.com.cn/article/66566)，下文将建立在该文档基础上。

1. 创建Promise构造函数

    ```js
    const PENDING = 'pending';
    const RESOLVED = 'resolved';
    const REJECTED = 'rejected';

    function MyPromise(fn) {
        this.state = PENDING; // 初始态为pending
        this.value = null; // value用于保存resolve或reject传入的值
        this.resolvedCallbacks = []; // 用于保存then的回调，等待状态改变时全部执行
        this.rejectedCallbacks = []; // 用于保存reject的回调，等待状态改变时全部执行
        typeof fn === 'function' ? fn(this.resolve.bind(this), this.reject.bind(this)) : null;
    }
    ```

2. 实现将`Promise`转为固定态的`resolve`、`reject`方法

    - 判断当前状态是否为`pending`，只有该状态才可以改变状态；
    - 将`pending`状态更改为对应状态，并且将传入的值赋值给value；
    - 以`setTimeout`模拟异步的微任务；
    - 遍历回调数组并执行，因为此处是异步，故而同步任务下的延时绑定必然完毕了。

    ```js
    MyPromise.prototype.resolve = function(value) {
        setTimeout(() => {
            if (this.state === PENDING) {
                this.value = value;
                this.state = RESOLVED;
                this.resolvedCallbacks.forEach(cb => cb(value));
            }
        });
    }
    MyPromise.prototype.reject = function(err) {
        setTimeout(() => {
            if (this.state === PENDING) {
                this.value = err;
                this.state = REJECTED;
                this.rejectedCallbacks.forEach(cb => cb(this.value));
            }
        });
    }
    ```

3. 实现`then`方法

    - 首先判断`onFulfilled`、`onRejected`参数是否为函数类型，因为这两个参数是可选参数；如果不传，需要实现透传。
    - 如果当前是`等待态`，需要将回调`onFulfilled`或`onRejected`，push进对应的回调数组（通常情况、都将命中该逻辑）。
    - 如果当前是`执行态`或`拒绝态`，就去执行相对应的函数（例如`Promise.resolve().then`的情况下）。
    - 必须返回一个新的`Promise`对象，记为`promise2`；无论`promise1`被`resolve`（`onFulfilled`被调用）还是被`reject`（`onRejected`被调用），`promise2`都会被 `resolve`，只有出现异常时才会被`rejected`。
    - 对于`onFulfilled`或`onRejected`的返回值`x`，则进入`Promise 解决过程：[[Resolve]](promise2, x)`，即方法`this.resolutionProcedure`。

    ```js
    MyPromise.prototype.then = function(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
        onRejected = typeof onRejected === 'function' ? onRejected : r => {
            throw r;
        };
        // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行下面的 Promise 解决过程：this.resolutionProcedure
        // 如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行（this.resolutionProcedure），并返回拒因 e
        let promise2;
        if (this.state === PENDING) {
            return (promise2 = new MyPromise((resolve, reject) => {
                this.resolvedCallbacks.push(() => {
                    try {
                        const x = onFulfilled(this.value);
                        this.resolutionProcedure(promise2, x, resolve, reject);
                    } catch (r) {
                        reject(r);
                    }
                });
                this.rejectedCallbacks.push(() => {
                    try {
                        const x = onRejected(this.value);
                        this.resolutionProcedure(promise2, x, resolve, reject);
                    } catch (r) {
                        reject(r);
                    }
                });
            }));
        }
        if (this.state === RESOLVED) {
            return (promise2 = new MyPromise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        const x = onFulfilled(this.value);
                        this.resolutionProcedure(promise2, x, resolve, reject);
                    } catch (reason) {
                        reject(reason);
                    }
                });
            }));
        }
        if (this.state === REJECTED) {
            return (promise2 = new MyPromise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        const x = onRejected(this.value);
                        this.resolutionProcedure(promise2, x, resolve, reject);
                    } catch (reason) {
                        reject(reason);
                    }
                });
            }));
        }
    }
    ```

    按照规范实现`Promise 解决过程：[[Resolve]](promise2, x)`

    ```js
    MyPromise.prototype.resolutionProcedure = function(promise2, x, resolve, reject) {
        // 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
        if (promise2 === x) {
            return reject(new TypeError('Error'));
        }
        if (x instanceof MyPromise) {
            // 如果 x 处于等待态，Promise 需保持为等待态直至 x 被执行或拒绝
            // 如果 x 处于其他状态，则用相同的值执行或据因拒绝 promise
            x.then(function (value) {
                this.resolutionProcedure(promise2, value, resolve, reject);
            }, reject);
        }
        // 首先创建一个变量 called 加锁用于判断 resolvePromise 和 rejectPromise 是否被调用且仅且取首次
        let called = false;
        // 如果 x 为对象或者函数，进入if逻辑；如果 x 不为对象或者函数，以 x 为参数执行 promise
        if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
            try {
                // 先把 x.then 赋值给 then，然后判断 then 的类型，如果 then 不是函数，以 x 为参数执行 promise
                let then = x.then;
                if (typeof then === 'function') {
                    // 如果 then 是函数类型的话，就将 x 作为函数的作用域 this 调用之，并且传递两个回调函数作为参数，
                    // 第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise，两个回调函数都需要判断是否已经执行过函数，然后进行相应的逻辑
                    then.call(
                        x,
                        y => {
                            if (called) return;
                            called = true;
                            this.resolutionProcedure(promise2, y, resolve, reject);
                        },
                        e => {
                            if (called) return;
                            called = true;
                            reject(e);
                        }
                    );
                } else {
                    resolve(x);
                }
                // 如果调用 then 方法抛出了异常 e
            } catch (e) {
                // 如果 resolvePromise 或 rejectPromise 已经被调用，则忽略之
                if (called) return;
                called = true;
                // 否则以 e 为据因拒绝 promise
                reject(e);
            }
        } else {
            resolve(x);
        }
    }
    ```

4. 衍生函数（这些函数是规范下的语法糖）

    ```js
    MyPromise.prototype.catch = function(onRejected) {
        onRejected = typeof onRejected === 'function' ? onRejected : r => {
            throw r;
        };
        let promise2;
        if (this.state === PENDING) {
            return (promise2 = new MyPromise((resolve, reject) => {
                this.rejectedCallbacks.push(() => {
                    try {
                        const x = onRejected(this.value);
                        this.resolutionProcedure(promise2, x, resolve, reject);
                    } catch (r) {
                        reject(r);
                    }
                });
            }));
        }
        if (this.state === RESOLVED) {
            return new MyPromise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        resolve(this.value);
                    } catch (reason) {
                        reject(reason);
                    }
                });
            })
        }
        if (this.state === REJECTED) {
            return (promise2 = new MyPromise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        const x = onRejected(this.value);
                        this.resolutionProcedure(promise2, x, resolve, reject);
                    } catch (reason) {
                        reject(reason);
                    }
                });
            }));
        }
    }

    MyPromise.resolve = (val) => {
        const promise = new MyPromise();
        promise.state = RESOLVED;
        promise.value = val;
        return promise;
    };

    MyPromise.reject = (val) => {
        const promise = new MyPromise();
        promise.state = REJECTED;
        promise.value = val;
        return promise;
    };
    ```

5. 测试代码

    ```js
    const promise = new MyPromise((resolve, reject) => {
        setTimeout(reject, 1000, 'initValue; ');
    });
    promise.then(res => {
        console.log(res + '1: success; ');
        return res + '1: success; ';
    }, err => {
        console.log(err + '1: failed; ');
        return err + '1: failed; ';
    }).then(res => {
        console.log(res + '2: success;');
        return MyPromise.reject('手动reject中断; ');
    }, err => {
        console.log(err + '2: failed; ');
        return err + '2: failed; ';
    })
    .then()
    .then(res => {
        console.log(res + '3: success; ');
        return res + '3: success; ';
    })
    .catch(err => {
        console.log(err + '4: failed; ');
        return err + '4: failed; ';
    })
    .then(res => {
        console.log(res + '5: success;');
        return res + '5: success;';
    }, err => {
        console.log(err + '5: failed;');
        return err + '5: failed;';
    });
    /**
    initValue; 1: failed;
    initValue; 1: failed; 2: success;
    手动reject中断; 4: failed;
    手动reject中断; 4: failed; 5: success;
    */
    ```

## Reference

- [最简实现Promise，支持异步链式调用（20行）](https://github.com/sl1673495/blogs/issues/58)
- [手写 Promise（掘金小册）](https://juejin.im/book/6844733763675488269/section/6844733763763568648)
