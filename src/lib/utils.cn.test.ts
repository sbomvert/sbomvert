import { cn, toolColor, TOOL_COLORS } from '@/lib/utils';

test('keeps a text color next to a custom font size', () => {
  expect(cn('text-white', 'text-body')).toBe('text-white text-body');
  expect(cn('text-foreground text-body-sm', 'text-caption')).toBe('text-foreground text-caption');
  expect(cn('text-white', 'text-foreground')).toBe('text-foreground');
});

test('a tool keeps its colour, whatever the order or the other tools', () => {
  const syft = toolColor('Syft (SPDX)');
  const trivy = toolColor('Trivy (SPDX)');
  expect(syft).not.toBe(trivy);
  expect(toolColor('Trivy (SPDX)')).toBe(trivy);
  expect(toolColor('Syft (SPDX)')).toBe(syft);
  expect(TOOL_COLORS).toContain(syft);
});
