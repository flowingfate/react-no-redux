Atom 是一个精巧的状态管理方案
* 只依赖 react 本身
* 代码很少，但功能齐全
* 类型系统足够健壮
* 核心 API 只有 2 个：`atom` (定义状态) 和 `WithStore` (根组件 Provider)

`<WithStore>...</WithStore>` 只需要套在应用的最外层即可，此处不赘述

## 基础介绍
首先了解两个类型定义
```ts
type Reduce<T> = (data: T) => T;
type Change<T> = (ch: Reduce<T> | T) => void;
```
后文多次提到的 set 函数，类型均为 `Change<T>`, 行为与 React.useState 的 setter 一致

通过 `atom` 函数可以创建 3 种类型的原子

### 1. Value Atom
基础的用法如下，代码中的 `set` 的类型是 `Change<T>`
```tsx
const priceAtom = atom(100);
function Component1() {
  const [price, set] = priceAtom.useData();
  return <div>{price}</div>;
}
function Component2() {
  // 使用 useChange 时，priceAtom 的值发生变化不会导致 Component2 重新渲染
  const set = priceAtom.useChange();
  return <button onClick={() => set(150)}>increase</button>;
}
```

### 2. Action Atom
在 Value Atom 的基础上，增加了定义一组预定义操作的能力
```tsx
// 这里 `get` 总是拿到最新的值，`set` 的类型是 `Change<T>`
const priceAtom = atom(100, (get, set) => {
  return {
    increase: (delta: number) => set(get() + delta),
    decrease: (delta: number) => set((prev) => prev - delta),
  };
});
function Component1() {
  const [price, actions] = priceAtom.useData();
  return <div>{price}</div>;
}
function Component2() {
  // 使用 useChange 时，priceAtom 的值发生变化不会导致 Component2 重新渲染
  const actions = priceAtom.useChange();
  return <button onClick={() => actions.increase(1)}>increase</button>;
}
```
通过 Action Atom，可以按需的把一些复杂的操作封装成函数，方便在不同的组件中复用。
这里要封装的函数可以是同步的，也可以是异步的，比如可以从服务器拉取数据后，根据结果更新 atom 的值，这就给了我们机会将一些通用的业务操作提炼为共用逻辑

### 3. Computed Atom
这是一种只读原子，它的值是通过其他原子计算得来的
```tsx
const priceAtom = atom(100);
const taxAtom = atom(0.1);
const totalAtom = atom((use) => use(priceAtom) * (1 + use(taxAtom)));
function Component() {
  // computed atom 只能使用 useData 来获取值，没有 useChange 方法，也无法改变数据
  const total = totalAtom.useData();
  return <div>{total}</div>;
}
```
创建 atom 时，使用的 `use` 方法，可以传入任意其他类型的 atom（包括 value atom, action atom, computed atom）返回其携带的值。并且会自动订阅它们的变化，从而在依赖的 atom 变化时，重新计算自己的值。


## 进阶用法

### 1. Action Atom 也可以读取和修改其它 atom
```ts
const a = atom(1);
const b = atom(2);
const c = atom(3, (get, set, use) => {
  function add(delta: number) {
    const [a_val, setA] = use(a);
    const [b_val, setB] = use(b);
    set(a_val + b_val + delta * 2);
    setA(a_val + delta);
    setB(b_val + delta);
  }
  return { add };
});
```

可见创建 action atom 时，也可以获得一个 `use` 方法，这个方法也可以接受其它任意类型的 atom，但这个方法很灵活
* 当传入 value atom 时： 会返回一个 `[value, set]` 的元组
* 当传入 action atom 时： 会返回一个 `[value, actions]` 的元组
* 当传入 computed atom 时： 只会返回它的值

这个 `use` 用起来很像 React 里的 hooks，所以很好理解。但需要注意的是：`use` 每次调用都会获取其他 atom 的最新值，但不会建立订阅关系，其它 atom 的变化不会触发 action 函数重新执行


### 2. 异步初始化
有的时候，我们希望 atom 的初始值来自服务器，但这个异步过程并不适合放在组件里执行，此时可以这么来巧妙的实现
```ts
type Product = { /* ... */ };
const productsAtom = atom([] as Product[], (get, set) => {
  async function initialize() {
    set(await fetchProductsFromServer());
  }
  initialize();

  function deleteProduct(id: string) {
    set(get().filter(product => product.id !== id));
  }
  return { deleteProduct };
});
```

这里的 `initialize` 函数并不会立刻就执行，它只会在这个 productsAtom 第一次被 use 的时候才会调用，并且只会调用一次。注意，这里说的 use 包括 3 种情况：
* 被其它 computed atom 依赖 use
* 被其它 action atom 依赖的时候 use
* 组件中调用 productsAtom.useXXX

依此类推，这种异步初始化的策略，也适合其它场景

### 3. 结合 immer（或mutative等） 使用
当 atom 的值是一个复杂对象时，直接修改这个对象会比较麻烦，这里以 immer 为例来简化操作

```tsx
import { produce } from 'immer';
type Product = { /* ... */ };
const productsAtom = atom([] as Product[]);
function Component() {
  const setProducts = productsAtom.useChange();
  function add(item: Product) {
    setProducts(produce((draft) => {
      draft.push(item);
    }));
  }
  return (/* ... */);
}
```

```ts
import { produce } from 'immer';
type Product = { /* ... */ };
const productsAtom = atom([] as Product[], (get, set) => {
  function add(item: Product) {
    set(produce((draft) => {
      draft.push(item);
    }));
  }
  return { add };
});
```