import React, { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTourStore, WALKTHROUGH_STEPS, type UserPlatformRole } from '@/lib/tour_state';
import useGlobalState from '@/lib/global_state';
import { TourWelcomeModal } from './TourWelcomeModal';
import { TourSpotlightCard } from './TourSpotlightCard';
import { TourGraduationModal } from './TourGraduationModal';

export const PlatformTour: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useGlobalState((state) => state.user);
  const isAuthenticated = useGlobalState((state) => state.isAuthenticated);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);

  const isWalkthroughActive = useTourStore((state) => state.isWalkthroughActive);
  const isWelcomeOpen = useTourStore((state) => state.isWelcomeOpen);
  const isGraduationOpen = useTourStore((state) => state.isGraduationOpen);
  const currentStepIndex = useTourStore((state) => state.currentStepIndex);

  const initFromUser = useTourStore((state) => state.initFromUser);
  const startWalkthrough = useTourStore((state) => state.startWalkthrough);
  const nextStep = useTourStore((state) => state.nextStep);
  const prevStep = useTourStore((state) => state.prevStep);
  const skipWalkthrough = useTourStore((state) => state.skipWalkthrough);
  const closeWelcome = useTourStore((state) => state.closeWelcome);
  const closeGraduation = useTourStore((state) => state.closeGraduation);

  // Initialize once user is available on /home
  useEffect(() => {
    if (isAuthenticated && user && !isGuestMode && location.pathname === '/home') {
      initFromUser(user);
    }
  }, [isAuthenticated, user, isGuestMode, location.pathname, initFromUser]);

  // Synchronize route navigation when currentStepIndex changes
  useEffect(() => {
    if (!isWalkthroughActive) return;
    const step = WALKTHROUGH_STEPS[currentStepIndex];
    if (step) {
      // If pointing to a sidebar item and currently on a valid workspace page, do not force navigate
      if (step.selector.includes('sidenav') && location.pathname !== '/settings' && location.pathname !== '/') {
        return;
      }
      // If currently on an item sub-route (e.g. /jobs/postings/123), don't force navigate away if same base
      if (location.pathname !== step.route && !location.pathname.startsWith(step.route + '/')) {
        navigate(step.route, { state: step.routeState });
      } else if (step.routeState) {
        navigate(step.route, { state: step.routeState, replace: true });
      }
    }
  }, [isWalkthroughActive, currentStepIndex]);

  const prevPathRef = useRef(location.pathname);

  // Route change detector: advance step if the user's navigation reached the next step's route
  useEffect(() => {
    if (!isWalkthroughActive) {
      prevPathRef.current = location.pathname;
      return;
    }

    const prevPath = prevPathRef.current;
    prevPathRef.current = location.pathname;

    const currentStepObj = WALKTHROUGH_STEPS[currentStepIndex];
    const nextStepObj = WALKTHROUGH_STEPS[currentStepIndex + 1];

    if (
      prevPath !== location.pathname &&
      currentStepObj &&
      location.pathname !== currentStepObj.route &&
      nextStepObj
    ) {
      // If staying within sub-routes of the same feature (e.g. opening /jobs/postings/:id drawer),
      // and the next step is part of this feature, do NOT auto-advance the route!
      const isSubRouteOfCurrent =
        currentStepObj.route !== '/' &&
        location.pathname.startsWith(currentStepObj.route + '/') &&
        nextStepObj.route === currentStepObj.route;

      if (isSubRouteOfCurrent) {
        return;
      }

      const matchesNext =
        location.pathname === nextStepObj.route ||
        (nextStepObj.route !== '/' && location.pathname.startsWith(nextStepObj.route + '/')) ||
        (location.pathname !== '/' && nextStepObj.route.startsWith(location.pathname)) ||
        (nextStepObj.selector.includes('sidenav') && location.pathname !== '/settings' && location.pathname !== '/');

      if (matchesNext) {
        nextStep();
      }
    }
  }, [isWalkthroughActive, location.pathname, currentStepIndex, nextStep]);

  // Direct element click listener for 'click'-type steps
  useEffect(() => {
    if (!isWalkthroughActive) return;
    const step = WALKTHROUGH_STEPS[currentStepIndex];
    if (!step || step.actionType !== 'click') return;

    // Header profile steps open the menu first, then navigate on selecting the item
    if (step.id === 'header_profile_nav' || step.id === 'header_settings_nav') {
      return;
    }

    let cleanedUp = false;
    let targetEl: Element | null = null;
    let clickHandler: (() => void) | null = null;

    const tryAttach = () => {
      if (cleanedUp || targetEl) return;
      const el = document.querySelector(step.selector);
      if (el) {
        targetEl = el;
        clickHandler = () => {
          setTimeout(() => {
            nextStep();
          }, 100);
        };
        el.addEventListener('click', clickHandler, { once: true });
      }
    };

    tryAttach();
    const interval = setInterval(tryAttach, 100);

    return () => {
      cleanedUp = true;
      clearInterval(interval);
      if (targetEl && clickHandler) {
        targetEl.removeEventListener('click', clickHandler);
      }
    };
  }, [isWalkthroughActive, currentStepIndex, nextStep]);

  // Handle next action with route transition
  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WALKTHROUGH_STEPS.length) {
      const nextStepObj = WALKTHROUGH_STEPS[nextIndex];
      if (nextStepObj) {
        if (location.pathname !== nextStepObj.route && !location.pathname.startsWith(nextStepObj.route + '/')) {
          navigate(nextStepObj.route, { state: nextStepObj.routeState });
        } else if (nextStepObj.routeState) {
          navigate(nextStepObj.route, { state: nextStepObj.routeState, replace: true });
        }
      }
      nextStep();
    } else {
      nextStep(); // Triggers finishWalkthrough
    }
  }, [currentStepIndex, location.pathname, navigate, nextStep]);

  // Handle back action with route transition
  const handlePrev = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      const prevStepObj = WALKTHROUGH_STEPS[prevIndex];
      if (prevStepObj) {
        if (location.pathname !== prevStepObj.route && !location.pathname.startsWith(prevStepObj.route + '/')) {
          navigate(prevStepObj.route, { state: prevStepObj.routeState });
        } else if (prevStepObj.routeState) {
          navigate(prevStepObj.route, { state: prevStepObj.routeState, replace: true });
        }
      }
      prevStep();
    }
  }, [currentStepIndex, location.pathname, navigate, prevStep]);

  // Keyboard navigation (skip arrow advance on click-required steps)
  useEffect(() => {
    if (!isWalkthroughActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = WALKTHROUGH_STEPS[currentStepIndex];
      if (e.key === 'Escape') {
        e.preventDefault();
        skipWalkthrough();
      } else if (e.key === 'ArrowRight') {
        // Only allow arrow advance on 'next'-type steps
        if (step?.actionType !== 'click') {
          e.preventDefault();
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWalkthroughActive, currentStepIndex, handleNext, handlePrev, skipWalkthrough]);

  // Start walkthrough handler from welcome modal
  const handleStartWalkthrough = useCallback((role: UserPlatformRole) => {
    startWalkthrough(role);
    const firstStep = WALKTHROUGH_STEPS[0];
    if (firstStep && location.pathname !== firstStep.route) {
      navigate(firstStep.route);
    }
  }, [startWalkthrough, location.pathname, navigate]);

  // Don't render if user is not authenticated or in guest mode
  if (!isAuthenticated && !isWalkthroughActive && !isWelcomeOpen) return null;

  return (
    <>
      {/* 1. Welcome Modal */}
      <TourWelcomeModal
        isOpen={isWelcomeOpen}
        onClose={closeWelcome}
        onStart={handleStartWalkthrough}
      />

      {/* 2. Active Walkthrough Spotlight Card */}
      {isWalkthroughActive && (
        <TourSpotlightCard
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={skipWalkthrough}
        />
      )}

      {/* 3. Walkthrough Graduation Modal */}
      <TourGraduationModal
        isOpen={isGraduationOpen}
        onClose={closeGraduation}
      />
    </>
  );
};

export default PlatformTour;
