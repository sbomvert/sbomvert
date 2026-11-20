import { composeStories } from '@storybook/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Stories from './Dialog.stories';

const { Default } = composeStories(Stories);

test('opens with its title and content, and closes', async () => {
  render(<Default />);
  expect(screen.queryByRole('dialog')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
  const dialog = await screen.findByRole('dialog', { name: 'Load SBOM' });
  expect(dialog).toHaveTextContent('The dialog content goes here.');
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
