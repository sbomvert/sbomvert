import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './ToolInfoCard.stories';

const { ToolInfoCardStory } = composeStories(Stories);

test('renders without crashing', () => {
  const { container } = render(<ToolInfoCardStory />);
  expect(container).toBeInTheDocument();
});
