import { useEffect, useMemo, useState } from "react";
import {
  FileCheck2,
  FileUp,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  X,
  AlertCircle,
  Clock3,
} from "lucide-react";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import GlideSelect, { type GlideSelectOption } from "@/components/ui/GlideSelect";
import {
  AUTHORIZATION_DOCUMENTS,
  AUTHORIZATION_REQUIRED_RELATIONSHIPS,
  BUSINESS_DOCUMENT_REQUIREMENTS,
  BUSINESS_RELATIONSHIPS,
  BUSINESS_TYPES,
  type BusinessDocumentRequirement,
  type BusinessType,
} from "../businessVerificationConfig";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface SelectedBusinessDocument {
  documentType: string;
  file: File;
  required: boolean;
}

export interface UploadedBusinessDocument {
  fileId: string;
  documentType: string;
  fileName: string;
}

interface BusinessVerificationModalProps {
  isOpen: boolean;
  teamAccountId: string;
  onClose: () => void;
  onUploaded: (documents: UploadedBusinessDocument[]) => void;
}

function getApiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string; error?: string } } }
    ).response;
    return response?.data?.message || response?.data?.error || fallback;
  }
  return fallback;
}

function DocumentRow({
  requirement,
  selected,
  disabled,
  onSelect,
  onRemove,
}: {
  requirement: BusinessDocumentRequirement;
  selected?: SelectedBusinessDocument;
  disabled: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const previewUrl = useMemo(
    () => (selected ? URL.createObjectURL(selected.file) : ""),
    [selected],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-4 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
            {requirement.label}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
              requirement.required
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/40"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
            }`}
          >
            {requirement.required ? "Required" : "Optional"}
          </span>
        </div>
        {selected ? (
          <FileCheck2 className="h-5 w-5 shrink-0 text-emerald-500" />
        ) : (
          <FileUp className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
        )}
      </div>

      {selected && (
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-2xs">
          {selected.file.type.startsWith("image/") ? (
            <img
              src={previewUrl}
              alt={`${requirement.label} preview`}
              className="h-32 w-full bg-zinc-100 dark:bg-zinc-800/60 object-contain p-1"
            />
          ) : (
            <div className="h-24 w-full bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              <FileText className="w-5 h-5 text-red-500" />
              <span>PDF Document Attached</span>
            </div>
          )}
          <div className="p-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {selected.file.name}
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 ml-2">
              {(selected.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 transition active:scale-95">
          <input
            type="file"
            disabled={disabled}
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onSelect(file);
            }}
          />
          {selected ? <RefreshCw className="h-3.5 w-3.5" /> : <FileUp className="h-3.5 w-3.5" />}
          <span>{selected ? "Replace" : "Select file"}</span>
        </label>
        {selected && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 transition active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Remove</span>
          </button>
        )}
      </div>
    </div>
  );
}

function BusinessVerificationModalContent({
  teamAccountId,
  onClose,
  onUploaded,
}: Omit<BusinessVerificationModalProps, "isOpen">) {
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [registeredBusinessName, setRegisteredBusinessName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationCountry, setRegistrationCountry] = useState("Philippines");
  const [relationship, setRelationship] = useState("");
  const [authorizationType, setAuthorizationType] = useState("");
  const [documents, setDocuments] = useState<SelectedBusinessDocument[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/countries")
      .then((response) => {
        if (!cancelled) setCountries(response.data?.countries || []);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requirements = useMemo(
    () => (businessType ? BUSINESS_DOCUMENT_REQUIREMENTS[businessType] : []),
    [businessType],
  );
  const needsAuthorization = AUTHORIZATION_REQUIRED_RELATIONSHIPS.has(relationship);
  const authorizationRequirement = AUTHORIZATION_DOCUMENTS.find(
    (item) => item.value === authorizationType,
  );

  const changeBusinessType = (value: BusinessType | "") => {
    setBusinessType(value);
    const validTypes = new Set(
      value ? BUSINESS_DOCUMENT_REQUIREMENTS[value].map((item) => item.value) : [],
    );
    setDocuments((current) =>
      current.filter(
        (item) =>
          validTypes.has(item.documentType) ||
          AUTHORIZATION_DOCUMENTS.some(
            (authorization) => authorization.value === item.documentType,
          ),
      ),
    );
    setFormError("");
  };

  const selectFile = (requirement: BusinessDocumentRequirement, file: File) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setFormError(`${file.name} must be a PDF, JPG, PNG, or WebP file.`);
      return;
    }
    if (!file.size || file.size > MAX_FILE_SIZE) {
      setFormError(`${file.name} must be a non-empty file no larger than 5 MB.`);
      return;
    }
    setFormError("");
    setDocuments((current) => [
      ...current.filter((item) => item.documentType !== requirement.value),
      { documentType: requirement.value, file, required: requirement.required },
    ]);
  };

  const removeDocument = (documentType: string) => {
    setDocuments((current) =>
      current.filter((item) => item.documentType !== documentType),
    );
  };

  const validate = () => {
    if (!businessType) return "Business type is required.";
    if (!registeredBusinessName.trim()) return "Registered business name is required.";
    if (!registrationNumber.trim()) return "Registration number is required.";
    if (!registrationCountry) return "Registration country is required.";
    if (!relationship) return "Relationship to business is required.";
    const missing = requirements.find(
      (requirement) =>
        requirement.required &&
        !documents.some((item) => item.documentType === requirement.value),
    );
    if (missing) return `${missing.label} is required.`;
    if (
      needsAuthorization &&
      (!authorizationRequirement ||
        !documents.some((item) => item.documentType === authorizationRequirement.value))
    ) {
      return "An authorization document is required for this relationship.";
    }
    return "";
  };

  const submit = async () => {
    if (isUploading) return;
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setIsUploading(true);
    try {
      const uploadedDocs = await Promise.all(
        documents.map(async (doc) => {
          const uploaded = await uploadFileWithIntent(doc.file, "documents");
          return {
            document_type: doc.documentType,
            is_required: doc.required,
            file: {
              name: doc.file.name,
              path: uploaded.key,
              mime_type: doc.file.type,
              size_bytes: doc.file.size,
            },
          };
        }),
      );

      const response = await api.post("/api/verification/create-business-verification", {
        account_id: teamAccountId,
        business_type: businessType,
        registered_business_name: registeredBusinessName.trim(),
        registration_number: registrationNumber.trim(),
        registration_country: registrationCountry,
        relationship_to_business: relationship,
        documents: uploadedDocs,
      });

      const attachments = response.data?.data?.attachments || [];
      onUploaded(
        attachments.map((attachment: { file_id: string; document_type: string; name: string }) => ({
          fileId: attachment.file_id,
          documentType: attachment.document_type,
          fileName: attachment.name,
        })),
      );
      showSuccessToast("Business verification submitted for manual review");
      onClose();
    } catch (error: unknown) {
      showErrorToast(getApiError(error, "Unable to submit business verification"));
    } finally {
      setIsUploading(false);
    }
  };

  // Convert config arrays to GlideSelect options
  const businessTypeOptions: GlideSelectOption[] = useMemo(
    () => BUSINESS_TYPES.map((type) => ({ value: type, label: type })),
    [],
  );

  const countryOptions: GlideSelectOption[] = useMemo(() => {
    const list = countries.length > 0 ? countries : ["Philippines"];
    return list.map((c) => ({ value: c, label: c }));
  }, [countries]);

  const relationshipOptions: GlideSelectOption[] = useMemo(
    () => BUSINESS_RELATIONSHIPS.map((rel) => ({ value: rel, label: rel })),
    [],
  );

  const authorizationOptions: GlideSelectOption[] = useMemo(
    () => AUTHORIZATION_DOCUMENTS.map((item) => ({ value: item.value, label: item.label })),
    [],
  );

  const inputClass =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4.5 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Verify Business
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Business information and supporting registration documents
            </p>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="gs-listbox-scroll flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Business Information
            </h3>

            <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Business Type *
                </label>
                <GlideSelect
                  options={businessTypeOptions}
                  value={businessType}
                  onChange={(val) => changeBusinessType(val as BusinessType | "")}
                  placeholder="Select business type..."
                  size="md"
                  radius={12}
                  fullWidth={true}
                  maxVisibleItems={6}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Registered Business Name *
                </label>
                <input
                  value={registeredBusinessName}
                  onChange={(e) => setRegisteredBusinessName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Registration Number *
                </label>
                <input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. SEC or DTI registration number"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Registration Country *
                </label>
                <GlideSelect
                  options={countryOptions}
                  value={registrationCountry}
                  onChange={(val) => setRegistrationCountry(val)}
                  placeholder="Select country..."
                  size="md"
                  radius={12}
                  fullWidth={true}
                  maxVisibleItems={6}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Relationship to Business *
                </label>
                <GlideSelect
                  options={relationshipOptions}
                  value={relationship}
                  onChange={(val) => {
                    setRelationship(val);
                    setAuthorizationType("");
                    setDocuments((current) =>
                      current.filter(
                        (item) =>
                          !AUTHORIZATION_DOCUMENTS.some(
                            (auth) => auth.value === item.documentType,
                          ),
                      ),
                    );
                  }}
                  placeholder="Select your relationship to this business..."
                  size="md"
                  radius={12}
                  fullWidth={true}
                  maxVisibleItems={6}
                />
              </div>
            </div>
          </section>

          {/* Business Documents Required based on Business Type */}
          {businessType && (
            <section className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Business Documents
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Upload one valid document for each required item below (PDF, JPG, PNG, or WebP up to 5 MB).
              </p>
              <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                {requirements.map((requirement) => (
                  <DocumentRow
                    key={requirement.value}
                    requirement={requirement}
                    selected={documents.find((item) => item.documentType === requirement.value)}
                    disabled={isUploading}
                    onSelect={(file) => selectFile(requirement, file)}
                    onRemove={() => removeDocument(requirement.value)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Authorization Document (Required for Employee / Rep / Other) */}
          {needsAuthorization && (
            <section className="rounded-xl border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Authorization Document Required *
                </h3>
                <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                  Because you are applying as an authorized representative or employee, please provide official authorization from the business owner.
                </p>
              </div>

              <div>
                <GlideSelect
                  options={authorizationOptions}
                  value={authorizationType}
                  onChange={(val) => {
                    const prev = authorizationType;
                    setAuthorizationType(val);
                    if (prev) removeDocument(prev);
                  }}
                  placeholder="Select authorization document type..."
                  size="md"
                  radius={12}
                  fullWidth={true}
                  maxVisibleItems={6}
                />
              </div>

              {authorizationRequirement && (
                <div className="pt-1">
                  <DocumentRow
                    requirement={authorizationRequirement}
                    selected={documents.find((item) => item.documentType === authorizationRequirement.value)}
                    disabled={isUploading}
                    onSelect={(file) => selectFile(authorizationRequirement, file)}
                    onRemove={() => removeDocument(authorizationRequirement.value)}
                  />
                </div>
              )}
            </section>
          )}

          {/* Validation Error Message */}
          {formError && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Review Notice */}
          <div className="rounded-xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <Clock3 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              Ensemble administrators manually review your business registration information and documents. Reviews normally take 3–5 business days.
            </span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex gap-3 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold px-4 py-2.5 text-xs transition active:scale-[0.98] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isUploading || !teamAccountId}
            onClick={() => void submit()}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              "Submit for review"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessVerificationModal(props: BusinessVerificationModalProps) {
  if (!props.isOpen) return null;
  return (
    <BusinessVerificationModalContent
      teamAccountId={props.teamAccountId}
      onClose={props.onClose}
      onUploaded={props.onUploaded}
    />
  );
}
