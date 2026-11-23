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
        <p className="text-foreground-muted">No container images yet. Add SBOMs to compare them</p>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-section"
      >
        {images.map(image => {
          const { imageName, repository } = handleImageName(image.name);
          const selectable = image.sbomCount >= 2;

          return (
            <button
              key={image.id}
              type="button"
              onClick={selectable ? () => onImageSelect(image.id) : undefined}
              className={`bg-surface rounded-card border border-border p-card-p shadow-card text-left min-w-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectable ? 'transition-colors hover:bg-surface-alt hover:border-border-field' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Package className="text-foreground-subtle shrink-0" size={16} strokeWidth={1.75} aria-hidden />
                <h3 className="font-mono text-body-sm font-medium text-foreground truncate min-w-0" title={imageName}>
                  {imageName}
                </h3>
              </div>
              <p className="text-body-sm text-foreground-muted truncate" title={image.description}>
                {image.description}
              </p>
              <div className="mt-3 space-y-0.5">
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
              <p className="text-caption text-foreground-subtle mt-1 truncate" title={repository}>
                Repository: {repository}
              </p>
            </button>
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
        <span className="px-4 py-2 text-body-sm text-foreground-muted tabular-nums">Page {currentPage} of {totalPages}</span>
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
