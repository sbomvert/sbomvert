import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react';
import * as Stories from './ViewSwitch.stories';

const { Default } = composeStories(Stories);

test('switches the selected mode', () => {
  render(<Default />);
  fireEvent.click(screen.getByText('table'));
  expect(screen.getByText('table')).toHaveClass('bg-surface');
  expect(screen.getByText('summary')).not.toHaveClass('bg-surface');
});
