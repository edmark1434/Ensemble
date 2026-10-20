import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, MousePointerClick, ChevronRight, ChevronLeft } from 'lucide-react';
import { WALKTHROUGH_STEPS, useTourStore } from '@/lib/tour_state';
import useGlobalState from '@/lib/global_state';

interface TourSpotlightCardProps {
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export const TourSpotlightCard: React.FC<TourSpotlightCardProps> = ({ onNext, onPrev, onSkip }) => {
  const currentStepIndex = useTourStore((state) => state.currentStepIndex);

  const currentStep = WALKTHROUGH_STEPS[currentStepIndex];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isElementFound, setIsElementFound] = useState<boolean>(false);
  const [isDropdownItemActive, setIsDropdownItemActive] = useState<boolean>(false);
  const [shakeCard, setShakeCard] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });
  const cardRef = useRef<HTMLDivElement>(null);

  // Measure and track target element
  const updateTargetRect = useCallback(() => {
    if (!currentStep) return;

    // Special case for header profile steps: point directly to the specific menu item when dropdown is open
    if (currentStep.id === 'header_profile_nav') {
      const profileItem = document.querySelector('[data-tour="profile-menu-profile"]');
      if (profileItem) {
        const rect = profileItem.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          setIsElementFound(true);
          setIsDropdownItemActive(true);
          return;
        }
      }
      setIsDropdownItemActive(false);
      const btnEl = document.querySelector('[data-tour="user-profile-button"]');
      if (btnEl) {
        const rect = btnEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          setIsElementFound(true);
          return;
        }
      }
    }

    if (currentStep.id === 'header_settings_nav') {
      const settingsItem = document.querySelector('[data-tour="profile-menu-settings"]');
      if (settingsItem) {
        const rect = settingsItem.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          setIsElementFound(true);
          setIsDropdownItemActive(true);
          return;
        }
      }
      setIsDropdownItemActive(false);
      const btnEl = document.querySelector('[data-tour="user-profile-button"]');
      if (btnEl) {
        const rect = btnEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          setIsElementFound(true);
          return;
        }
      }
    }

    if (currentStep.id === 'header_feedback_support') {
      const feedbackItem = document.querySelector('[data-tour="profile-menu-feedback"]');
      if (feedbackItem) {
        const rect = feedbackItem.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          setIsElementFound(true);
          setIsDropdownItemActive(true);
          return;
        }
      }
      setIsDropdownItemActive(false);
      const btnEl = document.querySelector('[data-tour="user-profile-button"]');
      if (btnEl) {
        const rect = btnEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
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
        setIsDropdownItemActive(false);
        return;
      }
    }
    setTargetRect(null);
    setIsElementFound(false);
    setIsDropdownItemActive(false);
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
      'sidenav_projects',
      'sidenav_teams',
      'sidenav_forums',
      'sidenav_discovery',
      'sidenav_assets',
      'sidenav_jobs',
      'sidenav_gigs',
      'sidenav_deliveries',
      'sidenav_tos',
      'sidenav_contracts',
      'sidenav_transactions',
      'sidenav_inbox',
      'sidenav_jobs_proposals',
      'sidenav_gigs_orders',
      'jobs_detail_exit',
      'gigs_detail_exit',
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
  const isClickStep = currentStep.actionType === 'click';
  const CARD_WIDTH = Math.min(380, windowSize.width - 32);
  const actualCardHeight = cardRef.current?.offsetHeight || 230;

  // Safe screen margins (guarantees card never clips into bottom taskbar)
  const TOP_SAFE_PADDING = 24;
  const BOTTOM_SAFE_PADDING = 52;
  const SIDE_SAFE_PADDING = 20;

  // Highlight padding & bounds
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
  let placement: 'top' | 'bottom' | 'left' | 'right' | 'none' = currentStep.preferredPlacement || 'bottom';
  let cardTop = Math.max(TOP_SAFE_PADDING, windowSize.height / 2 - actualCardHeight / 2);
  let cardLeft = Math.max(SIDE_SAFE_PADDING, windowSize.width / 2 - CARD_WIDTH / 2);
  let arrowOffset = CARD_WIDTH / 2;

  if (targetRect && isElementFound) {
    const spaceBelow = windowSize.height - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceLeft = targetRect.left;
    const spaceRight = windowSize.width - targetRect.right;

    // Detect if target is a large container occupying most of the viewport
    const isLargeContainer =
      targetRect.height > windowSize.height * 0.48 || targetRect.width > windowSize.width * 0.85;

    if (isLargeContainer) {
      // For full workspace/containers, float cleanly centered inside the bottom half with ample clearance
      cardLeft = Math.max(SIDE_SAFE_PADDING, Math.min(windowSize.width - CARD_WIDTH - SIDE_SAFE_PADDING, (windowSize.width - CARD_WIDTH) / 2));
      cardTop = Math.max(TOP_SAFE_PADDING, windowSize.height - actualCardHeight - BOTTOM_SAFE_PADDING - 16);
      placement = 'none'; // No awkward arrow pointing into the container
    } else {
      // Validate and adapt preferred placement
      if (placement === 'left') {
        if (spaceLeft < CARD_WIDTH + 24) {
          placement = spaceBelow >= actualCardHeight + 30 ? 'bottom' : (spaceAbove >= actualCardHeight + 30 ? 'top' : 'bottom');
        }
      } else if (placement === 'right') {
        if (spaceRight < CARD_WIDTH + 24) {
          placement = spaceBelow >= actualCardHeight + 30 ? 'bottom' : (spaceAbove >= actualCardHeight + 30 ? 'top' : 'bottom');
        }
      } else if (placement === 'top') {
        if (spaceAbove < actualCardHeight + 30 && spaceBelow >= actualCardHeight + 30) {
          placement = 'bottom';
        }
      } else {
        if (spaceBelow < actualCardHeight + 30 && spaceAbove >= actualCardHeight + 30) {
          placement = 'top';
        }
      }

      const maxCardTop = windowSize.height - actualCardHeight - BOTTOM_SAFE_PADDING;

      if (placement === 'left') {
        cardLeft = Math.max(SIDE_SAFE_PADDING, targetRect.left - CARD_WIDTH - 14);
        const desiredTop = targetRect.top + targetRect.height / 2 - actualCardHeight / 2;
        cardTop = Math.max(TOP_SAFE_PADDING, Math.min(maxCardTop, desiredTop));
        arrowOffset = targetRect.top + targetRect.height / 2 - cardTop;
        arrowOffset = Math.max(24, Math.min(actualCardHeight - 24, arrowOffset));
      } else if (placement === 'right') {
        cardLeft = Math.min(windowSize.width - CARD_WIDTH - SIDE_SAFE_PADDING, targetRect.right + 14);
        const desiredTop = targetRect.top + targetRect.height / 2 - actualCardHeight / 2;
        cardTop = Math.max(TOP_SAFE_PADDING, Math.min(maxCardTop, desiredTop));
        arrowOffset = targetRect.top + targetRect.height / 2 - cardTop;
        arrowOffset = Math.max(24, Math.min(actualCardHeight - 24, arrowOffset));
      } else if (placement === 'top') {
        cardTop = Math.max(TOP_SAFE_PADDING, targetRect.top - actualCardHeight - 14);
        const targetCenter = targetRect.left + targetRect.width / 2;
        cardLeft = Math.max(SIDE_SAFE_PADDING, Math.min(windowSize.width - CARD_WIDTH - SIDE_SAFE_PADDING, targetCenter - CARD_WIDTH / 2));
        arrowOffset = targetCenter - cardLeft;
        arrowOffset = Math.max(24, Math.min(CARD_WIDTH - 24, arrowOffset));
      } else {
        // bottom
        cardTop = Math.min(maxCardTop, targetRect.bottom + 14);
        const targetCenter = targetRect.left + targetRect.width / 2;
        cardLeft = Math.max(SIDE_SAFE_PADDING, Math.min(windowSize.width - CARD_WIDTH - SIDE_SAFE_PADDING, targetCenter - CARD_WIDTH / 2));
        arrowOffset = targetCenter - cardLeft;
        arrowOffset = Math.max(24, Math.min(CARD_WIDTH - 24, arrowOffset));
      }
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

  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  // Dynamic titles and instructions when menu items are visible
  let displayTitle = currentStep.targetName;
  let displayText = currentStep.text;

  if (currentStep.id === 'header_profile_nav') {
    if (isDropdownItemActive) {
      displayTitle = 'Select Profile';
      displayText = 'Click **Profile** in the menu to open your portfolio and setup page.';
    } else {
      displayTitle = 'Profile Menu';
      displayText = 'Click your **Profile Avatar** in the top header to open your account options.';
    }
  } else if (currentStep.id === 'header_settings_nav') {
    if (isDropdownItemActive) {
      displayTitle = 'Select Settings';
      displayText = 'Click **Settings** in the menu to open account credentials and display preferences.';
    } else {
      displayTitle = 'Profile Menu';
      displayText = 'Click your **Profile Avatar** to open your account options.';
    }
  } else if (currentStep.id === 'header_feedback_support') {
    if (isDropdownItemActive) {
      displayTitle = 'Feedback & Support';
      displayText = 'Click **Submit Feedback** or file a ticket anytime you need assistance or want to share thoughts.';
    } else {
      displayTitle = 'Profile Menu';
      displayText = 'Click your **Profile Avatar** to find help and submit feedback.';
    }
  }

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
          className={`fixed pointer-events-none border-2 transition-all duration-300 ease-out ${
            isClickStep
              ? 'border-amber-400 ring-4 ring-amber-500/50 shadow-[0_0_28px_rgba(245,158,11,0.5)] animate-pulse'
              : 'border-white/90 ring-4 ring-amber-500/40 shadow-[0_0_24px_rgba(255,255,255,0.35)]'
          }`}
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

      {/* 3. Floating Walkthrough Popover Card */}
      <AnimatePresence mode="wait">
        {!isElementFound ? (
          <motion.div
            key="waiting-target"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-10 right-6 z-[10002] flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121524] px-4 py-2.5 text-xs font-medium text-gray-800 dark:text-zinc-200 shadow-2xl backdrop-blur-md pointer-events-auto"
          >
            <div className="h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Loading {currentStep.tabHint || 'page view'}...</span>
          </motion.div>
        ) : (
          <motion.div
            key={`${currentStep.id}-${isDropdownItemActive ? 'item' : 'btn'}`}
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              x: shakeCard ? [-5, 5, -5, 5, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: `${cardTop}px`,
              left: `${cardLeft}px`,
              width: `${CARD_WIDTH}px`,
              zIndex: 10002,
            }}
            className="pointer-events-auto relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121524] text-gray-800 dark:text-zinc-100 shadow-2xl p-5"
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

            {/* Top Bar: Section Badge + Counter + Close Button */}
            <div className="flex items-center justify-between pb-2 mb-2">
              <div className="flex items-center gap-2">
                {currentStep.section && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Sparkles className="h-2.5 w-2.5" />
                    {currentStep.section}
                  </span>
                )}
                <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500">
                  {currentStepIndex + 1} / {totalSteps}
                </span>
              </div>

              <button
                type="button"
                onClick={onSkip}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                title="Exit Walkthrough"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sleek Progress Bar */}
            <div className="h-1 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-3">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-amber-500 transition-all duration-300 ease-out"
              />
            </div>

            {/* Target Title */}
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <span>{displayTitle}</span>
            </h3>

            {/* Main Direct Instruction */}
            <div className="text-xs sm:text-[13px] leading-relaxed text-gray-600 dark:text-zinc-300 mb-4 font-normal">
              {renderFormattedText(displayText)}
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={onPrev}
                disabled={currentStepIndex === 0}
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                  currentStepIndex === 0
                    ? 'text-gray-300 dark:text-zinc-700 cursor-not-allowed opacity-30'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              {isClickStep ? (
                /* Click-to-Advance Interactive Pill (No Next button shown) */
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 animate-pulse">
                  <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
                  <span>{isDropdownItemActive ? 'Click highlighted option' : 'Click highlighted element'}</span>
                </div>
              ) : (
                /* Standard Next Button for passive observe steps */
                <button
                  type="button"
                  onClick={onNext}
                  className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-4 py-1.5 text-xs font-bold text-zinc-950 transition-colors shadow-sm"
                >
                  <span>{currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
