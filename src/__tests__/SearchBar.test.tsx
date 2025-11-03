import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { SearchBar } from '@/app/compare/components/SearchBar';

test('updates onChange', () => {
  const onChange = jest.fn();
  render(<SearchBar value="" onChange={onChange} />);
  fireEvent.change(screen.getByPlaceholderText(/Search container images/), { target: { value: 'ng' } });
  expect(onChange).toHaveBeenCalledWith('ng');
});


