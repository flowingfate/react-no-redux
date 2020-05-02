import React from 'react';
import { WithStore, useStore } from './store';

const Target = () => {
  const { state, actions } = useStore();
  // state 和 actions 任你差遣
  const removeB = () => actions.removeFromC(state.b);
  return (
    <div onClick={removeB}>{state.a}</div>
  );
};

const App = () => (
  <WithStore>
    <div>放置你的业务组件</div>
    <div>
      <Target />
    </div>
  </WithStore>
);

export default App;