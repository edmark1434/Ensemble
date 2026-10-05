import React from "react";
import {
  Bell, Users, MessageSquare, Briefcase, FileText, Star, AlertCircle, UserPlus,
  Wallet, BadgeCheck, Ticket, RefreshCw, Heart, BookOpen, AtSign, Calendar,
  Clock, XCircle, CheckCircle2, ArrowRightLeft, Package, Layers, ShoppingBag,
  Send, Shield,
} from "lucide-react";

export type NotificationIconDef = { icon: React.ReactNode; bg: string; text: string; border: string };

type Tone = Omit<NotificationIconDef, "icon">;

const TONES: Record<string, Tone> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/20" },
  purple:  { bg: "bg-purple-500/10",  text: "text-purple-500 dark:text-purple-400",   border: "border-purple-200 dark:border-purple-500/20" },
  yellow:  { bg: "bg-yellow-500/10",  text: "text-yellow-500 dark:text-yellow-400",   border: "border-yellow-200 dark:border-yellow-500/20" },
  rose:    { bg: "bg-rose-500/10",    text: "text-rose-500 dark:text-rose-400",       border: "border-rose-200 dark:border-rose-500/20" },
  blue:    { bg: "bg-blue-500/10",    text: "text-blue-500 dark:text-blue-400",       border: "border-blue-200 dark:border-blue-500/20" },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-500 dark:text-amber-400",     border: "border-amber-200 dark:border-amber-500/20" },
  gray:    { bg: "bg-gray-500/10",    text: "text-gray-500 dark:text-zinc-400",       border: "border-gray-200 dark:border-white/10" },
  green:   { bg: "bg-green-500/10",   text: "text-green-500 dark:text-green-400",     border: "border-green-200 dark:border-green-500/20" },
  red:     { bg: "bg-red-500/10",     text: "text-red-500 dark:text-red-400",         border: "border-red-200 dark:border-red-500/20" },
  indigo:  { bg: "bg-indigo-500/10",  text: "text-indigo-500 dark:text-indigo-400",   border: "border-indigo-200 dark:border-indigo-500/20" },
  teal:    { bg: "bg-teal-500/10",    text: "text-teal-500 dark:text-teal-400",       border: "border-teal-200 dark:border-teal-500/20" },
  orange:  { bg: "bg-orange-500/10",  text: "text-orange-500 dark:text-orange-400",   border: "border-orange-200 dark:border-orange-500/20" },
  violet:  { bg: "bg-violet-500/10",  text: "text-violet-500 dark:text-violet-400",   border: "border-violet-200 dark:border-violet-500/20" },
  pink:    { bg: "bg-pink-500/10",    text: "text-pink-500 dark:text-pink-400",       border: "border-pink-200 dark:border-pink-500/20" },
};

const tone = (color: keyof typeof TONES, icon: React.ReactNode): NotificationIconDef => ({ icon, ...TONES[color] });

const i = (Icon: React.ComponentType<{ className?: string }>) => <Icon className="w-4 h-4" />;

