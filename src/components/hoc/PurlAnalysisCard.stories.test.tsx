import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './PurlAnalysisCard.stories';

const { Default } = composeStories(Stories);

test.skip('renders without crashing', () => {
  const { container } = render(<Default />);
  expect(container).toBeInTheDocument();
});
