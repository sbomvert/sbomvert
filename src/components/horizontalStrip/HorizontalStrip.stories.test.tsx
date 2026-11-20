import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import * as Stories from './HorizontalStrip.stories';

const { Default, Single } = composeStories(Stories);

test('renders every entry', () => {
  render(<Default />);
  expect(screen.getByText('Total packages')).toBeInTheDocument();
  expect(screen.getByText('1,284')).toBeInTheDocument();
});

test('renders a single entry', () => {
  render(<Single />);
  expect(screen.getByText('42')).toBeInTheDocument();
});
