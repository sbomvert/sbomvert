// Keeps components on the design tokens in src/app/globals.css: flags Tailwind palette colors
// (`bg-gray-100`, `text-white`), arbitrary colors (`bg-[#fff]`) and hardcoded arbitrary
// shadows/radii (`shadow-[0_1px_2px_#000]`, `rounded-[6px]`) in any string or template literal.
// Arbitrary values built from tokens (`rounded-[calc(var(--radius)-2px)]`) are allowed.
// Also flags color literals (`'#fff'`, `'rgb(…)'`) passed to a `style` prop, an SVG color attribute
// (`fill="#000"`) or a color-like object key (`backgroundColor: '#fff'`): use `var(--surface)` etc.
// A legitimate exception (e.g. categorical data colors) gets an eslint-disable comment with the reason.

const UTIL = '(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|divide|fill|stroke|from|via|to|decoration|placeholder|caret|accent|shadow)';
const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

const CHECKS = [
  [new RegExp(`\\b${UTIL}-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?![\\w-])`, 'g'), 'palette'],
  [new RegExp(`\\b${UTIL}-\\[(?:#|rgba?\\(|hsla?\\(|oklch\\()`, 'g'), 'arbitraryColor'],
  [/\b(?:shadow|rounded(?:-[a-z]{1,2})?)-\[(?![^\]]*var\(--)[^\]]+\]/g, 'arbitraryValue'],
];

const COLOR_VALUE = /^\s*(?:#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\()/i;
const COLOR_ATTR = /^(?:style|fill|stroke|color|stopColor|floodColor|lightingColor)$/;
const COLOR_KEY = /color|background|fill|stroke|border|shadow|outline/i;
// Expressions a color can pass through on its way to the attribute or key (`a ? '#fff' : x`, `${'#fff'}`)
const PASS_THROUGH = new Set(['ConditionalExpression', 'LogicalExpression', 'TemplateLiteral', 'JSXExpressionContainer', 'ObjectExpression', 'ArrayExpression']);

/** The attribute or object key a literal is the value of, if any. */
function colorTarget(node) {
  let child = node;
  for (let p = node.parent; p; child = p, p = p.parent) {
    if (p.type === 'JSXAttribute') return COLOR_ATTR.test(p.name.name) ? p.name.name : null;
    if (p.type === 'Property' && p.value === child) {
      const key = p.key.name ?? p.key.value;
      if (typeof key === 'string' && COLOR_KEY.test(key)) return key;
    }
    if (p.type !== 'Property' && !PASS_THROUGH.has(p.type)) return null;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Use design tokens from globals.css instead of hardcoded colors, shadows and radii' },
    schema: [],
    messages: {
      palette: '`{{match}}`: use a semantic color token (bg-surface, text-foreground-muted, border-border, …), see globals.css.',
      arbitraryColor: '`{{match}}…`: use a semantic color token instead of an arbitrary color, see globals.css.',
      arbitraryValue: '`{{match}}`: use a shadow-*/rounded-* token from globals.css.',
      colorLiteral: '`{{match}}` in `{{target}}`: use a theme variable such as var(--surface), see globals.css.',
    },
  },
  create(context) {
    const check = (node, text) => {
      for (const [re, messageId] of CHECKS) {
        for (const m of text.matchAll(re)) context.report({ node, messageId, data: { match: m[0] } });
      }
      const target = COLOR_VALUE.test(text) && colorTarget(node);
      if (target) context.report({ node, messageId: 'colorLiteral', data: { match: text.trim(), target } });
    };
    return {
      Literal: node => typeof node.value === 'string' && check(node, node.value),
      TemplateElement: node => check(node, node.value.raw),
    };
  },
};
