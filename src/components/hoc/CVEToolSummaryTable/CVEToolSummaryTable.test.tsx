import { render, screen, within } from '@testing-library/react';
import { CVEToolSummaryTable } from './CVEToolSummaryTable';

const rows = [
  { tool: 'grype (CDX)', color: '#2563eb', total: 132, unique: 66, packages: 8, repeated: 63 },
  { tool: 'trivy (CDX)', color: '#ea580c', total: 104, unique: 53, packages: 8, repeated: 49 },
];

describe('CVEToolSummaryTable', () => {
  test('has one row per tool, with each measure in its column', () => {
    render(<CVEToolSummaryTable rows={rows} totalCVEs={67} />);

    const grype = screen.getByRole('rowheader', { name: 'grype (CDX)' }).closest('tr') as HTMLElement;
    const cells = within(grype).getAllByRole('cell').map(cell => cell.textContent);
    expect(cells).toEqual(['132', '66', '8', '63']);
  });

  test('names each column', () => {
    render(<CVEToolSummaryTable rows={rows} totalCVEs={67} />);

    const headers = screen.getAllByRole('columnheader').map(header => header.textContent);
    expect(headers).toEqual(['Tool', 'Total', 'Unique CVEs', 'Packages', 'On several packages']);
  });

  test('explains the measures under the table, with the total number of CVEs', () => {
    render(<CVEToolSummaryTable rows={rows} totalCVEs={67} />);

    expect(screen.getByText(/out of 67 in all/)).toBeInTheDocument();
  });
});
