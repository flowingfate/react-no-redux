import { Store } from '../../src';

export interface IWorkState {
  department: string;
  level: number;
}

const initial: IWorkState = {
  department: '钉钉',
  level: 5,
}

export const makeWorkActions = (store: Store<IWorkState>) => {
  const setDepartment = (department: string) => store.set({ department });
  const setLevel = (level: number) => store.set({ level });
  return { setDepartment, setLevel };
};

export default initial;
