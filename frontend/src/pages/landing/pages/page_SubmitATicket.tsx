import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Heart,
  HelpCircle,
  Info,
  LifeBuoy,
  Lock,
  LogIn,
  MessageCircleQuestion,
  MessageSquare,
  Paperclip,
  RotateCw,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";
import { CASES_PATH, caseLabel, casePath, useCaseStore } from "@/lib/cases";
import { APPEAL_PATH, isAppealLimitedMember } from "@/lib/appealAccess";
import { useSuspension } from "@/lib/useSuspension";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  ATTACHMENT_LIMIT,
  PendingFileList,
  type AttachmentPayload,
  uploadPendingFiles,
  usePendingFiles,
} from "@/pages/user/account/appeal/appealAttachments";

/** Must match `APPEAL_TICKET_TYPE` in `backend/lib/AccountRestriction.js`. */
const APPEAL_TICKET_TYPE = "Appeal an account penalty";

/**
 * Subject and description limits match `MEMBER_TICKET_LIMITS` in `backend/services/TicketServices.js`;
 * the server keeps at most 2,000 characters of any answer.
 */
const LIMITS = { subject: 200, descriptionMin: 10, description: 5000, text: 500, textarea: 2000 } as const;

const TICKET_PATH = "/support/ticket";
const LOGIN_PATH = `/login?redirect=${encodeURIComponent(TICKET_PATH)}`;
const MANUAL_PICK = "__manual__";

/** Field definitions come from `backend/lib/TicketFormFields.js` (see the picker notes there). */
interface TicketField {
  key: string;
  label: string;
  kind: "text" | "select" | "multiselect" | "checkbox" | "textarea";
  required?: boolean;
  options?: string[];
  picker?: "project" | "order" | "listing" | "contract" | "job" | "team" | "asset" | "posting";
  /** `others`: the search leaves out what the member posted (reports). */
  pickerScope?: "others";
  when?: { key: string; equals?: string; oneOf?: string[] };
  /** Short help shown under the question (bug report steps, where to file a dispute). */
  hint?: string;
}

interface PickerOption {
  id: string;
  label: string;
}

interface SearchSuggestion {
  id: string;
  label: string;
  detail?: string | null;
}

type SearchPickerKind = "team" | "asset" | "posting";

interface SearchPickerConfig {
  url: string;
  /** `kind` for `GET /api/users/ticket-search`. */
  kind?: string;
  placeholder: string;
  hint: string;
  emptyHint: string;
  noMatch: string;
  unavailable: string;
  chosenHint: string;
  required: string;
  /** The member may type a name or paste a link instead when the record is not found. */
  allowTyping: boolean;
}

/** Search pickers: the member types, then chooses one of the server's suggestions. */
const SEARCH_PICKERS: Record<SearchPickerKind, SearchPickerConfig> = {
  team: {
    url: "/api/users/ticket-teams",
    placeholder: "Type a team name",
    hint: "Type a team name, then choose it from the list.",
    emptyHint: "Type a team name to search.",
    noMatch: "No teams match that name.",
    unavailable: "Team search is unavailable.",
    chosenHint: "Tagged team. Remove it to choose a different one.",
    required: "Choose a team from the suggestions.",
    allowTyping: false,
  },
  asset: {
    url: "/api/users/ticket-search",
    kind: "asset",
    placeholder: "Asset name, seller, or link",
    hint: "Search by asset name or seller, or paste the asset's link, then choose it from the list.",
    emptyHint: "Type an asset name or a seller to search.",
    noMatch: "No assets match that search.",
    unavailable: "Asset search is unavailable. You can type the name or paste the link instead.",
    chosenHint: "Chosen asset. Remove it to pick a different one.",
    required: "Choose the asset from the suggestions, or type it instead.",
    allowTyping: true,
  },
  posting: {
    url: "/api/users/ticket-search",
    kind: "posting",
    placeholder: "Job or gig title, poster, or link",
    hint: "Search by title or poster, or paste the job or gig's link, then choose it from the list.",
    emptyHint: "Type a job or gig title, or the poster's name, to search.",
    noMatch: "No jobs or gigs match that search.",
    unavailable: "Job and gig search is unavailable. You can type the title or paste the link instead.",
    chosenHint: "Chosen job or gig. Remove it to pick a different one.",
    required: "Choose the job or gig from the suggestions, or type it instead.",
    allowTyping: true,
  },
};

function searchPickerOf(field: TicketField): SearchPickerKind | null {
  return field.picker === "team" || field.picker === "asset" || field.picker === "posting" ? field.picker : null;
}

interface TicketTypeDetail {
  label: string;
  queueRole: string;
  description?: string | null;
  group?: string | null;
  subgroup?: string | null;
  fields?: TicketField[];
}

type FieldErrors = Record<string, string>;

type Draft = {
  ticketType: string;
  subject: string;
  description: string;
  fieldValues: Record<string, string>;
};

/** Which `GET /api/users/ticket-context` list feeds each picker field. */
const PICKER_LISTS: Record<string, string> = {
  project: "projects",
  order: "orders",
  listing: "listings",
  contract: "contracts",
  job: "jobs",
};

const INPUT_BASE =
  "w-full rounded-[10px] border bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-60 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-zinc-600";

function inputClass(invalid = false) {
  return `${INPUT_BASE} ${invalid ? "border-red-400 dark:border-red-500/60" : "border-gray-200 dark:border-zinc-800"}`;
}

const LABEL_CLASS = "mb-2 block text-[13px] font-semibold text-gray-500 dark:text-zinc-400";

