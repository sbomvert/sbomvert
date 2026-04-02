import { render, screen, fireEvent } from '@testing-library/react';
import { ViewSwitch } from '@/components/hoc/ViewSwitch';

describe('ViewSwitch component', () => {
  const modes = ['list', 'grid'];
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  it('renders a button for each mode', () => {
    render(<ViewSwitch modes={modes} selected={modes[0]} onChange={onChange} />);
    modes.forEach(mode => {
      expect(screen.getByRole('button', { name: mode })).toBeInTheDocument();
    });
  });

  it('applies selected styling to the active mode', () => {
    render(<ViewSwitch modes={modes} selected={modes[1]} onChange={onChange} />);
    const selectedBtn = screen.getByRole('button', { name: modes[1] });
    const otherBtn = screen.getByRole('button', { name: modes[0] });
    // selected button should have bg-surface class
    expect(selectedBtn).toHaveClass('bg-surface');
    // non-selected should not have bg-surface
    expect(otherBtn).not.toHaveClass('bg-surface');
  });

  it('calls onChange with the clicked mode', () => {
    render(<ViewSwitch modes={modes} selected={modes[0]} onChange={onChange} />);
    const btn = screen.getByRole('button', { name: modes[1] });
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(modes[1]);
  });
});
