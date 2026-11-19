import path from 'path';

// A file or folder name that came from a request: one path segment, never `.`, `..` or a separator
export const isSafeName = (name: string): boolean =>
  name !== '' && name !== '.' && name !== '..' && !/[/\\\0]/.test(name);

// `names` joined under `dir`; a name that could leave `dir` throws
export const pathIn = (dir: string, ...names: string[]): string => {
  const bad = names.find(name => !isSafeName(name));
  if (bad !== undefined) throw new Error(`Invalid name: ${JSON.stringify(bad)}`);
  return path.join(dir, ...names);
};
