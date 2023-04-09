import React from 'react';
import { shallow, mount } from 'enzyme';
import { atom, useAtom, useChange, WithStore } from '../src';

const store = {
  a: atom(1),
  b: atom('2'),
  c: atom<string[]>(['1', '2', '3']),
};

describe('Unit test for react-no-redux', () => {
  it('Complex-Usage', () => {
    let stateOfA: any = {};
    let stateOfB: any = {};

    const BizA = () => {
      const [a, setA] = useAtom(store.a);
      const [b] = useAtom(store.b);
      const setC = useChange(store.c);
      stateOfA = { a, b };
      const removeB = () => setC(list => list.filter(item => (item !== b)));;
      return (
        <>
          <button className="btn1" onClick={() => setA(a + 1)}>{a}</button>
          <button className="btn2" onClick={removeB}>{b}</button>
        </>
      );
    };

    const BizB  = () => {
      const [a] = useAtom(store.a);
      const [b] = useAtom(store.b);
      const [list] = useAtom(store.c);
      stateOfB = { a, b, c: list };
      return (
        <div>
          {list.map(i => <span key={i}>{i}</span>)}
        </div>
      );
    };

    const App = () => (
      <WithStore>
        <BizA />
        <BizB />
      </WithStore>
    );

    const wrapper = mount(<App />);
    expect(stateOfA).toEqual({ a: 1, b: '2' });
    expect(stateOfB).toEqual({ a: 1, b: '2', c: ['1', '2', '3'] });

    wrapper.find('.btn1').simulate('click');
    expect(stateOfA).toEqual({ a: 2, b: '2' });
    expect(stateOfB).toEqual({ a: 2, b: '2', c: ['1', '2', '3'] });

    wrapper.find('.btn2').simulate('click');
    expect(stateOfA).toEqual({ a: 2, b: '2' });
    expect(stateOfB).toEqual({ a: 2, b: '2', c: ['1', '3'] });

    wrapper.unmount();
  });
});
