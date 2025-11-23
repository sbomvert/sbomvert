import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TOOL_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const getPackageTypeColor = (type?: string): string => {
  switch (type) {
    case 'os':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'npm':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'python':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'maven':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'binary':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'library':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

interface IJaccardResult {
  x: string;
  y: string;
  value: number;
}

export const computeJaccard = (
  infoByTool: Record<string, { packages: string[]; purls: string[] }>,
  key: 'packages' | 'purls'
): IJaccardResult[] => {
  const tools = Object.keys(infoByTool);
  const results: IJaccardResult[] = [];


  // Compare each pair of tools
  for (let i = 0; i < tools.length; i++) {

     results.push({
        y: tools[i],
        x: tools[i],
        value: 1,
      });

    for (let j = i + 1; j < tools.length; j++) {
      const toolA = tools[i];
      const toolB = tools[j];

      const setA = new Set(infoByTool[toolA][key]);
      const setB = new Set(infoByTool[toolB][key]);

      // Calculate intersection
      const intersection = new Set([...setA].filter(item => setB.has(item)));

      // Calculate union
      const union = new Set([...setA, ...setB]);

      // Jaccard index = |intersection| / |union|
      const jaccardValue = union.size === 0 ? 0 : intersection.size / union.size;

      results.push({
        x: toolA,
        y: toolB,
        value: jaccardValue,
      });
      results.push({
        y: toolA,
        x: toolB,
        value: jaccardValue,
      });
    }
  }

  return results;
};