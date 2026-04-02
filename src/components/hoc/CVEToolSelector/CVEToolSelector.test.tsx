import { render, screen, fireEvent } from '@testing-library/react';
import { CVEToolSelector } from './CVEToolSelector';

// Mock Card component used inside CVEToolSelector
jest.mock('@/components/card/Card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));

describe('CVEToolSelector component', () => {
  const allTools = ['trivy', 'syft'];
  const selectedTools = new Set(['trivy']);
  const toolColors = { trivy: 'red', syft: 'green' };
  const onToggle = jest.fn();

  test('renders tool buttons and selected count', () => {
    render(
      <CVEToolSelector
        allTools={allTools}
        selectedTools={selectedTools}
        toolColors={toolColors}
        onToggle={onToggle}
      />
    );
    // Verify selected count text
    expect(screen.getByText('1 / 2 selected')).toBeInTheDocument();
    // Both tool buttons should be present
    expect(screen.getByText('trivy')).toBeInTheDocument();
    expect(screen.getByText('syft')).toBeInTheDocument();
    // Click on syft button should call onToggle
    fireEvent.click(screen.getByText('syft'));
    expect(onToggle).toHaveBeenCalledWith('syft');
  });
});
