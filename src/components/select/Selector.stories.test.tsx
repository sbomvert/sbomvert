import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Stories from './Selector.stories';

const { Default, Secondary } = composeStories(Stories);

test('shows the placeholder, then the chosen option', async () => {
  const onValueChange = jest.fn();
  render(<Default onValueChange={onValueChange} />);
  const trigger = screen.getByRole('combobox');
  expect(trigger).toHaveTextContent('Choose a tool');
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole('option', { name: 'Trivy' }));
  expect(onValueChange).toHaveBeenCalledWith('trivy');
  expect(trigger).toHaveTextContent('Trivy');
});

test('shows the label of a default value', () => {
  render(<Secondary />);
  expect(screen.getByRole('combobox')).toHaveTextContent('Trivy');
});
