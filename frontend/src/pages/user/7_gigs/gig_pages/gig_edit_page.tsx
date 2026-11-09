import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import api from "@/lib/axios";
import ShapeGrid from "@/components/ui/ShapeGrid";
import FloatingCreditsPill from "@/components/ui/FloatingCreditsPill";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { convertGigPresetUrlToFile } from "@/lib/defaultGigBanners";
import { getImageUrl } from "@/lib/utils";
import useGlobalState from "@/lib/global_state";
import { GigCreateHeader } from "../gig_components/gig_creation_components/gig_create_header";
import { GigIdentity } from "../gig_components/gig_creation_components/0_gig_identity";
import { CreateCoreInfo } from "../gig_components/gig_creation_components/1_create_coreinfo";
import { GigTerms } from "../gig_components/gig_creation_components/2_gig_terms";
import { GigMilestones, type ServiceMilestone } from "../gig_components/gig_creation_components/3_gig_milestones";
import { CreateTiers } from "../gig_components/gig_creation_components/3_create_tiers";
import { CreateReview } from "../gig_components/gig_creation_components/6_create_review";
import { CreationSuccess } from "../gig_components/gig_creation_components/7_creation_success";
import type { GigTier, GigAddOn, Questionnaire } from "../gig_datasets";
import { showErrorToast } from "@/components/utility/toast";

