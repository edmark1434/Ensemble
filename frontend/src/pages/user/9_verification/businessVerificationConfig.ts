export type BusinessType =
  | "Sole Proprietorship"
  | "One Person Corporation"
  | "Corporation"
  | "Partnership"
  | "Cooperative"
  | "Non-Profit Organization"
  | "Educational Institution"
  | "Government Organization"
  | "Foreign Registered Business"
  | "Other";

export interface BusinessDocumentRequirement {
  value: string;
  label: string;
  required: boolean;
  description?: string;
}

const document = (
  value: string,
  label: string,
  required = false,
): BusinessDocumentRequirement => ({ value, label, required });

export const BUSINESS_DOCUMENT_REQUIREMENTS: Record<
  BusinessType,
  BusinessDocumentRequirement[]
> = {
  "Sole Proprietorship": [
    document("DTI_CERTIFICATE", "DTI Certificate", true),
    document("BIR_CERTIFICATE", "BIR Certificate (Form 2303)"),
    document("BUSINESS_PERMIT", "Mayor's / Business Permit"),
  ],
  "One Person Corporation": [
    document("SEC_CERTIFICATE", "SEC Certificate", true),
    document("GENERAL_INFORMATION_SHEET", "General Information Sheet (GIS)"),
    document("ARTICLES_OF_INCORPORATION", "Articles of Incorporation"),
    document("BIR_CERTIFICATE", "BIR Certificate (Form 2303)"),
    document("BUSINESS_PERMIT", "Mayor's / Business Permit"),
  ],
  Corporation: [
    document("SEC_CERTIFICATE", "SEC Certificate", true),
    document("GENERAL_INFORMATION_SHEET", "General Information Sheet (GIS)"),
    document("ARTICLES_OF_INCORPORATION", "Articles of Incorporation"),
    document("BIR_CERTIFICATE", "BIR Certificate (Form 2303)"),
    document("BUSINESS_PERMIT", "Mayor's / Business Permit"),
  ],
  Partnership: [
    document("SEC_CERTIFICATE", "SEC Certificate", true),
    document("PARTNERSHIP_REGISTRATION", "Partnership Registration"),
    document("BIR_CERTIFICATE", "BIR Certificate (Form 2303)"),
  ],
  Cooperative: [
    document("CDA_CERTIFICATE", "CDA Certificate", true),
    document("CERTIFICATE_OF_COMPLIANCE", "Certificate of Compliance"),
  ],
  "Non-Profit Organization": [
    document("NON_PROFIT_REGISTRATION", "Non-Profit Registration Document", true),
    document("SEC_CERTIFICATE", "SEC Certificate"),
    document("BIR_CERTIFICATE", "BIR Certificate (Form 2303)"),
  ],
  "Educational Institution": [
    document(
      "GOVERNMENT_RECOGNITION",
      "Government Recognition / Registration Document",
      true,
    ),
  ],
  "Government Organization": [
    document("GOVERNMENT_AUTHORIZATION", "Government Authorization Document", true),
  ],
  "Foreign Registered Business": [
    document(
      "FOREIGN_BUSINESS_REGISTRATION",
      "Foreign Business Registration Certificate",
      true,
    ),
  ],
  Other: [
    document("OTHER_BUSINESS_DOCUMENT", "Business Registration Document", true),
  ],
};

export const BUSINESS_TYPES = Object.keys(
  BUSINESS_DOCUMENT_REQUIREMENTS,
) as BusinessType[];

export const BUSINESS_RELATIONSHIPS = [
  "Owner",
  "Sole Proprietor",
  "Director",
  "Partner",
  "President",
  "Corporate Officer",
  "Authorized Representative",
  "Employee",
  "Other",
] as const;

export const AUTHORIZATION_REQUIRED_RELATIONSHIPS = new Set<string>([
  "Authorized Representative",
  "Employee",
  "Other",
]);

export const AUTHORIZATION_DOCUMENTS: BusinessDocumentRequirement[] = [
  document("AUTHORIZATION_LETTER", "Authorization Letter", true),
  document("SECRETARY_CERTIFICATE", "Secretary's Certificate", true),
  document("BOARD_RESOLUTION", "Board Resolution", true),
  document("SPECIAL_POWER_OF_ATTORNEY", "Special Power of Attorney", true),
  document("PROOF_OF_EMPLOYMENT", "Proof of Employment or Appointment", true),
  document("OTHER_AUTHORIZATION", "Other Authorization Document", true),
];

export function getBusinessDocumentLabel(value: string) {
  const requirements = Object.values(BUSINESS_DOCUMENT_REQUIREMENTS).flat();
  return [...requirements, ...AUTHORIZATION_DOCUMENTS].find(
    (requirement) => requirement.value === value,
  )?.label || value.replaceAll("_", " ");
}
