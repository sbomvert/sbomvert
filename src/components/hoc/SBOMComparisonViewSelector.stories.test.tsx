import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './SBOMComparisonViewSelector.stories';

const { SummaryView } = composeStories(Stories);

test('renders without crashing', () => {
  const { container } = render(<SummaryView />);
  expect(container).toBeInTheDocument();
});
