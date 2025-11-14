import React from 'react';
import { render, screen } from '@/test-utils';
import { Card } from '@/components/ui/Card';

test('renders Card with children', () => {
  render(
    <Card>
      <span>Inside</span>
    </Card>
  );
  expect(screen.getByText('Inside')).toBeInTheDocument();
});
