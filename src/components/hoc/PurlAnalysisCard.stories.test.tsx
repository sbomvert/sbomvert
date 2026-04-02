import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './PurlAnalysisCard.stories';

const { WithPurl } = composeStories(Stories);

test('renders without crashing', () => {
  const { container } = render(<WithPurl />);
  expect(container).toBeInTheDocument();
});
