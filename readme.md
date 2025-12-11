[![Build Status](https://travis-ci.org/flowingfate/react-no-redux.svg?branch=master)](https://travis-ci.org/flowingfate/react-no-redux)
[![codecov](https://codecov.io/gh/flowingfate/react-no-redux/branch/master/graph/badge.svg)](https://codecov.io/gh/flowingfate/react-no-redux)
![react](https://img.shields.io/badge/react-^16.8.0-blue.svg)
![lang](https://img.shields.io/badge/lang-typescript-red.svg)
![npm](https://img.shields.io/npm/v/react-no-redux)
![GitHub file size in bytes](https://img.shields.io/github/size/flowingfate/react-no-redux/src/index.tsx)
![npm](https://img.shields.io/npm/dw/react-no-redux)

---

**[English Version](./docs/readme.en.md)**

## Why

虽然状态管理还是Redux占据半壁江山，但是新的东西早已层出不穷！

在我个人看来，Redux存在2个显著的弊端：
* 与Typescript配合不够友好，
* 使用过程过于繁琐，强行增加人的认知成本

新兴的状态管理，例如 Jotai 、Recoil、Zustand 等等，他们都足够轻量好用，本方案也是旨在提供和他们一样好的体验

React 本身就提供了Context用于跨组件通信，一个好的状态管理，无非就是对原生Context的用法进行优化，使得：
* 性能表现更好
* 使用方式更友善


## Goal

* 足够轻量小巧，但功能齐全
* 足够类型健壮
* 概念少，结构完全透明，使用简单
* 支持多实例（不像Redux那样使用单例），可以在任意局部灵活使用


## How

> 写这个东西主要是为了记录自己的学习理解，也顺便Share一下

感兴趣可以阅读 **[源码](./src/index.tsx)** ，它非常精简，除了react，没有其它任何额外的东西，其中有几个关键要点：

#### ① 不变的Context value

Context value变化的时候，需要递归遍历子树，寻找依赖它的节点进行更新，所以效率会很差
* 所以，当状态变化时，通知组件状态的变更不能依赖 Context value 的改变
* `value={useMemo(buildQuery, [])}` 就是为了保证其不发生变化
* 变更通知，只能采用别的方式 —— 发布订阅

#### ② 发布订阅（事件机制）

当状态变化时，发布订阅能做到精准的点对点更新（react-redux中其实也用到了发布订阅）

#### ③ 触发变更——偷梁换柱

```tsx
const { data, change, listen } = useContext(Context)(this);
const [v, set] = useState(data);
useLayoutEffect(() => listen(set), []);
return [v, change] as const;
```
把变更函数 `set` 注册给监听器，替换为change（不仅修改数据，还会触发订阅更新）


## Usage

本方案一共只导出了2个API，使用非常简单:
* `atom`: 用于定义状态
* `WithStore`: 用于包裹组件树，提供状态上下文

`<WithStore>...</WithStore>` 只需要套在应用的最外层即可。

首先了解两个类型定义，后文多次提到的 `set` 函数，类型均为 `Change<T>`, 行为与 `React.useState` 的 setter 一致。

```ts
type Reduce<T> = (data: T) => T;
type Change<T> = (ch: Reduce<T> | T) => void;
```

通过 `atom` 函数可以创建 3 种类型的原子：

### 1. Value Atom
基础的用法如下：

```tsx
const priceAtom = atom(100);

function Component1() {
  const [price, set] = priceAtom.useData();
  return <div>{price}</div>;
}

function Component2() {
  const set = priceAtom.useChange();
  return <button onClick={() => set(150)}>increase</button>;
}
```

`useData` vs `useChange` 区别是什么
* `useData`: 返回值和更新函数，当atom值变化时，当前组件会重新渲染。
* `useChange`: 返回只有更新函数，当atom值变化时，当前组件不会重新渲染。

### 2. Action Atom
在 Value Atom 的基础上，增加了定义一组预定义操作的能力：

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
  // 同样使用 useChange 时，priceAtom 的值发生变化不会导致 Component2 重新渲染
  const actions = priceAtom.useChange();
  return <button onClick={() => actions.increase(1)}>increase</button>;
}
```
通过 Action Atom，可以按需的把一些复杂的操作封装成函数，方便在不同的组件中复用。
这里要封装的函数可以是同步的，也可以是异步的，比如可以从服务器拉取数据后，根据结果更新 atom 的值，这就给了我们机会将一些通用的业务操作提炼为共用逻辑。

### 3. Computed Atom
这是一种只读原子，它的值是通过其他原子计算得来的：

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

## Advanced Usage

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

可见创建 action atom 时，也可以获得一个 `use` 方法，这个方法也可以接受其它任意类型的 atom，但这个方法很灵活：
* 当传入 value atom 时： 会返回一个 `[value, set]` 的元组
* 当传入 action atom 时： 会返回一个 `[value, actions]` 的元组
* 当传入 computed atom 时： 只会返回它的值

这个 `use` 用起来很像 React 里的 hooks，所以很好理解。但需要注意的是：`use` 每次调用都会获取其他 atom 的最新值，但不会建立订阅关系，其它 atom 的变化不会触发 action 函数重新执行。

### 2. 异步初始化
有的时候，我们希望 atom 的初始值来自服务器，但这个异步过程并不适合放在组件里执行，此时可以这么来巧妙的实现：

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

依此类推，这种异步初始化的策略，也适合其它场景。

### 3. 结合 immer（或mutative等） 使用
当 atom 的值是一个复杂对象时，直接修改这个对象会比较麻烦，这里以 immer 为例来简化操作：

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

或者在 Action Atom 中使用：

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

以 action atom 为例，配合 `set` 方法使用 immer时，有3种调用方式：

```tsx
// 方式一：传入 get()
set(produce(get(), draft => {
  draft.push(newItem);
}));

// 方式二：使用函数形式
set(current => produce(current, draft => {
  draft.push(newItem);
}));

// 方式三：curried form（这种是最简洁的）
set(produce(draft => {
  draft.push(newItem);
}));
```


使用 immer 的好处：
- **简化语法**：直接修改 draft 对象，无需手动创建新对象
- **类型安全**：完全保持 TypeScript 类型推断
- **性能优化**：immer 内部做了优化，只有真正改变的部分才会创建新对象
- **减少错误**：避免手动深拷贝时可能出现的遗漏


## Compare with Jotai
在jotai中需要引入单独的 API: `useAtom` `useSetAtom` `useAtomValue`
```tsx
import { useAtom, useSetAtom, useAtomValue } from 'jotai';

const [atomValue, setAtomValue] = useAtom(a);
const atomValue = useAtomValue(a);
const setAtomValue = useSetAtom(a);
```

在本方案中，节省了导入的麻烦，直接使用 `a.useData()` 和 `a.useChange()` 即可