export const NOTIFICATION_ICONS: Record<string, NotificationIconDef> = {
  // Followers
  follow:                     tone("emerald", i(UserPlus)),
  // Chat
  CHAT_GROUP_ADDED:           tone("purple", i(Users)),
  CHAT_ENGAGEMENT_CREATED:    tone("purple", i(MessageSquare)),
  CHAT_MARKETPLACE_CREATED:   tone("purple", i(MessageSquare)),
  CHAT_REVISION_CREATED:      tone("yellow", i(RefreshCw)),
  CHAT_MESSAGE:               tone("purple", i(MessageSquare)),
  CHAT_REPLY:                 tone("purple", i(MessageSquare)),
  CHAT_REACTION:              tone("rose", i(Heart)),
  // Jobs
  create:                     tone("blue", i(Briefcase)),
  save:                       tone("blue", i(BookOpen)),
  JOB_INVITATION:             tone("blue", i(Send)),
  shortlisted:                tone("amber", i(Star)),
  unshortlisted:              tone("gray", i(XCircle)),
  accepted:                   tone("green", i(CheckCircle2)),
  rejected:                   tone("red", i(XCircle)),
  // Gigs
  new_order:                  tone("blue", i(Package)),
  GIGR:                       tone("amber", i(Star)),
  // Contracts
  offer_sent:                 tone("indigo", i(FileText)),
  offer_received:             tone("indigo", i(FileText)),
  offer_accepted:             tone("green", i(CheckCircle2)),
  CON:                        tone("indigo", i(FileText)),
  JOB:                        tone("blue", i(Briefcase)),
  PRP:                        tone("indigo", i(FileText)),
  CONTRACT_REVIEW:            tone("amber", i(Star)),
  CONTRACT_CLOSED:            tone("gray", i(XCircle)),
  CONTRACT_CANCELLED:         tone("red", i(XCircle)),
  CONTRACT_EXTENDED:          tone("teal", i(Calendar)),
  CONTRACT_FUND_DISTRIBUTION: tone("emerald", i(ArrowRightLeft)),
  // Milestones
  MILESTONE_UPDATE:             tone("blue", i(RefreshCw)),
  MILESTONE_MESSAGE:            tone("purple", i(MessageSquare)),
  MILESTONE_REVIEW_REQUESTED:   tone("indigo", i(Clock)),
  MILESTONE_REVISION_REQUESTED: tone("yellow", i(RefreshCw)),
  MILESTONE_DUE_SOON:           tone("orange", i(Clock)),
  MILESTONE_OVERDUE:            tone("red", i(AlertCircle)),
  MILESTONE_STALLED:            tone("red", i(AlertCircle)),
  MILESTONE_ABANDONED:          tone("red", i(XCircle)),
  MILESTONE_APPROVED:           tone("green", i(CheckCircle2)),
  MILESTONE_AUTO_APPROVED:      tone("green", i(CheckCircle2)),
  MILESTONE_REVISION:           tone("yellow", i(RefreshCw)),
  MILESTONE_REVIEW_REMINDER:    tone("orange", i(Clock)),
  MILESTONE_CANCELLED:          tone("red", i(XCircle)),
  // Cancellations
  CANCELLATION_REQUESTED:     tone("orange", i(AlertCircle)),
  CANCELLATION_ACCEPTED:      tone("green", i(CheckCircle2)),
  CANCELLATION_DECLINED:      tone("red", i(XCircle)),
  CANCELLATION_WITHDRAWN:     tone("gray", i(RefreshCw)),
  CANCELLATION_AUTO_APPROVED: tone("green", i(CheckCircle2)),
  // Payments
  TOPUP:                      tone("emerald", i(Wallet)),
  PAYMENT:                    tone("emerald", i(Wallet)),
  SUBSCRIPTION:               tone("violet", i(Layers)),
  CASHOUT_PENDING:            tone("yellow", i(ArrowRightLeft)),
  CASHOUT_APPROVED:           tone("green", i(CheckCircle2)),
  CASHOUT_REJECTED:           tone("red", i(XCircle)),
  CASHOUT_COMPLETED:          tone("green", i(CheckCircle2)),
  TEAM_FUND_TRANSFER:         tone("emerald", i(ArrowRightLeft)),
  // Assets
  ASSET_PURCHASED:            tone("emerald", i(ShoppingBag)),
  ASSET_CLAIMED:              tone("emerald", i(ShoppingBag)),
  // Team tasks
  TEAM_TASK_ASSIGNED:         tone("blue", i(Briefcase)),
  TEAM_TASK_STATUS_CHANGED:   tone("teal", i(RefreshCw)),
  TEAM_TASK_DUE:              tone("orange", i(Clock)),
  // Social
  PROJECT_INVITATION:         tone("pink", i(UserPlus)),
  meeting_request:            tone("indigo", i(Calendar)),
  // Forums
  FORUM_COMMENT:              tone("purple", i(MessageSquare)),
  FORUM_REPLY:                tone("purple", i(MessageSquare)),
  FORUM_LIKE:                 tone("rose", i(Heart)),
  FORUM_SAVE:                 tone("blue", i(BookOpen)),
  FORUM_MENTION:              tone("amber", i(AtSign)),
  // Account
  VERIFICATION:               tone("green", i(BadgeCheck)),
  BUSINESS_VERIFICATION:      tone("green", i(BadgeCheck)),
  IDENTITY_REVERIFICATION:    tone("orange", i(AlertCircle)),
  SUSPEND:                    tone("red", i(XCircle)),
  MARKETPLACE:                tone("orange", i(Shield)),
  // Tickets
  TICKET_ASSIGNED:            tone("indigo", i(Ticket)),
  TICKET_RESOLVED:            tone("green", i(CheckCircle2)),
  TICKET_REPLY:               tone("indigo", i(Ticket)),
  TICKET_INTERNAL_REPLY:      tone("gray", i(Ticket)),
};

export const DEFAULT_NOTIFICATION_ICON = tone("gray", i(Bell));

export function getNotificationIcon(prefix: string): NotificationIconDef {
  return NOTIFICATION_ICONS[prefix] ?? DEFAULT_NOTIFICATION_ICON;
}