function chipClass(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-sm transition ${
    active
      ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
      : "border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
  }`;
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_TONE =
  "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";
const SECONDARY_TONE =
  "border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/5";
const PRIMARY_BUTTON = `${BUTTON_BASE} ${PRIMARY_TONE} rounded-xl px-4 py-2.5 font-semibold`;
const SECONDARY_BUTTON = `${BUTTON_BASE} ${SECONDARY_TONE} rounded-xl px-4 py-2.5 font-semibold`;
const PRIMARY_WIDE = `${BUTTON_BASE} ${PRIMARY_TONE} w-full rounded-xl px-6 py-3 font-bold sm:w-auto`;
const SECONDARY_WIDE = `${BUTTON_BASE} ${SECONDARY_TONE} w-full rounded-xl px-6 py-3 font-semibold sm:w-auto`;
const SUBMIT_BUTTON = `${BUTTON_BASE} ${PRIMARY_TONE} w-full rounded-[10px] py-3.5 font-bold`;

function fieldId(key: string) {
  return `ticket-field-${key}`;
}

function groupLabel(group?: string | null) {
  return group === "Forums" ? "Forum" : group || "";
}

function fieldVisible(field: TicketField, values: Record<string, string>) {
  if (!field.when) return true;
  const current = values[field.when.key] || "";
  if (field.when.equals) return current === field.when.equals;
  if (field.when.oneOf) return field.when.oneOf.includes(current);
  return true;
}

function splitMulti(value?: string) {
  return (value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function draftKeyFor(accountId: string | null) {
  return accountId ? `ensemble:ticket-draft:${accountId}` : null;
}

/** Unsent drafts live in this tab's session storage only; they are a convenience, never required. */
function readDraft(key: string | null): Draft | null {
  if (!key) return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    const values = parsed.fieldValues && typeof parsed.fieldValues === "object" ? parsed.fieldValues : {};
    return {
      ticketType: typeof parsed.ticketType === "string" ? parsed.ticketType : "",
      subject: typeof parsed.subject === "string" ? parsed.subject : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      fieldValues: Object.fromEntries(
        Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      ),
    };
  } catch {
    return null;
  }
}

function writeDraft(key: string | null, draft: Draft | null) {
  if (!key) return;
  try {
    if (draft) window.sessionStorage.setItem(key, JSON.stringify(draft));
    else window.sessionStorage.removeItem(key);
  } catch {
    // Private windows and blocked storage: the form still works without a draft.
  }
}

function readApiError(err: unknown) {
  const response = (err as {
    response?: { status?: number; data?: { message?: string; code?: string; data?: Record<string, unknown> } };
  })?.response;
  return {
    hasResponse: Boolean(response),
    status: response?.status,
    message: response?.data?.message,
    code: response?.data?.code,
    data: response?.data?.data,
  };
}

/**
 * Client-side check before any upload starts. The server repeats every rule.
 * `answerOf` is the value that would be sent; `searching` tells whether a search picker is
 * waiting for a suggestion to be chosen (rather than typed).
 */
function validateTicket(
  fields: TicketField[],
  answerOf: (field: TicketField) => string,
  searching: (field: TicketField) => SearchPickerKind | null,
  subject: string,
  description: string
) {
  const errors: FieldErrors = {};
  for (const field of fields) {
    const value = answerOf(field);
    const required = field.required !== false;
    if (field.kind === "checkbox") {
      if (required && value !== "yes") errors[field.key] = "Tick this box to continue.";
      continue;
    }
    if (!value) {
      if (!required) continue;
      const search = searching(field);
      errors[field.key] = search
        ? SEARCH_PICKERS[search].required
        : field.kind === "select" || field.kind === "multiselect"
          ? "Choose an option."
          : "This field is required.";
      continue;
    }
    if (field.key === "card_last4" && !/^\d{4}$/.test(value)) errors[field.key] = "Enter only the last 4 digits.";
  }
  const cleanSubject = subject.trim();
  const cleanDescription = description.trim();
  if (!cleanSubject) errors.subject = "Add a short subject.";
  else if (cleanSubject.length > LIMITS.subject) errors.subject = `Keep the subject to ${LIMITS.subject} characters.`;
  if (!cleanDescription) errors.description = "Describe the problem.";
  else if (cleanDescription.length < LIMITS.descriptionMin) {
    errors.description = `Write at least ${LIMITS.descriptionMin} characters.`;
  } else if (cleanDescription.length > LIMITS.description) {
    errors.description = `Keep it to ${LIMITS.description.toLocaleString()} characters.`;
  }
  return errors;
}

function focusError(key: string) {
  const id = key === "subject" ? "ticket-subject" : key === "description" ? "ticket-description" : fieldId(key);
  const node = document.getElementById(id);
  node?.scrollIntoView({ behavior: "smooth", block: "center" });
  node?.focus({ preventScroll: true });
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

/**
 * Search-and-choose field for team, asset and job-or-gig pickers. The chosen suggestion is
 * kept by the form (`selected` / `onSelect`), so it survives the field being hidden and shown
 * again by an earlier answer.
 */
function SearchTagField({
  inputId,
  config,
  scope,
  selected,
  onSelect,
  required,
  disabled,
  invalid,
  describedBy,
}: {
  inputId: string;
  config: SearchPickerConfig;
  scope?: "others";
  selected: SearchSuggestion | null;
  onSelect: (next: SearchSuggestion | null) => void;
  required: boolean;
  disabled: boolean;
  invalid: boolean;
  describedBy?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusAfterClear = useRef(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!focusAfterClear.current || selected) return;
    focusAfterClear.current = false;
    inputRef.current?.focus();
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!open || selected) return;
    const controller = new AbortController();
    setLoading(true);
    setSearchError(null);
    const handle = window.setTimeout(async () => {
      try {
        const response = await api.get(config.url, {
          params: {
            q: query.trim(),
            ...(config.kind ? { kind: config.kind } : {}),
            ...(scope ? { scope } : {}),
          },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const rows: unknown[] = Array.isArray(response.data?.data) ? response.data.data : [];
        // Teams come back with `handle`; assets and jobs with `detail`.
        const suggestions = rows.flatMap((row) => {
          const item = row as { id?: unknown; label?: unknown; detail?: unknown; handle?: unknown };
          if (!item?.id) return [];
          const detail = typeof item.detail === "string" && item.detail
            ? item.detail
            : typeof item.handle === "string" && item.handle
              ? `@${item.handle}`
              : null;
          return [{ id: String(item.id), label: String(item.label || item.id), detail }];
        });
        setOptions(suggestions);
        setActiveIndex(0);
      } catch (err) {
        if (controller.signal.aborted) return;
        setOptions([]);
        const info = readApiError(err);
        setSearchError(info.status === 400 && info.message ? info.message : config.unavailable);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 200 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [open, query, selected, config, scope]);

  const choose = (option: SearchSuggestion) => {
    setQuery("");
    setOpen(false);
    onSelect(option);
  };

  const clear = () => {
    focusAfterClear.current = true;
    setQuery("");
    setOpen(true);
    onSelect(null);
  };

  if (selected) {
    return (
      <div>
        <div className={`${inputClass(false)} flex items-center justify-between gap-3`}>
          <span className="min-w-0 truncate">
            <span className="font-semibold">{selected.label}</span>
            {selected.detail ? (
              <span className="ml-2 font-normal text-gray-500 dark:text-zinc-400">{selected.detail}</span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            aria-label={`Remove ${selected.label}`}
            className="shrink-0 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500 dark:text-zinc-500">{config.chosenHint}</p>
      </div>
    );
  }

  const listId = `${inputId}-suggestions`;
  const status = options.length > 0
    ? null
    : loading
      ? "Searching…"
      : searchError
        ? searchError
        : query.trim()
          ? config.noMatch
          : config.emptyHint;

  return (
    <div ref={rootRef}>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && options[activeIndex] ? `${listId}-${options[activeIndex].id}` : undefined}
          aria-required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          autoComplete="off"
          placeholder={config.placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }
              setActiveIndex((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              const option = options[activeIndex];
              if (option) choose(option);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className={inputClass(invalid)}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-[10px] border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            {status ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-zinc-400">{status}</li>
            ) : options.map((option, index) => (
              <li key={option.id} id={`${listId}-${option.id}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2 text-left text-sm ${
                    index === activeIndex
                      ? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
                      : "text-gray-800 dark:text-zinc-200"
                  }`}
                >
                  <span className="min-w-0 truncate font-medium">{option.label}</span>
                  {option.detail ? (
                    <span className="min-w-0 truncate text-xs text-gray-500 dark:text-zinc-500">{option.detail}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1.5 text-xs text-gray-500 dark:text-zinc-500">{config.hint}</p>
    </div>
  );
}

const SUPPORT_LINKS = [
  {
    title: "Your cases",
    description: "Follow and reply to your open tickets and disputes.",
    to: CASES_PATH,
    icon: LifeBuoy,
  },
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

const NEXT_STEPS = [
  "The ticket type sends it to the team that handles that area.",
  "A staff member replies in Cases, usually within 24 hours.",
  "We notify you on every reply. Add details or files there at any time.",
];

const PageSubmitATicket: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const user = useGlobalState((state) => state.user);
  const accountId: string | null = user?.account_id || user?.accountId || null;
  const draftKey = draftKeyFor(accountId);
  const { suspended } = useSuspension();
  const appealOnly = Boolean(accountId) && (suspended || isAppealLimitedMember(user));
  const openTickets = useCaseStore((state) => state.summary?.openTickets ?? 0);

  const [catalog, setCatalog] = useState<TicketTypeDetail[]>([]);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "error">("loading");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [pickers, setPickers] = useState<Record<string, PickerOption[]>>({});
  /** Open tickets per category (`subgroup`) and the per-category cap the server enforces. */
  const [ticketLimits, setTicketLimits] = useState<{ limit: number; open: Record<string, number> } | null>(null);

  const [group, setGroup] = useState("Support");
  const [subgroup, setSubgroup] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [manualPickers, setManualPickers] = useState<Record<string, boolean>>({});
  /** The suggestion chosen in each search picker (team, asset, job or gig), by field key. */
  const [searchChoices, setSearchChoices] = useState<Record<string, SearchSuggestion>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [draftRestored, setDraftRestored] = useState(false);

  const attachments = usePendingFiles();
  const uploadedRef = useRef(new Map<string, AttachmentPayload>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ ticketId: string; ticketNumber: string | null } | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string | null; number: string | null } | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogState("loading");
    api
      .get("/api/users/ticket-catalog", { signal: controller.signal })
      .then((response) => {
        const details = response.data?.data?.typeDetails;
        if (Array.isArray(details) && details.length) {
          setCatalog(details);
          setCatalogState("ready");
        } else {
          setCatalogState("error");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogState("error");
      });
    return () => controller.abort();
  }, [catalogAttempt]);

  useEffect(() => {
    if (!accountId || appealOnly) return;
    let cancelled = false;
    api
      .get("/api/users/ticket-context")
      .then((response) => {
        if (cancelled || !response.data?.success) return;
        const { ticketLimits: limits, ...lists } = response.data.data || {};
        setPickers(lists);
        setTicketLimits(limits && typeof limits.limit === "number" ? limits : null);
      })
      .catch(() => {});
    void useCaseStore.getState().refresh();
    return () => {
      cancelled = true;
    };
  }, [accountId, appealOnly]);

  // First type: `?type=`, then the unsent draft's type, then the first support type.
  useEffect(() => {
    if (catalogState !== "ready" || initializedRef.current) return;
    initializedRef.current = true;
    const find = (label?: string | null) => {
      const needle = String(label || "").trim().toLowerCase();
      return needle ? catalog.find((item) => item.label.toLowerCase() === needle) : undefined;
    };
    const draft = readDraft(draftKey);
    const target = find(searchParams.get("type")) || find(draft?.ticketType)
      || catalog.find((item) => item.group === "Support") || catalog[0];
    setGroup(target.group || "Support");
    setSubgroup(target.subgroup || "");
    setTicketType(target.label);
    if (!draft) return;
    // Search pickers (team, asset, job or gig) are not restored: they need the chosen suggestion, not only its id.
    const restorable = draft.ticketType === target.label
      ? Object.fromEntries(
          Object.entries(draft.fieldValues).filter(([key]) =>
            (target.fields || []).some((field) => field.key === key && !searchPickerOf(field))
          )
        )
      : {};
    setSubject(draft.subject.slice(0, LIMITS.subject));
    setDescription(draft.description.slice(0, LIMITS.description));
    setFieldValues(restorable);
    if (draft.subject.trim() || draft.description.trim() || Object.keys(restorable).length) setDraftRestored(true);
  }, [catalogState, catalog, draftKey, searchParams]);

  // Keep an unsent draft so a reload or a detail lookup in another page does not lose it.
  useEffect(() => {
    if (!draftKey || !initializedRef.current || submittedTicket) return;
    const handle = window.setTimeout(() => {
      const hasContent = subject.trim() || description.trim() || Object.values(fieldValues).some((value) => value.trim());
      writeDraft(draftKey, hasContent ? { ticketType, subject, description, fieldValues } : null);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draftKey, ticketType, subject, description, fieldValues, submittedTicket]);

  const groups = useMemo(
    () => Array.from(new Set(catalog.map((item) => item.group).filter(Boolean))) as string[],
    [catalog]
  );
  const subgroups = useMemo(
    () => Array.from(
      new Set(catalog.filter((item) => item.group === group && item.subgroup).map((item) => item.subgroup as string))
    ),
    [catalog, group]
  );
  const visibleTypes = catalog.filter(
    (item) => item.group === group && (group !== "Support" || item.subgroup === subgroup)
  );
  const selected = catalog.find((item) => item.label === ticketType) || null;
  // Each penalty is appealed on its own from the standing page, where the member picks it.
  const appealType = ticketType === APPEAL_TICKET_TYPE;
  // Account penalty appeals are not capped (one per penalty already); every other type is.
  const category = !appealType ? selected?.subgroup || null : null;
  const openInCategory = category && ticketLimits ? ticketLimits.open[category] || 0 : 0;
  const categoryFull = Boolean(category && ticketLimits && openInCategory >= ticketLimits.limit);
  const visibleFields = useMemo(
    () => (selected && !appealType ? (selected.fields || []).filter((field) => fieldVisible(field, fieldValues)) : []),
    [selected, appealType, fieldValues]
  );

  const resetAnswers = () => {
    setFieldValues({});
    setManualPickers({});
    setSearchChoices({});
    setErrors((current) => {
      const next: FieldErrors = {};
      if (current.subject) next.subject = current.subject;
      if (current.description) next.description = current.description;
      return next;
    });
  };

  const chooseGroup = (nextGroup: string) => {
    const inGroup = catalog.filter((item) => item.group === nextGroup);
    const nextSubgroup = inGroup.find((item) => item.subgroup)?.subgroup || "";
    const nextType = inGroup.find((item) => !nextSubgroup || item.subgroup === nextSubgroup);
    setGroup(nextGroup);
    setSubgroup(nextSubgroup);
    setTicketType(nextType?.label || "");
    resetAnswers();
  };

  const chooseSubgroup = (nextSubgroup: string) => {
    const nextType = catalog.find((item) => item.group === group && item.subgroup === nextSubgroup);
    setSubgroup(nextSubgroup);
    setTicketType(nextType?.label || "");
    resetAnswers();
  };

  const clearError = (key: string) => {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const setFieldValue = (key: string, value: string) => {
    setFieldValues((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  /** A search picker waiting for a suggestion (not switched to typing). */
  const searchingFor = (field: TicketField): SearchPickerKind | null => {
    const kind = searchPickerOf(field);
    if (!kind) return null;
    return SEARCH_PICKERS[kind].allowTyping && manualPickers[field.key] ? null : kind;
  };

  /** What is sent for a field: a search picker sends its chosen suggestion's id. */
  const answerOf = (field: TicketField) =>
    searchingFor(field) ? searchChoices[field.key]?.id || "" : (fieldValues[field.key] || "").trim();

  const setSearchChoice = (key: string, choice: SearchSuggestion | null) => {
    setSearchChoices((current) => {
      const next = { ...current };
      if (choice) next[key] = choice;
      else delete next[key];
      return next;
    });
    setFieldValue(key, choice?.id || "");
  };

  /** Switch a picker between choosing (list or search) and typing it; the answer starts over. */
  const setPickerTyping = (key: string, typing: boolean) => {
    setManualPickers((current) => ({ ...current, [key]: typing }));
    setSearchChoices((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFieldValue(key, "");
  };

  const discardDraft = () => {
    setSubject("");
    setDescription("");
    resetAnswers();
    setErrors({});
    setDraftRestored(false);
    writeDraft(draftKey, null);
  };

  const startAnother = () => {
    setSubmittedTicket(null);
    setSubject("");
    setDescription("");
    resetAnswers();
    setErrors({});
    setError(null);
    setDuplicate(null);
    setDraftRestored(false);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!accountId) {
      navigate(LOGIN_PATH);
      return;
    }
    if (appealType || appealOnly) {
      navigate(APPEAL_PATH);
      return;
    }
    if (!selected) {
      setError("Choose a ticket type.");
      return;
    }
    const found = validateTicket(visibleFields, answerOf, searchingFor, subject, description);
    setErrors(found);
    setError(null);
    setDuplicate(null);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      focusError(firstInvalid);
      return;
    }

    setSubmitting(true);
    try {
      // Files already uploaded on an earlier try are reused instead of sent again.
      const files = attachments.files;
      const uploaded: AttachmentPayload[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const item = files[index];
        let payload = uploadedRef.current.get(item.id);
        if (!payload) {
          setProgress(files.length > 1 ? `Uploading file ${index + 1} of ${files.length}…` : "Uploading your file…");
          const [fresh] = await uploadPendingFiles([item], "ticket-attachments");
          if (!fresh) throw new Error(`${item.file.name}: the upload did not finish.`);
          payload = fresh;
          uploadedRef.current.set(item.id, fresh);
        }
        uploaded.push(payload);
      }

      setProgress("Sending your ticket…");
      const fields = Object.fromEntries(
        visibleFields
          .map((field) => [field.key, answerOf(field)] as const)
          .filter(([, value]) => value)
      );
      const fromState = (location.state as { from?: unknown } | null)?.from;
      const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
      const response = await api.post("/api/users/tickets", {
        subject: subject.trim(),
        type: ticketType,
        description: description.trim(),
        ...(uploaded.length ? { attachments: uploaded } : {}),
        fields,
        context: {
          browser: navigator.userAgent,
          device: platform || navigator.platform || "",
          page: typeof fromState === "string" && fromState ? fromState : document.referrer || "Direct",
        },
      });
      if (!response.data?.success) {
        setError(response.data?.message || "Failed to submit the ticket. Please try again.");
        return;
      }
      writeDraft(draftKey, null);
      uploadedRef.current.clear();
      attachments.clear();
      setSubmittedTicket({
        id: response.data.data?.ticketId ? String(response.data.data.ticketId) : null,
        number: response.data.data?.ticketNumber || null,
      });
      if (category) {
        setTicketLimits((current) =>
          current ? { ...current, open: { ...current.open, [category]: (current.open[category] || 0) + 1 } } : current
        );
      }
      void useCaseStore.getState().refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const info = readApiError(err);
      if (info.code === "TICKET_CATEGORY_LIMIT" && info.data && typeof info.data.limit === "number") {
        const { category: fullCategory, limit, open } = info.data as { category: string; limit: number; open: number };
        setTicketLimits((current) => ({
          limit,
          open: { ...(current?.open || {}), [fullCategory]: open },
        }));
      }
      // A double submit, or an open ticket already about the same record: offer that ticket.
      if ((info.code === "TICKET_DUPLICATE" || info.code === "TICKET_RECORD_OPEN") && info.data?.ticketId) {
        setDuplicate({
          ticketId: String(info.data.ticketId),
          ticketNumber: info.data.ticketNumber ? String(info.data.ticketNumber) : null,
        });
      }
      // A file the server refused is uploaded again on the next try.
      if (info.status === 400 && /attach/i.test(info.message || "")) uploadedRef.current.clear();
      setError(
        info.message
          || (!info.hasResponse && err instanceof Error && err.message ? err.message : null)
          || "Failed to submit the ticket. Please try again."
      );
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  const renderField = (field: TicketField) => {
    const id = fieldId(field.key);
    const required = field.required !== false;
    const value = fieldValues[field.key] || "";
    const message = errors[field.key];
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [field.hint ? hintId : null, message ? errorId : null].filter(Boolean).join(" ") || undefined;
    const hint = field.hint ? (
      <p id={hintId} className="mb-2 -mt-1 text-xs text-gray-500 dark:text-zinc-500">{field.hint}</p>
    ) : null;
    const requiredMark = required
      ? <span className="text-red-500" aria-hidden="true"> *</span>
      : <span className="font-normal text-gray-400 dark:text-zinc-500"> (optional)</span>;

    if (field.kind === "checkbox") {
      return (
        <div key={field.key}>
          <label
            htmlFor={id}
            className={`flex cursor-pointer items-start gap-3 rounded-[10px] border bg-white px-3.5 py-3 text-sm text-gray-800 dark:bg-zinc-900 dark:text-zinc-200 ${
              message ? "border-red-400 dark:border-red-500/60" : "border-gray-200 dark:border-zinc-800"
            }`}
          >
            <input
              id={id}
              type="checkbox"
              checked={value === "yes"}
              disabled={submitting}
              aria-invalid={Boolean(message) || undefined}
              aria-describedby={describedBy}
              onChange={(event) => setFieldValue(field.key, event.target.checked ? "yes" : "")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gray-900 dark:accent-white"
            />
            <span>
              {field.label}
              {requiredMark}
            </span>
          </label>
          <FieldError id={errorId} message={message} />
        </div>
      );
    }

    if (field.kind === "multiselect") {
      const chosen = splitMulti(value);
      return (
        <fieldset key={field.key} aria-describedby={describedBy}>
          <legend className={LABEL_CLASS}>
            {field.label}
            {requiredMark}
          </legend>
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map((option, index) => {
              const checked = chosen.includes(option);
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition focus-within:ring-2 focus-within:ring-gray-400 dark:focus-within:ring-zinc-500 ${
                    checked
                      ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : "border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                  }`}
                >
                  <input
                    id={index === 0 ? id : undefined}
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={submitting}
                    onChange={() => {
                      const next = checked ? chosen.filter((part) => part !== option) : [...chosen, option];
                      setFieldValue(field.key, next.join(", "));
                    }}
                  />
                  {option}
                </label>
              );
            })}
          </div>
          <FieldError id={errorId} message={message} />
        </fieldset>
      );
    }

    const listName = field.picker ? PICKER_LISTS[field.picker] || "" : "";
    const pickerOptions = listName ? pickers[listName] || [] : [];
    const searchKind = searchPickerOf(field);
    const searchConfig = searchKind ? SEARCH_PICKERS[searchKind] : null;
    // A typed answer, or a restored one that is no longer in the list, shows as text.
    const manual = Boolean(manualPickers[field.key])
      || (pickerOptions.length > 0 && value !== "" && !pickerOptions.some((option) => option.id === value));
    let control: React.ReactNode;

    if (searchConfig && searchingFor(field)) {
      control = (
        <SearchTagField
          inputId={id}
          config={searchConfig}
          scope={field.pickerScope}
          selected={searchChoices[field.key] || null}
          onSelect={(choice) => setSearchChoice(field.key, choice)}
          required={required}
          disabled={submitting}
          invalid={Boolean(message)}
          describedBy={describedBy}
        />
      );
    } else if (pickerOptions.length > 0 && !manual) {
      control = (
        <select
          id={id}
          value={value}
          disabled={submitting}
          aria-invalid={Boolean(message) || undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            if (event.target.value === MANUAL_PICK) {
              setPickerTyping(field.key, true);
              return;
            }
            setFieldValue(field.key, event.target.value);
          }}
          className={inputClass(Boolean(message))}
        >
          <option value="">Choose one</option>
          {pickerOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
          <option value={MANUAL_PICK}>Not listed here, I'll type it</option>
        </select>
      );
    } else if (field.kind === "select") {
      control = (
        <select
          id={id}
          value={value}
          disabled={submitting}
          aria-invalid={Boolean(message) || undefined}
          aria-describedby={describedBy}
          onChange={(event) => setFieldValue(field.key, event.target.value)}
          className={inputClass(Boolean(message))}
        >
          <option value="">Choose one</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    } else if (field.kind === "textarea") {
      control = (
        <textarea
          id={id}
          rows={4}
          value={value}
          maxLength={LIMITS.textarea}
          disabled={submitting}
          aria-invalid={Boolean(message) || undefined}
          aria-describedby={describedBy}
          onChange={(event) => setFieldValue(field.key, event.target.value)}
          className={`${inputClass(Boolean(message))} resize-y`}
        />
      );
    } else {
      control = (
        <input
          id={id}
          type="text"
          value={value}
          maxLength={field.key === "card_last4" ? 4 : LIMITS.text}
          inputMode={field.key === "card_last4" ? "numeric" : undefined}
          disabled={submitting}
          aria-invalid={Boolean(message) || undefined}
          aria-describedby={describedBy}
          placeholder={field.picker ? "Name or link" : undefined}
          onChange={(event) => setFieldValue(field.key, event.target.value)}
          className={inputClass(Boolean(message))}
        />
      );
    }

    return (
      <div key={field.key}>
        <label htmlFor={id} className={LABEL_CLASS}>
          {field.label}
          {requiredMark}
        </label>
        {hint}
        {control}
        {pickerOptions.length > 0 && manual ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => setPickerTyping(field.key, false)}
            className="mt-1.5 text-xs font-semibold text-gray-600 hover:underline disabled:opacity-60 dark:text-zinc-400"
          >
            Choose from your list instead
          </button>
        ) : null}
        {searchConfig?.allowTyping ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => setPickerTyping(field.key, !manualPickers[field.key])}
            className="mt-1.5 text-xs font-semibold text-gray-600 hover:underline disabled:opacity-60 dark:text-zinc-400"
          >
            {manualPickers[field.key] ? "Search instead" : "Can't find it? Type the name or paste a link instead"}
          </button>
        ) : null}
        <FieldError id={errorId} message={message} />
      </div>
    );
  };

  const subjectLength = subject.trim().length;
  const descriptionLength = description.trim().length;

  const supportLinks = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {SUPPORT_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <button
            key={link.to}
            type="button"
            onClick={() => navigate(link.to)}
            className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Icon className="h-4 w-4 text-zinc-500" />
              {link.title}
            </span>
            <span className="block text-xs leading-relaxed text-gray-500 dark:text-zinc-400">{link.description}</span>
          </button>
        );
      })}
    </div>
  );

  let content: React.ReactNode;
  if (!accountId) {
    content = (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sign In Required to Submit a Ticket</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
          To keep our community secure and provide direct assistance with your account, projects, and escrow, ticket
          submissions are only accessible to logged-in users.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate(LOGIN_PATH)} className={PRIMARY_WIDE}>
            <LogIn className="h-4 w-4" />
            Log in to submit a ticket
          </button>
          <button type="button" onClick={() => navigate("/signup")} className={SECONDARY_WIDE}>
            <UserPlus className="h-4 w-4" />
            Create an account
          </button>
        </div>
      </div>
    );
  } else if (submittedTicket) {
    content = (
      <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ticket submitted</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
              {submittedTicket.number ? (
                <>
                  Your ticket number is{" "}
                  <strong className="text-gray-900 dark:text-white">{submittedTicket.number}</strong>. Support usually
                  replies within 24 hours.
                </>
              ) : (
                "Support usually replies within 24 hours."
              )}
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
              Replies arrive in Cases, and we notify you when they do. You can add details or files there at any time.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate(submittedTicket.id ? casePath("ticket", submittedTicket.id) : CASES_PATH)}
                className={PRIMARY_BUTTON}
              >
                Open the conversation
              </button>
              <button type="button" onClick={startAnother} className={SECONDARY_BUTTON}>
                File another ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (appealOnly) {
    content = (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-300" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Only appeals are open right now</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
              {suspended
                ? "While your account is suspended, new tickets are paused."
                : "While this penalty is active, new tickets are paused."}{" "}
              You can appeal each penalty from your account standing page, and keep replying on your existing cases.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => navigate(APPEAL_PATH)} className={PRIMARY_BUTTON}>
                Go to my penalties and appeals
              </button>
              <button type="button" onClick={() => navigate(CASES_PATH)} className={SECONDARY_BUTTON}>
                Open my cases
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs dark:border-white/10 dark:bg-white/5">
          <span className="text-gray-500 dark:text-zinc-400">Submitting ticket as</span>
          <span className="min-w-0 truncate font-semibold text-gray-900 dark:text-white">
            {user?.handle ? `@${user.handle}` : user?.username || "Account"}
            {(user?.email || user?.email_address) && (
              <span className="ml-1.5 font-normal text-gray-500 dark:text-zinc-400">
                ({user?.email || user?.email_address})
              </span>
            )}
          </span>
        </div>

        {openTickets > 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-gray-800 dark:text-zinc-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
            <p className="leading-relaxed">
              You have {openTickets} open ticket{openTickets === 1 ? "" : "s"}. If this is the same problem, reply there
              so the same person keeps helping you.{" "}
              <button type="button" onClick={() => navigate(CASES_PATH)} className="font-semibold underline-offset-2 hover:underline">
                View cases
              </button>
            </p>
          </div>
        ) : null}

        {draftRestored ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
            <span>We restored the ticket you had not sent yet.</span>
            <button type="button" onClick={discardDraft} className="font-semibold text-gray-900 hover:underline dark:text-white">
              Discard draft
            </button>
          </div>
        ) : null}

        {catalogState === "loading" ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading ticket types">
            <div className="h-8 w-2/3 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="h-12 animate-pulse rounded-[10px] bg-gray-200 dark:bg-white/10" />
            <div className="h-24 animate-pulse rounded-[10px] bg-gray-200 dark:bg-white/10" />
          </div>
        ) : catalogState === "error" ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <span>Ticket types could not be loaded.</span>
            <button type="button" onClick={() => setCatalogAttempt((count) => count + 1)} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
              <RotateCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : (
          <>
            <div>
              <span className={LABEL_CLASS} id="ticket-group-label">Where is the problem?</span>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ticket-group-label">
                {groups.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={group === item}
                    disabled={submitting}
                    onClick={() => chooseGroup(item)}
                    className={chipClass(group === item)}
                  >
                    {groupLabel(item)}
                  </button>
                ))}
              </div>
            </div>

            {group === "Support" && subgroups.length > 0 && (
              <div>
                <span className={LABEL_CLASS} id="ticket-subgroup-label">Support area</span>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ticket-subgroup-label">
                  {subgroups.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={subgroup === item}
                      disabled={submitting}
                      onClick={() => chooseSubgroup(item)}
                      className={chipClass(subgroup === item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="ticket-type" className={LABEL_CLASS}>Ticket type</label>
              <select
                id="ticket-type"
                value={ticketType}
                onChange={(event) => {
                  setTicketType(event.target.value);
                  resetAnswers();
                }}
                disabled={submitting || !visibleTypes.length}
                className={inputClass(false)}
              >
                {visibleTypes.map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {selected?.description && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">This type is for</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-800 dark:text-zinc-100">{selected.description}</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                  {[groupLabel(selected.group), selected.subgroup].filter(Boolean).join(" · ")}
                  {category && ticketLimits
                    ? ` · ${openInCategory} of ${ticketLimits.limit} open tickets used`
                    : ""}
                </p>
              </div>
            )}

            {categoryFull && ticketLimits ? (
              <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  You have {ticketLimits.limit} open {category} tickets
                </p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                  That is the most you can have open in one category. Add the new details to one of them, or wait for
                  one to close, then open another.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/support/cases")}
                  className="mt-2 text-sm font-semibold text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                >
                  Open your cases
                </button>
              </div>
            ) : null}

            {appealType ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Appeals are filed per penalty</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                  Each penalty on your account (a suspension, a forum timeout, a warning, a credit hold…) has its own appeal.
                  Open your account standing page, pick the penalty, and appeal it there. A decision on one does not change
                  the others.
                </p>
                <button type="button" onClick={() => navigate(APPEAL_PATH)} className={`${PRIMARY_BUTTON} mt-3`}>
                  Go to my penalties and appeals
                </button>
              </div>
            ) : (
              <>
                {visibleFields.map(renderField)}

                <div>
                  <label htmlFor="ticket-subject" className={LABEL_CLASS}>
                    Issue subject<span className="text-red-500" aria-hidden="true"> *</span>
                  </label>
                  <input
                    id="ticket-subject"
                    type="text"
                    value={subject}
                    maxLength={LIMITS.subject}
                    disabled={submitting}
                    placeholder="A short summary, e.g. Export stops at 90%"
                    aria-invalid={Boolean(errors.subject) || undefined}
                    aria-describedby={errors.subject ? "ticket-subject-error" : "ticket-subject-count"}
                    onChange={(event) => {
                      setSubject(event.target.value);
                      clearError("subject");
                    }}
                    className={inputClass(Boolean(errors.subject))}
                  />
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    <FieldError id="ticket-subject-error" message={errors.subject} />
                    <span id="ticket-subject-count" className="ml-auto shrink-0 text-xs text-gray-400 dark:text-zinc-500">
                      {subjectLength}/{LIMITS.subject}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="ticket-description" className={LABEL_CLASS}>
                    Detailed description<span className="text-red-500" aria-hidden="true"> *</span>
                  </label>
                  <textarea
                    id="ticket-description"
                    rows={6}
                    value={description}
                    maxLength={LIMITS.description}
                    disabled={submitting}
                    placeholder="What happened, what you expected instead, and when it started."
                    aria-invalid={Boolean(errors.description) || undefined}
                    aria-describedby={errors.description ? "ticket-description-error" : "ticket-description-count"}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      clearError("description");
                    }}
                    className={`${inputClass(Boolean(errors.description))} resize-y`}
                  />
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    <FieldError id="ticket-description-error" message={errors.description} />
                    <span id="ticket-description-count" className="ml-auto shrink-0 text-xs text-gray-400 dark:text-zinc-500">
                      {descriptionLength < LIMITS.descriptionMin
                        ? `${LIMITS.descriptionMin - descriptionLength} more to go`
                        : `${descriptionLength.toLocaleString()}/${LIMITS.description.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                <div>
                  <span className={LABEL_CLASS}>
                    Screenshots or files<span className="font-normal text-gray-400 dark:text-zinc-500"> (optional)</span>
                  </span>
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!submitting) setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      if (!submitting) attachments.add(event.dataTransfer.files);
                    }}
                    className={`rounded-[10px] border border-dashed px-4 py-4 transition ${
                      dragging
                        ? "border-gray-500 bg-gray-50 dark:border-zinc-500 dark:bg-white/5"
                        : "border-gray-300 dark:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting || attachments.files.length >= ATTACHMENT_LIMIT}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-white/5"
                      >
                        <Paperclip className="h-4 w-4" />
                        {attachments.files.length ? "Add more" : "Attach files"}
                      </button>
                      <span className="text-xs leading-relaxed text-gray-500 dark:text-zinc-500">
                        Or drop them here. {ATTACHMENT_HINT}
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ATTACHMENT_ACCEPT}
                      className="hidden"
                      onChange={(event) => {
                        attachments.add(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    {attachments.files.length > 0 ? (
                      <div className="mt-3">
                        <PendingFileList files={attachments.files} onRemove={attachments.remove} disabled={submitting} />
                      </div>
                    ) : null}
                  </div>
                </div>

                {error ? (
                  <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                    {duplicate ? (
                      <button
                        type="button"
                        onClick={() => navigate(casePath("ticket", duplicate.ticketId))}
                        className="mt-2 font-semibold underline-offset-2 hover:underline"
                      >
                        Open {caseLabel("ticket", duplicate.ticketNumber)}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <button type="submit" disabled={submitting || !ticketType || categoryFull} className={SUBMIT_BUTTON}>
                  {submitting ? progress || "Submitting…" : "Submit ticket"}
                </button>
              </>
            )}
          </>
        )}
      </form>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#121214] dark:text-white">
      <UserHeader pageTitle="Get Support" />
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight">Submit a Ticket</h1>
          <p className="text-[15px] text-gray-500 dark:text-zinc-400">
            {accountId
              ? "Encountered a bug or an escrow processing issue? File a support ticket and our team will look into it."
              : "Encountered an issue or need assistance? Sign in to file a support ticket so our team can resolve it."}
          </p>
          <p className="mt-2 text-[13px] text-gray-700 dark:text-zinc-400">
            {accountId
              ? "This ticket is filed on the account you are signed in with. We also save your browser and the page you came from."
              : "Submitting a support ticket is only accessible to logged-in members. Please sign in to submit a ticket or explore our self-service options."}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <aside className="lg:order-2">
            <div className="space-y-6 lg:sticky lg:top-6">
              {accountId && !submittedTicket && !appealOnly ? (
                <div className="hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 lg:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">What happens next</p>
                  <ol className="mt-3 space-y-2.5">
                    {NEXT_STEPS.map((step, index) => (
                      <li key={step} className="flex gap-2.5 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-700 dark:bg-white/10 dark:text-zinc-200">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                  Before you file
                </p>
                {supportLinks}
              </div>
            </div>
          </aside>
          <section className="min-w-0 lg:order-1" aria-label="Ticket form">{content}</section>
        </div>
      </div>
    </div>
  );
};

export default PageSubmitATicket;
