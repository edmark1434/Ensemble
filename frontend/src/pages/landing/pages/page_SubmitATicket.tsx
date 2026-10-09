import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, HelpCircle, MessageCircleQuestion, MessageSquare } from "lucide-react";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import useGlobalState from "@/lib/global_state";

interface TicketField {
  key: string;
  label: string;
  kind: "text" | "select";
  required?: boolean;
  options?: string[];
}

interface TicketTypeDetail {
  label: string;
  queueRole: string;
  description?: string | null;
  group?: string | null;
  subgroup?: string | null;
  fields?: TicketField[];
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
  const [ticketType, setTicketType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<TicketTypeDetail[]>([]);
  const [group, setGroup] = useState("Support");
  const [subgroup, setSubgroup] = useState("Account");
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.get("/api/users/ticket-catalog")
      .then((response) => {
        const details = response.data?.data?.typeDetails;
        if (!cancelled && Array.isArray(details) && details.length) {
          setCatalog(details);
          const first = details.find((item: TicketTypeDetail) => item.group === "Support") || details[0];
          setGroup(first.group || "Support");
          setSubgroup(first.subgroup || "Account");
          setTicketType(first.label);
          setCatalogError(null);
        } else if (!cancelled) {
          setCatalogError("Ticket types could not be loaded.");
        }
      })
      .catch(() => {
        if (!cancelled) setCatalogError("Ticket types could not be loaded.");
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
        subject: subject.trim(),
        type: ticketType,
        priority: "Medium",
        description: description.trim(),
        attachments,
        fields: fieldValues,
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

  const groups = Array.from(new Set(catalog.map((item) => item.group).filter(Boolean))) as string[];
  const subgroups = Array.from(
    new Set(
      catalog
        .filter((item) => item.group === group && item.subgroup)
        .map((item) => item.subgroup as string)
    )
  );
  const visibleTypes = catalog.filter(
    (item) => item.group === group && (group !== "Support" || item.subgroup === subgroup)
  );
  const selected = catalog.find((item) => item.label === ticketType) || null;

  const chooseGroup = (nextGroup: string) => {
    const inGroup = catalog.filter((item) => item.group === nextGroup);
    const nextSubgroup = inGroup.find((item) => item.subgroup)?.subgroup || "";
    const nextType = inGroup.find((item) => !nextSubgroup || item.subgroup === nextSubgroup);
    setGroup(nextGroup);
    setSubgroup(nextSubgroup);
    setTicketType(nextType?.label || "");
    setFieldValues({});
  };

  const chooseSubgroup = (nextSubgroup: string) => {
    const nextType = catalog.find((item) => item.group === group && item.subgroup === nextSubgroup);
    setSubgroup(nextSubgroup);
    setTicketType(nextType?.label || "");
    setFieldValues({});
  };

  if (!accountId) return null;

  const fieldStyle = {
    width: "100%",
    background: theme === "dark" ? "#18181b" : "#ffffff",
    border: `1px solid ${theme === "dark" ? "#27272a" : "#e5e7eb"}`,
    borderRadius: 10,
    padding: "14px",
    color: theme === "dark" ? "#ffffff" : "#111827",
    outline: "none",
  };
  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: theme === "dark" ? "#7a8499" : "#6b7280",
    marginBottom: 8,
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#121214] dark:text-white">
      <UserHeader pageTitle="Get Support" />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px 64px" }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16 }}>Submit a Ticket</h1>
        <p style={{ color: theme === 'dark' ? "#7a8499" : "#6b7280", fontSize: 15, marginBottom: 8 }}>
          Encountered a bug or an escrow processing issue? File a support ticket and our team will look into it.
        </p>
        <p style={{ color: theme === 'dark' ? "#a1a1aa" : "#374151", fontSize: 13, marginBottom: 24 }}>
          This ticket is filed on the account you are signed in with.
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
              <label style={labelStyle}>Where is the problem?</label>
              <div className="flex flex-wrap gap-2">
                {groups.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => chooseGroup(item)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      group === item
                        ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                        : "border-gray-200 text-gray-700 dark:border-white/10 dark:text-zinc-300"
                    }`}
                  >
                    {item === "Forums" ? "Forum" : item}
                  </button>
                ))}
              </div>
            </div>
            {group === "Support" && subgroups.length > 0 && (
              <div>
                <label style={labelStyle}>Support area</label>
                <div className="flex flex-wrap gap-2">
                  {subgroups.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => chooseSubgroup(item)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        subgroup === item
                          ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                          : "border-gray-200 text-gray-700 dark:border-white/10 dark:text-zinc-300"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label style={labelStyle}>Ticket type</label>
              <select
                className="inbox-scroll-thin"
                value={ticketType}
                onChange={(e) => {
                  setTicketType(e.target.value);
                  setFieldValues({});
                }}
                disabled={loadingTypes || submitting || !visibleTypes.length}
                style={fieldStyle}
              >
                {visibleTypes.map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
              {catalogError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{catalogError}</p>}
            </div>
            {selected?.description && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                  This type is for
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-800 dark:text-zinc-100">{selected.description}</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                  {[selected.group === "Forums" ? "Forum" : selected.group, selected.subgroup].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            {(selected?.fields || []).map((field) => (
              <div key={field.key}>
                <label style={labelStyle}>
                  {field.label}
                  {field.required === false ? " (optional)" : ""}
                </label>
                {field.kind === "select" ? (
                  <select
                    required={field.required !== false}
                    value={fieldValues[field.key] || ""}
                    onChange={(e) => setFieldValues((current) => ({ ...current, [field.key]: e.target.value }))}
                    style={fieldStyle}
                  >
                    <option value="">Choose one</option>
                    {(field.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required={field.required !== false}
                    type="text"
                    value={fieldValues[field.key] || ""}
                    onChange={(e) => setFieldValues((current) => ({ ...current, [field.key]: e.target.value }))}
                    style={fieldStyle}
                  />
                )}
              </div>
            ))}
            <div>
              <label style={labelStyle}>Issue Subject</label>
              <input
                required
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Detailed Description</label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...fieldStyle, resize: "none" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Screenshots</label>
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
              disabled={submitting || loadingTypes || !ticketType}
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
