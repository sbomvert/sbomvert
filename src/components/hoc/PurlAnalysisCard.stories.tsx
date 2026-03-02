import type { Meta, StoryObj } from '@storybook/react';
import { PurlAnalysisCard } from '@/components/hoc/PurlAnalysisCard';

const meta: Meta<typeof PurlAnalysisCard> = {
  title: 'UI/PurlAnalysisCard',
  component: PurlAnalysisCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PurlAnalysisCard>;

export const WithPurl: Story = { args: { purl: 'pkg:npm/%40angular/core@12.0.0' } };
export const WithCpe: Story = { args: { cpe: 'cpe:2.3:a:example:example:1.0:*:*:*:*:*:*:*' } };
