# Why？

没有最好的技术方案，满足诉求的就是最适合的！
这个方案并非挑战redux，而是针对某些 **特定诉求** 而产出的一个小巧的工具，如果恰好对你有用，那自然是再好不过，如果觉得比较鸡肋，大可一笑而过！

## react+redux 的痛点
① 冗长的链路和样板代码

一套完善的redux组合拳

定义action
```ts
export const XX_ACTION = '';
export const YY_ACTION = '';
export const XX_ACTION = '';
/* ········ */
```

定义action创建函数
```ts
export function createXXAction() {};
export function createYYAction() {};
export function createZZAction() {};
```

定义类型
```ts
interface XXAction { type: XX_ACTION, payload: XXPayload }
interface YYAction { type: YY_ACTION, payload: YYPayload }
interface ZZAction { type: ZZ_ACTION, payload: ZZPayload }
```

定义reducer
```ts
function reducer(initalState, action) {
  switch (action.type) {
    case XX_ACTION: /* ··· */;
    case YY_ACTION: /* ··· */;
    case ZZ_ACTION: /* ··· */;
  }
}
```

定义Selector（用于mapStateToProps）
```ts
const selectXX = (state: State) => /* 返回需要的字段 */;
const selectYY = (state: State) => /* 返回需要的字段 */;
const selectZZ = (state: State) => /* 返回需要的字段 */;
```

定义action执行函数（用于mapDispathToProps）
```ts
const doXX = (dispatch) => (payload) => dispatch(createXXAction(payload));
const doYY = (dispatch) => (payload) => dispatch(createYYAction(payload));
const doZZ = (dispatch) => (payload) => dispatch(createZZAction(payload));
```

异步变更？
```ts
引入saga之后，又产生了一大堆新的概念
```

诚然，这一套规范，让大型应用变得很有章程，但是
* 认知成本非常高
* 有的时候用不到这么复杂的程度

其实react和redux都很简单，把一众开发者拒之门外的，可能正是这一大堆看似虚幻的复杂概念

② 类型不够友好
```ts
const MyComponent: React.ComponentType<Props>;
const Wrapped = connect(mapStateToProps, mapDispathToProps)(MyComponent);
```
在这种常规用法下，Wrapped的类型是any（注意，此问题最新版已解决），为了解决这个问题，在connect的时候不得不做大量的类型补充

```ts
connect<StateToProps, DispatchToProps, OwnProps, State>(
  (state) => { /* return some state fields */ },
  (dispatch) => { /* return some handlers */ }, // dispatch缺乏有效类型
)(MyComponent);
```
即便是这样，类型依然是不健壮的
* 缺乏了逻辑上的约束链路，connect的类型可以随便传
* dispatch的类型依然缺失


**更新 at 2020-04-29**

经过尝试，最新版本的react-redux在搭配typescript时，类型系统已经得到强化，相比之前，connect已经能够做出一些推断和约束，不再需要手动传入4个泛型，但是依然解决不了dispatch的类型问题

期待将来react-redux更好的解决类型问题

## 目标诉求

* 足够轻量小巧
* 足够类型健壮
* 概念少，结构相对透明，使用简单
* 支持多实例，局部灵活作用
* 不影响redux链路，完全可以混用


其实react本身就提供了跨组件通讯的能力：Context API

只不过它比较原始，一个完善的状态管理方案，至少包含2个要素：
* 组织一棵完整的状态树
* 提供状态树的变更途径

对此，本方案也是仅仅利用了react原始的能力来实现这些目标诉求
