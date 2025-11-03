import type { Meta, StoryObj } from '@storybook/react';
import { ComparisonTypeSelector } from '@/app/compare/components/ComparisonTypeSelector';

const meta: Meta<typeof ComparisonTypeSelector> = {
  title: 'Compare/ComparisonTypeSelector',
  component: ComparisonTypeSelector,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ComparisonTypeSelector>;

export const SBOMSelected: Story = {
  args: {
    comparisonType: 'SBOM',
    onComparisonTypeChange: (type) => console.log('Selected:', type),
  },
};

export const CVESelected: Story = {
  args: {
    comparisonType: 'CVE',
    onComparisonTypeChange: (type) => console.log('Selected:', type),
  },
};