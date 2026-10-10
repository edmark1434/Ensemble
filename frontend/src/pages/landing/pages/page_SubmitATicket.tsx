import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, Heart, HelpCircle, MessageCircleQuestion, MessageSquare } from "lucide-react";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import useGlobalState from "@/lib/global_state";

const LOGGED_OUT_TYPES = ["Sign-in and password", "Account compromised"];
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

interface TicketField {
  key: string;
  label: string;
  kind: "text" | "select" | "multiselect" | "checkbox" | "textarea";
  required?: boolean;
  options?: string[];
  picker?: "project" | "order" | "listing" | "contract" | "job";
  when?: { key: string; equals?: string; oneOf?: string[] };
}

interface PickerOption {
  id: string;
  label: string;
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
  const [pickers, setPickers] = useState<Record<string, PickerOption[]>>({});

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
          setTicketType("");
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

  useEffect(() => {
    if (!accountId) return;
    api.get("/api/users/ticket-context")
      .then((response) => {
        if (response.data?.success) setPickers(response.data.data || {});
      })
      .catch(() => {});
  }, [accountId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId && !LOGGED_OUT_TYPES.includes(ticketType)) {
      navigate(`/login?redirect=${encodeURIComponent("/support/ticket")}`);
      return;
    }
    const tooLarge = screenshots.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (tooLarge) {
      setError("Each attachment must be 8 MB or smaller.");
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
        context: {
          browser: navigator.userAgent,
          device: navigator.platform || "",
          page: document.referrer || "Direct",
        },
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

  const shownCatalog = accountId
    ? catalog
    : catalog.filter((item) => LOGGED_OUT_TYPES.includes(item.label));
  const groups = Array.from(new Set(shownCatalog.map((item) => item.group).filter(Boolean))) as string[];
  const subgroups = Array.from(
    new Set(
      shownCatalog
        .filter((item) => item.group === group && item.subgroup)
        .map((item) => item.subgroup as string)
    )
  );
  const visibleTypes = shownCatalog.filter(
    (item) => item.group === group && (group !== "Support" || item.subgroup === subgroup)
  );
  const selected = catalog.find((item) => item.label === ticketType) || null;

  const chooseGroup = (nextGroup: string) => {
    const inGroup = shownCatalog.filter((item) => item.group === nextGroup);
    const nextSubgroup = inGroup.find((item) => item.subgroup)?.subgroup || "";
    setGroup(nextGroup);
    setSubgroup(nextSubgroup);
    setTicketType("");
    setFieldValues({});
  };

  const chooseSubgroup = (nextSubgroup: string) => {
    setSubgroup(nextSubgroup);
    setTicketType("");
    setFieldValues({});
  };

  const fieldShown = (field: TicketField) => {
    if (!field.when) return true;
    const current = fieldValues[field.when.key] || "";
    if (field.when.equals) return current === field.when.equals;
    if (field.when.oneOf) return field.when.oneOf.includes(current);
    return true;
  };

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
          {accountId
            ? "This ticket is filed on the account you are signed in with. We also save your browser and the page you came from."
            : "Sign-in and compromised-account tickets can be filed while you are locked out. Other tickets need you to sign in."}
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
              <label style={labelStyle}>What do you need help with?</label>
              {loadingTypes ? (
                <p className="text-sm text-gray-500 dark:text-zinc-400">Loading types…</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#18181b]">
                  <div className="flex border-b border-gray-200 dark:border-white/10">
                    {groups.map((item) => {
                      const active = group === item;
                      const label = item === "Forums" ? "Forum" : item === "Jobs and Gigs" ? "Jobs & Gigs" : item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => chooseGroup(item)}
                          className={`relative flex-1 px-2 py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-500 hover:text-gray-800 dark:text-zinc-500 dark:hover:text-zinc-200"
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="ticket-group-tab"
                              className="absolute inset-x-3 bottom-0 h-0.5 bg-gray-900 dark:bg-white"
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            />
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {group === "Support" && subgroups.length > 0 && (
                    <div className="flex gap-1 overflow-x-auto border-b border-gray-200 px-2 py-2 dark:border-white/10">
                      {subgroups.map((item) => {
                        const active = subgroup === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => chooseSubgroup(item)}
                            className={`relative shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
                              active ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-500"
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="ticket-area-tab"
                                className="absolute inset-0 rounded-md bg-gray-100 dark:bg-white/10"
                                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                              />
                            )}
                            <span className="relative">{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${group}-${subgroup}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="p-1.5"
                      role="listbox"
                      aria-label="Ticket type"
                    >
                      {visibleTypes.map((item) => {
                        const open = ticketType === item.label;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            role="option"
                            aria-selected={open}
                            disabled={submitting}
                            onClick={() => {
                              if (open) return;
                              setTicketType(item.label);
                              setFieldValues({});
                            }}
                            className="relative flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left"
                          >
                            {open && (
                              <motion.span
                                layoutId="ticket-type-selected"
                                className="absolute inset-0 rounded-lg bg-gray-100 dark:bg-white/10"
                                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                              />
                            )}
                            <span className={`relative text-sm ${open ? "font-medium text-gray-900 dark:text-white" : "text-gray-700 dark:text-zinc-300"}`}>
                              {item.label}
                            </span>
                            <Check className={`relative h-4 w-4 shrink-0 text-gray-900 transition-opacity dark:text-white ${open ? "opacity-100" : "opacity-0"}`} />
                          </button>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                  <AnimatePresence initial={false}>
                    {selected?.description && (
                      <motion.div
                        key={selected.label}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden border-t border-gray-200 dark:border-white/10"
                      >
                        <p className="px-4 py-3 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
                          {selected.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {catalogError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{catalogError}</p>}
            </div>
            {(selected?.fields || []).filter(fieldShown).map((field) => {
              const pickerKey = field.picker === "project" ? "projects"
                : field.picker === "order" ? "orders"
                : field.picker === "listing" ? "listings"
                : field.picker === "contract" ? "contracts"
                : field.picker === "job" ? "jobs"
                : "";
              const pickerOptions = pickerKey ? pickers[pickerKey] || [] : [];
              const required = field.required !== false;
              const setValue = (value: string) => setFieldValues((current) => ({ ...current, [field.key]: value }));
              return (
                <div key={field.key}>
                  <label style={labelStyle}>
                    {field.label}
                    {required ? " *" : " (optional)"}
                  </label>
                  {field.kind === "checkbox" ? (
                    <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        required={required}
                        checked={fieldValues[field.key] === "yes"}
                        onChange={(e) => setValue(e.target.checked ? "yes" : "")}
                      />
                      <span>Yes</span>
                    </label>
                  ) : field.kind === "multiselect" ? (
                    <div className="space-y-2">
                      {(field.options || []).map((option) => {
                        const selectedValues = (fieldValues[field.key] || "").split(",").map((part) => part.trim()).filter(Boolean);
                        const checked = selectedValues.includes(option);
                        return (
                          <label key={option} className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? selectedValues.filter((part) => part !== option)
                                  : [...selectedValues, option];
                                setValue(next.join(", "));
                              }}
                            />
                            {option}
                          </label>
                        );
                      })}
                    </div>
                  ) : field.kind === "textarea" ? (
                    <textarea
                      required={required}
                      rows={4}
                      value={fieldValues[field.key] || ""}
                      onChange={(e) => setValue(e.target.value)}
                      style={{ ...fieldStyle, resize: "vertical" }}
                    />
                  ) : field.kind === "select" || pickerOptions.length > 0 ? (
                    <select
                      required={required}
                      value={fieldValues[field.key] || ""}
                      onChange={(e) => setValue(e.target.value)}
                      style={fieldStyle}
                    >
                      <option value="">Choose one</option>
                      {(pickerOptions.length ? pickerOptions.map((option) => option.label) : field.options || []).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required={required}
                      type="text"
                      value={fieldValues[field.key] || ""}
                      onChange={(e) => setValue(e.target.value)}
                      style={fieldStyle}
                    />
                  )}
                </div>
              );
            })}
            <div>
              <label style={labelStyle}>Issue subject *</label>
              <input
                required
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Detailed description *</label>
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
                accept="image/*,video/*"
                multiple
                onChange={(event) => setScreenshots(Array.from(event.target.files || []).slice(0, 4))}
              />
              <p style={{ color: theme === 'dark' ? "#7a8499" : "#6b7280", fontSize: 12, marginTop: 6 }}>
                Optional. Up to 4 screenshots or screen recordings, 8 MB each.
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
