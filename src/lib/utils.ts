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

// Tool palette: data colours for chart elements and tool chips (hex, because they go to `style` props
// and the charting library). Each one carries white text at 4.5:1 and stands out 3:1 on the dark surface.
export const TOOL_COLORS = ['#2563eb', '#047857', '#b45309', '#dc2626', '#7c3aed', '#0e7490', '#c026d3', '#4d7c0f', '#0369a1', '#a16207'];

// A tool keeps its colour on every view, and when other tools are deselected: the first tool seen
// in the session gets the first colour, and so on.
// ponytail: colours repeat after TOOL_COLORS.length tools, and follow the order tools are first seen
const toolColors = new Map<string, string>();
export const toolColor = (tool: string): string => {
  if (!toolColors.has(tool)) toolColors.set(tool, TOOL_COLORS[toolColors.size % TOOL_COLORS.length]);
  return toolColors.get(tool)!;
};

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
