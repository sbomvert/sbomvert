import React, { PropsWithChildren } from 'react';
import { render } from '@testing-library/react';

export const customRender = (ui: React.ReactElement, options: any = {}) =>
  render(ui, { wrapper: ({ children }: PropsWithChildren) => <>{children}</>, ...options });

export * from '@testing-library/react';
export { customRender as render };


