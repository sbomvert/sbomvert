import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import {TutorialStep} from "../hooks/useTutorial"
import React, { useState, useEffect } from 'react';

export interface TutorialOverlayProps {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: TutorialStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  onGoToStep: (step: number) => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isActive,
  currentStep,
  totalSteps,
  step,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  onClose,
  onGoToStep,
}) => {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive || !step.target) {
      setHighlightRect(null);
      return;
    }

    const targetElement = document.getElementById(step.target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setHighlightRect(rect);

      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'bottom':
          top = rect.bottom + scrollY + 20;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'top':
          top = rect.top + scrollY - 20;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'left':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.left + scrollX - 20;
          break;
        case 'right':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.right + scrollX + 20;
          break;
        default:
          top = window.innerHeight / 2 + scrollY;
          left = window.innerWidth / 2 + scrollX;
      }

      setTooltipPosition({ top, left });
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, step, currentStep]);

  if (!isActive) return null;

  const isCentered = !step.target || step.position === 'center';

  return (
    <>
      <div className="fixed inset-0 z-40 pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {highlightRect && (
                <rect
                  x={highlightRect.left - 8}
                  y={highlightRect.top - 8}
                  width={highlightRect.width + 16}
                  height={highlightRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#spotlight-mask)"
            className="pointer-events-auto"
          />
        </svg>
      </div>

      {highlightRect && (
        <div
          className="fixed z-40 pointer-events-none border-4 border-blue-500 rounded-xl shadow-lg"
          style={{
            top: `${highlightRect.top - 8}px`,
            left: `${highlightRect.left - 8}px`,
            width: `${highlightRect.width + 16}px`,
            height: `${highlightRect.height + 16}px`,
            transition: 'all 0.3s ease-in-out',
          }}
        />
      )}

      <div
        className={`fixed z-50 pointer-events-none ${
          isCentered ? 'inset-0 flex items-center justify-center' : ''
        }`}
        style={
          !isCentered
            ? {
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
                transform:
                  step.position === 'top'
                    ? 'translate(-50%, -100%)'
                    : step.position === 'bottom'
                    ? 'translate(-50%, 0)'
                    : step.position === 'left'
                    ? 'translate(-100%, -50%)'
                    : step.position === 'right'
                    ? 'translate(0, -50%)'
                    : 'translate(-50%, -50%)',
              }
            : {}
        }
      >
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full pointer-events-auto m-4">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            <p className="text-gray-600 leading-relaxed">{step.description}</p>
          </div>

          <div className="flex justify-center gap-2 px-6 pb-4">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <button
                key={index}
                onClick={() => onGoToStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep ? 'bg-blue-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-lg">
            <button onClick={onSkip} className="text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Skip tutorial
            </button>

            <div className="flex gap-2">
              {!isFirstStep && (
                <button
                  onClick={onPrev}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}

              <button
                onClick={onNext}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};