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
    // Verify middle entry gets border-x class (Second is middle)
    const middleDiv = screen.getByText('Second').closest('div');
    expect(middleDiv).toHaveClass('border-x');
  });
});
