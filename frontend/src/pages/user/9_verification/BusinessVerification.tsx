import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  AlertCircle,
  Users,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";
import api from "@/lib/axios";
import BusinessVerificationModal, {
  type UploadedBusinessDocument,
} from "./components/BusinessVerificationModal";

interface BusinessVerificationRouteState {
  teamAccountId?: string;
  teamName?: string;
  teamHandle?: string;
  verificationStatus?: string;
  isOwner?: boolean;
}

interface TeamVerificationContext {
  account_id: string;
  display_name: string;
  handle: string;
  avatar_path?: string;
  business_verification_status?: string;
  current_user_is_verified: boolean;
  current_user_membership?: {
    role: string;
    status: string;
  };
}

const cloudfront = String(
  import.meta.env.VITE_CLOUDFRONT_URL ||
    import.meta.env.VITE_S3_BUCKET_URL ||
    "",
);

const imageUrl = (path?: string) =>
  !path
    ? ""
    : /^https?:\/\//i.test(path)
      ? path
      : `${cloudfront}/${path.replace(/^\/+/, "")}`;

export default function BusinessVerification() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as BusinessVerificationRouteState;

  const [teamContext, setTeamContext] = useState<TeamVerificationContext | null>(
    null
  );
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<
    UploadedBusinessDocument[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    const loadTeamContext = async () => {
      try {
        const response = await api.get(`/api/teams/${id}`);
        if (!cancelled) setTeamContext(response.data?.data || null);
      } catch {
        if (!cancelled) setTeamContext(null);
      } finally {
        if (!cancelled) setIsLoadingTeam(false);
      }
    };

    void loadTeamContext();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isOwner =
    teamContext?.current_user_membership?.role === "Owner" &&
    teamContext.current_user_membership.status === "Active";
  const ownerAccountIsVerified = Boolean(teamContext?.current_user_is_verified);
  const teamAccountId = teamContext?.account_id || state.teamAccountId || "";
  const teamName = teamContext?.display_name || state.teamName || "Your Team";
  const teamHandle = teamContext?.handle || state.teamHandle;
  const currentStatus = uploadedDocuments.length
    ? "Pending"
    : teamContext?.business_verification_status ||
      state.verificationStatus ||
      "";
  const hasSubmittedVerification = Boolean(currentStatus);
  const normalizedStatus = currentStatus.trim().toLowerCase();
  const isVerified = normalizedStatus === "verified" || normalizedStatus === "approved";
  const isPending = normalizedStatus === "pending" || normalizedStatus === "in_review" || uploadedDocuments.length > 0;
  const canResubmit = [
    "declined",
    "rejected",
    "resubmitted",
    "action required",
    "action_required",
  ].includes(normalizedStatus);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <UserHeader pageTitle="Business Verification" />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(`/teams/${id}`)}
          className="mb-6 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Team</span>
        </button>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          {/* Header Banner */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-6 sm:p-8">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Business Verification
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Confirm your Team's business identity and establish verified credibility with
              clients and collaborators on Ensemble. Your submitted documents will be manually
              reviewed by an Ensemble administrator.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Team Business Account Card */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {teamContext?.avatar_path ? (
                  <img
                    src={imageUrl(teamContext.avatar_path)}
                    alt={teamName}
                    className="h-12 w-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 text-zinc-600 dark:text-zinc-300">
                    <Users className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Team Business Account
                  </p>
                  <p className="mt-0.5 text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
                    {teamName}
                  </p>
                  {teamHandle && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      @{teamHandle}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Pill */}
              <div className="shrink-0">
                {isVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Verified Business
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                    <Clock3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Pending Review
                  </span>
                ) : canResubmit ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    Action Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                    Unverified
                  </span>
                )}
              </div>
            </div>

            {/* Verification Features Overview */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">
                  Owner-controlled
                </h2>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Only the active Team owner can start, manage, and resubmit business
                  verification applications.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Clock3 className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">
                  Manual admin review
                </h2>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  After uploading your documents, an administrator checks the government
                  records and approves your verified badge.
                </p>
              </div>
            </div>

            {/* Non-owner Warning */}
            {!isLoadingTeam && !isOwner && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Only the Team owner can manage business verification. Please access this page
                  using the owner account.
                </span>
              </div>
            )}

            {/* Owner personal account unverified Warning */}
            {isOwner && !ownerAccountIsVerified && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Verify your personal account first</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200/80 leading-relaxed">
                  The Team owner must complete personal identity verification before the Team
                  can submit business registration documents.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => navigate("/account-verification-status")}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold px-4 py-2 text-xs transition cursor-pointer shadow-xs"
                  >
                    Go to Account Verification
                  </button>
                </div>
              </div>
            )}

            {/* In-Review Status Details */}
            {isOwner && ownerAccountIsVerified && (
              <div className="space-y-4 pt-2">
                {hasSubmittedVerification && (
                  <div
                    className={`flex items-start gap-3 rounded-xl border p-4.5 ${
                      isVerified
                        ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100"
                        : canResubmit
                          ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100"
                          : "border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100"
                    }`}
                  >
                    {isVerified ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : canResubmit ? (
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                    )}

                    <div className="flex-1">
                      <p className="text-sm font-bold">
                        Verification Status: {currentStatus}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed opacity-85">
                        {isVerified
                          ? "Your Team business identity has been verified by an administrator. The verified badge is now active on your team profile."
                          : canResubmit
                            ? "Your previous submission required adjustments. Please review the details and resubmit updated documents."
                            : "Your application is currently being processed. Reviews normally take 3–5 business days. You will be notified once complete."}
                      </p>

                      {uploadedDocuments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-current/15 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                            Submitted Documents ({uploadedDocuments.length})
                          </p>
                          {uploadedDocuments.map((doc) => (
                            <p
                              key={doc.fileId || doc.fileName}
                              className="text-xs opacity-80"
                            >
                              • {doc.documentType} · {doc.fileName}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit / Resubmit Action Button */}
                {(!hasSubmittedVerification || canResubmit) && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xs transition sm:w-auto cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>
                        {canResubmit
                          ? "Resubmit Business Documents"
                          : "Verify Business"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <BusinessVerificationModal
        isOpen={isModalOpen}
        teamAccountId={teamAccountId}
        onClose={() => setIsModalOpen(false)}
        onUploaded={setUploadedDocuments}
      />
    </div>
  );
}
