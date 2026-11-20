import { cn } from '@/lib/utils';

test('keeps a text color next to a custom font size', () => {
  expect(cn('text-white', 'text-body')).toBe('text-white text-body');
  expect(cn('text-foreground text-body-sm', 'text-caption')).toBe('text-foreground text-caption');
  expect(cn('text-white', 'text-foreground')).toBe('text-foreground');
});
