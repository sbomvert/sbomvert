import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react';
import * as Stories from './FilterPill.stories';

const { Active, Inactive, ToolColorActive } = composeStories(Stories);

test('is pressed when active, and calls back on click', () => {
  const onClick = jest.fn();
  render(<Active onClick={onClick} />);
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  expect(onClick).toHaveBeenCalled();
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
});

test('is not pressed when inactive', () => {
  render(<Inactive />);
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
});

test('fills with the tool color when active', () => {
  render(<ToolColorActive />);
  expect(screen.getByRole('button')).toHaveStyle({ color: 'var(--primary-foreground)' });
});
