import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, MousePointerClick, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTourStore } from '@/lib/tour_state';
import useGlobalState from '@/lib/global_state';

interface TourSpotlightCardProps {
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
  onSkipSection: () => void;
}

export const TourSpotlightCard: React.FC<TourSpotlightCardProps> = ({
  onNext,
  onPrev,
  onExit,
  onSkipSection,
}) => {
  const currentStepIndex = useTourStore((state) => state.currentStepIndex);
  const activeSteps = useTourStore((state) => state.activeSteps);
  const currentStep = activeSteps[currentStepIndex];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isElementFound, setIsElementFound] = useState<boolean>(false);
  const [isDropdownItemActive, setIsDropdownItemActive] = useState<boolean>(false);
  const [shakeCard, setShakeCard] = useState<boolean>(false);
  const [showFallbackCard, setShowFallbackCard] = useState<boolean>(false);
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
        if (rect.width >= 16 && rect.height >= 16) {
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

      // Auto-expand Jobs accordion if pointing to jobs sidebar elements
      if (currentStep?.id?.includes('job') || currentStep?.selector?.includes('jobs')) {
        const jobsToggle = document.querySelector('[data-tour="sidenav-jobs-toggle"]') as HTMLButtonElement | null;
        const targetEl = document.querySelector(currentStep.selector) as HTMLElement | null;
        if (jobsToggle && (!targetEl || targetEl.offsetHeight < 10)) {
          jobsToggle.click();
        }
      }

      // Auto-expand Gigs accordion if pointing to gigs sidebar elements
      if (currentStep?.id?.includes('gig') || currentStep?.selector?.includes('gigs')) {
        const gigsToggle = document.querySelector('[data-tour="sidenav-gigs-toggle"]') as HTMLButtonElement | null;
        const targetEl = document.querySelector(currentStep.selector) as HTMLElement | null;
        if (gigsToggle && (!targetEl || targetEl.offsetHeight < 10)) {
          gigsToggle.click();
        }
      }
    }

    // Auto-open detail drawers if step targets inside a detail modal/drawer
    if (currentStep?.id === 'gigs_detail_view_full' || currentStep?.id === 'gigs_detail_order') {
      if (!document.querySelector(currentStep.selector)) {
        const firstGig = document.querySelector('[data-tour="gig-card-first"]') as HTMLElement | null;
        if (firstGig) firstGig.click();
      }
    }
    if (currentStep?.id === 'jobs_detail_view_full' || currentStep?.id === 'jobs_detail_send_proposal') {
      if (!document.querySelector(currentStep.selector)) {
        const firstJob = document.querySelector('[data-tour="job-card-first"]') as HTMLElement | null;
        if (firstJob) firstJob.click();
      }
    }

    // Auto-close detail drawers if step has moved past the drawer view
    if (
      (currentStep?.id === 'gigs_orders' || currentStep?.section !== 'Gigs & Services') &&
      document.querySelector('[data-tour="gig-detail-exit-pill"]')
    ) {
      const exitPill = document.querySelector('[data-tour="gig-detail-exit-pill"]') as HTMLElement | null;
      if (exitPill) exitPill.click();
    }
    if (
      (currentStep?.id === 'jobs_proposals' || currentStep?.section !== 'Job Market') &&
      document.querySelector('[data-tour="job-detail-exit-pill"]')
    ) {
      const exitPill = document.querySelector('[data-tour="job-detail-exit-pill"]') as HTMLElement | null;
      if (exitPill) exitPill.click();
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

  // Fallback timer: if target element isn't found within 1.2s, display the card controls so the user is never stuck
  useEffect(() => {
    setShowFallbackCard(false);
    if (!isElementFound) {
      const fallbackTimer = setTimeout(() => {
        setShowFallbackCard(true);
      }, 1200);
      return () => clearTimeout(fallbackTimer);
    }
  }, [currentStepIndex, isElementFound]);

  // When clicking outside the highlighted target and card, trigger gentle shake
  const handleBlockedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShakeCard(true);
    setTimeout(() => setShakeCard(false), 500);
  };

  if (!currentStep) return null;

  const totalSteps = activeSteps.length;
  const sectionSteps = activeSteps.filter((s) => s.section === currentStep.section);
  const sectionCurrentIndex = sectionSteps.findIndex((s) => s.id === currentStep.id);
  const sectionTotal = sectionSteps.length || 1;
  const sectionProgressPercent = Math.round(
    ((Math.max(0, sectionCurrentIndex) + 1) / sectionTotal) * 100
  );
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

  if (!isElementFound) {
    placement = 'none';
    cardTop = Math.max(TOP_SAFE_PADDING, windowSize.height - actualCardHeight - BOTTOM_SAFE_PADDING - 16);
    cardLeft = Math.max(SIDE_SAFE_PADDING, windowSize.width - CARD_WIDTH - SIDE_SAFE_PADDING);
  } else if (targetRect && isElementFound) {
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
          <strong key={index} className="font-bold text-zinc-950 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

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

      {/* 2. Target Element Spotlight Ring (Crisp High-Contrast Border Around Target) */}
      {targetRect && isElementFound && (
        <div
          className={`fixed pointer-events-none border-2 transition-all duration-300 ease-out ${
            isClickStep
              ? 'border-zinc-900 dark:border-white ring-4 ring-zinc-500/30 dark:ring-white/30 shadow-[0_0_24px_rgba(0,0,0,0.35)] dark:shadow-[0_0_24px_rgba(255,255,255,0.25)] animate-pulse'
              : 'border-zinc-900/80 dark:border-white/90 ring-4 ring-zinc-500/20 dark:ring-white/20 shadow-[0_0_20px_rgba(0,0,0,0.2)] dark:shadow-[0_0_20px_rgba(255,255,255,0.15)]'
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

      {/* 2b. Click blocker for passive/observe steps so users don't accidentally trigger underlying buttons */}
      {!isClickStep && targetRect && isElementFound && (
        <div
          className="fixed pointer-events-auto cursor-default z-[9993]"
          style={{
            top: `${hlTop}px`,
            left: `${hlLeft}px`,
            width: `${hlWidth}px`,
            height: `${hlHeight}px`,
            borderRadius: `${innerRadius}px`,
          }}
          onClick={handleBlockedClick}
          title="Observe step: press Next on the tour card to continue"
        />
      )}

      {/* 3. Floating Walkthrough Popover Card */}
      <AnimatePresence mode="wait">
        {!isElementFound && !showFallbackCard ? (
          <motion.div
            key="waiting-target"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-10 right-6 z-[10002] flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-[#12141c] px-4 py-2.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-2xl backdrop-blur-md pointer-events-auto"
          >
            <div className="h-3.5 w-3.5 border-2 border-zinc-700 dark:border-zinc-300 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Loading {currentStep.tabHint || 'page view'}...</span>
            <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-700 pl-2 ml-1">
              <button
                type="button"
                onClick={onSkipSection}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Skip section"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Exit Walkthrough"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
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
            className="pointer-events-auto relative rounded-2xl border border-zinc-200/90 dark:border-zinc-700/60 bg-white dark:bg-[#12141c] text-zinc-900 dark:text-zinc-100 shadow-2xl shadow-black/15 dark:shadow-black/70 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow Pointer: Top (points UP) */}
            {placement === 'bottom' && (
              <div
                className="absolute -top-[9px] pointer-events-none"
                style={{ left: `${arrowOffset}px`, transform: 'translateX(-50%)' }}
              >
                <svg width="18" height="10" viewBox="0 0 18 10">
                  <polygon points="9,0 0,10 18,10" className="fill-white dark:fill-[#12141c]" />
                  <polyline
                    points="0,10 9,0 18,10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-zinc-200 dark:text-zinc-700/60"
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
                  <polygon points="0,0 18,0 9,10" className="fill-white dark:fill-[#12141c]" />
                  <polyline
                    points="0,0 9,10 18,0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-zinc-200 dark:text-zinc-700/60"
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
                  <polygon points="0,0 10,9 0,18" className="fill-white dark:fill-[#12141c]" />
                  <polyline
                    points="0,0 10,9 0,18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-zinc-200 dark:text-zinc-700/60"
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
                  <polygon points="10,0 0,9 10,18" className="fill-white dark:fill-[#12141c]" />
                  <polyline
                    points="10,0 0,9 10,18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-zinc-200 dark:text-zinc-700/60"
                  />
                </svg>
              </div>
            )}

            {/* Top Bar: Section Badge + Counter + Close Button */}
            <div className="flex items-center justify-between pb-2 mb-2">
              <div className="flex items-center gap-2">
                {currentStep.section && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/60 shadow-xs">
                    <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">#</span>
                    {currentStep.section}
                  </span>
                )}
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 font-mono">
                  {sectionCurrentIndex + 1} / {sectionTotal}
                </span>
              </div>

              <button
                type="button"
                onClick={onExit}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Exit Walkthrough"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sleek Progress Bar */}
            <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
              <div
                style={{ width: `${sectionProgressPercent}%` }}
                className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300 ease-out rounded-full"
              />
            </div>

            {/* Target Title */}
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <span>{displayTitle}</span>
            </h3>

            {/* Main Direct Instruction */}
            <div className="text-xs sm:text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300 mb-4 font-normal">
              {renderFormattedText(displayText)}
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={currentStepIndex === 0}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    currentStepIndex === 0
                      ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-40'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                  }`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>

                <button
                  type="button"
                  onClick={onSkipSection}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Skip to next section"
                >
                  Skip
                </button>
              </div>

              {isClickStep ? (
                /* Click-to-Advance Interactive Pill (No Next button shown) */
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep.id === 'gigs_detail_exit') {
                      const pill = document.querySelector('[data-tour="gig-detail-exit-pill"]') as HTMLElement | null;
                      if (pill) pill.click();
                    } else if (currentStep.id === 'jobs_detail_exit') {
                      const pill = document.querySelector('[data-tour="job-detail-exit-pill"]') as HTMLElement | null;
                      if (pill) pill.click();
                    }
                    onNext();
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
                  title="Click highlighted element, or click here to continue"
                >
                  <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <span>{isDropdownItemActive ? 'Click highlighted option' : 'Click highlighted element'}</span>
                </button>
              ) : (
                /* Standard Next Button for passive observe steps */
                <button
                  type="button"
                  onClick={onNext}
                  className="flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:active:bg-zinc-200 px-4 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 transition-all shadow-sm hover:shadow cursor-pointer"
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
