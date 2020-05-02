import createStore, { makeModel } from '../../src';

interface State {
  a: number;
  b: string;
  c: string[];
};
const inital: State = { a: 1, b: '2', c: [] };

const model = makeModel(inital, (store) => {
  const setA = (a: number) => store.set({ a });
  const setB = (b: string) => store.set({ b });
  const removeFromC = (id: string) => store.set((prev) => ({
    c: prev.c.filter(item => (item !== id)),
  }));

  return { setA, setB, removeFromC };
});

const { WithStore, useStore, Context } = createStore(model);
export { WithStore, useStore, Context };
