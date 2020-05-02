# How？

## 读写状态树

一个完善的状态管理方案，至少包含2个要素：
* 组织一棵完整的状态树
* 提供状态树的变更途径

对此，首先来定义一个辅助结构（先不管它是怎么来的）
```ts
interface Store<S> {
  set(state: ((prev: S) => Partial<S>) | Partial<S>, callback?: () => void ): void;
  get(): S;
}
```

它是一个辅助工具，有完善的类型约束，作用于一棵状态树，其含义是：
* 提供了修改状态树的方法 set
* 提供了读取状态树的方法 get

比如有一个状态树
```ts
interface State {
  a: number;
  b: string;
  c: string[];
}
const store: Store<State> = /* 生成store */;
```

那么操作起来就如：
```ts
store.set({ b: 'haha', c: ['heihei'] });
store.set((prev) => ({ a: prev.a + 1 }));
store.set({ b: 'hehe' }, () => {
  console.log(store.get());
});
```

看起来很熟悉？没错，其实这里的set背后就是class组件的setState


## 读写子树

当状态树比较大时，显然setState变更起来就会比较费劲，为了做到immutable，就需要多层解构
```ts
interface State {
  user: {/* 子树 */};
  work: {/* 子树 */};
}
const store: Store<State> = /* 生成store */;

const { user } = store.get();
store.set({
  user: { ...user, name: 'my-name' },
});
```

对此，可以从子树单独生成一个store
```ts
const userStore = bindStore(store, 'user');
userStore.set({ name: 'my-name' });
```

这里的bindStore实现如下，它依然保留了所有的类型约束
```ts
function bindStore<S extends Record<string, object>, K extends keyof S>(store: Store<S>, key: K) {
  const newStore: Store<S[K]> = {
    get: () => store.get()[key],
    set: (state, callback) => {
      store.set((prev) => {
        const origin = prev[key];
        const value = (typeof state === 'function') ? state(origin) : state;
        if (/* origin 和 value 没有差异 */) return {}; // Todo 确认api
        const record: Partial<S> = {};
        record[key] = Object.assign({}, origin, value);
        return record;
      }, callback);
    },
  };
  return newStore;
}
```

也就是说，只要有一个对应顶层状态树的store，就可以衍生出子树对应的store，他们是 **同质** 的

## 基石

* 在redux中，reducer+action+dispatch构成了状态变更的基石！
* 在这里，store就构成了状态变更的基石

通过store，就可以构建和封装变更状态的所有api，那么store是怎么来的呢？

其实就来自一个class组件
```ts
class Provider<S> extends React.PureComponent<{}, S> {
  public state: S;
  public store = {
    get: () => this.state,
    set: this.setState.bind(this),
  };

  render() { /* ··· */ }
}
```
