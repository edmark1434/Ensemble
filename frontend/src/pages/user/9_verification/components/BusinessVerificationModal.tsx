import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FileCheck2, FileUp, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
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
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{requirement.label}</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${
              requirement.required
                ? "bg-rose-500/15 text-rose-300"
                : "bg-white/5 text-zinc-400"
            }`}
          >
            {requirement.required ? "Required" : "Optional"}
          </span>
        </div>
        {selected ? (
          <FileCheck2 className="h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <FileUp className="h-5 w-5 shrink-0 text-zinc-500" />
        )}
      </div>

      {selected && (
        <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
          {selected.file.type.startsWith("image/") ? (
            <img
              src={previewUrl}
              alt={`${requirement.label} preview`}
              className="h-36 w-full bg-black/20 object-contain"
            />
          ) : (
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0`}
              title={`${requirement.label} preview`}
              className="h-36 w-full bg-white"
            />
          )}
          <div className="p-3">
            <p className="truncate text-xs text-zinc-200">{selected.file.name}</p>
            <p className="mt-1 text-[10px] text-zinc-500">
              {(selected.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-blue-400/25 px-3 py-1.5 text-xs text-blue-300 transition hover:bg-blue-500/10">
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
          {selected ? "Replace" : "Select file"}
        </label>
        {selected && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
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
    api.get("/api/countries")
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
        (item) => validTypes.has(item.documentType) || AUTHORIZATION_DOCUMENTS.some(
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
      const uploadedDocuments = await Promise.all(
        documents.map(async (document) => {
          const uploadResponse = await api.post("/api/files/upload-url", {
            folder: "documents",
            filename: document.file.name,
            contentType: document.file.type,
          });
          await axios.put(uploadResponse.data.uploadUrl, document.file, {
            headers: { "Content-Type": document.file.type },
          });
          return {
            document_type: document.documentType,
            is_required: document.required,
            file: {
              name: document.file.name,
              path: uploadResponse.data.key,
              mime_type: document.file.type,
              size_bytes: document.file.size,
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
        documents: uploadedDocuments,
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

  const inputClass = "mt-2 w-full rounded-lg border border-white/15 bg-[#111522] px-4 py-2.5 text-white outline-none focus:border-blue-500/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Verify Business</h2>
            <p className="mt-1 text-xs text-zinc-500">Business information and supporting documents</p>
          </div>
          <button type="button" disabled={isUploading} onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="inbox-scroll-thin flex-1 space-y-7 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="font-semibold text-white">Business information</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-zinc-300">Business type *
                <select value={businessType} onChange={(event) => changeBusinessType(event.target.value as BusinessType | "")} className={inputClass}>
                  <option value="">Select business type</option>
                  {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="text-sm text-zinc-300">Registered business name *
                <input value={registeredBusinessName} onChange={(event) => setRegisteredBusinessName(event.target.value)} className={inputClass} />
              </label>
              <label className="text-sm text-zinc-300">Registration number *
                <input value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} className={inputClass} />
              </label>
              <label className="text-sm text-zinc-300">Registration country *
                <select value={registrationCountry} onChange={(event) => setRegistrationCountry(event.target.value)} className={inputClass}>
                  <option value="">Select country</option>
                  {countries.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </label>
              <label className="text-sm text-zinc-300 sm:col-span-2">Relationship to business *
                <select value={relationship} onChange={(event) => { setRelationship(event.target.value); setAuthorizationType(""); setDocuments((current) => current.filter((item) => !AUTHORIZATION_DOCUMENTS.some((auth) => auth.value === item.documentType))); }} className={inputClass}>
                  <option value="">Select relationship</option>
                  {BUSINESS_RELATIONSHIPS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </section>

          {businessType && (
            <section>
              <h3 className="font-semibold text-white">Business documents</h3>
              <p className="mt-1 text-xs text-zinc-500">Upload one file for each selected document type.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

          {needsAuthorization && (
            <section className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
              <h3 className="font-semibold text-amber-100">Authorization document *</h3>
              <select value={authorizationType} onChange={(event) => { const previous = authorizationType; setAuthorizationType(event.target.value); if (previous) removeDocument(previous); }} className={inputClass}>
                <option value="">Select authorization document type</option>
                {AUTHORIZATION_DOCUMENTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              {authorizationRequirement && (
                <div className="mt-3">
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

          {formError && <p className="text-sm text-rose-400">{formError}</p>}
          <p className="rounded-xl border border-amber-400/15 bg-amber-500/[0.07] p-4 text-xs leading-5 text-amber-100/80">
            Ensemble administrators manually review your business information and documents. Review normally takes 3–5 business days.
          </p>
        </div>

        <div className="flex gap-3 border-t border-white/10 px-6 py-4">
          <button type="button" disabled={isUploading || !teamAccountId} onClick={() => void submit()} className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
            {isUploading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Uploading...</span> : "Submit for review"}
          </button>
          <button type="button" disabled={isUploading} onClick={onClose} className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessVerificationModal(props: BusinessVerificationModalProps) {
  if (!props.isOpen) return null;
  return <BusinessVerificationModalContent teamAccountId={props.teamAccountId} onClose={props.onClose} onUploaded={props.onUploaded} />;
}
