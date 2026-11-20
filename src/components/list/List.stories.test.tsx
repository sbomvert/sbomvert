import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react';
import * as Stories from './List.stories';

const { Default, Empty } = composeStories(Stories);

test('lists the items by label and selects the clicked one', () => {
  const onSelect = jest.fn();
  render(<Default onSelect={onSelect} />);
  fireEvent.click(screen.getByText('trivy'));
  expect(onSelect).toHaveBeenCalledWith({ name: 'trivy.cdx.json' });
});

test('renders nothing for no items', () => {
  render(<Empty />);
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
