import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Stories from './FilePicker.stories';

const { Empty, Chosen } = composeStories(Stories);

test('passes on the chosen file, and the same file can be chosen again', async () => {
  const onFile = jest.fn();
  render(<Empty onFile={onFile} />);
  expect(screen.getByText('No file chosen')).toBeInTheDocument();
  const input = screen.getByLabelText('Choose a JSON file') as HTMLInputElement;
  const file = new File(['{}'], 'a.json', { type: 'application/json' });
  await userEvent.upload(input, file);
  await userEvent.upload(input, file);
  expect(onFile).toHaveBeenCalledTimes(2);
  expect(onFile).toHaveBeenCalledWith(file);
});

test('shows the chosen file name', () => {
  render(<Chosen />);
  expect(screen.getByText('syft.spdx.json')).toBeInTheDocument();
});

test('the button directly follows the input, so peer-focus-visible reaches it', () => {
  render(<Empty />);
  const input = screen.getByLabelText('Choose a JSON file');
  expect(input.nextElementSibling).toHaveTextContent('Choose a JSON file');
});
