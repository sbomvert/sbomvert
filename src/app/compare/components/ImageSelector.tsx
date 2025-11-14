import React from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';

export interface ImageInfo {
  id: string;
  name: string;
  description: string;
  toolCount?: number;
  sbomCount: number;
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
  const imageName = parts.pop(); // Get the last part as the name

  // If there are remaining parts, join them; otherwise, set to default
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
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {images.map((image, idx) => {
          const { imageName, repository } = handleImageName(image.name);

          return (
            <motion.button
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={image.sbomCount >= 2 ? () => onImageSelect(image.id) : undefined}
              className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md text-left ${
                image.sbomCount >= 2
                  ? 'hover:shadow-xl transition-all hover:scale-105 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Package className="text-indigo-600 dark:text-indigo-400" size={24} />
                <h3 className="font-bold dark:text-white">{imageName}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{image.description}</p>
              <div className="mt-2 space-y-1">
                {image.toolCount !== undefined && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {image.toolCount} tools available
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {image.sbomCount} SBOMs available {image.sbomCount < 2 && '(minimum 2 required)'}
                </p>
              </div>
              {/* Optionally display the repository information */}
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Repository: {repository}
              </p>
            </motion.button>
          );
        })}
      </motion.div>
      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`px-4 py-2 rounded ${
            currentPage <= 1
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          Previous
        </button>
        <span className="px-4 py-2">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`px-4 py-2 rounded ${
            currentPage >= totalPages
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};
