
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

global.IS_DEV = true;
Enzyme.configure({ adapter: new Adapter() });
