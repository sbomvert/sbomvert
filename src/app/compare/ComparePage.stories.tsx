import Home from '@/app/compare/page';
import { Meta } from '@storybook/react';

const meta: Meta<typeof Home> = {
  title: 'Pages/Compare',
  component: Home,
};

export default meta;

export const Default = () => <Home />;
