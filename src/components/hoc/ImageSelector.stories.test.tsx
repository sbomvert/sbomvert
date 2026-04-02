import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './ImageSelector.stories';

const { SingleImage } = composeStories(Stories);

test('renders without crashing', () => {
  const { container } = render(<SingleImage />);
  expect(container).toBeInTheDocument();
});
