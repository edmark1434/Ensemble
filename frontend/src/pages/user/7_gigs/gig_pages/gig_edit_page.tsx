import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ShapeGrid from "@/components/ui/ShapeGrid";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";

// Types
import type { GigTier, Milestone, Questionnaire } from "../gig_datasets";

// Components
import GigCreateHeader from "../gig_components/gig_creation_components/gig_create_header";
import CreateCoreInfo from "../gig_components/gig_creation_components/1_create_coreinfo";
import CreateDelivery from "../gig_components/gig_creation_components/2_create_delivery";
import CreateTiers from "../gig_components/gig_creation_components/3_create_tiers";
import CreateMilestones from "../gig_components/gig_creation_components/4_create_milestones";
import CreateForms from "../gig_components/gig_creation_components/5_create_forms";
import CreateReview from "../gig_components/gig_creation_components/6_create_review";
import CreationSuccess from "../gig_components/gig_creation_components/7_creation_success";

const GigEditPage: React.FC = () => {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  


  // --- SLIDE 1: CORE INFO ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(""); // Using URL for frontend mock
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // --- SLIDE 2: DELIVERY ---
  const [slots, setSlots] = useState<number>(1);
  const [termsOfService, setTermsOfService] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [firstDraftDelivery, setFirstDraftDelivery] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]); // Using URLs for frontend mock
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  // --- SLIDE 3: TIERS & MILESTONES ---
  const [tiers, setTiers] = useState<GigTier[]>([
    { tierName: "Basic", title: "Essential Delivery", description: "Standard quality output perfect for simple projects.", daysOfDelivery: 1, revisions: 1, price: 100 },
    { tierName: "Standard", title: "Pro Delivery", description: "High-quality output with source files and extra revisions.", daysOfDelivery: 3, revisions: 2, price: 300 }
  ]);
  const [milestones, setMilestones] = useState<Milestone[]>([{ name: "Kickoff", description: "Initial setup and requirements gathering." }]);
  const [additionalWorkRate, setAdditionalWorkRate] = useState<number>(50);

  // --- SLIDE 4: QUESTIONNAIRES ---
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);

  // --- VALIDATION & ERRORS ---
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const res = await api.get(`/api/gigs/${id}`);
        const data = res.data.data;
        if (data) {
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || '';
          const mapUrl = (path: string) => {
            if (!path) return "";
            if (!cloudFrontUrl && path.includes('public')) return "";
            if (path.startsWith('http') || path.startsWith('/')) return path;
            return `${cloudFrontUrl}/${path}`;
          };

          setTitle(data.title || "");
          setDescription(data.description || "");
          setCategory(data.category || "");
          setThumbnailUrl(mapUrl(data.thumbnail) || "");
          setSlots(data.slots || 1);
          setTermsOfService(data.termsOfService || "");
          setSkills(data.skills || []);
          setFirstDraftDelivery(data.firstDraftDelivery || "");
          if (data.gallery) {
            setGalleryUrls(data.gallery.map((p: string) => mapUrl(p)).filter(Boolean));
          }
          if (data.tiers) setTiers(data.tiers);
          if (data.milestones) setMilestones(data.milestones);
          if (data.questionnaires) setQuestionnaires(data.questionnaires);
        }
      } catch (err) {
        console.error("Failed to fetch gig details:", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchGig();
  }, [id]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center dark:bg-dark-base text-gray-500">Loading service details...</div>;
  }

  const hasUnsavedChanges = Boolean(title || description || category);

  const handleReturnTrigger = () => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Discard?")) {
        navigate("/gigs");
      }
    } else {
      navigate("/gigs");
    }
  };

  const handleNext = (targetSlide: number) => {
    if (currentSlide === 1 && targetSlide === 2) {
      const stepErrors: Record<string, string> = {};
      if (!title.trim()) stepErrors.title = "Service title is required";
      if (!description.trim()) stepErrors.description = "Service description is required";
      if (!category) stepErrors.category = "Category is required";
      if (!thumbnailFile && !thumbnailUrl) stepErrors.thumbnail = "Thumbnail image is required";

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
    }

    if (currentSlide === 2 && targetSlide === 3) {
      const stepErrors: Record<string, string> = {};
      if (skills.length === 0) stepErrors.skills = "At least 1 skill is required";
      if (!firstDraftDelivery) stepErrors.firstDraftDelivery = "Timeline is required";
      if (!termsOfService.trim()) stepErrors.termsOfService = "Terms of service are required";
      if (galleryFiles.length === 0 && galleryUrls.length === 0) stepErrors.galleryUrls = "At least 1 supporting picture is required";
      
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
    }

    if (currentSlide === 3 && targetSlide === 4) {
      const stepErrors: Record<string, string> = {};
      tiers.forEach((tier, index) => {
        if (!tier.title.trim()) stepErrors[`tier_${index}_title`] = "Title required";
        if (!tier.description.trim()) stepErrors[`tier_${index}_description`] = "Description required";
        if (tier.price <= 0) stepErrors[`tier_${index}_price`] = "Price required";
      });
      if (additionalWorkRate <= 0) stepErrors.additionalWorkRate = "Hourly rate must be > 0";

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
    }

    if (currentSlide === 4 && targetSlide === 5) {
      const stepErrors: Record<string, string> = {};
      if (milestones.length === 0) {
        stepErrors.milestones = "At least 1 milestone is required";
      }
      milestones.forEach((m, index) => {
        if (!m.name.trim()) stepErrors[`milestone_${index}_name`] = "Name required";
        if (!m.description.trim()) stepErrors[`milestone_${index}_desc`] = "Description required";
      });
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
    }

    if (currentSlide === 5 && targetSlide === 6) {
      const stepErrors: Record<string, string> = {};
      questionnaires.forEach((q, i) => {
        if (!q.question.trim()) stepErrors[`question_${q.id}_question`] = "Question text is required";
        if (q.type === 'choice') {
          if (!q.options || q.options.length < 2) {
            stepErrors[`question_${q.id}_options_length`] = "Multiple choice requires at least 2 options";
          } else {
            q.options.forEach((opt, optIdx) => {
              if (!opt.trim()) stepErrors[`question_${q.id}_option_${optIdx}`] = "Option cannot be empty";
            });
          }
        }
      });

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
    }

    setCurrentSlide(targetSlide);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let thumbnailFileId = null;
      let galleryFileIds: string[] = [];

      const uploadPromises: Promise<void>[] = [];

      if (thumbnailFile) {
        uploadPromises.push(
          uploadFileWithIntent(thumbnailFile, "gig_thumbnails").then(res => {
            thumbnailFileId = res.fileId;
          })
        );
      }

      galleryFiles.forEach((file, index) => {
        uploadPromises.push(
          uploadFileWithIntent(file, "gig_galleries").then(res => {
            // Need to retain order, but a simple push is okay because order doesn't strictly matter for the array unless specified.
            // S3 attachments index handles order later, but we'll push in order using indices
            galleryFileIds[index] = res.fileId;
          })
        );
      });

      await Promise.all(uploadPromises);

      const gigPayload = {
        title,
        description,
        category,
        slots,
        termsOfService,
        firstDraftDelivery,
        additionalWorkRate,
        tiers,
        milestones,
        questionnaires,
        skills,
        thumbnailFileId,
        galleryFileIds,
      };

      await api.put(`/api/gigs/${id}`, gigPayload);
      setIsSuccessOpen(true);
    } catch (err: any) {
      console.error("Error creating gig:", err);
      alert(err.response?.data?.message || err.message || "Failed to create gig");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-gray-200 overflow-hidden font-inter transition-colors duration-300">
      {/* Background Grid Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === 'dark' ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl flex min-h-screen flex-col px-4 py-8 md:py-12 w-full">
        {/* Title Heading Display */}
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Editing a Gig Post
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Update the details below to modify your service offering.
            </p>
          </motion.div>

        {/* Header (Stepper) */}
        <div className="mb-6 w-full">
          <GigCreateHeader currentSlide={currentSlide} onReturn={handleReturnTrigger} />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-4xl relative">
            <AnimatePresence mode="wait">
              {currentSlide === 1 && (
                <motion.div
                  key="slide1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-3xl bg-white dark:bg-dark-surface/80 p-8 shadow-sm dark:shadow-2xl border border-gray-200 dark:border-white/5 backdrop-blur-xl">
                    <CreateCoreInfo
                      title={title}
                      setTitle={setTitle}
                      description={description}
                      setDescription={setDescription}
                      category={category}
                      setCategory={setCategory}
                      previewUrl={thumbnailUrl}
                      setPreviewUrl={setThumbnailUrl}
                      setThumbnailFile={setThumbnailFile}
                      isDragging={false}
                      setIsDragging={() => {}}
                      errors={errors}
                      setErrors={setErrors}
                      onNext={() => handleNext(2)}
                      onDiscard={handleReturnTrigger}
                    />
                  </div>
                </motion.div>
              )}
              {currentSlide === 2 && (
                <motion.div
                  key="slide2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-3xl bg-white dark:bg-dark-surface/80 p-8 shadow-sm dark:shadow-2xl border border-gray-200 dark:border-white/5 backdrop-blur-xl">
                    <CreateDelivery
                      slots={slots}
                      setSlots={setSlots}
                      termsOfService={termsOfService}
                      setTermsOfService={setTermsOfService}
                      skills={skills}
                      setSkills={setSkills}
                      firstDraftDelivery={firstDraftDelivery}
                      setFirstDraftDelivery={setFirstDraftDelivery}
                      galleryUrls={galleryUrls}
                      setGalleryUrls={setGalleryUrls}
                      setGalleryFiles={setGalleryFiles}
                      errors={errors}
                      setErrors={setErrors}
                      onBack={() => handleNext(1)}
                      onNext={() => handleNext(3)}
                    />
                  </div>
                </motion.div>
              )}
              {currentSlide === 3 && (
                <motion.div
                  key="slide3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-3xl bg-white dark:bg-dark-surface/80 p-8 shadow-sm dark:shadow-2xl border border-gray-200 dark:border-white/5 backdrop-blur-xl">
                    <CreateTiers
                      tiers={tiers}
                      setTiers={setTiers}
                      additionalWorkRate={additionalWorkRate}
                      setAdditionalWorkRate={setAdditionalWorkRate}
                      errors={errors}
                      setErrors={setErrors}
                      onBack={() => handleNext(2)}
                      onNext={() => handleNext(4)}
                    />
                  </div>
                </motion.div>
              )}

              {currentSlide === 4 && (
                <motion.div
                  key="slide4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-3xl bg-white dark:bg-dark-surface/80 p-8 shadow-sm dark:shadow-2xl border border-gray-200 dark:border-white/5 backdrop-blur-xl">
                    <CreateMilestones
                      milestones={milestones}
                      setMilestones={setMilestones}
                      errors={errors}
                      setErrors={setErrors}
                      onBack={() => handleNext(3)}
                      onNext={() => handleNext(5)}
                    />
                  </div>
                </motion.div>
              )}

              {currentSlide === 5 && (
                <motion.div
                  key="slide5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-3xl bg-white dark:bg-dark-surface/80 p-8 shadow-sm dark:shadow-2xl border border-gray-200 dark:border-white/5 backdrop-blur-xl">
                    <CreateForms
                      questionnaires={questionnaires}
                      setQuestionnaires={setQuestionnaires}
                      errors={errors}
                      setErrors={setErrors}
                      onBack={() => handleNext(4)}
                      onNext={() => handleNext(6)}
                    />
                  </div>
                </motion.div>
              )}

              {currentSlide === 6 && (
                <motion.div
                  key="slide6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-3xl bg-white dark:bg-dark-surface/80 p-8 shadow-sm dark:shadow-2xl border border-gray-200 dark:border-white/5 backdrop-blur-xl">
                    <CreateReview
                      title={title}
                      description={description}
                      category={category}
                      thumbnailUrl={thumbnailUrl}
                      slots={slots}
                      termsOfService={termsOfService}
                      skills={skills}
                      firstDraftDelivery={firstDraftDelivery}
                      galleryUrls={galleryUrls}
                      tiers={tiers}
                      milestones={milestones}
                      additionalWorkRate={additionalWorkRate}
                      questionnaires={questionnaires}
                      onBack={() => handleNext(5)}
                      onSubmit={handleSubmit}
                      onEdit={(step) => setCurrentSlide(step)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      <CreationSuccess
        isOpen={isSuccessOpen}
        onConfirm={() => navigate("/gigs")}
      />
    </div>
  );
};

export default GigEditPage;
