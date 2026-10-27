import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search } from "lucide-react";
import { requireVerifiedAccount } from "@/lib/accountVerification";
import api from "@/lib/axios";
import type { Gig, GigTier } from "../gig_datasets";
import ShapeGrid from "@/components/ui/ShapeGrid";
import FloatingCreditsPill from "@/components/ui/FloatingCreditsPill";
import useGlobalState from "@/lib/global_state";
import PopupConfirmReturn from "@/pages/user/6_job_market/job_components/job_popups/popup_confirm_return";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import SuccessModal from "@/components/ui/SuccessModal";
import { showErrorToast } from "@/components/utility/toast";

import OrderWizardHeader from "../gig_orders/orders_components/order_wizard_components/order_wizard_header";
import OrderSelection from "../gig_orders/orders_components/order_wizard_components/1_order_selection";
import OrderDetails from "../gig_orders/orders_components/order_wizard_components/2_order_details";
import OrderQuestions from "../gig_orders/orders_components/order_wizard_components/3_order_questions";
import OrderReview from "../gig_orders/orders_components/order_wizard_components/4_order_review";
import OrderCheckoutModal from "../gig_orders/orders_components/order_wizard_components/order_checkout_modal";

const GigOrderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useGlobalState((state) => state.theme);

  const searchParams = new URLSearchParams(location.search);
  const editOrderId = searchParams.get("edit");

  // Step & Stepper Progress
  const [currentSlide, setCurrentSlide] = useState(1);
  const [maxReachedStep, setMaxReachedStep] = useState(1);

  // Core Service Data
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const initialTierIndex = location.state?.tierIndex !== undefined ? location.state.tierIndex : 0;
  const [tierIndex, setTierIndex] = useState(initialTierIndex);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [actingTeamId, setActingTeamId] = useState("");

  const [projectBrief, setProjectBrief] = useState("");
  const [initiatorRole, setInitiatorRole] = useState<"Client" | "Freelancer">("Freelancer");
  const [isExistingProject, setIsExistingProject] = useState(false);
  const [existingProjectId, setExistingProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsFetched, setProjectsFetched] = useState(false);

  // Workflow & Legal Questions
  const [requireNda, setRequireNda] = useState<"Yes" | "No">("No");
  const [allowPortfolio, setAllowPortfolio] = useState<"Yes" | "No">("Yes");
  const [portfolioDuration, setPortfolioDuration] = useState<number>(15);

  // Freelancer Questionnaire Answers
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});

  // Review Agreements
  const [agreedToFreelancerTerms, setAgreedToFreelancerTerms] = useState(!!editOrderId);
  const [agreedToPlatformTerms, setAgreedToPlatformTerms] = useState(!!editOrderId);

  // Draft & Submission Tracking
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const isSubmittedRef = useRef(false);

  // Modals
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  const isVerified = useGlobalState((state) => state.isVerified);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isGlobalLoading = useGlobalState((state) => state.isLoading);
  const user = useGlobalState((state) => state.user);

  // Update maxReachedStep
  useEffect(() => {
    setMaxReachedStep((prev) => Math.max(prev, currentSlide));
  }, [currentSlide]);

  const hasReachedReview = maxReachedStep >= 4 || currentSlide === 4;

  // Verification Check
  useEffect(() => {
    let cancelled = false;
    if (isGuestMode) {
      navigate("/login");
      return;
    }
    if (isGlobalLoading) return;
    if (isVerified || user?.is_verified) {
      if (!isVerified && user?.is_verified) {
        useGlobalState.getState().setIsVerified(true);
      }
      return;
    }
    requireVerifiedAccount().catch(() => {
      if (!cancelled) {
        useGlobalState.getState().setIsVerificationModalOpen(
          true,
          "Account Verification is required to place a Gig Order. Please verify your identity to proceed."
        );
        navigate(id ? `/gigs/services/${id}` : "/gigs/services");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isGuestMode, isGlobalLoading, isVerified, user?.is_verified, navigate, id]);

  // Fetch Projects for Collaboration Setup
  useEffect(() => {
    let cancelled = false;
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const response = await api.get("/api/projects");
        if (!cancelled) {
          const userProjects = response.data?.projects || response.data?.data || [];
          setProjects(userProjects);
          if (userProjects.length === 0) {
            setInitiatorRole("Freelancer");
            setIsExistingProject(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
          setProjectsFetched(true);
        }
      }
    };
    fetchProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch Gig Data & Edit Order if applicable
  useEffect(() => {
    const fetchGigAndOrder = async () => {
      try {
        const gigRes = await api.get(`/api/gigs/${id}`);
        if (gigRes.data.success && gigRes.data.data) {
          const g = gigRes.data.data;
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
          const mapUrl = (path: string) => {
            if (!path) return undefined;
            if (!cloudFrontUrl && path.includes("public")) return undefined;
            if (path.startsWith("http") || path.startsWith("/")) return path;
            return `${cloudFrontUrl}${path.startsWith("/") ? "" : "/"}${path}`;
          };

          setGig({
            ...g,
            thumbnail:
              mapUrl(g.thumbnail) ||
              "https://d2dl0agwn9kque.cloudfront.net/gig_thumbnails/ede6f8d1-cc62-4afd-be9f-11f044d86122/placeholder_1787040672764_8a5d64b3.png",
          });

          if (!editOrderId && g.hasPendingOrder && g.pendingOrderId) {
            showErrorToast("You already have an active order for this service.");
            navigate(`/gigs/orders/sent/${g.pendingOrderId}`, { replace: true });
            return;
          }

          if (editOrderId) {
            const orderRes = await api.get(`/api/gigs/orders/${editOrderId}`);
            if (orderRes.data.success && orderRes.data.data) {
              const orderData = orderRes.data.data;
              setProjectBrief(orderData.project_brief || "");

              if (orderData.gig_tier_id) {
                const tIndex = g.tiers.findIndex((t: any) => t.tierId === orderData.gig_tier_id);
                if (tIndex !== -1) setTierIndex(tIndex);
              }

              if (orderData.initiator_role) {
                setInitiatorRole(orderData.initiator_role);
              }
              if (orderData.linked_project_id) {
                setIsExistingProject(true);
                setExistingProjectId(orderData.linked_project_id);
              }

              const parsedAnswers: Record<string, any> = {};
              if (orderData.responses && Array.isArray(orderData.responses)) {
                orderData.responses.forEach((resp: any) => {
                  const reqId = resp.question_id || resp.gig_requirement_id;
                  const index = g.questionnaires?.findIndex((q: any) => q.id === reqId);
                  if (index !== undefined && index !== -1) {
                    parsedAnswers[index] = resp.response;
                  } else {
                    parsedAnswers[reqId] = resp.response;
                  }
                });
              }
              setQuestionAnswers(parsedAnswers);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch gig details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGigAndOrder();
  }, [id, editOrderId]);

  // Restore Draft from LocalStorage on mount
  useEffect(() => {
    if (!id || editOrderId) return;
    try {
      const saved = localStorage.getItem(`ensemble_gig_order_draft_${id}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.projectBrief) setProjectBrief(data.projectBrief);
        if (Array.isArray(data.selectedAddonIds)) setSelectedAddonIds(data.selectedAddonIds);
        if (data.questionAnswers && typeof data.questionAnswers === "object") {
          setQuestionAnswers(data.questionAnswers);
        }
        if (data.tierIndex !== undefined && location.state?.tierIndex === undefined) {
          setTierIndex(data.tierIndex);
        }
        if (data.portfolioDuration) setPortfolioDuration(data.portfolioDuration);
        if (data.requireNda) setRequireNda(data.requireNda);
        if (data.allowPortfolio) setAllowPortfolio(data.allowPortfolio);
        if (data.initiatorRole) setInitiatorRole(data.initiatorRole);
        if (data.actingTeamId) setActingTeamId(data.actingTeamId);
        setIsDraftRestored(true);
      }
    } catch (e) {
      console.error("Failed to restore gig order draft", e);
    }
  }, [id, editOrderId]);

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    if (!id || editOrderId || isSubmittedRef.current) return;
    if (!projectBrief && selectedAddonIds.length === 0 && Object.keys(questionAnswers).length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        if (isSubmittedRef.current) return;
        const draftData = {
          projectBrief,
          selectedAddonIds,
          tierIndex,
          portfolioDuration,
          requireNda,
          allowPortfolio,
          initiatorRole,
          actingTeamId,
          questionAnswers,
          updatedAt: Date.now(),
        };
        localStorage.setItem(`ensemble_gig_order_draft_${id}`, JSON.stringify(draftData));
      } catch (e) {
        console.error("Failed to auto-save gig order draft", e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    id,
    editOrderId,
    projectBrief,
    selectedAddonIds,
    tierIndex,
    portfolioDuration,
    requireNda,
    allowPortfolio,
    initiatorRole,
    actingTeamId,
    questionAnswers,
  ]);

  const handleClearDraft = () => {
    if (id) {
      localStorage.removeItem(`ensemble_gig_order_draft_${id}`);
    }
    setProjectBrief("");
    setSelectedAddonIds([]);
    setQuestionAnswers({});
    setPortfolioDuration(15);
    setRequireNda("No");
    setAllowPortfolio("Yes");
    setIsDraftRestored(false);
  };

  // Has Unsaved Changes Check
  const hasUnsavedChanges = useMemo(() => {
    if (editOrderId || isSubmittedRef.current) return false;
    if (projectBrief.trim().length > 0) return true;
    if (selectedAddonIds.length > 0) return true;
    if (tierIndex !== (initialTierIndex || 0)) return true;
    if (actingTeamId !== "") return true;
    if (isExistingProject || existingProjectId) return true;
    if (requireNda === "Yes") return true;
    if (allowPortfolio === "No") return true;
    if (
      Object.values(questionAnswers).some((ans) => {
        if (Array.isArray(ans)) return ans.length > 0;
        return Boolean(ans && String(ans).trim());
      })
    ) {
      return true;
    }
    return false;
  }, [
    editOrderId,
    projectBrief,
    selectedAddonIds,
    tierIndex,
    initialTierIndex,
    actingTeamId,
    isExistingProject,
    existingProjectId,
    requireNda,
    allowPortfolio,
    questionAnswers,
  ]);

  const handleReturnTrigger = () => {
    if (hasUnsavedChanges) {
      setIsDiscardOpen(true);
    } else {
      navigate(id ? `/gigs/services/${id}` : -1);
    }
  };

  const activeTier: GigTier | undefined = gig?.tiers?.[tierIndex] || gig?.tiers?.[0];

  // Total pricing calculations for Checkout Modal
  const basePrice = activeTier?.price || 0;
  const baseDelivery = activeTier?.daysOfDelivery || 0;

  const selectedAddonsList = useMemo(() => {
    return (gig?.addOns || []).filter((a) => a.id && selectedAddonIds.includes(String(a.id)));
  }, [gig?.addOns, selectedAddonIds]);

  const addonsTotalPrice = selectedAddonsList.reduce(
    (sum, a) => sum + (Number(a.price) || 0),
    0
  );
  const addonsTotalDays = selectedAddonsList.reduce(
    (sum, a) => sum + (Number(a.deliveryDays) || 0),
    0
  );

  const totalPrice = basePrice + addonsTotalPrice;
  const totalDeliveryDays = baseDelivery + addonsTotalDays;

  const existingProjectTitle = useMemo(() => {
    if (!existingProjectId) return undefined;
    const found = projects.find((p) => p.project_id === existingProjectId);
    return found?.name || found?.title || existingProjectId;
  }, [projects, existingProjectId]);

  // Order Submission Handler
  const handleConfirmOrder = async () => {
    if (!gig || !activeTier) return;
    setIsProcessing(true);

    try {
      if (!actingTeamId) await requireVerifiedAccount();

      // Compile responses including workflow questions
      const responses: Array<{ requirementId: string; response: string }> = [];

      // 1. Workflow responses
      responses.push({
        requirementId: "workflow-nda",
        response: requireNda === "Yes" ? "Yes, I require an NDA" : "No, standard confidentiality",
      });

      responses.push({
        requirementId: "workflow-portfolio",
        response:
          allowPortfolio === "Yes"
            ? `Yes, portfolio showcase allowed (Up to ${portfolioDuration} seconds)`
            : "No, deliverables must remain private",
      });

      // 2. Custom questionnaire responses
      if (gig.questionnaires && gig.questionnaires.length > 0) {
        Object.entries(questionAnswers).forEach(([idx, response]) => {
          const q = gig.questionnaires[parseInt(idx, 10)];
          if (q) {
            const finalResponse = Array.isArray(response) ? response.join(", ") : String(response);
            responses.push({
              requirementId: q.id || idx,
              response: finalResponse,
            });
          }
        });
      }

      const payload = {
        tierId: activeTier.tierId,
        projectBrief,
        initiatorRole,
        linkedProjectId: isExistingProject ? existingProjectId : null,
        acting_team_id: actingTeamId || null,
        selectedAddonIds,
        responses,
      };

      if (editOrderId) {
        await api.put(`/api/gigs/orders/${editOrderId}`, payload);
      } else {
        await api.post(`/api/gigs/${gig.id}/order`, payload);
      }

      // Lock auto-save and clear draft so next order is pristine
      isSubmittedRef.current = true;
      if (id) {
        localStorage.removeItem(`ensemble_gig_order_draft_${id}`);
      }
      setProjectBrief("");
      setSelectedAddonIds([]);
      setQuestionAnswers({});

      setIsCheckoutModalOpen(false);
      setIsProcessing(false);
      setIsSuccessOpen(true);
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      showErrorToast(
        err?.response?.data?.message || "Failed to submit gig order. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="mb-6 h-36 w-36 grayscale opacity-80">
          <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Service Not Found</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-md">
          The freelance service you are looking for does not exist or might have been removed.
        </p>
        <button
          onClick={() => navigate("/gigs/services")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-500/20"
        >
          <Search className="h-4 w-4" />
          <span>Explore Services</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-12 font-inter transition-colors duration-300">
      <FloatingCreditsPill />

      {/* Background Grid Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      {/* Main Container - Wide Layout matching Service Posting */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6"
      >
        {/* Title Heading Display */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {editOrderId ? "Editing Gig Order" : "Making an Order"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Placing order on{" "}
            <strong className="text-gray-900 dark:text-white">{gig.title}</strong> by{" "}
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {gig.freelancer?.displayName || "Freelancer"}
            </span>
          </p>
        </motion.div>

        {/* Wizard Header Stepper with Draft Restore & Jump to Review */}
        <OrderWizardHeader
          currentSlide={currentSlide}
          onReturn={handleReturnTrigger}
          isDraftRestored={isDraftRestored && !editOrderId}
          onClearDraft={handleClearDraft}
          hasReachedReview={hasReachedReview}
          onJumpToReview={() => setCurrentSlide(4)}
          maxReachedStep={maxReachedStep}
          onStepClick={(stepId) => setCurrentSlide(stepId)}
        />

        {/* Wizard Slide Body */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-dark-surface/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Order Selection */}
            {currentSlide === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <OrderSelection
                  gig={gig}
                  tierIndex={tierIndex}
                  setTierIndex={setTierIndex}
                  selectedAddonIds={selectedAddonIds}
                  setSelectedAddonIds={setSelectedAddonIds}
                  actingTeamId={actingTeamId}
                  setActingTeamId={setActingTeamId}
                  editOrderId={editOrderId}
                  onNext={() => setCurrentSlide(2)}
                  onReturn={handleReturnTrigger}
                />
              </motion.div>
            )}

            {/* Step 2: Order Details */}
            {currentSlide === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <OrderDetails
                  gigTitle={gig.title}
                  gigDescription={gig.description}
                  category={gig.category}
                  tierName={activeTier?.tierName}
                  projectBrief={projectBrief}
                  setProjectBrief={setProjectBrief}
                  initiatorRole={initiatorRole}
                  setInitiatorRole={setInitiatorRole}
                  isExistingProject={isExistingProject}
                  setIsExistingProject={setIsExistingProject}
                  existingProjectId={existingProjectId}
                  setExistingProjectId={setExistingProjectId}
                  projects={projects}
                  loadingProjects={loadingProjects}
                  projectsFetched={projectsFetched}
                  onNext={() => setCurrentSlide(3)}
                  onBack={() => setCurrentSlide(1)}
                />
              </motion.div>
            )}

            {/* Step 3: Questions */}
            {currentSlide === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <OrderQuestions
                  questionnaires={gig.questionnaires || []}
                  requireNda={requireNda}
                  setRequireNda={setRequireNda}
                  allowPortfolio={allowPortfolio}
                  setAllowPortfolio={setAllowPortfolio}
                  portfolioDuration={portfolioDuration}
                  setPortfolioDuration={setPortfolioDuration}
                  questionAnswers={questionAnswers}
                  setQuestionAnswers={setQuestionAnswers}
                  onNext={() => setCurrentSlide(4)}
                  onBack={() => setCurrentSlide(2)}
                />
              </motion.div>
            )}

            {/* Step 4: Review Order */}
            {currentSlide === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <OrderReview
                  gig={gig}
                  tierIndex={tierIndex}
                  selectedAddonIds={selectedAddonIds}
                  projectBrief={projectBrief}
                  initiatorRole={initiatorRole}
                  isExistingProject={isExistingProject}
                  existingProjectTitle={existingProjectTitle}
                  requireNda={requireNda}
                  allowPortfolio={allowPortfolio}
                  portfolioDuration={portfolioDuration}
                  questionnaires={gig.questionnaires || []}
                  questionAnswers={questionAnswers}
                  agreedToFreelancerTerms={agreedToFreelancerTerms}
                  setAgreedToFreelancerTerms={setAgreedToFreelancerTerms}
                  agreedToPlatformTerms={agreedToPlatformTerms}
                  setAgreedToPlatformTerms={setAgreedToPlatformTerms}
                  onEditStep={(stepId) => setCurrentSlide(stepId)}
                  onProceedToCheckout={() => setIsCheckoutModalOpen(true)}
                  onBack={() => setCurrentSlide(3)}
                  editOrderId={editOrderId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Separate Checkout Modal with Swipe Commitment */}
      <OrderCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        gigTitle={gig.title}
        gigThumbnail={gig.thumbnail}
        tierName={activeTier?.tierName || "Selected Tier"}
        totalPrice={totalPrice}
        totalDeliveryDays={totalDeliveryDays}
        onConfirmOrder={handleConfirmOrder}
        editOrderId={editOrderId}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessOpen}
        title={editOrderId ? "Order Successfully Updated!" : "Order Request Successfully Placed!"}
        message={
          editOrderId
            ? "Your order details have been saved."
            : "Your order request has been sent! The creator will review your brief and accept to begin work."
        }
        buttonText={editOrderId ? "VIEW ORDER" : "GO TO MY ORDERS"}
        onConfirm={() =>
          navigate(editOrderId ? `/gigs/orders/sent/${editOrderId}` : "/gigs/orders/sent")
        }
      />

      {/* Popup Confirm Return for Unsaved Changes */}
      <PopupConfirmReturn
        isOpen={isDiscardOpen}
        onConfirm={() => {
          setIsDiscardOpen(false);
          navigate(id ? `/gigs/services/${id}` : -1);
        }}
        onCancel={() => setIsDiscardOpen(false)}
        description="All unsaved order requirements and questionnaire responses will be permanently lost if you return now."
      />
    </div>
  );
};

export default GigOrderPage;
