import { sampleCategories } from "../6_job_market/job_datasets";

export type QuestionnaireType = "fill-in-blank" | "file-upload" | "multiple-choice";

export interface Questionnaire {
  id?: string;
  type: QuestionnaireType | string;
  question: string;
  required?: boolean;
  isRequired?: boolean;
  limit?: number; // for multiple choice
  multipleAnswer?: boolean;
  allowMultiple?: boolean;
  options?: string[]; // for multiple choice
  fileTypes?: string[]; // "image", "document", "video" etc
  fileLimit?: number;
}

export interface GigTier {
  tierId?: string;
  title: string;
  tierName: string;
  description: string;
  daysOfDelivery: number;
  revisions: number;
  price: number;
}

export interface Milestone {
  name: string;
  description: string;
}

export interface Gig {
  id: string;
  postedBy: string;
  clientAvatar?: string;
  title: string;
  description: string;
  category: string;
  status?: string;
  slots: number;
  termsOfService: string;
  skills: string[];
  firstDraftDelivery: string;
  thumbnail: string;
  gallery: string[];
  milestones: Milestone[];
  tiers: GigTier[];
  additionalWorkRate: number;
  questionnaires: Questionnaire[];
  
  // UI helpers (similar to Jobs)
  postedAt: string;
  timeAgo: string;
  clientRating: number;
  ratingCount: number;
  isSaved: boolean;
  isOwnGig: boolean;
  savesCount?: number;
  ordersCount?: number;
  freelancerAccountId?: string;
}

export const sampleGigs: Gig[] = [];
