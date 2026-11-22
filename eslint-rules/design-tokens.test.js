/** @jest-environment node */
const { RuleTester } = require('eslint');
const rule = require('./design-tokens');

new RuleTester({ languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } }).run('design-tokens', rule, {
  valid: [
    "'bg-surface text-foreground-muted border-border shadow-card rounded-card'",
    "'rounded-[calc(var(--radius-sm)-2px)] rounded-[min(var(--radius-md),10px)]'",
    "'text-whitespace grow-to-black-box'",
    "'#4f46e5'",
    "const TOOL_COLORS = ['#4f46e5', '#10b981']",
    "<div style={{ color: 'var(--foreground)', width: '10px' }} />",
    "<a href='#top' title='#fff' />",
  ],
  invalid: [
    { code: "'p-1 hover:bg-gray-100 dark:text-white'", errors: [{ messageId: 'palette' }, { messageId: 'palette' }] },
    { code: '`bg-black/10 ${x}`', errors: [{ messageId: 'palette' }] },
    { code: "'bg-[#ffffff] text-[rgb(0,0,0)]'", errors: [{ messageId: 'arbitraryColor' }, { messageId: 'arbitraryColor' }] },
    { code: "'shadow-[0_1px_2px_#000] rounded-t-[6px]'", errors: [{ messageId: 'arbitraryValue' }, { messageId: 'arbitraryValue' }] },
    { code: "<div style={{ color: '#fff' }} />", errors: [{ messageId: 'colorLiteral' }] },
    { code: "<div style={{ background: on ? 'rgb(0 0 0)' : c }} />", errors: [{ messageId: 'colorLiteral' }] },
    { code: '<rect fill="#9ca3af" />', errors: [{ messageId: 'colorLiteral' }] },
    { code: "const s = { borderColor: '#e2e8f0' }", errors: [{ messageId: 'colorLiteral' }] },
  ],
});
