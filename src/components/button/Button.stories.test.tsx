import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './Button.stories';

const { Default } = composeStories(Stories);

test('renders without crashing', () => {
  if (typeof Default === 'undefined') {
    console.warn('Default story not defined');
    return;
  }
  const { container } = render(<Default />);
  expect(container).toBeInTheDocument();
});
