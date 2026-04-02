import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CVEComparisonViewSelector } from './CVEComparisonViewSelector';

// Mock Button to isolate behavior and avoid dependency coupling
jest.mock('@/components/button/Button', () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    variant: string;
  }) => (
    <button data-testid={`btn-${children}`} onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

describe('CVEComparisonViewSelector', () => {
  test('renders both buttons', () => {
    render(<CVEComparisonViewSelector viewMode="summary" onViewModeChange={jest.fn()} />);

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
  });

  test('applies correct variant for summary mode', () => {
    render(<CVEComparisonViewSelector viewMode="summary" onViewModeChange={jest.fn()} />);

    expect(screen.getByTestId('btn-Summary')).toHaveAttribute('data-variant', 'primary');
    expect(screen.getByTestId('btn-Table')).toHaveAttribute('data-variant', 'unfocused');
  });

  test('applies correct variant for table mode', () => {
    render(<CVEComparisonViewSelector viewMode="table" onViewModeChange={jest.fn()} />);

    expect(screen.getByTestId('btn-Summary')).toHaveAttribute('data-variant', 'unfocused');
    expect(screen.getByTestId('btn-Table')).toHaveAttribute('data-variant', 'primary');
  });

  test('calls onViewModeChange with "summary" when clicking Summary', () => {
    const onChange = jest.fn();

    render(<CVEComparisonViewSelector viewMode="table" onViewModeChange={onChange} />);

    fireEvent.click(screen.getByText('Summary'));

    expect(onChange).toHaveBeenCalledWith('summary');
  });

  test('calls onViewModeChange with "table" when clicking Table', () => {
    const onChange = jest.fn();

    render(<CVEComparisonViewSelector viewMode="summary" onViewModeChange={onChange} />);

    fireEvent.click(screen.getByText('Table'));

    expect(onChange).toHaveBeenCalledWith('table');
  });

  test('does not call handler on render', () => {
    const onChange = jest.fn();

    render(<CVEComparisonViewSelector viewMode="summary" onViewModeChange={onChange} />);

    expect(onChange).not.toHaveBeenCalled();
  });
});