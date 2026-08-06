import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  ShieldCheck,
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
  business_verification_status?: string;
  current_user_is_verified: boolean;
  current_user_membership?: {
    role: string;
    status: string;
  };
}

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
        if (!cancelled) setTeamContext(response.data.data);
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

  return (
    <div className="min-h-screen bg-[#080a12] text-white">
      <UserHeader pageTitle="Business Verification" />

      <main className="mx-auto max-w-4xl p-6 md:p-8">
        <button
          type="button"
          onClick={() => navigate(`/teams/${id}`)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </button>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent">
          <div className="border-b border-white/10 p-6 md:p-8">
            <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
              <Building2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Business Verification</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Confirm your Team's business identity and establish trust with
              clients and collaborators on Ensemble. Your submitted business
              documents will be manually reviewed by an Ensemble administrator
              before your Team is verified.
            </p>
          </div>

          <div className="p-6 md:p-8">
            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Team business account
              </p>
              <p className="mt-2 text-lg font-semibold">
                {teamName}
              </p>
              {teamHandle && (
                <p className="text-sm text-zinc-500">@{teamHandle}</p>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                <h2 className="mt-3 font-semibold">Owner-controlled</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Only the active Team owner can begin and manage business
                  verification.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <Clock3 className="h-6 w-6 text-blue-400" />
                <h2 className="mt-3 font-semibold">Manual admin review</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  After uploading your document, an administrator will check
                  the business information and decide whether to verify your
                  Team.
                </p>
              </div>
            </div>

            {!isLoadingTeam && !isOwner && (
              <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                Return to the Team page and open this section using the Team
                owner's account.
              </div>
            )}

            {isOwner && !ownerAccountIsVerified && (
              <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-medium">Verify your personal account first</p>
                <p className="mt-1 text-amber-100/70">
                  The Team owner must have a valid verified account before the
                  Team can submit business documents.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/account-verification-status")}
                  className="mt-3 rounded-full border border-amber-300/30 px-4 py-2 font-medium transition hover:bg-amber-300/10"
                >
                  Go to account verification
                </button>
              </div>
            )}

            {isOwner && ownerAccountIsVerified && (
              <div className="mt-6">
                {hasSubmittedVerification && (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-emerald-200">
                        Verification status: {currentStatus}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-emerald-100/70">
                        Please wait 3–5 business days while an administrator
                        reviews your application. If the application was
                        declined or requires reverification, wait for the review
                        instructions before resubmitting your documents.
                      </p>
                      {uploadedDocuments.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs text-emerald-100/50">
                          {uploadedDocuments.map((document) => (
                            <p key={document.fileId || document.fileName}>
                              {document.documentType} · {document.fileName}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!hasSubmittedVerification && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] sm:w-auto"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify Business
                  </button>
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
