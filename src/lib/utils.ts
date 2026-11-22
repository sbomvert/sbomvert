import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The custom font sizes in globals.css (`--text-body`…): without them tailwind-merge takes `text-body` for a color and
// drops the `text-white` before it
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['label', 'caption', 'body-sm', 'body', 'heading-sm', 'heading', 'heading-lg', 'display', 'display-lg', 'micro'] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Tool palette — used for dynamically coloured chart elements (kept as hex,
// because they are passed via `style` props / charting libs, not Tailwind classes).
export const TOOL_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface IJaccardResult { x: string; y: string; value: number; }

export const computeJaccard = (
  infoByTool: Record<string, { packages: string[]; purls: string[] }>,
  key: 'packages' | 'purls'
): IJaccardResult[] => {
  const tools = Object.keys(infoByTool);
  const results: IJaccardResult[] = [];

  for (let i = 0; i < tools.length; i++) {
    results.push({ y: tools[i], x: tools[i], value: 1 });
    for (let j = i + 1; j < tools.length; j++) {
      const setA = new Set(infoByTool[tools[i]][key]);
      const setB = new Set(infoByTool[tools[j]][key]);
      const intersection = new Set([...setA].filter(item => setB.has(item)));
      const union = new Set([...setA, ...setB]);
      const jaccardValue = union.size === 0 ? 0 : intersection.size / union.size;
      results.push({ x: tools[i], y: tools[j], value: jaccardValue });
      results.push({ y: tools[i], x: tools[j], value: jaccardValue });
    }
  }
  return results;
};
