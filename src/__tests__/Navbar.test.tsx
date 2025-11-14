import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { Navbar } from '@/components/layout/Navbar';

test('fires logo and theme actions', () => {
  const onLogo = jest.fn();
  const onToggle = jest.fn();
  render(<Navbar isDark={false} toggleTheme={onToggle} onLogoClick={onLogo} />);
  fireEvent.click(screen.getByText('SBOMVert'));
  expect(onLogo).toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Toggle theme'));
  expect(onToggle).toHaveBeenCalled();
});
