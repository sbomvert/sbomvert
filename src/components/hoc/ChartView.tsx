import React from 'react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { MultiToolSummary } from './ComparisonSummary';

interface ChartViewProps {
  comparison: IMultiToolComparison;
}

export const ChartView: React.FC<ChartViewProps> = ({ comparison }) => {
  return <MultiToolSummary comparison={comparison} />;
};
