import React from 'react';
import { Database, Code, Box, Package, FileText } from 'lucide-react';

// The color and icon of each package type, in one place so the two can't drift apart.
const PACKAGE_TYPES: Record<string, { color: string; icon: React.ReactNode }> = {
  os:      { color: 'bg-purple-100 text-purple-800', icon: <Database size={16} /> },
  npm:     { color: 'bg-red-100 text-red-800',       icon: <Code size={16} /> },
  python:  { color: 'bg-blue-100 text-blue-800',     icon: <Code size={16} /> },
  maven:   { color: 'bg-orange-100 text-orange-800', icon: <Code size={16} /> },
  rust:    { color: 'bg-amber-100 text-amber-800',   icon: <Code size={16} /> },
  '.net':  { color: 'bg-indigo-100 text-indigo-800', icon: <Code size={16} /> },
  binary:  { color: 'bg-gray-100 text-gray-800',     icon: <Box size={16} /> },
  library: { color: 'bg-green-100 text-green-800',   icon: <Package size={16} /> },
};
const UNKNOWN = { color: 'bg-gray-100 text-gray-800', icon: <FileText size={16} /> };

const typeOf = (type?: string) => (type && Object.hasOwn(PACKAGE_TYPES, type) ? PACKAGE_TYPES[type] : UNKNOWN);

export const getPackageTypeColor = (type?: string): string => typeOf(type).color;

// The package type as a colored badge with its icon; shared by the comparison and analysis tables.
export const PackageTypeBadge: React.FC<{ type?: string }> = ({ type }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-badge text-caption font-medium ${typeOf(type).color}`}>
    {typeOf(type).icon}
    {type || 'unknown'}
  </span>
);
