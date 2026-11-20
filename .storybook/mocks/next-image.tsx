import type { ImgHTMLAttributes } from 'react';

// next/image needs the Next runtime; in Storybook a plain img does
export default function Image(props: ImgHTMLAttributes<HTMLImageElement>) {
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...props} />;
}