export const NOTIFICATION_LABELS: Record<string, string> = {
  follow: "New Follower",
  CHAT_GROUP_ADDED: "Added to Group", CHAT_ENGAGEMENT_CREATED: "Engagement Started",
  CHAT_MARKETPLACE_CREATED: "Marketplace Chat", CHAT_REVISION_CREATED: "Revision Chat",
  CHAT_MESSAGE: "New Message", CHAT_REPLY: "Message Reply", CHAT_REACTION: "Reaction",
  create: "Job Posted", save: "Job Saved", JOB_INVITATION: "Job Invitation",
  shortlisted: "Shortlisted", unshortlisted: "Removed from Shortlist",
  accepted: "Proposal Accepted", rejected: "Proposal Rejected",
  new_order: "New Gig Order", GIGR: "Gig Review",
  offer_sent: "Offer Sent", offer_received: "Offer Received", offer_accepted: "Offer Accepted",
  CON: "Contract Event", JOB: "Job Contract", PRP: "Proposal Contract",
  CONTRACT_REVIEW: "New Review", CONTRACT_CLOSED: "Contract Closed",
  CONTRACT_CANCELLED: "Contract Cancelled", CONTRACT_EXTENDED: "Contract Extended",
  CONTRACT_FUND_DISTRIBUTION: "Funds Distributed",
  MILESTONE_UPDATE: "Milestone Update", MILESTONE_MESSAGE: "Milestone Message",
  MILESTONE_REVIEW_REQUESTED: "Review Requested", MILESTONE_REVISION_REQUESTED: "Revision Requested",
  MILESTONE_DUE_SOON: "Milestone Due Soon", MILESTONE_OVERDUE: "Milestone Overdue",
  MILESTONE_STALLED: "Milestone Stalled", MILESTONE_ABANDONED: "Milestone Abandoned",
  MILESTONE_APPROVED: "Milestone Approved", MILESTONE_AUTO_APPROVED: "Auto-Approved",
  MILESTONE_REVISION: "Revision Requested", MILESTONE_REVIEW_REMINDER: "Review Reminder",
  MILESTONE_CANCELLED: "Milestone Cancelled",
  CANCELLATION_REQUESTED: "Cancellation Requested", CANCELLATION_ACCEPTED: "Cancellation Accepted",
  CANCELLATION_DECLINED: "Cancellation Declined", CANCELLATION_WITHDRAWN: "Cancellation Withdrawn",
  CANCELLATION_AUTO_APPROVED: "Auto-Approved Cancellation",
  TOPUP: "Credit Top-up", PAYMENT: "Payment", SUBSCRIPTION: "Subscription",
  CASHOUT_PENDING: "Cashout Pending", CASHOUT_APPROVED: "Cashout Approved",
  CASHOUT_REJECTED: "Cashout Rejected", CASHOUT_COMPLETED: "Cashout Completed",
  TEAM_FUND_TRANSFER: "Team Funds",
  ASSET_PURCHASED: "Asset Purchased", ASSET_CLAIMED: "Asset Claimed",
  TEAM_TASK_ASSIGNED: "Task Assigned", TEAM_TASK_STATUS_CHANGED: "Task Updated",
  TEAM_TASK_DUE: "Task Due", PROJECT_INVITATION: "Project Invite",
  meeting_request: "Meeting Request",
  FORUM_COMMENT: "Forum Comment", FORUM_REPLY: "Forum Reply", FORUM_LIKE: "Forum Like",
  FORUM_SAVE: "Forum Save", FORUM_MENTION: "Mentioned",
  VERIFICATION: "Verified", BUSINESS_VERIFICATION: "Business Verified",
  IDENTITY_REVERIFICATION: "Re-verify Required", SUSPEND: "Account Suspended",
  MARKETPLACE: "Marketplace Notice",
  TICKET_ASSIGNED: "Ticket Assigned", TICKET_RESOLVED: "Ticket Resolved",
  TICKET_REPLY: "Ticket Reply", TICKET_INTERNAL_REPLY: "Internal Reply",
};

export function getNotificationLabel(prefix: string): string {
  return NOTIFICATION_LABELS[prefix]
    ?? prefix.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const FOLLOW_MESSAGE = /^(?:(.+?) \(@([^)]+)\)|@(\S+)) followed you\.?$/;

export function getFollower(message: string): { name: string; handle: string | null } | null {
  const match = message.match(FOLLOW_MESSAGE);
  if (!match) return null;
  const handle = match[2] ?? match[3] ?? null;
  return { name: match[1] ?? `@${handle}`, handle: match[1] ? handle : null };
}
