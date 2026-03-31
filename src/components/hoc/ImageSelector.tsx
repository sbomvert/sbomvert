import React from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { Button } from '@/components/button/Button';

export interface ImageInfo {
  id: string;
  name: string;
  description: string;
  toolCount?: number;
  sbomCount: number;
  cveCount?: number;
}

interface ImageSelectorProps {
  images: ImageInfo[];
  onImageSelect: (imageId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const handleImageName = (name: string) => {
  const parts = name.split('/');
  const imageName = parts.pop();
  const repository = parts.length > 0 ? parts.join('/') : 'dockerhub';
  return { imageName, repository };
};

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  images,
  onImageSelect,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-foreground-subtle mb-4" />
        <p className="text-foreground-muted">
          No container images found. Please add SBOM files to the public/sbom directory.
        </p>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-section"
      >
        {images.map((image, idx) => {
          const { imageName, repository } = handleImageName(image.name);
          const selectable = image.sbomCount >= 2;

          return (
            <motion.button
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={selectable ? () => onImageSelect(image.id) : undefined}
              className={`bg-surface rounded-card p-card-p-lg shadow-card text-left ${
                selectable
                  ? 'hover:shadow-card-hover transition-all hover:scale-105 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Package className="text-primary" size={24} />
                <h3 className="font-bold text-foreground">{imageName}</h3>
              </div>
              <p className="text-body-sm text-foreground-muted">{image.description}</p>
              <div className="mt-2 space-y-1">
                {image.toolCount !== undefined && (
                  <p className="text-caption text-foreground-subtle">{image.toolCount} tools available</p>
                )}
                <p className="text-caption text-foreground-subtle">
                  {image.sbomCount} SBOMs available {!selectable && '(minimum 2 required)'}
                </p>
                {image.cveCount !== undefined && (
                  <p className="text-caption text-foreground-subtle">
                    {image.cveCount} CVE report{image.cveCount === 1 ? '' : 's'} available
                  </p>
                )}
              </div>
              <p className="text-caption text-foreground-subtle mt-1">Repository: {repository}</p>
            </motion.button>
          );
        })}
      </motion.div>

      <div className="flex justify-center gap-2 mt-4">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          withHover={false}
          variant={currentPage <= 1 ? 'secondary' : 'primary'}
          size="Sm"
        >
          Previous
        </Button>
        <span className="px-4 py-2 text-foreground-muted">Page {currentPage} of {totalPages}</span>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          withHover={false}
          variant={currentPage >= totalPages ? 'secondary' : 'primary'}
          size="Sm"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
