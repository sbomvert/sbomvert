import { render, screen, fireEvent } from '@/test-utils';
import { SBOMComparisonViewSelector } from '@/components/hoc/SBOMComparisonViewSelector';

test('switches view mode', () => {
  const onChange = jest.fn();
  render(<SBOMComparisonViewSelector viewMode="summary" onViewModeChange={onChange} />);
  fireEvent.click(screen.getByText('Table'));
  expect(onChange).toHaveBeenCalledWith('table');
});
