import type { Preview, Decorator } from '@storybook/react';
import '../src/app/globals.css';

/* ─── Theme type (single source of truth) ─────────────────────── */
type Theme = 'light' | 'dark' | 'solarized';


/* ─── Toolbar config (typed via satisfies) ────────────────────── */
export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'UI theme',
    defaultValue: 'light' as Theme,
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'light', title: 'Light' },
        { value: 'dark', title: 'Dark' },
      ] satisfies { value: Theme; title: string }[],
    },
  },
};

/* ─── Decorator (typed) ───────────────────────────────────────── */
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme as Theme;
  const root = document.documentElement;

  // reset
  root.classList.remove('dark');

  // apply
  if (theme === 'dark') root.classList.add('dark');
  if (theme === 'solarized') root.classList.add('solarized');

  return (
    <div className="bg-background text-foreground p-6">
      <Story />
    </div>
  );
};

/* ─── Preview config ──────────────────────────────────────────── */
const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
    },
  },
  decorators: [withTheme],
};

export default preview;