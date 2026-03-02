import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { Button } from '@/components/button/Button';

test('renders primary button and handles click', () => {
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Click</Button>);
  fireEvent.click(screen.getByText('Click'));
  expect(onClick).toHaveBeenCalled();
});

test('supports secondary and outline variants and sizes', () => {
  const { rerender } = render(<Button variant="secondary">Sec</Button>);
  expect(screen.getByText('Sec')).toBeInTheDocument();
  rerender(
    <Button variant="outline" size="lg">
      Out
    </Button>
  );
  expect(screen.getByText('Out')).toBeInTheDocument();
});
