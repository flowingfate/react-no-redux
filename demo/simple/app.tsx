import React from 'react';
import { WithStore } from './store';

const App = () => (
  <WithStore>
    <div>放置你的业务组件</div>
  </WithStore>
);

export default App;