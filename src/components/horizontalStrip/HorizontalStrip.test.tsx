import { render, screen } from '@testing-library/react';
import { HorizontalStrip } from './HorizontalStrip';

describe('HorizontalStrip component', () => {
  test('renders entries with correct layout', () => {
    const entries = { First: '10', Second: '20', Third: '30' };
    render(<HorizontalStrip entries={entries} className="custom" />);
    // Verify all keys and values are present
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    // the entries are separated by dividers on the list, and the custom class is kept
    expect(screen.getByText('Second').closest('dl')).toHaveClass('divide-x', 'custom');
  });
});
