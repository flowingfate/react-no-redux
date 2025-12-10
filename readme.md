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

更多关于Redux的考量参见这里 **[Redux的问题](./docs/no-redux.md)**


新兴的状态管理，例如 Jotai 、Recoil、Zustand 等等，他们都足够轻量好用，本方案也是旨在提供和他们一样好的体验

React 本身就提供了Context用于跨组件通信，一个好的状态管理，无非就是对原生Context的用法进行优化，使得：
* 性能表现更好
* 使用方式更友善


## Goal

* 足够轻量小巧
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


## Usage Sample

本方案一共只导出了2个API，使用非常简单:
* atom: 用于定义状态
* WithStore: 用于包裹组件树，提供状态上下文

### Basic Usage

```tsx
// define atoms with initial states
import { atom } from 'react-no-redux';

const a = atom(1);
const b = atom('2');
const c = atom<string[]>([]);

// use atoms
import { WithStore } from 'react-no-redux';

const BizA = () => {
  const [a, setA] = a.useData();
  const [b] = b.useData();
  const setC = c.useChange();
  const addA = () => setA(a + 1);
  const removeB = () => setC(list => list.filter(item => (item !== b)));
  return (
    <>
      <button onClick={addA}>{a}</button>
      <button onClick={removeB}>{b}</button>
    </>
  );
};

const BizB  = () => {
  const [list] = c.useData();
  return (
    <div>
      {list.map(item => <span>{item}</span>)}
    </div>
  );
};

const App = () => (
  <WithStore>
    <div><BizA /></div>
    <div><BizB /></div>
  </WithStore>
);

export default App;
```

`useData` vs `useChange` 区别是什么
* `useData`: 返回值和更新函数，当atom值变化时，当前组件会重新渲染。
* `useChange`: 返回只有更新函数，当atom值变化时，当前组件不会重新渲染。

### Define atom with actions

```tsx
// define atom
const a = atom(1, (get, set) => {
  const inc = () => set(get() + 1);
  const dec = () => set(get() - 1);
  return { inc, dec };
});


// use atom
const [value, actions] = a.useData();
return (
  <>
    <button onClick={actions.inc}>+</button>
    <span>{value}</span>
    <button onClick={actions.dec}>-</button>
  </>
);

// use only actions
const actions = a.useChange();
return (
  <>
    <button onClick={actions.inc}>+</button>
    <button onClick={actions.dec}>-</button>
  </>
);
```

同样的，当使用 `useChange` 时，当前组件不会因为atom状态变化而重新渲染

actions 可以设置为任意函数，甚至可以是异步函数，例如：
```tsx
const a = atom(1, (get, set) => {
  async function inc() {
    const result = await fetchDataFromServer();
    set(get() + result);
  }
  return { inc };
});
```

在创建 actions 的函数中，甚至可以执行异步初始化的逻辑，比如这样一个场景，我们需要从服务器请求一个商品列表
```tsx
type Product = { /* ... */ };
const products = atom([] as Product[], (get, set) => {
  async function init() {
    const products = await fetchProductsFromServer();
    set(products);
  }
  // 第一次使用 products.useXXX 时会自动调用 init 函数， 并且只会执行一次
  init();

  function deleteProduct(id: string) {
    set(get().filter(product => product.id !== id));
  }
  return { deleteProduct };
});
```

创建 actions，还可以依赖其它 atom
```tsx
const a = atom(1);
const b = atom(2);
const x = atom('hello');
const c = atom(3, (get, set, use) => {
  const inc = () => {
    const a_value = use(a)[0];
    const b_value = use(b)[0];
    const [x_value, change_x] = use(x);
    set(get() + a_value + b_value);
    change_x(x_value + 'world!');
  };
  return { inc };
});
```


### Define computed atom
```tsx
// define atom
const a = atom(1);
const b = atom(2);
const c = atom((use) => {
  const a_value = use(a);
  const b_value = use(b);
  return a_value + b_value;
});

// use atom
const value = c.useData();
return <span>{value}</span>;
```

注意，computed atom 只有 `useData`, 没有 `useChange`，因为它是只读的，不能直接修改。

## Compare with Jotai
在jotai中需要引入单独的 API: `useAtom` `useSetAtom` `useAtomValue`
```tsx
import { useAtom, useSetAtom, useAtomValue } from 'jotai';

const [atomValue, setAtomValue] = useAtom(a);
const atomValue = useAtomValue(a);
const setAtomValue = useSetAtom(a);
```

在本方案中，节省了导入的麻烦，直接使用 `a.useData()` 和 `a.useChange()` 即可

## work with immer

对于复杂的嵌套对象状态，可以结合 [immer](https://github.com/immerjs/immer) 来实现不可变更新，让代码更简洁易读。

### 基础用法

```tsx
import { produce } from 'immer';
import { atom, WithStore } from 'react-no-redux';

type Product = {
  id: number;
  name: string;
  price: number;
};

const products = atom([] as Product[]);

const App = () => {
  const [list, setList] = products.useData();

  const addProduct = () => {
    setList(produce(draft => {
      draft.push({ id: Date.now(), name: 'New Product', price: 100 });
    }));
  };

  const updateFirstProduct = () => {
    setList(produce(draft => {
      if (draft[0]) {
        draft[0].name = 'Updated Product';
        draft[0].price = 200;
      }
    }));
  };

  const removeProduct = (id: number) => {
    setList(produce(draft => {
      const index = draft.findIndex(p => p.id === id);
      if (index !== -1) draft.splice(index, 1);
    }));
  };

  return (
    <WithStore>
      <button onClick={addProduct}>Add Product</button>
      <button onClick={updateFirstProduct}>Update First</button>
      <div>
        {list.map(product => (
          <div key={product.id}>
            {product.name} - ${product.price}
            <button onClick={() => removeProduct(product.id)}>Remove</button>
          </div>
        ))}
      </div>
    </WithStore>
  );
};
```

### 结合 actions 使用

```tsx
import { produce } from 'immer';
import { atom } from 'react-no-redux';

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

const todos = atom([] as Todo[], (get, set) => {
  const addTodo = (text: string) => {
    set(produce(get(), draft => {
      draft.push({ id: Date.now(), text, completed: false });
    }));
  };
  const toggleTodo = (id: number) => {
    set(produce(get(), draft => {
      const todo = draft.find(t => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    }));
  };
  const removeTodo = (id: number) => {
    set(produce(get(), draft => {
      const index = draft.findIndex(t => t.id === id);
      if (index !== -1) {
        draft.splice(index, 1);
      }
    }));
  };

  return { addTodo, toggleTodo, removeTodo };
});

// 使用
const TodoApp = () => {
  const [todoList, actions] = todos.useData();

  return (
    <div>
      <button onClick={() => actions.addTodo('New Task')}>Add Todo</button>
      {todoList.map(todo => (
        <div key={todo.id}>
          <span
            style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
            onClick={() => actions.toggleTodo(todo.id)}
          >
            {todo.text}
          </span>
          <button onClick={() => actions.removeTodo(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};
```


### 3种调用方式

以 action 为例，在 `set` 方法中使用 immer时，有3种调用方式：

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