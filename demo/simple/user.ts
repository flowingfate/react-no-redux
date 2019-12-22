import { Store } from '../../src';

export interface IUserState {
  name: string;
  age: number;
}

const initial: IUserState = {
  name: '鸣达',
  age: 27,
};

export const makeUserActions = (store: Store<IUserState>) => {
  const setName = (name: string) => store.set({ name });
  const setAge = (age: number) => store.set({ age });
  return { setName, setAge };
};

export default initial;
