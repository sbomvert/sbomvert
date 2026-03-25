'use client';
import React, { useState } from 'react';
import { Button } from '@/components/button/Button';
import { SupportedTools, SupportedToolsType, ToolConfig } from "@/lib/sbom/tools"

type ImageScanFormProps = {
  onSubmit: (image: string, tools: {producers:string[],consumers: string[]}) => Promise<void> | void;
  onCancel: () => void;
};


export const ImageScanForm: React.FC<ImageScanFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [image, setImage] = useState('');
  const [selectedTools, setSelectedTools] = useState<SupportedToolsType>(
    SupportedTools
  );
  const [submitting, setSubmitting] = useState(false);

  const toggleProducerTool = (tool: ToolConfig) => {
    setSelectedTools(prev => ({
      ...prev,
      producers: prev.producers.includes(tool)
        ? prev.producers.filter(t => t !== tool)
        : [...prev.producers, tool]
    }));
  };

  const toggleConsumerTool = (tool: ToolConfig) => {
    setSelectedTools(prev => ({
      ...prev,
      consumers: prev.consumers.includes(tool)
        ? prev.consumers.filter(t => t !== tool)
        : [...prev.consumers, tool]
    }));
  };

  const handleSubmit = async () => {
    if (!image.trim()) return alert('Please enter an image name');

    try {
      setSubmitting(true);
      const body = {
        "consumers" : selectedTools.consumers.map(c => c.name),
        "producers": selectedTools.producers.map(p => p.name)
      }
      await onSubmit(image, body);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 border rounded-2xl shadow-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-md mx-auto mb-6 transition-all animate-in fade-in slide-in-from-top-4">
      <h2 className="text-xl font-semibold mb-4">
        Scan Container Image
      </h2>

      <input
        type="text"
        placeholder="repo/app:tag"
        className="w-full border p-2 mb-4 rounded-lg border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-gray-600 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400"
        value={image}
        onChange={e => setImage(e.target.value)}
      />

      <div className="mb-4">
        <div className="mt-2">
          <div className="font-medium mb-2">
            SBOM generators:
          </div>

          <div className="flex flex-wrap gap-2">
            {SupportedTools.producers.map(tool => (
              <Button
                key={tool.name}
                type="button"
                onClick={() => toggleProducerTool(tool)}
                variant={
                  selectedTools.producers.some(t => t.name === tool.name)
                    ? 'primary'
                    : 'secondary'
                }
                size="sm"
              >
                {tool.name.toUpperCase()}
              </Button>
            ))}
          </div>
          <div className="mt-2 font-medium mb-2">
            CVE scanners:
          </div>

          <div className="flex flex-wrap gap-2">
            {SupportedTools.consumers.map(tool => (
              <Button
                key={tool.name}
                type="button"
                onClick={() => toggleConsumerTool(tool)}
                variant={
                  selectedTools.consumers.some(t => t.name === tool.name)
                    ? 'primary'
                    : 'secondary'
                }
                size="sm"
              >
                {tool.name.toUpperCase()}
              </Button>
            ))}
          </div>
          {/*AVAILABLE_TOOLS.map(tool => (
            <Button
              key={tool}
              type="button"
              onClick={() => toggleTool(tool)}
              variant={
                selectedTools.includes(tool)
                  ? 'primary'
                  : 'secondary'
              }
              size="sm"
            >
              {tool.toUpperCase()}
            </Button>
          ))*/}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Starting...' : 'Start Scan'}
        </Button>
      </div>
    </div>
  );
};