import {ImageScanForm} from './ImageScanForm';

export const meta = {
  title: 'HOC/ImageScanForm',
  component: ImageScanForm,
};

export const Default = () => (
  <ImageScanForm onSubmit={(data) => console.log('Submitted', data)} onCancel={() => (console.log)} />
);

export default meta