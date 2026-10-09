import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, HelpCircle, MessageCircleQuestion, MessageSquare } from "lucide-react";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { TICKET_TYPE_GROUPS } from "@/pages/admin/ticketManagement/ticketTypes";
import useGlobalState from "@/lib/global_state";

interface TicketTypeDetail {
  label: string;
  queueRole: string;
}

interface TicketTypeGroup {
  label: string;
  types: string[];
}

const SUPPORT_LINKS = [
  {
    title: "FAQ",
    description: "Answers about jobs, escrow, fees, and the editor.",
    to: "/landing/FAQ",
    icon: HelpCircle,
  },
  {
    title: "Ask our chatbot",
    description: "Get a quick answer before you file a ticket.",
    to: "/landing/AskOurChatbot",
    icon: MessageCircleQuestion,
  },
  {
    title: "Submit feedback",
    description: "Tell us what to improve. This is not a support ticket.",
    to: "/landing/SendAFeedback",
    icon: MessageSquare,
  },
  {
    title: "Support us",
    description: "Ways to support Ensemble.",
    to: "/landing/SupportUs",
    icon: Heart,
  },
];

function groupTicketTypes(details: TicketTypeDetail[]): TicketTypeGroup[] {
  const groups = new Map<string, string[]>();
  details.forEach((detail) => {
    const groupLabel = detail.queueRole.replace(/ Moderator$/, "") || "Support";
    const current = groups.get(groupLabel) || [];
    current.push(detail.label);
    groups.set(groupLabel, current);
  });
  return Array.from(groups, ([label, types]) => ({ label, types }));
}

const PageSubmitATicket: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);

  const navigate = useNavigate();
  const user = useGlobalState((state) => state.user);
  const accountId = user?.account_id || user?.accountId || null;
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [ticketType, setTicketType] = useState<string>("Other");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [ticketTypeGroups, setTicketTypeGroups] = useState<TicketTypeGroup[]>(
    TICKET_TYPE_GROUPS.map((group) => ({
      label: group.label,
      types: [...group.types],
    })),
  );
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api.get("/api/users/ticket-catalog")
      .then((response) => {
        const details = response.data?.data?.typeDetails;
        if (!cancelled && Array.isArray(details) && details.length) {
          const groups = groupTicketTypes(details);
          setTicketTypeGroups(groups);
          const availableTypes = groups.flatMap((group) => group.types);
          setTicketType((current) =>
            availableTypes.includes(current)
              ? current
              : availableTypes[0] || "Other",
          );
        }
      })
      .catch(() => {
        // Keep the shared admin ticket-type constants as the fallback catalog.
      })
      .finally(() => {
        if (!cancelled) setLoadingTypes(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      navigate("/login");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const attachments = [];
      for (const file of screenshots.slice(0, 4)) {
        const uploaded = await uploadFileWithIntent(file, "ticket-attachments");
        attachments.push({ key: uploaded.key, name: file.name, size: file.size });
      }
      const response = await api.post("/api/users/tickets", {
        account_id: accountId,
        subject: subject.trim(),
        type: ticketType,
        priority: "Medium",
        description: description.trim(),
        attachments,
      });
      if (!response.data?.success) {
        setError(response.data?.message || "Failed to submit ticket");
        return;
      }
      setTicketNumber(response.data.data?.ticketNumber || null);
      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to submit ticket";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!accountId) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#121214] dark:text-white">
      <UserHeader pageTitle="Get Support" />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px 64px" }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16 }}>Submit a Ticket</h1>
        <p style={{ color: theme === 'dark' ? "#7a8499" : "#6b7280", fontSize: 15, marginBottom: 24 }}>
          Encountered a bug or an escrow processing issue? File a support ticket and our team will look into it.
        </p>

        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SUPPORT_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.to}
                type="button"
                onClick={() => navigate(link.to)}
                className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <Icon className="h-4 w-4 text-zinc-500" />
                  {link.title}
                </span>
                <span className="block text-xs leading-relaxed text-gray-500 dark:text-zinc-400">
                  {link.description}
                </span>
              </button>
            );
          })}
        </div>

        {submitted ? (
          <div
            style={{
              background: "rgba(45,212,191,0.05)",
              border: "1px solid rgba(45,212,191,0.2)",
              padding: 24,
              borderRadius: 12,
            }}
          >
            <h4 style={{ color: "#2dd4bf", fontSize: 18, marginBottom: 8 }}>Ticket submitted successfully</h4>
            <p style={{ color: theme === 'dark' ? "#7a8499" : "#6b7280", fontSize: 14 }}>
              {ticketNumber ? (
                <>
                  Your ticket number is <strong style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}>{ticketNumber}</strong>. Our team will follow
                  up within 24 hours.
                </>
              ) : (
                "Our customer success team will follow up via email within 24 hours."
              )}
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme === 'dark' ? "#7a8499" : "#6b7280", marginBottom: 8 }}>
                Ticket Type
              </label>
              <select
                className="inbox-scroll-thin"
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                disabled={loadingTypes || submitting}
                style={{
                  width: "100%",
                  background: theme === 'dark' ? "#18181b" : "#ffffff",
                  border: `1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'}`,
                  borderRadius: 10,
                  padding: "14px",
                  color: theme === 'dark' ? '#ffffff' : '#111827',
                  outline: "none",
                }}
              >
                {ticketTypeGroups.map((group) => (
                  <optgroup key={group.label} label={group.label} style={{ background: theme === 'dark' ? "#18181b" : "#ffffff", color: theme === 'dark' ? '#ffffff' : '#111827' }}>
                    {group.types.map((t) => (
                      <option key={t} value={t} style={{ background: theme === 'dark' ? "#18181b" : "#ffffff", color: theme === 'dark' ? '#ffffff' : '#111827' }}>
                        {t}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme === 'dark' ? "#7a8499" : "#6b7280", marginBottom: 8 }}>
                Issue Subject
              </label>
              <input
                required
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  background: theme === 'dark' ? "#18181b" : "#ffffff",
                  border: `1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'}`,
                  borderRadius: 10,
                  padding: "14px",
                  color: theme === 'dark' ? '#ffffff' : '#111827',
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme === 'dark' ? "#7a8499" : "#6b7280", marginBottom: 8 }}>
                Detailed Description
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%",
                  background: theme === 'dark' ? "#18181b" : "#ffffff",
                  border: `1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'}`,
                  borderRadius: 10,
                  padding: "14px",
                  color: theme === 'dark' ? '#ffffff' : '#111827',
                  outline: "none",
                  resize: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme === 'dark' ? "#7a8499" : "#6b7280", marginBottom: 8 }}>
                Screenshots
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setScreenshots(Array.from(event.target.files || []).slice(0, 4))}
              />
              <p style={{ color: theme === 'dark' ? "#7a8499" : "#6b7280", fontSize: 12, marginTop: 6 }}>
                Up to 4 images. Stored in the existing file bucket.
              </p>
            </div>
            {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: theme === 'dark' ? '#ffffff' : '#111827',
                color: theme === 'dark' ? '#121214' : '#ffffff',
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PageSubmitATicket;
