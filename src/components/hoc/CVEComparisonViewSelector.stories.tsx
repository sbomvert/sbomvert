import React, { useState } from 'react';
import { CVEComparisonViewSelector } from './CVEComparisonViewSelector';

export default {
  title: 'CVE/CVEComparisonViewSelector',
  component: CVEComparisonViewSelector,
};

export const Default = () => {
  const [mode, setMode] = useState<'summary' | 'table' | 'chart'>('summary');
  return <CVEComparisonViewSelector viewMode={mode} onViewModeChange={setMode} />;
};