export const GigEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useGlobalState((state) => state.user);
  const theme = useGlobalState((state) => state.theme);

  const [isLoading, setIsLoading] = useState(true);
  const [isInitializingEditor, setIsInitializingEditor] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(2);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializingEditor(false);
    }, 750);
    return () => clearTimeout(timer);
  }, []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Step 1: Representation & Identity
  const [postingAs, setPostingAs] = useState<"self" | "team">("self");
  const [actingTeamId, setActingTeamId] = useState<string>("");
  const [includedMemberIds, setIncludedMemberIds] = useState<string[]>(() => {
    const uid = user?.account_id || (user as any)?.accountId || user?.id;
    return uid ? [String(uid)] : [];
  });

  // Step 2: Core Info
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [skills, setSkills] = useState<string[]>([]);

  // Step 3: Order Policies, Work Samples & Buyer Requirements
  const [termsOfService, setTermsOfService] = useState("");
  const [selectedTosId, setSelectedTosId] = useState("default-standard");
  const [workSampleFiles, setWorkSampleFiles] = useState<File[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [slots, setSlots] = useState<number>(3);
  const [firstDraftDelivery, setFirstDraftDelivery] = useState("3 Days");
  const [additionalWorkRate, setAdditionalWorkRate] = useState<number>(25);
  const [askNDA, setAskNDA] = useState<boolean>(false);
  const [askPortfolio, setAskPortfolio] = useState<boolean>(true);
  const [portfolioDuration, setPortfolioDuration] = useState<string>("30");
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);

  // Step 4: Milestones
  const [milestones, setMilestones] = useState<ServiceMilestone[]>([
    {
      id: "1",
      name: "Initial Concept & Rough Cut",
      description: "Assembly of timeline, storyboarding, and initial sync for review.",
      hours: 8,
      revisions: 1,
      percentage: 40,
      tasks: ["Asset & Script Sync", "Timeline Assembly", "Rough Cut Export"],
    },
    {
      id: "2",
      name: "Final Polish & Master Export",
      description: "Color grading, sound design, motion graphics, and final render.",
      hours: 12,
      revisions: 2,
      percentage: 60,
      tasks: ["Color Grading & VFX", "Audio Mixing & Mastering", "Final 4K Render"],
    },
  ]);

  // Step 5: Tiers & Add-ons
  const [tiers, setTiers] = useState<GigTier[]>([
    { tierName: "Basic", title: "Basic Package", description: "", price: 150, daysOfDelivery: 3, revisions: 1 },
  ]);
  const [addOns, setAddOns] = useState<GigAddOn[]>([]);

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const res = await api.get(`/api/gigs/${id}`);
        if (res.data?.success && res.data.data) {
          const data = res.data.data;
          if (data.canManageGig === false) {
            showErrorToast("You are not authorized to edit this service.");
            navigate("/gigs/services");
            return;
          }

          setTitle(data.title || "");
          setCategory(data.category || "");
          setDescription(data.description || "");
          setThumbnailUrl(data.thumbnail ? getImageUrl(data.thumbnail) : null);
          setSlots(Number(data.slots) || 3);
          setTermsOfService(data.termsOfService || data.terms_of_service || "");
          setFirstDraftDelivery(data.firstDraftDelivery || "3 Days");
          setAdditionalWorkRate(Number(data.additionalWorkRate) || 25);
          setSkills(Array.isArray(data.skills) ? data.skills : []);

          if (data.isTeam || data.teamId) {
            setPostingAs("team");
            if (data.teamId) setActingTeamId(String(data.teamId));
          } else {
            setPostingAs("self");
          }

          // Load gallery URLs (exclude thumbnail if duplicated)
          if (Array.isArray(data.gallery) && data.gallery.length > 0) {
            const filteredGallery = data.gallery.filter(
              (url: string) => Boolean(url) && url !== data.thumbnail
            );
            setGalleryUrls(filteredGallery);
          }

          // Load tiers
          if (Array.isArray(data.tiers) && data.tiers.length > 0) {
            const defaultTierNames = ["Basic", "Standard", "Premium"];
            setTiers(
              data.tiers.map((t: any, idx: number) => ({
                tierId: t.tierId || t.id,
                tierName: (t.tierName || defaultTierNames[idx] || "Basic") as "Basic" | "Standard" | "Premium",
                title: t.title || t.name || `${defaultTierNames[idx] || "Basic"} Package`,
                description: t.description || "",
                price: Number(t.price) || 150,
                daysOfDelivery: Number(t.daysOfDelivery) || 3,
                revisions: Number(t.revisions) || 1,
              }))
            );
          }

          // Load add-ons
          const rawAddOns = data.addOns || data.add_ons || [];
          if (Array.isArray(rawAddOns) && rawAddOns.length > 0) {
            setAddOns(
              rawAddOns.map((a: any, idx: number) => ({
                id: String(a.id || a.gig_addon_id || `addon-${idx}`),
                title: a.title || a.name || "",
                price: Number(a.price ?? a.price_credits ?? 25),
                deliveryDays: Number(a.deliveryDays ?? a.additional_days ?? 0),
              }))
            );
          } else {
            setAddOns([]);
          }

          // Load milestones
          if (Array.isArray(data.milestones) && data.milestones.length > 0) {
            const count = data.milestones.length;
            const defaultPct = Math.floor(100 / count);
            setMilestones(
              data.milestones.map((m: any, idx: number) => {
                const rawTasks = Array.isArray(m.tasks)
                  ? m.tasks
                  : Array.isArray(m.deliverables)
                  ? m.deliverables
                  : typeof m.tasks === "string"
                  ? (() => {
                      try {
                        return JSON.parse(m.tasks);
                      } catch {
                        return [];
                      }
                    })()
                  : [];
                return {
                  id: String(m.id || idx + 1),
                  name: m.name || m.title || `Phase ${idx + 1}`,
                  description: m.description || "",
                  hours: Number(m.hours) || 8,
                  revisions: Number(m.revisions) || 1,
                  percentage:
                    Number(m.percentage ?? m.timelinePercentage) ||
                    (idx === count - 1 ? 100 - defaultPct * (count - 1) : defaultPct),
                  tasks: rawTasks.length > 0 ? rawTasks : ["Deliverable Check"],
                };
              })
            );
          }

          // Load questionnaires and separate synthetic NDA / Portfolio flags
          if (Array.isArray(data.questionnaires) && data.questionnaires.length > 0) {
            let detectedNDA = false;
            let detectedPortfolio = false;
            let detectedDuration = "30";
            const customQuestions: Questionnaire[] = [];

            data.questionnaires.forEach((q: any, idx: number) => {
              const qText = String(q.question || "");
              if (/confidentiality \(NDA\)/i.test(qText)) {
                detectedNDA = true;
                return;
              }
              const portMatch = qText.match(/Freelancer\/Studio Portfolio.*?\(up to (\d+)s showcase\)/i);
              if (portMatch) {
                detectedPortfolio = true;
                if (portMatch[1]) detectedDuration = portMatch[1];
                return;
              }
              customQuestions.push({
                id: String(q.id || idx + 1),
                type: q.type || "text",
                question: qText,
                isRequired: q.isRequired !== undefined ? Boolean(q.isRequired) : true,
                multipleAnswer: Boolean(q.multipleAnswer),
                fileLimit: q.fileLimit || undefined,
                fileTypes: Array.isArray(q.fileTypes) ? q.fileTypes : [],
                options: Array.isArray(q.options) ? q.options : [],
              });
            });

            setAskNDA(detectedNDA);
            setAskPortfolio(detectedPortfolio);
            setPortfolioDuration(detectedDuration);
            setQuestionnaires(customQuestions);
          }
        }
      } catch (err) {
        console.error("Failed to load gig details:", err);
        showErrorToast("Could not load service details.");
        navigate("/gigs/services");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchGig();
  }, [id, navigate]);

  const validateCurrentStep = (stepToValidate = currentSlide) => {
    const newErrors: Record<string, string> = {};

    if (stepToValidate === 2) {
      if (!title.trim()) newErrors.title = "Title is required.";
      else if (title.trim().length < 10) newErrors.title = "Title must be at least 10 characters.";
      if (!category) newErrors.category = "Please select a category.";
      const plainDesc = description.replace(/<[^>]+>/g, "").trim();
      if (!plainDesc) newErrors.description = "Description is required.";
      else if (plainDesc.length < 30) newErrors.description = "Please provide a more detailed description.";
      if (!thumbnailUrl && !thumbnailFile) newErrors.thumbnail = "Thumbnail image is required.";
      if (skills.length === 0) newErrors.skills = "Select at least one skill.";
    } else if (stepToValidate === 3) {
      if (slots < 1) newErrors.slots = "Slots must be at least 1.";
      if (!termsOfService.trim()) newErrors.termsOfService = "Terms of Service are required.";
      questionnaires.forEach((q) => {
        if (!q.question.trim()) {
          newErrors[`question_${q.id}_question`] = "Question cannot be empty.";
        }
      });
    } else if (stepToValidate === 4) {
      if (milestones.length === 0) {
        newErrors.milestones = "At least one milestone is required.";
      } else {
        milestones.forEach((m, idx) => {
          if (!m.name.trim()) newErrors[`milestone_${idx}_name`] = "Milestone title is required.";
          if (!m.description.trim()) newErrors[`milestone_${idx}_desc`] = "Description is required.";
        });
      }
    } else if (stepToValidate === 5) {
      tiers.forEach((t, idx) => {
        if (!t.title.trim()) newErrors[`tier_${idx}_title`] = "Package name is required.";
        if (!t.description.trim()) newErrors[`tier_${idx}_desc`] = "Package description is required.";
        if (t.price < 5) newErrors[`tier_${idx}_price`] = "Minimum price is 5 Credits.";
        if (t.daysOfDelivery < 1) newErrors[`tier_${idx}_days`] = "Must be at least 1 day.";
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStepJump = (targetStep: number) => {
    setErrors({});
    setCurrentSlide(targetStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = (targetSlide?: number) => {
    const nextSlide = targetSlide !== undefined ? targetSlide : currentSlide + 1;
    if (nextSlide > currentSlide) {
      if (!validateCurrentStep(currentSlide)) return;
    }
    setCurrentSlide(nextSlide);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setErrors({});
    setCurrentSlide((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let uploadedThumbnailId: string | null = null;
      const uploadedGalleryIds: string[] = [];

      // Upload new thumbnail if a new file or preset banner was selected
      let fileToUpload = thumbnailFile;
      if (!fileToUpload && thumbnailUrl && thumbnailUrl.startsWith("/gig_banners/")) {
        try {
          fileToUpload = await convertGigPresetUrlToFile(
            thumbnailUrl,
            thumbnailUrl.split("/").pop() || "preset_banner.png"
          );
        } catch (e) {
          console.warn("Could not convert preset banner to file:", e);
        }
      }

      if (fileToUpload) {
        const upRes = await uploadFileWithIntent(fileToUpload, "gig_thumbnails");
        uploadedThumbnailId = upRes?.fileId || null;
      }

      // Upload any newly added work sample files
      for (const gFile of workSampleFiles) {
        const upRes = await uploadFileWithIntent(gFile, "gig_galleries");
        if (upRes?.fileId) uploadedGalleryIds.push(upRes.fileId);
      }

      const finalQuestionnaires = [...questionnaires];
      if (askNDA) {
        finalQuestionnaires.push({
          id: "req-nda-" + Date.now(),
          type: "choice",
          question: "Do you require confidentiality (NDA) for this project?",
          isRequired: true,
          multipleAnswer: false,
          options: ["Yes, I require an NDA", "No, standard confidentiality is fine"],
        });
      }
      if (askPortfolio) {
        finalQuestionnaires.push({
          id: "req-port-" + Date.now(),
          type: "choice",
          question: `Do you allow us to display the final work in our Freelancer/Studio Portfolio after completion (up to ${portfolioDuration || "30"}s showcase)?`,
          isRequired: true,
          multipleAnswer: false,
          options: ["Yes, you can use it", "No, please keep it private"],
        });
      }

      const gigPayload = {
        title,
        category,
        description,
        slots,
        termsOfService,
        firstDraftDelivery:
          tiers.length > 0
            ? tiers[0].daysOfDelivery === 1
              ? "1 Day"
              : `${tiers[0].daysOfDelivery} Days`
            : firstDraftDelivery,
        additionalWorkRate,
        tiers,
        addOns,
        milestones,
        questionnaires: finalQuestionnaires,
        skills,
        thumbnailFileId: uploadedThumbnailId,
        keptGalleryUrls: galleryUrls,
        galleryFileIds: uploadedGalleryIds.length > 0 ? uploadedGalleryIds : undefined,
      };

      const res = await api.put(`/api/gigs/${id}`, gigPayload);
      if (res.data?.success) {
        setIsSuccessOpen(true);
      }
    } catch (error: any) {
      console.error("Failed to update gig:", error);
      showErrorToast(error?.response?.data?.message || "Failed to update service changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSuccess = () => {
    setIsSuccessOpen(false);
    navigate(`/gigs/services/${id}/page`);
  };

  if (isLoading || isInitializingEditor) {
    return (
      <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6 font-['Plus_Jakarta_Sans'] overflow-hidden">
        {/* Background Grid */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
          <ShapeGrid
            shape="square"
            squareSize={48}
            direction="diagonal"
            speed={0.4}
            borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)"}
            hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
            hoverTrailAmount={3}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 flex flex-col items-center gap-3 text-center"
        >
          <div className="w-40 h-40 flex items-center justify-center">
            <DotLottieReact
              src="/icons/lottie/loading-ensemble.lottie"
              loop
              autoplay
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Loading Service Editor
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Retrieving your service specifications, milestones, and pricing packages...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-12 font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-300">
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

      <FloatingCreditsPill />

      {/* Wide container matching gig_create_page.tsx */}
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
            Editing Service Post
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Update the details below to modify your service offering on the marketplace.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          <GigCreateHeader
            currentSlide={currentSlide}
            onReturn={() => navigate(`/gigs/services/${id}/page`)}
            maxReachedStep={6}
            hasReachedReview={true}
            onJumpToReview={() => handleStepJump(6)}
            onStepClick={(stepId) => handleStepJump(stepId)}
          />
        </motion.div>

        {/* Form Box Wrapper with Slide Transition */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 sm:p-8 lg:p-10 backdrop-blur-xl shadow-2xl space-y-6 w-full"
        >
          <AnimatePresence mode="wait">
            {currentSlide === 1 && (
              <motion.div
                key="slide1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <GigIdentity
                  postingAs={postingAs}
                  setPostingAs={setPostingAs}
                  actingTeamId={actingTeamId}
                  setActingTeamId={setActingTeamId}
                  includedMemberIds={includedMemberIds}
                  setIncludedMemberIds={setIncludedMemberIds}
                  onNext={() => handleNext(2)}
                  isEditMode={true}
                />
              </motion.div>
            )}

            {currentSlide === 2 && (
              <motion.div
                key="slide2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <CreateCoreInfo
                  title={title}
                  setTitle={setTitle}
                  category={category}
                  setCategory={setCategory}
                  description={description}
                  setDescription={setDescription}
                  previewUrl={thumbnailUrl}
                  setPreviewUrl={setThumbnailUrl}
                  setThumbnailFile={setThumbnailFile}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  skills={skills}
                  setSkills={setSkills}
                  errors={errors}
                  setErrors={setErrors}
                  postingAs={postingAs}
                  onNext={() => handleNext(3)}
                  onBack={() => handleNext(1)}
                  onDiscard={() => navigate(`/gigs/services/${id}/page`)}
                />
              </motion.div>
            )}

            {currentSlide === 3 && (
              <motion.div
                key="slide3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <GigTerms
                  termsOfService={termsOfService}
                  setTermsOfService={setTermsOfService}
                  selectedTosId={selectedTosId}
                  setSelectedTosId={setSelectedTosId}
                  workSampleFiles={workSampleFiles}
                  setWorkSampleFiles={setWorkSampleFiles}
                  galleryUrls={galleryUrls}
                  setGalleryUrls={setGalleryUrls}
                  slots={slots}
                  setSlots={setSlots}
                  additionalWorkRate={additionalWorkRate}
                  setAdditionalWorkRate={setAdditionalWorkRate}
                  askNDA={askNDA}
                  setAskNDA={setAskNDA}
                  askPortfolio={askPortfolio}
                  setAskPortfolio={setAskPortfolio}
                  portfolioDuration={portfolioDuration}
                  setPortfolioDuration={setPortfolioDuration}
                  questionnaires={questionnaires}
                  setQuestionnaires={setQuestionnaires}
                  errors={errors}
                  setErrors={setErrors}
                  onNext={() => handleNext(4)}
                  onBack={handleBack}
                />
              </motion.div>
            )}

            {currentSlide === 4 && (
              <motion.div
                key="slide4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <GigMilestones
                  milestones={milestones}
                  setMilestones={setMilestones}
                  tiers={tiers}
                  setTiers={setTiers}
                  additionalWorkRate={additionalWorkRate}
                  setAdditionalWorkRate={setAdditionalWorkRate}
                  errors={errors}
                  setErrors={setErrors}
                  onNext={() => handleNext(5)}
                  onBack={handleBack}
                />
              </motion.div>
            )}

            {currentSlide === 5 && (
              <motion.div
                key="slide5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <CreateTiers
                  tiers={tiers}
                  setTiers={setTiers}
                  addOns={addOns}
                  setAddOns={setAddOns}
                  gigTitle={title}
                  gigDescription={description}
                  gigCategory={category}
                  gigSkills={skills}
                  isTeam={postingAs === "team"}
                  additionalWorkRate={additionalWorkRate}
                  setAdditionalWorkRate={setAdditionalWorkRate}
                  errors={errors}
                  setErrors={setErrors}
                  onNext={() => handleNext(6)}
                  onBack={handleBack}
                />
              </motion.div>
            )}

            {currentSlide === 6 && (
              <motion.div
                key="slide6"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <CreateReview
                  title={title}
                  description={description}
                  category={category}
                  thumbnailUrl={thumbnailUrl}
                  slots={slots}
                  termsOfService={termsOfService}
                  skills={skills}
                  firstDraftDelivery={firstDraftDelivery}
                  workSampleFiles={workSampleFiles}
                  galleryUrls={galleryUrls}
                  tiers={tiers}
                  addOns={addOns}
                  milestones={milestones}
                  additionalWorkRate={additionalWorkRate}
                  questionnaires={questionnaires}
                  askNDA={askNDA}
                  askPortfolio={askPortfolio}
                  portfolioDuration={portfolioDuration}
                  postingAs={postingAs}
                  actingTeamId={actingTeamId}
                  includedMemberIds={includedMemberIds}
                  onBack={handleBack}
                  onSubmit={handleSubmit}
                  onEditStep={(step) => handleStepJump(step)}
                  isSubmitting={isSubmitting}
                  isEditMode={true}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <CreationSuccess
        isOpen={isSuccessOpen}
        message="Your service changes have been saved and updated in the marketplace."
        onConfirm={handleConfirmSuccess}
      />
    </div>
  );
};

export default GigEditPage;
