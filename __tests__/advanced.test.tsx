import React from 'react';
import { describe, it, expect } from 'vitest'
import { atom, WithStore } from '../src';
import { render, fireEvent, screen } from '@testing-library/react';


describe('Advanced case', () => {
  it('Advanced action atom usage', () => {
    const atom_a = atom(1);
    const atom_b = atom(2);
    const atom_c = atom((use) => use(atom_a) * 10);
    const atom_d = atom(100, (get, set) => ({
      double: () => set(get() * 2)
    }));

    const atom_x = atom(3, (get, set, use) => {
      const execute = () => {
        const a = use(atom_a)[0];
        const [b, setB] = use(atom_b);
        const c = use(atom_c);
        const [d, dActions] = use(atom_d);
        set(get() + a + b + c + d);
        setB(b + 1);
        dActions.double();
      };
      return { execute };
    });

    const App = () => {
      const [a] = atom_a.useData();
      const [b] = atom_b.useData();
      const c = atom_c.useData();
      const [d] = atom_d.useData();
      const [x, actions] = atom_x.useData();

      return (
        <>
          <div data-testid="val_a">{a}</div>
          <div data-testid="val_b">{b}</div>
          <div data-testid="val_c">{c}</div>
          <div data-testid="val_d">{d}</div>
          <div data-testid="val_x">{x}</div>
          <button onClick={actions.execute}>click</button>
        </>
      );
    };

    render(
      <WithStore>
        <App />
      </WithStore>
    );

    fireEvent.click(screen.getByText('click'));

    expect(screen.getByTestId('val_a').textContent).toBe('1');
    expect(screen.getByTestId('val_b').textContent).toBe('3');
    expect(screen.getByTestId('val_c').textContent).toBe('10');
    expect(screen.getByTestId('val_d').textContent).toBe('200');
    expect(screen.getByTestId('val_x').textContent).toBe('116');
  });
});