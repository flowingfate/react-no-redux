import React from 'react';
import { store } from './store';
import { useAtom, useChange, WithStore } from '../src';

const BizA = () => {
  const [a] = useAtom(store.a);
  const [b] = useAtom(store.b);
  const setC = useChange(store.c);
  const removeB = () => setC(list => list.filter(item => (item !== b)));;
  return <div onClick={removeB}>{a}</div>;
};

const BizB  = () => {
  const [list] = useAtom(store.c);
  return (
    <div>
      {list.map(item => <span>{item}</span>)}
    </div>
  );
};

const App = () => (
  <WithStore>
    <div>
      <BizA />
    </div>
    <div>
      <BizB />
    </div>
  </WithStore>
);

export default App;