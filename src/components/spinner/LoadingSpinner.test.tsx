import { render, screen } from '@/test-utils';
import { LoadingSpinner } from '@/components/spinner/LoadingSpinner';

test('renders with default message', () => {
  render(<LoadingSpinner />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
