import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle } from 'lucide-react';
import { WALKTHROUGH_STEPS, useTourStore } from '@/lib/tour_state';
import useGlobalState from '@/lib/global_state';

interface TourSpotlightCardProps {
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export const TourSpotlightCard: React.FC<TourSpotlightCardProps> = ({ onNext, onPrev, onSkip }) => {
  const currentStepIndex = useTourStore((state) => state.currentStepIndex);
  const goToStep = useTourStore((state) => state.goToStep);

  const currentStep = WALKTHROUGH_STEPS[currentStepIndex];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isElementFound, setIsElementFound] = useState<boolean>(false);
  const [shakeCard, setShakeCard] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });
  const cardRef = useRef<HTMLDivElement>(null);

  // Measure and track target element
  const updateTargetRect = useCallback(() => {
    if (!currentStep) return;

    // Special case for header profile step: if dropdown is open, union bounds!
    if (currentStep.id === 'header_profile_nav' || currentStep.id === 'header_settings_nav' || currentStep.id === 'header_feedback_support') {
      const btnEl = document.querySelector('[data-tour="user-profile-button"]');
      const dropdownEl = document.querySelector('[data-tour="user-profile-dropdown"]');
      if (btnEl) {
        const bRect = btnEl.getBoundingClientRect();
        if (dropdownEl) {
          const dRect = dropdownEl.getBoundingClientRect();
          if (dRect.width > 0 && dRect.height > 0) {
            const unionRect = new DOMRect(
              Math.min(bRect.left, dRect.left),
              Math.min(bRect.top, dRect.top),
              Math.max(bRect.right, dRect.right) - Math.min(bRect.left, dRect.left),
              Math.max(bRect.bottom, dRect.bottom) - Math.min(bRect.top, dRect.top)
            );
            setTargetRect(unionRect);
            setIsElementFound(true);
            return;
          }
        }
        if (bRect.width > 0 && bRect.height > 0) {
          setTargetRect(bRect);
          setIsElementFound(true);
          return;
        }
      }
    }

    const el = document.querySelector(currentStep.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        setIsElementFound(true);
        return;
      }
    }
    setTargetRect(null);
    setIsElementFound(false);
  }, [currentStep]);

  useEffect(() => {
    updateTargetRect();
    const interval = setInterval(updateTargetRect, 80);

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      updateTargetRect();
    };
    const handleScroll = () => updateTargetRect();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // Auto-expand sidebar if pointing to sidebar elements
    if (currentStep?.id?.startsWith('sidenav_') || currentStep?.selector?.includes('sidenav')) {
      useGlobalState.getState().setIsSidebarCollapsed(false);
    }

    // Smooth scroll to target for in-page content (skip sticky header and sidebar)
    const skipScroll = [
      'header_notifications',
      'header_ask_ai',
      'header_profile_nav',
      'header_settings_nav',
      'header_credits',
      'header_creator_search',
      'header_feedback_support',
      'sidebar_collapse',
      'ask_ai',
      'credits_and_transactions',
      'sidenav_projects',
      'sidenav_deliveries',
      'sidenav_tos',
      'sidenav_contracts',
      'sidenav_jobs_proposals',
      'sidenav_gigs_orders',
    ].includes(currentStep?.id || '') || currentStep?.selector?.includes('sidenav');

    if (!skipScroll && currentStep) {
      const el = document.querySelector(currentStep.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [currentStep, updateTargetRect]);

  // When clicking outside the highlighted target and card, trigger gentle shake
  const handleBlockedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShakeCard(true);
    setTimeout(() => setShakeCard(false), 500);
  };

  if (!currentStep) return null;

  const totalSteps = WALKTHROUGH_STEPS.length;
  const CARD_WIDTH = Math.min(360, windowSize.width - 32);
  const CARD_HEIGHT = 185;
  const PADDING = 16;

  // Highlight pad & bounds
  const highlightPad = 6;
  const hlTop = targetRect && isElementFound ? Math.max(0, targetRect.top - highlightPad) : 0;
  const hlLeft = targetRect && isElementFound ? Math.max(0, targetRect.left - highlightPad) : 0;
  const hlWidth = targetRect && isElementFound ? targetRect.width + highlightPad * 2 : 0;
  const hlHeight = targetRect && isElementFound ? targetRect.height + highlightPad * 2 : 0;
  const innerRadius = Math.min(14, hlWidth / 2, hlHeight / 2);

  // SVG Path with evenodd cutout
  const pathD =
    targetRect && isElementFound && hlWidth > 0 && hlHeight > 0
      ? `M 0 0 H ${windowSize.width} V ${windowSize.height} H 0 Z ` +
        `M ${hlLeft + innerRadius} ${hlTop} ` +
        `H ${hlLeft + hlWidth - innerRadius} ` +
        `A ${innerRadius} ${innerRadius} 0 0 1 ${hlLeft + hlWidth} ${hlTop + innerRadius} ` +
        `V ${hlTop + hlHeight - innerRadius} ` +
        `A ${innerRadius} ${innerRadius} 0 0 1 ${hlLeft + hlWidth - innerRadius} ${hlTop + hlHeight} ` +
        `H ${hlLeft + innerRadius} ` +
        `A ${innerRadius} ${innerRadius} 0 0 1 ${hlLeft} ${hlTop + hlHeight - innerRadius} ` +
        `V ${hlTop + innerRadius} ` +
        `A ${innerRadius} ${innerRadius} 0 0 1 ${hlLeft + innerRadius} ${hlTop} ` +
        `Z`
      : `M 0 0 H ${windowSize.width} V ${windowSize.height} H 0 Z`;

  // Compute popover placement and arrow positioning
  let placement: 'top' | 'bottom' | 'left' | 'right' = currentStep.preferredPlacement || 'bottom';
  let cardTop = windowSize.height / 2 - CARD_HEIGHT / 2;
  let cardLeft = windowSize.width / 2 - CARD_WIDTH / 2;
  let arrowOffset = CARD_WIDTH / 2;

  if (targetRect && isElementFound) {
    const spaceBelow = windowSize.height - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceLeft = targetRect.left;
    const spaceRight = windowSize.width - targetRect.right;

    // Validate preferred placement
    if (placement === 'left') {
      if (spaceLeft < CARD_WIDTH + 20) {
        placement = spaceBelow >= CARD_HEIGHT + 20 ? 'bottom' : (spaceAbove >= CARD_HEIGHT + 20 ? 'top' : 'bottom');
      }
    } else if (placement === 'right') {
      if (spaceRight < CARD_WIDTH + 20) {
        placement = spaceBelow >= CARD_HEIGHT + 20 ? 'bottom' : (spaceAbove >= CARD_HEIGHT + 20 ? 'top' : 'bottom');
      }
    } else if (placement === 'top') {
      if (spaceAbove < CARD_HEIGHT + 20 && spaceBelow >= CARD_HEIGHT + 20) {
        placement = 'bottom';
      }
    } else {
      if (spaceBelow < CARD_HEIGHT + 20 && spaceAbove >= CARD_HEIGHT + 20) {
        placement = 'top';
      }
    }

    if (placement === 'left') {
      cardLeft = Math.max(PADDING, targetRect.left - CARD_WIDTH - 14);
      cardTop = Math.max(PADDING, Math.min(windowSize.height - CARD_HEIGHT - PADDING, targetRect.top + targetRect.height / 2 - CARD_HEIGHT / 2));
      arrowOffset = targetRect.top + targetRect.height / 2 - cardTop;
      arrowOffset = Math.max(22, Math.min(CARD_HEIGHT - 22, arrowOffset));
    } else if (placement === 'right') {
      cardLeft = Math.min(windowSize.width - CARD_WIDTH - PADDING, targetRect.right + 14);
      cardTop = Math.max(PADDING, Math.min(windowSize.height - CARD_HEIGHT - PADDING, targetRect.top + targetRect.height / 2 - CARD_HEIGHT / 2));
      arrowOffset = targetRect.top + targetRect.height / 2 - cardTop;
      arrowOffset = Math.max(22, Math.min(CARD_HEIGHT - 22, arrowOffset));
    } else if (placement === 'top') {
      cardTop = Math.max(PADDING, targetRect.top - CARD_HEIGHT - 14);
      const targetCenter = targetRect.left + targetRect.width / 2;
      cardLeft = Math.max(PADDING, Math.min(windowSize.width - CARD_WIDTH - PADDING, targetCenter - CARD_WIDTH / 2));
      arrowOffset = targetCenter - cardLeft;
      arrowOffset = Math.max(22, Math.min(CARD_WIDTH - 22, arrowOffset));
    } else {
      // bottom
      cardTop = Math.min(windowSize.height - CARD_HEIGHT - PADDING, targetRect.bottom + 14);
      const targetCenter = targetRect.left + targetRect.width / 2;
      cardLeft = Math.max(PADDING, Math.min(windowSize.width - CARD_WIDTH - PADDING, targetCenter - CARD_WIDTH / 2));
      arrowOffset = targetCenter - cardLeft;
      arrowOffset = Math.max(22, Math.min(CARD_WIDTH - 22, arrowOffset));
    }
  }

  // Format **bold** markdown cleanly
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-gray-950 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-none">
      {/* 1. Seamless Fullscreen SVG Overlay with EvenOdd Cutout */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[9990]">
        <path
          d={pathD}
          fill="rgba(0, 0, 0, 0.72)"
          fillRule="evenodd"
          className="pointer-events-auto cursor-default transition-all duration-300 ease-out"
          onClick={handleBlockedClick}
        />
      </svg>

      {/* 2. Target Element Spotlight Ring (Glowing Border Around Target) */}
      {targetRect && isElementFound && (
        <div
          className="fixed pointer-events-none border-2 border-white/90 ring-4 ring-amber-500/40 shadow-[0_0_24px_rgba(255,255,255,0.35)] transition-all duration-300 ease-out"
          style={{
            top: `${hlTop}px`,
            left: `${hlLeft}px`,
            width: `${hlWidth}px`,
            height: `${hlHeight}px`,
            borderRadius: `${innerRadius}px`,
            zIndex: 9992,
          }}
        />
      )}

      {/* 3. Floating Walkthrough Popover Card (or Loading indicator while waiting for target) */}
      <AnimatePresence mode="wait">
        {!isElementFound ? (
          <motion.div
            key="waiting-target"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-[10002] flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121524] px-4 py-2.5 text-xs font-medium text-gray-800 dark:text-zinc-200 shadow-2xl backdrop-blur-md pointer-events-auto"
          >
            <div className="h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Loading {currentStep.tabHint || 'page view'}...</span>
          </motion.div>
        ) : (
          <motion.div
            key={currentStep.id}
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: shakeCard ? [-4, 4, -4, 4, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: `${cardTop}px`,
              left: `${cardLeft}px`,
              width: `${CARD_WIDTH}px`,
              zIndex: 10002,
            }}
            className="pointer-events-auto relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121524] text-gray-800 dark:text-zinc-100 shadow-2xl p-5 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow Pointer: Top (points UP) */}
            {placement === 'bottom' && (
              <div
                className="absolute -top-[9px] pointer-events-none"
                style={{ left: `${arrowOffset}px`, transform: 'translateX(-50%)' }}
              >
                <svg width="18" height="10" viewBox="0 0 18 10">
                  <polygon points="9,0 0,10 18,10" className="fill-white dark:fill-[#121524]" />
                  <polyline
                    points="0,10 9,0 18,10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-gray-200 dark:text-white/15"
                  />
                </svg>
              </div>
            )}

            {/* Arrow Pointer: Bottom (points DOWN) */}
            {placement === 'top' && (
              <div
                className="absolute -bottom-[9px] pointer-events-none"
                style={{ left: `${arrowOffset}px`, transform: 'translateX(-50%)' }}
              >
                <svg width="18" height="10" viewBox="0 0 18 10">
                  <polygon points="0,0 18,0 9,10" className="fill-white dark:fill-[#121524]" />
                  <polyline
                    points="0,0 9,10 18,0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-gray-200 dark:text-white/15"
                  />
                </svg>
              </div>
            )}

            {/* Arrow Pointer: Right edge (points RIGHT at target on left) */}
            {placement === 'left' && (
              <div
                className="absolute -right-[9px] pointer-events-none"
                style={{ top: `${arrowOffset}px`, transform: 'translateY(-50%)' }}
              >
                <svg width="10" height="18" viewBox="0 0 10 18">
                  <polygon points="0,0 10,9 0,18" className="fill-white dark:fill-[#121524]" />
                  <polyline
                    points="0,0 10,9 0,18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-gray-200 dark:text-white/15"
                  />
                </svg>
              </div>
            )}

            {/* Arrow Pointer: Left edge (points LEFT at target on right) */}
            {placement === 'right' && (
              <div
                className="absolute -left-[9px] pointer-events-none"
                style={{ top: `${arrowOffset}px`, transform: 'translateY(-50%)' }}
              >
                <svg width="10" height="18" viewBox="0 0 10 18">
                  <polygon points="10,0 0,9 10,18" className="fill-white dark:fill-[#121524]" />
                  <polyline
                    points="10,0 0,9 10,18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-gray-200 dark:text-white/15"
                  />
                </svg>
              </div>
            )}

            {/* Close (X) button at top right */}
            <button
              type="button"
              onClick={onSkip}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-white transition-colors"
              title="Exit Walkthrough"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Top Pagination Dots */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {WALKTHROUGH_STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToStep(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentStepIndex
                      ? 'w-2 h-2 bg-amber-500 ring-2 ring-amber-500/25'
                      : 'w-1.5 h-1.5 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400 dark:hover:bg-zinc-500'
                  }`}
                  title={`Jump to step ${i + 1}`}
                />
              ))}
            </div>

            {/* Main Direct Instruction */}
            <div className="text-center text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-zinc-300 my-3 font-normal">
              {renderFormattedText(currentStep.text)}
            </div>

            {/* Footer Controls: < Prev on left, Next > on right */}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={onPrev}
                disabled={currentStepIndex === 0}
                className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
                  currentStepIndex === 0
                    ? 'text-gray-300 dark:text-zinc-700 cursor-not-allowed opacity-40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <span>&#9664;</span> Prev
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onNext}
                  className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-zinc-950 transition-colors shadow-sm"
                >
                  {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                  <span>&#9654;</span>
                </button>

                <span className="text-gray-300 dark:text-zinc-600" title="Ensemble Walkthrough">
                  <MessageCircle className="h-4 w-4" />
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
