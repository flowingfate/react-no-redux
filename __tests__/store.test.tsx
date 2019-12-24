import React from 'react';
import { shallow } from 'enzyme';
import createStore, { makeModel, combineModels, Store } from '../src';

interface IUser {
  name: string;
  age: number;
}
interface IWork {
  level: number;
  site: string;
}
const user: IUser = {
  name: '鸣达',
  age: 18,
};
const work: IWork = {
  level: 6,
  site: '钉钉',
};

const userActions = (store: Store<IUser>) => {
  const setName = (name: string) => store.set({ name });
  const setAge = (age: number) => store.set({ age });
  return { setName, setAge };
};

const workActions = (store: Store<IWork>) => {
  const setSite = (site: string) => store.set({ site });
  const setLevel = (level: number) => store.set({ level });
  return { setSite, setLevel };
};

describe('主功能校验', () => {
  it('MakeModel', () => {
    const model = makeModel(user, () => {});
    expect(model.state).toBe(user);
    expect(model.factory).toBeInstanceOf(Function);
  });

  const initialState = { user, work };
  const model = combineModels(initialState, (store) => ({
    user: userActions(store.user),
    work: workActions(store.work),
  }));

  it('CombineModels', () => {
    expect(model.state).toBe(initialState);
    expect(model.factory).toBeInstanceOf(Function);
  });

  const { WithStore, Context, useStore } = createStore(model);

  it('CreateStore', () => {
    expect(WithStore).toBeInstanceOf(Function);
    expect(Context).toBeTruthy();
    expect(useStore).toBeInstanceOf(Function);
  });

  it('WithStore', () => {
    const wrapper = shallow(<WithStore />);
    expect(wrapper.state()).toEqual(initialState);
    expect(WithStore.displayName).toBe('NoRedux-Root');
  });

  it('UseStore', () => {
    let result: any;
    const Test = () => {
      result = useStore();
      return null;
    };
    shallow(<Test />);
    expect(result.state).toBe(initialState);
    expect(result.actions).toEqual({});
  });
});
