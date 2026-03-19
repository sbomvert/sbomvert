import React from 'react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { MultiToolSummary } from './ComparisonSummary';

interface SummaryViewProps {
  comparison: IMultiToolComparison;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ comparison }) => {
  return <MultiToolSummary comparison={comparison} />;
};
