import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Tool palette — used for dynamically coloured chart elements (kept as hex,
// because they are passed via `style` props / charting libs, not Tailwind classes).
export const TOOL_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Package-type badge colours — now expressed as Tailwind semantic tokens
// so a single token change in tailwind.config.js ripples through.
export const getPackageTypeColor = (type?: string): string => {
  switch (type) {
    case 'os':      return 'bg-purple-100 text-purple-800';
    case 'npm':     return 'bg-red-100 text-red-800';
    case 'python':  return 'bg-blue-100 text-blue-800';
    case 'maven':   return 'bg-orange-100 text-orange-800';
    case 'binary':  return 'bg-gray-100 text-gray-800';
    case 'library': return 'bg-green-100 text-green-800';
    default:        return 'bg-gray-100 text-gray-800';
  }
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

export const SanitizeContainerImage = (imageName: string) =>
  imageName.replace(/\//g, 'slash').replace(/:/g, 'twodots');
