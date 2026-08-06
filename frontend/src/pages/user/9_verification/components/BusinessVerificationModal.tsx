import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FileCheck2, FileUp, Loader2, X } from "lucide-react";
import api from "@/lib/axios";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/utility/toast";

const BUSINESS_DOCUMENT_TYPES = [
  "DTI Certificate of Business Name Registration",
  "SEC Certificate of Incorporation",
  "SEC Certificate of Partnership",
  "BIR Certificate of Registration (Form 2303)",
  "Mayor's Permit / Business Permit",
  "Barangay Business Clearance",
  "Articles of Incorporation or Partnership",
  "CDA Certificate of Registration",
];

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

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

function SelectedDocumentPreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
      {file.type.startsWith("image/") ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="h-36 w-full object-cover"
        />
      ) : (
        <iframe
          src={previewUrl}
          title={file.name}
          className="h-36 w-full bg-white"
        />
      )}
      <div className="p-3">
        <p className="truncate text-sm font-medium text-white">{file.name}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function BusinessVerificationModalContent({
  teamAccountId,
  onClose,
  onUploaded,
}: Omit<BusinessVerificationModalProps, "isOpen">) {
  const [documentType, setDocumentType] = useState("");
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const selectDocuments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    const invalidType = selectedFiles.find(
      (file) => !ALLOWED_FILE_TYPES.includes(file.type)
    );
    if (invalidType) {
      setFileError(`${invalidType.name} must be a PDF, JPG, PNG, or WebP file.`);
      return;
    }

    const oversized = selectedFiles.find(
      (file) => file.size > 5 * 1024 * 1024
    );
    if (oversized) {
      setFileError(`${oversized.name} must be 5 MB or smaller.`);
      return;
    }

    const combinedFiles = [...documentFiles, ...selectedFiles].filter(
      (file, index, files) =>
        files.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified === file.lastModified
        ) === index
    );

    if (combinedFiles.length > 10) {
      setFileError("You can upload up to 10 business documents.");
      return;
    }

    setFileError("");
    setDocumentFiles(combinedFiles);
  };

  const uploadDocuments = async () => {
    if (!documentType || !documentFiles.length || isUploading) return;
    setIsUploading(true);

    try {
      const uploadedFiles = await Promise.all(
        documentFiles.map(async (documentFile) => {
          const uploadResponse = await api.post("/api/files/upload-url", {
            folder: "documents",
            filename: documentFile.name,
            contentType: documentFile.type,
          });

          await axios.put(uploadResponse.data.uploadUrl, documentFile, {
            headers: { "Content-Type": documentFile.type },
          });

          return {
            name: documentFile.name,
            path: uploadResponse.data.key,
            mime_type: documentFile.type,
            size_bytes: documentFile.size,
          };
        })
      );

      const submissionResponse = await api.post(
        "/api/verification/create-business-verification",
        {
          account_id: teamAccountId,
          document_type: documentType,
          file: uploadedFiles,
        }
      );

      const savedAttachments = submissionResponse.data?.data?.attachments || [];
      onUploaded(
        documentFiles.map((documentFile, index) => ({
          fileId: savedAttachments[index]?.file_id || "",
          documentType,
          fileName: documentFile.name,
        }))
      );
      showSuccessToast("Business verification submitted for manual review");
      onClose();
    } catch (error: unknown) {
      showErrorToast(getApiError(error, "Unable to upload business documents"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f1a] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Verify Business</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Upload official documents for manual administrator review.
            </p>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="inbox-scroll-thin flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <label className="block text-sm font-medium text-zinc-300">
              Business document type <span className="text-red-400">*</span>
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-[#111522] px-4 py-2.5 text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
              >
                <option value="">Select document type</option>
                {BUSINESS_DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-sm font-medium text-zinc-300">
                Business documents <span className="text-red-400">*</span>
              </p>
              <label className="mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center transition hover:border-blue-400/40 hover:bg-blue-500/[0.06]">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={selectDocuments}
                  className="hidden"
                />
                {documentFiles.length ? (
                  <>
                    <FileCheck2 className="h-9 w-9 text-emerald-400" />
                    <p className="mt-3 text-sm font-medium text-white">Add more documents</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {documentFiles.length} file{documentFiles.length === 1 ? "" : "s"} selected
                    </p>
                  </>
                ) : (
                  <>
                    <FileUp className="h-9 w-9 text-blue-400" />
                    <p className="mt-3 text-sm font-medium text-white">Select business documents</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      PDF, JPG, PNG, or WebP · 5 MB each · Up to 10 files
                    </p>
                  </>
                )}
              </label>
              {fileError && <p className="mt-2 text-xs text-red-400">{fileError}</p>}

              {documentFiles.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {documentFiles.map((file) => (
                    <SelectedDocumentPreview
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      file={file}
                      onRemove={() =>
                        setDocumentFiles((current) =>
                          current.filter((candidate) => candidate !== file)
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-amber-400/15 bg-amber-500/[0.07] p-4 text-xs leading-5 text-amber-100/80">
              Your documents will be uploaded securely and manually checked by
              an Ensemble administrator. Your Team receives the verified
              business badge only after approval.
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-white/10 px-6 py-4">
          <button
            type="button"
            disabled={
              isUploading ||
              !teamAccountId ||
              !documentType ||
              !documentFiles.length
            }
            onClick={() => void uploadDocuments()}
            className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              `Upload ${documentFiles.length} Document${documentFiles.length === 1 ? "" : "s"}`
            )}
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessVerificationModal(
  props: BusinessVerificationModalProps
) {
  if (!props.isOpen) return null;
  return (
    <BusinessVerificationModalContent
      onClose={props.onClose}
      teamAccountId={props.teamAccountId}
      onUploaded={props.onUploaded}
    />
  );
}
