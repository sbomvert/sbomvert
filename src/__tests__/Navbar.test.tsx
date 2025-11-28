import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { Navbar } from '@/components/layout/Navbar';
import { expect, test,jest } from '@jest/globals';


test('fires logo  actions', () => {
  const onLogo = jest.fn();
  render(<Navbar onLogoClick={onLogo} />);
  fireEvent.click(screen.getByText('SBOMVert'));
  expect(onLogo).toHaveBeenCalled();
});
