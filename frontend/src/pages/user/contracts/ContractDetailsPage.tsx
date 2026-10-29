import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  ListTodo,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Users,
  Copy,
  MessageCircle,
  CalendarPlus,
  Ban,
  Printer,
  LayoutDashboard,
  ScrollText,
  Sparkles,
  Building2,
  CheckCircle,
  MoreHorizontal,
  XCircle,
  UserPlus,
  ArrowRightLeft,
  Trash2,
  Loader2,
  Coins,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import useGlobalState from "@/lib/global_state";
import UserHeader from "@/components/nav/user_header";
import { UnverifiedOverlay } from "@/components/ui/UnverifiedOverlay";
import { CreditIcon } from "@/components/ui/credit-icon";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DetailedContract, MilestoneItem, MilestoneStatus, ContractStatus, CancellationRequest } from "./contracts";
import { ActiveMilestoneTimerCard } from "./ActiveMilestoneTimerCard";

export interface ContractTeamMember {
  account_id: string;
  role_title: string;
  agreed_credits: number | null;
  notes: string | null;
  created_at: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  total_received_credits: number;
}

export interface ContractDistribution {
  distribution_id: string;
  contract_id: string;
  distributed_by_account_id: string;
  recipient_account_id: string;
  amount_credits: number;
  notes: string | null;
  created_at: string;
  recipient_name: string;
  recipient_handle: string;
  recipient_avatar: string | null;
  distributor_name: string;
  distributor_handle: string;
}

export interface TeamBudget {
  total_rate_credits: number;
  released_credits: number;
  distributed_credits: number;
  remaining_distributable_credits: number;
}

// ============================================================================
// OFFICIAL PAPER CONTRACT DOCUMENT VIEW
// ============================================================================
const PaperContractDocument: React.FC<{ contract: DetailedContract }> = ({ contract }) => {
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          html, body, #root, main, .min-h-screen {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
            margin: 0 !important;
            padding: 0 !important;
            padding-left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          aside, nav, header, [role="navigation"], .print-hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            padding-left: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .paper-contract-wrapper {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-exact {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          img.ensemble-logo-print {
            filter: invert(1) !important;
          }
        }
      `}</style>
      <div className="paper-contract-wrapper max-w-4xl mx-auto bg-white text-zinc-900 border border-zinc-200/90 shadow-2xl rounded-3xl p-6 sm:p-12 md:p-16 space-y-8 relative font-['Plus_Jakarta_Sans'] print:bg-white print:text-black print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none">
        {/* Paper Top Accent & Official Document Header */}
        <div className="avoid-break flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b-2 border-zinc-900 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <img
                src="/ensemble_lg.svg"
                alt="Ensemble"
                className="ensemble-logo-print h-8 w-8 object-contain invert shrink-0"
              />
              <span className="text-xs font-extrabold tracking-widest uppercase text-zinc-700">
                Ensemble Platform Services
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-serif">
              Digital Services & Escrow Agreement
            </h1>
            <p className="text-xs text-zinc-600 mt-1">
              Legally Binding Professional Service Contract Executed via Ensemble Smart Escrow
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1 shrink-0">
            <div className="inline-block px-3 py-1 rounded border border-emerald-600 bg-emerald-50 text-emerald-950 text-[10px] font-mono font-bold uppercase tracking-wider print-exact">
              Contract Serial: CTR-{contract.id}
            </div>
            <div className="text-xs text-zinc-600 font-mono">
              Executed: {new Date(contract.dateCreated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </div>
            <div className="text-[11px] font-bold text-zinc-700">
              Obligation Status: <span className="uppercase font-extrabold text-blue-700">{contract.status}</span>
            </div>
          </div>
        </div>

        {/* Recital / Legal Preamble */}
        <div className="avoid-break text-xs leading-relaxed text-zinc-700 bg-zinc-50 p-4 rounded-xl border border-zinc-200 italic print-exact">
          This Service & Escrow Agreement (the "Agreement") is entered into and made effective as of the Date of Execution by and between the Principal (Client) and Independent Contractor (Specialist) designated below. All monetary consideration is governed by Ensemble Platform Escrow Protocols and binding mediation procedures.
        </div>

        {/* SECTION 1: THE PARTIES */}
        <div className="avoid-break space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
            <span className="font-mono text-xs font-bold text-blue-700">ARTICLE 1</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Identification of the Parties
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Box */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/80 space-y-1.5 print-exact">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Party A: The Principal (Client)
              </span>
              <div className="font-extrabold text-sm text-zinc-900">
                {contract.clientName}
              </div>
              <div className="text-[11px] font-mono text-zinc-500">
                Platform Account ID: {contract.clientAccountId || "Registered Platform Client"}
              </div>
              <p className="text-[11px] text-zinc-600 leading-normal pt-1">
                Capacity: Authorizing and funding party. Responsible for reviewing submissions and approving milestone disbursement.
              </p>
            </div>

            {/* Freelancer / Team Box */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/80 space-y-1.5 print-exact">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                {contract.freelancerType === "Team" || (contract.includedTeamMembers && contract.includedTeamMembers.length > 0)
                  ? "Party B: The Specialist Team (Contractor)"
                  : "Party B: The Specialist (Contractor)"}
              </span>
              <div className="font-extrabold text-sm text-zinc-900 flex items-center gap-2 flex-wrap">
                <span>{contract.freelancerName}</span>
                {(contract.freelancerType === "Team" || (contract.includedTeamMembers && contract.includedTeamMembers.length > 0)) && (
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    Team / Studio
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-zinc-500">
                Platform Account ID: {contract.freelancerAccountId || "Registered Platform Specialist"}
              </div>
              {contract.includedTeamMembers && contract.includedTeamMembers.length > 0 && (
                <div className="pt-1.5 mt-1 border-t border-zinc-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Included Team Members ({contract.includedTeamMembers.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {contract.includedTeamMembers.map((m, idx) => (
                      <span
                        key={m.account_id || idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-zinc-200 text-[10.5px] font-semibold text-zinc-800"
                      >
                        <span>{m.display_name || m.handle}</span>
                        {m.is_leader && (
                          <span className="px-1 py-0.1 rounded text-[8.5px] font-bold bg-amber-500 text-white">
                            Team Leader
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-zinc-600 leading-normal pt-1">
                Capacity: Independent specialist {contract.includedTeamMembers && contract.includedTeamMembers.length > 0 ? "team " : ""}responsible for executing and delivering the agreed deliverables according to project specifications.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/60 text-[11px] text-zinc-600 print-exact">
            <strong>Custodial Agent:</strong> Ensemble Technologies Inc. acts as neutral third-party escrow holder and administrator for all transactions executed under this Agreement.
          </div>
        </div>

        {/* SECTION 2: ENGAGEMENT SCOPE & STATEMENT OF WORK */}
        <div className="avoid-break space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
            <span className="font-mono text-xs font-bold text-blue-700">ARTICLE 2</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Engagement Scope & Statement of Work
            </h2>
          </div>

          <div className="space-y-3 text-xs text-zinc-800">
            <div className="avoid-break space-y-1">
              <span className="font-bold text-xs text-zinc-900 block">
                2.1 Official Title of Work:
              </span>
              <div className="text-sm sm:text-base font-extrabold text-zinc-900 pl-3 border-l-2 border-blue-600 py-0.5 tracking-tight break-words [overflow-wrap:anywhere]">
                "{contract.title}"
              </div>
            </div>

            <div className="avoid-break space-y-1">
              <span className="font-bold text-zinc-900 block">
                2.2 Detailed Statement of Work (SOW):
              </span>
              <div className="text-xs text-zinc-800 leading-relaxed font-normal break-words [overflow-wrap:anywhere] max-w-full">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed break-words [overflow-wrap:anywhere]" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-zinc-900 break-words" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-zinc-800 break-words" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 my-2 space-y-1 break-words" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 my-2 space-y-1 break-words" {...props} />,
                    li: ({ node, ...props }) => <li className="pl-1 leading-relaxed break-words [overflow-wrap:anywhere]" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-sm font-bold text-zinc-900 mt-3 mb-1 break-words" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xs font-bold text-zinc-900 mt-2.5 mb-1 break-words" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-zinc-900 mt-2 mb-1 break-words" {...props} />,
                    h4: ({ node, ...props }) => <h4 className="text-xs font-semibold text-zinc-900 mt-1.5 mb-0.5 break-words" {...props} />,
                  }}
                >
                  {contract.jobDescription || ''}
                </ReactMarkdown>
              </div>
            </div>

            {contract.targetMilestoneTitle && (
              <div className="avoid-break space-y-1">
                <span className="font-bold text-zinc-900 block">
                  2.3 Assigned Milestone Role Scope:
                </span>
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-950 space-y-0.5 print-exact">
                  <span className="font-bold text-xs text-blue-950 block">{contract.targetMilestoneTitle}</span>
                  {contract.targetMilestoneDescription && (
                    <p className="text-xs text-blue-900 leading-relaxed">{contract.targetMilestoneDescription}</p>
                  )}
                </div>
              </div>
            )}

            {contract.targetMilestoneTasks && contract.targetMilestoneTasks.length > 0 && (
              <div className="avoid-break space-y-1.5">
                <span className="font-bold text-xs text-zinc-900 block">
                  2.4 Enumerated Deliverables Schedule:
                </span>
                <div className="space-y-1.5 pl-2">
                  {contract.targetMilestoneTasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-zinc-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      <span className="font-bold font-mono text-zinc-900 shrink-0">
                        2.4.{idx + 1}
                      </span>
                      <span className="text-zinc-800 leading-relaxed font-medium">
                        {task}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: PROJECT WORKFLOW & CONFIDENTIALITY PROTOCOLS */}
        <div className="avoid-break space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
            <span className="font-mono text-xs font-bold text-blue-700">ARTICLE 3</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Project Workflow & Confidentiality Protocols
            </h2>
          </div>

          <div className="space-y-3 text-xs text-zinc-800">
            {/* 3.1 Project Initiation Responsibility */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                {contract.initiatorRole === "Client" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
                <span>3.1 Project Initiation Responsibility</span>
              </div>
              <p className="text-xs text-zinc-700 pl-5.5 leading-relaxed">
                {contract.initiatorRole === "Client"
                  ? "Client Initiates: The Principal is designated to create and configure the collaborative project workspace."
                  : "Specialist Initiates: The Independent Specialist is expected to create and initialize the collaborative project workspace."}
              </p>
            </div>

            {/* 3.2 Pre-existing Project Association */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                {contract.isExistingProject ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
                <span>3.2 Pre-existing Project Association</span>
              </div>
              <p className="text-xs text-zinc-700 pl-5.5 leading-relaxed">
                {contract.isExistingProject
                  ? "Linked Project: This contract is tied to a pre-existing project asset library on Ensemble."
                  : "New Engagement: A dedicated project workspace will be created specifically for this agreement."}
              </p>
            </div>

            {/* 3.3 Confidentiality & NDA */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                {contract.requireNDA ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
                <span>3.3 Confidentiality & Non-Disclosure (NDA)</span>
              </div>
              <p className="text-xs text-zinc-700 pl-5.5 leading-relaxed">
                {contract.requireNDA
                  ? "Strict NDA In Effect: Specialist is legally bound not to disclose, distribute, or discuss project assets or work-in-progress."
                  : "Standard Platform Policy: General platform confidentiality applies without independent restrictive covenants."}
              </p>
            </div>

            {/* 3.4 Portfolio Demonstration Rights */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                {contract.portfolioUseAllowed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
                <span>3.4 Portfolio & Demonstration Rights</span>
              </div>
              <p className="text-xs text-zinc-700 pl-5.5 leading-relaxed">
                {contract.portfolioUseAllowed
                  ? `Permitted Portfolio Showcase: Specialist is authorized to display approved deliverables in professional portfolios (up to ${contract.portfolioDuration || 60} seconds).`
                  : "Restricted Portfolio Rights: Specialist is expressly prohibited from publicly displaying deliverables in personal or commercial showcases."}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 4: ESCROW CONSIDERATION & FINANCIAL TERMS */}
        <div className="avoid-break space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
            <span className="font-mono text-xs font-bold text-blue-700">ARTICLE 4</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Escrow Consideration & Financial Terms
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/80 print-exact">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">Gross Consideration</span>
              <div className="text-base font-extrabold text-zinc-900 mt-0.5">
                {contract.totalValueCredits.toLocaleString()} Credits
              </div>
              <span className="text-[10px] text-zinc-500">Held in custodial escrow</span>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/80 print-exact">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">Platform Escrow Fee</span>
              <div className="text-base font-extrabold text-zinc-800 mt-0.5">
                10% ({(contract.totalValueCredits * 0.1).toLocaleString()} Cr)
              </div>
              <span className="text-[10px] text-zinc-500">Protection & Mediation</span>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/70 print-exact">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 block">Net Specialist Entitlement</span>
              <div className="text-base font-extrabold text-emerald-950 mt-0.5">
                {(contract.totalValueCredits * 0.9).toLocaleString()} Credits
              </div>
              <span className="text-[10px] text-emerald-800">Disbursed per milestone</span>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 print-exact">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-950 block">Additional Work Rate</span>
              <div className="text-base font-extrabold text-blue-950 mt-0.5 font-mono">
                {contract.addOnRate}
              </div>
              <span className="text-[10px] text-blue-800">Set by Freelancer</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-800 leading-relaxed">
            <p>
              <strong>4.1 Escrow Assurance:</strong> 100% of the agreed consideration was collected upon contract execution and is held in custodial escrow by Ensemble. Escrowed funds shall only be released to Contractor upon explicit milestone approval by Client, or upon binding arbitral resolution.
            </p>
            <p>
              <strong>4.2 Out-of-Scope Revision Rate:</strong> Any work or revisions requested by Principal outside the stipulated milestone specifications shall be billed at the agreed additional rate of <strong>{contract.addOnRate}</strong> (set by the Specialist).
            </p>
          </div>
        </div>

        {/* SECTION 5: PERFORMANCE MILESTONES & DELIVERY SCHEDULE */}
        <div className="avoid-break space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
            <span className="font-mono text-xs font-bold text-blue-700">ARTICLE 5</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Milestones & Delivery Schedule
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-2xs print:shadow-none">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-100 border-b border-zinc-300 font-bold uppercase text-zinc-800 print-exact">
                <tr>
                  <th className="p-2.5">Phase</th>
                  <th className="p-2.5">Milestone Title</th>
                  <th className="p-2.5">Deadline</th>
                  <th className="p-2.5">Revisions</th>
                  <th className="p-2.5 text-right">Escrow Allocation</th>
                  <th className="p-2.5 text-center">Fulfillment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {contract.milestones.map((m, idx) => (
                  <tr key={m.id} className="avoid-break hover:bg-zinc-50/80">
                    <td className="p-2.5 font-mono font-bold text-zinc-700">5.{idx + 1}</td>
                    <td className="p-2.5 font-bold text-zinc-900">{m.name}</td>
                    <td className="p-2.5 text-zinc-600">{m.deadline}</td>
                    <td className="p-2.5 text-zinc-600">{m.revisions} Included</td>
                    <td className="p-2.5 text-right font-extrabold text-zinc-900">{m.credits.toLocaleString()} Credits</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border print-exact ${
                        m.status === 'Claimed' ? 'bg-emerald-100 text-emerald-950 border-emerald-400' :
                        m.status === 'In Progress' ? 'bg-blue-100 text-blue-950 border-blue-400' :
                        'bg-zinc-100 text-zinc-900 border-zinc-300'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 6: INTELLECTUAL PROPERTY & TERMS OF SERVICE */}
        <div className="avoid-break space-y-2">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
            <span className="font-mono text-xs font-bold text-blue-700">ARTICLE 6</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Intellectual Property & Terms of Service
            </h2>
          </div>

          <div className="space-y-2 text-xs text-zinc-800 leading-relaxed">
            <div>
              <span className="font-bold text-zinc-900 block mb-1">
                6.1 Specialist Terms: {contract.freelancerTosTitle || "Standard Service Terms"}
              </span>
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/80 whitespace-pre-wrap text-zinc-800 print-exact leading-relaxed">
                {contract.freelancerTosContent || "Standard platform service terms apply to this agreement. All deliverables shall be provided in accordance with agreed milestone specifications and quality standards."}
              </div>
            </div>

            <p>
              <strong>6.2 Universal Assignment of Rights:</strong> Contractor covenants that upon final approval and release of escrow consideration for each milestone, Contractor irrevocably conveys and assigns to Principal all right, title, interest, and intellectual property in and to all deliverables created under such milestone.
            </p>
          </div>
        </div>

        {/* SECTION 7: DISPUTES & MUTUAL CANCELLATIONS */}
        <div className="avoid-break space-y-2">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
            <span className="font-mono text-xs font-bold text-blue-700">ARTICLE 7</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Mutual Cancellation & Dispute Governance
            </h2>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-800 leading-relaxed">
            <p>
              <strong>7.1 Mutual Cancellation:</strong> Either party may submit a formal request for mutual cancellation with a 72-hour review period. If agreed, unapproved milestone escrow is refunded to the Principal, while previously approved milestones remain with the Contractor.
            </p>
            <p>
              <strong>7.2 Dispute Arbitration:</strong> In the event of an unresolvable breach or disagreement, either party may submit a formal dispute to Ensemble Platform Mediation. The determination of Ensemble Arbitration shall be final and binding.
            </p>
          </div>
        </div>

        {/* SECTION 8: SIGNATURES & EXECUTION ATTESTATION */}
        <div className="avoid-break space-y-3 pt-3 border-t-2 border-zinc-900">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-700">ARTICLE 8</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Digital Execution & Verification Attestation
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Client Signature Box */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/80 space-y-1.5 print-exact">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Principal Signature</span>
              <div className="h-10 flex items-center border-b border-dashed border-zinc-400 text-sm font-serif italic text-zinc-900">
                {contract.clientName}
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>Verified ID: {contract.clientAccountId?.slice(0, 8) || "VERIFIED"}...</span>
                <span>{new Date(contract.dateCreated).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Freelancer Signature Box */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/80 space-y-1.5 print-exact">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Specialist Signature</span>
              <div className="h-10 flex items-center border-b border-dashed border-zinc-400 text-sm font-serif italic text-zinc-900">
                {contract.freelancerName}
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>Verified ID: {contract.freelancerAccountId?.slice(0, 8) || "VERIFIED"}...</span>
                <span>{new Date(contract.dateCreated).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs text-blue-950 font-medium print-exact">
            <img
              src="/ensemble_lg.svg"
              alt="Ensemble Seal"
              className="ensemble-logo-print h-4 w-4 object-contain invert shrink-0"
            />
            <span>Digitally signed and sealed under Ensemble Platform Smart Escrow Ledger. Cryptographic record verified.</span>
          </div>
        </div>

        {/* Document Footer */}
        <div className="avoid-break pt-4 border-t border-zinc-200 flex flex-col items-center justify-center text-center text-[10px] text-zinc-600 space-y-1">
          <div className="flex items-center gap-1.5 opacity-80">
            <img
              src="/ensemble_lg.svg"
              alt="Ensemble"
              className="ensemble-logo-print h-3.5 w-3.5 object-contain invert"
            />
            <span className="font-semibold tracking-wider uppercase text-[9px]">Ensemble Platform Escrow Protocol</span>
          </div>
          <p className="font-semibold">CONFIDENTIAL & PROPRIETARY • ENSEMBLE TECHNOLOGIES INC. • CONTRACT ID: CTR-{contract.id}</p>
          <p>All transactions, escrow safeguards, and deliverable handoffs are subject to Ensemble Platform Terms of Service.</p>
        </div>
      </div>
    </>
  );
};

export const ContractDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useGlobalState();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isVerified = useGlobalState((state) => state.isVerified);

  const [contract, setContract] = useState<DetailedContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"workspace" | "paper">("workspace");

  // Mutual Cancellation State
  const [activeCancellation, setActiveCancellation] = useState<CancellationRequest | null>(null);
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("Mutual agreement to end project");
  const [cancellationMessage, setCancellationMessage] = useState("");
  const [submittingCancellation, setSubmittingCancellation] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [milestoneAction, setMilestoneAction] = useState<{ type: string; milestoneId: string; milestoneName: string } | null>(null);
  const [extensionDays, setExtensionDays] = useState<number>(3);
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Subcontract Team & Allocation State
  const [teamMembers, setTeamMembers] = useState<ContractTeamMember[]>([]);
  const [distributions, setDistributions] = useState<ContractDistribution[]>([]);
  const [teamBudget, setTeamBudget] = useState<TeamBudget | null>(null);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Add Member Modal State
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSuggestions, setMemberSuggestions] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState<any | null>(null);
  const [editorRole, setEditorRole] = useState("Video Editor");
  const [editorAgreedCredits, setEditorAgreedCredits] = useState("");
  const [editorNotes, setEditorNotes] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Distribute Modal State
  const [distributeModalOpen, setDistributeModalOpen] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [distributionNote, setDistributionNote] = useState("");
  const [distributingFunds, setDistributingFunds] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const myAccountId = String(user?.account_id || (user as any)?.accountId || (user as any)?.id || "").trim();

  const isCancellationInitiator = Boolean(
    activeCancellation && (
      (myAccountId && (
        String(activeCancellation.initiator_account_id || "") === myAccountId ||
        String(activeCancellation.initiated_by || "") === myAccountId
      )) ||
      (contract && myAccountId && (
        (activeCancellation.initiator_role === "client" && String(contract.clientAccountId) === myAccountId) ||
        (activeCancellation.initiator_role === "freelancer" && String(contract.freelancerAccountId) === myAccountId)
      ))
    )
  );

  const formatRemainingTime = (targetIso?: string) => {
    if (!targetIso) return "";
    const diff = new Date(targetIso).getTime() - Date.now();
    if (diff <= 0) return "Expiring now (pending auto-approval)";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}d ${remHours}h remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  const formatMilestoneDeadline = (m: any) => {
    if (m.deadline_at) {
      const d = new Date(m.deadline_at);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
      }
    }
    if (m.hours) return `${m.hours} Hours`;
    const hrs = Number(m.deadline);
    if (!isNaN(hrs) && hrs <= 0) return "Flexible";
    if (!isNaN(hrs) && hrs > 0 && hrs < 100000) {
      if (m.started_at) {
        const st = new Date(m.started_at);
        if (!isNaN(st.getTime())) {
          return new Date(st.getTime() + hrs * 3600000).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
        }
      }
      if (hrs >= 24 && hrs % 24 === 0) {
        return `${hrs / 24} Day${hrs / 24 > 1 ? "s" : ""} (${hrs} hrs)`;
      }
      return `${hrs} Hours`;
    }
    if (typeof m.deadline === "string" && m.deadline.includes("-")) {
      const d = new Date(m.deadline);
      if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
        return d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
      }
    }
    return m.deadline ? String(m.deadline) : "N/A";
  };

  const fetchCancellationRequest = useCallback(async (contractId: string) => {
    try {
      const res = await api.get(`/api/contracts/${contractId}/cancellation-request`);
      if (res.data?.success && res.data?.data) {
        setActiveCancellation(res.data.data);
      } else {
        setActiveCancellation(null);
      }
    } catch {
      setActiveCancellation(null);
    }
  }, []);

  const fetchContractData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/contracts");
      const raw = res.data?.data || res.data || [];
      const foundRaw = raw.find((c: any) => String(c.contract_id) === String(id));

      if (!foundRaw) {
        setError("Contract not found or you do not have permission to view it.");
        setContract(null);
        return;
      }

      const mappedMilestones = (foundRaw.milestones || []).filter(Boolean).map((m: any, _idx: number, arr: any[]) => {
        const rawStatus: string = (m.status || "").toLowerCase();
        let uiStatus: MilestoneStatus = "Locked";
        if (["completed", "approved", "auto_approved"].includes(rawStatus)) uiStatus = "Claimed";
        else if (rawStatus === "active") uiStatus = "In Progress";
        else if (["under_review", "revision_requested"].includes(rawStatus)) uiStatus = "Under Review";
        else if (rawStatus === "overdue") uiStatus = "Overdue";
        else if (rawStatus === "stalled") uiStatus = "Stalled";
        else if (rawStatus === "abandoned") uiStatus = "Abandoned";
        else if (rawStatus === "cancelled") uiStatus = "Cancelled";
        return {
          id: m.id,
          name: m.name,
          revisions: parseInt(m.revisions, 10) || 0,
          deadline: formatMilestoneDeadline(m),
          deadline_at: m.deadline_at,
          started_at: m.started_at,
          credits: m.credits || Math.floor((parseFloat(foundRaw.rate_credits) || 0) / (arr.length || 1)),
          status: uiStatus,
          rawStatus,
        };
      });

      const allMilestonesDone = mappedMilestones.length > 0 && mappedMilestones.every((m: any) => m.status === "Claimed");
      let derivedStatus = foundRaw.status;
      if (derivedStatus === "Completed") {
        derivedStatus = "Closed";
      } else if (allMilestonesDone) {
        derivedStatus = (foundRaw.client_rating && foundRaw.freelancer_rating) ? "Closed" : "Done";
      }

      const mapped: DetailedContract = {
        id: foundRaw.contract_id,
        title: foundRaw.job_title || foundRaw.contract_type,
        contractType: foundRaw.contract_type === "job" ? "Job" : "Gig",
        clientName: foundRaw.client_name || foundRaw.client_handle,
        freelancerName: foundRaw.freelancer_name || foundRaw.freelancer_handle,
        clientAccountId: foundRaw.client_account_id,
        freelancerAccountId: foundRaw.freelancer_account_id,
        clientAvatar: foundRaw.client_avatar ? constructAvatarUrl(foundRaw.client_avatar, foundRaw.client_name) : undefined,
        freelancerAvatar: foundRaw.freelancer_avatar ? constructAvatarUrl(foundRaw.freelancer_avatar, foundRaw.freelancer_name) : undefined,
        status: derivedStatus,
        isArchived: derivedStatus === "Closed" || derivedStatus === "Cancelled",
        jobId: foundRaw.job_id,
        dateCreated: foundRaw.created_at,
        dateStarted: foundRaw.starts_at || undefined,
        dueDate: foundRaw.job_deadline || undefined,
        clientRange: (foundRaw.rate_credits_min && foundRaw.rate_credits_max)
          ? `${parseFloat(foundRaw.rate_credits_min).toLocaleString()} ~ ${parseFloat(foundRaw.rate_credits_max).toLocaleString()}`
          : "Fixed Price",
        totalValueCredits: parseFloat(foundRaw.rate_credits) || 0,
        platformFeePercent: 10,
        jobDescription: foundRaw.job_description || "No description provided.",
        jobHiringType: foundRaw.job_hiring_type || (foundRaw.contract_type === "gig" ? "gig" : "single"),
        targetMilestoneTitle: foundRaw.target_milestone_title,
        targetMilestoneDescription: foundRaw.target_milestone_description,
        targetMilestoneTasks: Array.isArray(foundRaw.target_milestone_tasks)
          ? foundRaw.target_milestone_tasks
          : (typeof foundRaw.target_milestone_tasks === "string" ? JSON.parse(foundRaw.target_milestone_tasks || "[]") : []),
        jobAllMilestones: foundRaw.job_all_milestones || [],
        addOnRate: (() => {
          const raw = foundRaw.additional_work_rate !== null && foundRaw.additional_work_rate !== undefined
            ? Number(foundRaw.additional_work_rate)
            : (foundRaw.revision_price_credits !== null && foundRaw.revision_price_credits !== undefined ? Number(foundRaw.revision_price_credits) : null);
          if (raw !== null && !isNaN(raw)) {
            return raw > 0 ? `${raw.toLocaleString()} Credits / Revision` : "0 Credits (Free Revisions)";
          }
          return "Standard Platform Policy";
        })(),
        freelancerTosTitle: foundRaw.terms_title || "Standard Terms",
        freelancerTosContent: foundRaw.terms_content || "Standard platform terms and milestone fulfillment policies apply to this agreement. All deliverables will be provided in accordance with agreed milestone specifications and quality standards.",
        initiatorRole: (foundRaw.initiator_role === 'client' || foundRaw.initiator_role === 'Client') ? 'Client' : 'Freelancer',
        isExistingProject: Boolean(foundRaw.is_existing_project),
        existingProjectId: foundRaw.existing_project_id || undefined,
        requireNDA: Boolean(foundRaw.require_nda),
        portfolioUseAllowed: Boolean(foundRaw.portfolio_use_allowed),
        portfolioDuration: foundRaw.portfolio_use_duration_seconds || 60,
        teamId: foundRaw.team_id || undefined,
        orderId: foundRaw.proposal_id || undefined,
        milestones: mappedMilestones,
        activeDispute: foundRaw.active_dispute || null,
      };

      setContract(mapped);
      await fetchCancellationRequest(mapped.id);
    } catch (err: any) {
      console.error("Failed to load contract details:", err);
      setError("An unexpected error occurred while loading this contract.");
    } finally {
      setLoading(false);
    }
  }, [id, fetchCancellationRequest]);

  const fetchTeamData = useCallback(async () => {
    if (!id) return;
    try {
      setTeamLoading(true);
      const res = await api.get(`/api/contracts/${id}/team`);
      if (res.data?.success && res.data?.data) {
        setTeamMembers(res.data.data.members || []);
        setDistributions(res.data.data.distributions || []);
        setTeamBudget(res.data.data.budget || null);
        setCanManageTeam(Boolean(res.data.data.permissions?.can_manage_team));
      }
    } catch {
      // Ignored if user not authorized to view team
    } finally {
      setTeamLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContractData();
    fetchTeamData();
  }, [fetchContractData, fetchTeamData]);

  // Real-time socket updates
  useEffect(() => {
    if (!id || !socket) return;
    const handleUpdate = () => {
      fetchContractData();
      fetchTeamData();
    };
    socket.on(`contract:${id}:update`, handleUpdate);
    socket.on(`milestone:update`, handleUpdate);
    socket.on("contractTeamUpdated", handleUpdate);
    socket.on("notification", handleUpdate);
    return () => {
      socket.off(`contract:${id}:update`, handleUpdate);
      socket.off(`milestone:update`, handleUpdate);
      socket.off("contractTeamUpdated", handleUpdate);
      socket.off("notification", handleUpdate);
    };
  }, [id, fetchContractData, fetchTeamData]);

  // Live member search
  useEffect(() => {
    if (!addMemberModalOpen || !memberSearchQuery.trim() || selectedEditor) {
      setMemberSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const { data } = await api.get("/api/accounts/search-users", {
          params: { handle: memberSearchQuery.trim() },
        });
        const existingIds = new Set([
          contract?.clientAccountId,
          contract?.freelancerAccountId,
          ...teamMembers.map((m) => m.account_id),
        ]);
        const filtered = (data.data || [])
          .filter((u: any) => !existingIds.has(u.account_id))
          .map((u: any) => ({
            account_id: u.account_id,
            handle: u.handle,
            display_name: u.display_name,
            avatar_url: u.avatar_url || (u.avatar_file_id ? constructAvatarUrl(u.avatar_file_id, u.display_name) : undefined),
          }));
        setMemberSuggestions(filtered);
      } catch {
        setMemberSuggestions([]);
      } finally {
        setSearchingMembers(false);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [memberSearchQuery, selectedEditor, addMemberModalOpen, contract?.clientAccountId, contract?.freelancerAccountId, teamMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditor) return showErrorToast("Select an editor from search.");
    if (!editorRole.trim()) return showErrorToast("Specify a role for this team member.");
    setAddingMember(true);
    try {
      await api.post(`/api/contracts/${id}/team`, {
        accountId: selectedEditor.account_id,
        roleTitle: editorRole.trim(),
        agreedCredits: editorAgreedCredits ? parseInt(editorAgreedCredits, 10) : null,
        notes: editorNotes.trim() || undefined,
      });
      showSuccessToast(`Added @${selectedEditor.handle} to project team!`);
      setAddMemberModalOpen(false);
      setSelectedEditor(null);
      setMemberSearchQuery("");
      setEditorRole("Video Editor");
      setEditorAgreedCredits("");
      setEditorNotes("");
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || "Failed to add team member.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberAccountId: string, handle: string) => {
    if (!window.confirm(`Are you sure you want to remove @${handle} from this contract team?`)) return;
    try {
      await api.delete(`/api/contracts/${id}/team/${memberAccountId}`);
      showSuccessToast(`Removed @${handle} from project team.`);
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || "Failed to remove member.");
    }
  };

  const handleDistributeFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = Object.entries(allocations)
      .map(([accountId, amt]) => ({ account_id: accountId, amount_credits: Number(amt) }))
      .filter((r) => r.amount_credits > 0);

    if (recipients.length === 0) {
      return showErrorToast("Enter an allocation amount for at least one member.");
    }

    const totalAllocated = recipients.reduce((sum, r) => sum + r.amount_credits, 0);
    const maxBudget = teamBudget?.remaining_distributable_credits || 0;
    if (totalAllocated > maxBudget) {
      return showErrorToast(`Total payout (${totalAllocated} cr) exceeds remaining contract budget (${maxBudget} cr).`);
    }

    setDistributingFunds(true);
    try {
      const res = await api.post(`/api/contracts/${id}/distribute-funds`, {
        recipients,
        notes: distributionNote.trim() || undefined,
      });
      showSuccessToast(res.data?.message || "Contract funds distributed successfully!");
      setDistributeModalOpen(false);
      setAllocations({});
      setDistributionNote("");
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || "Failed to distribute funds.");
    } finally {
      setDistributingFunds(false);
    }
  };

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    showSuccessToast("Contract ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleRequestCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || submittingCancellation) return;
    if (!cancellationReason.trim()) {
      showErrorToast("Please select a cancellation reason.");
      return;
    }
    setSubmittingCancellation(true);
    try {
      const res = await api.post(`/api/contracts/${contract.id}/cancellation-request`, {
        reason: cancellationReason,
        message: cancellationMessage.trim() || undefined
      });
      showSuccessToast(res.data?.message || "Mutual cancellation request submitted successfully.");
      setCancellationModalOpen(false);
      setCancellationMessage("");
      await fetchContractData();
    } catch (err: any) {
      console.error("Failed to request cancellation:", err);
      showErrorToast(err?.response?.data?.message || "Failed to submit cancellation request.");
    } finally {
      setSubmittingCancellation(false);
    }
  };

  const handleAcceptCancellation = async () => {
    if (!contract || !activeCancellation || actionLoading) return;
    if (isCancellationInitiator) {
      showErrorToast("You cannot accept your own cancellation request. You may only withdraw it.");
      return;
    }
    const confirmed = window.confirm(
      "Are you sure you want to accept mutual cancellation? Held escrow for uncompleted milestones will be refunded to the client. Completed milestone earnings are retained by the freelancer. This action is final."
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/api/contracts/${contract.id}/cancellation-request/${activeCancellation.request_id}/respond`, {
        action: "accept"
      });
      showSuccessToast(res.data?.message || "Mutual cancellation accepted. Unfinished escrow has been refunded.");
      await fetchContractData();
    } catch (err: any) {
      console.error("Failed to accept cancellation:", err);
      showErrorToast(err?.response?.data?.message || "Failed to accept cancellation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineCancellation = async () => {
    if (!contract || !activeCancellation || actionLoading) return;
    if (isCancellationInitiator) {
      showErrorToast("You cannot decline your own cancellation request.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/api/contracts/${contract.id}/cancellation-request/${activeCancellation.request_id}/respond`, {
        action: "decline",
        declineReason: declineReason.trim() || undefined
      });
      showSuccessToast(res.data?.message || "Cancellation request declined. The contract remains active.");
      setDeclineModalOpen(false);
      setDeclineReason("");
      await fetchContractData();
    } catch (err: any) {
      console.error("Failed to decline cancellation:", err);
      showErrorToast(err?.response?.data?.message || "Failed to decline cancellation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawCancellation = async () => {
    if (!contract || !activeCancellation || actionLoading) return;
    if (!isCancellationInitiator) {
      showErrorToast("Only the party who initiated the cancellation request can withdraw it.");
      return;
    }
    const confirmed = window.confirm("Are you sure you want to withdraw your cancellation request? The contract will remain active.");
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/api/contracts/${contract.id}/cancellation-request/${activeCancellation.request_id}/withdraw`);
      showSuccessToast(res.data?.message || "Cancellation request withdrawn.");
      await fetchContractData();
    } catch (err: any) {
      console.error("Failed to withdraw cancellation request:", err);
      showErrorToast(err?.response?.data?.message || "Failed to withdraw cancellation request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMilestoneAction = async (action: "cancel" | "approve" | "extend" | "revision", milestone: MilestoneItem) => {
    if (!contract || milestoneLoading) return;
    if (action === "cancel" && !milestone.id) {
      setCancellationReason("Mutual agreement to end project");
      setCancellationMessage("");
      setCancellationModalOpen(true);
      return;
    }
    setMilestoneLoading(true);
    try {
      const body = action === "extend" ? { extensionDays } : {};
      const url = action === "extend"
        ? `/api/contracts/${contract.id}/extend`
        : `/api/contracts/${contract.id}/milestones/${milestone.id}/${action}`;
      await api.post(url, body);
      showSuccessToast(
        action === "extend"
          ? `Milestone deadline extended by ${extensionDays} days`
          : action === "cancel"
          ? "Milestone cancelled and escrow refunded to your wallet."
          : action === "approve"
          ? "Milestone approved and credits released."
          : "Milestone revision requested."
      );
      await fetchContractData();
      setMilestoneAction(null);
    } catch (err: any) {
      console.error(`Milestone ${action} failed:`, err);
      showErrorToast(err?.response?.data?.message || `Failed to ${action} milestone. Please try again.`);
    } finally {
      setMilestoneLoading(false);
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    let color = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    if (status === "Active") color = "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30";
    else if (status === "Waiting") color = "bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
    else if (status === "Closed" || status === "Done") color = "bg-purple-50 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400 border-purple-200 dark:border-purple-500/30";
    else if (status === "Cancelled") color = "bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-500/30";

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs ${color}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${status === "Active" ? "bg-emerald-500 animate-pulse" : status === "Cancelled" ? "bg-rose-500" : "bg-current"}`} />
        {status}
      </span>
    );
  };

  const isClient = user?.account_id === contract?.clientAccountId;
  const isFreelancer = user?.account_id === contract?.freelancerAccountId;

  const claimedCount = (contract?.milestones || []).filter((m) => m.status === "Claimed").length;
  const totalMilestones = contract?.milestones.length || 0;
  const completionPercent = totalMilestones > 0 ? Math.round((claimedCount / totalMilestones) * 100) : 0;

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base text-zinc-900 dark:text-zinc-100 font-['Plus_Jakarta_Sans'] pb-20 print:min-h-0 print:bg-white print:dark:bg-white print:text-black print:dark:text-black print:p-0 print:m-0">
      <div className="print:hidden">
        <UserHeader pageTitle="Contract Details" />
        {!isGuestMode && !isVerified && <UnverifiedOverlay featureName="contracts" />}
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6 print:max-w-none print:w-full print:p-0 print:m-0 print:space-y-0">
        {/* Awaiting Escrow Banner for Waiting Status */}
        {contract?.status === "Waiting" && (
          <div className="rounded-2xl border p-4 sm:p-5 shadow-xs overflow-hidden transition-all bg-blue-50/70 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{isClient ? "Awaiting Your Escrow Funding" : "Awaiting Client Escrow Funding"}</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {isClient
                    ? "The specialist has accepted your order specifications! Authorize and fund escrow to officially activate this agreement and launch the collaborative project workspace."
                    : "You have accepted this order! The contract is currently waiting for the client to fund escrow. Delivery milestone countdown begins once escrow is locked."}
                </p>
              </div>

              {isClient && contract.orderId && (
                <button
                  type="button"
                  onClick={() => navigate(`/gigs/orders/sent/${contract.orderId}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
                >
                  <CreditIcon className="w-4 h-4" />
                  <span>Fund Escrow &amp; Start Workspace</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top Breadcrumb Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-dark-surface/80 border border-zinc-200/90 dark:border-white/10 rounded-2xl p-2.5 sm:px-4 shadow-xs print:hidden">
          {/* Left: Breadcrumbs + ID */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => navigate("/contracts")}
              className="inline-flex items-center gap-1.5 font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4 text-blue-500" />
              <span>Contracts</span>
            </button>
            <span className="text-zinc-300 dark:text-zinc-700 font-light">/</span>
            <button
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 py-1 px-2 rounded-md hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              title="Click to copy Contract ID"
            >
              <img
                src="/ensemble_lg.svg"
                alt="Ensemble"
                className="h-3.5 w-3.5 object-contain invert dark:invert-0 shrink-0"
              />
              <span>CTR-{id?.slice(0, 8)}</span>
              <Copy className="w-3 h-3 text-zinc-400" />
              {copiedId && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-0.5">
                  Copied!
                </span>
              )}
            </button>
          </div>

          {/* Right: View Toggle + Actions */}
          {contract && (
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              {/* View Workspace / Tasks Action Button */}
              {contract.teamId ? (
                <button
                  type="button"
                  onClick={() => navigate(`/team-project/${contract.teamId}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs hover:shadow active:scale-95"
                  title="Open Project Workspace"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Open Workspace</span>
                </button>
              ) : contract.status === "Active" ? (
                <button
                  type="button"
                  onClick={() => navigate(isFreelancer ? `/dashboard/tasks/${contract.id}` : `/dashboard/review/${contract.id}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs hover:shadow active:scale-95"
                  title={isFreelancer ? "Open Task Delivery Workspace" : "Open Progress & Milestone Review"}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isFreelancer ? "View Tasks" : "View Progress"}</span>
                </button>
              ) : ["done", "closed", "completed"].includes(contract.status?.toLowerCase()) ? (
                <button
                  type="button"
                  onClick={() => navigate(isFreelancer ? `/dashboard/tasks/${contract.id}` : `/dashboard/review/${contract.id}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-bold transition shadow-xs hover:shadow active:scale-95"
                  title={isFreelancer ? "View Completed Task Workspace & Deliverables" : "View Progress History & Deliverables"}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isFreelancer ? "View Task History" : "View Progress History"}</span>
                </button>
              ) : null}

              {/* Print / Save PDF (Only visible when viewing Paper View) */}
              {viewMode === "paper" && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/90 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-xs font-bold transition shadow-2xs hover:shadow-xs active:scale-95"
                  title="Print or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Print / PDF</span>
                </button>
              )}

              {/* Segmented View Mode Switcher with animated sliding pill */}
              <div className="inline-flex items-center rounded-xl bg-zinc-100/90 dark:bg-white/5 border border-zinc-200/90 dark:border-white/10 p-1 relative shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode("workspace")}
                  className={`relative px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors duration-200 flex items-center gap-1.5 z-10 ${
                    viewMode === "workspace"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {viewMode === "workspace" && (
                    <motion.div
                      layoutId="activeContractViewModePill"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-dark-surface shadow-xs border border-zinc-200/80 dark:border-white/10 z-[-1]"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Workspace</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("paper")}
                  className={`relative px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors duration-200 flex items-center gap-1.5 z-10 ${
                    viewMode === "paper"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {viewMode === "paper" && (
                    <motion.div
                      layoutId="activeContractViewModePill"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-dark-surface shadow-xs border border-zinc-200/80 dark:border-white/10 z-[-1]"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Paper View</span>
                </button>
              </div>

              {/* More Actions Dropdown Menu */}
              <div className="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition shadow-2xs"
                  title="More contract actions"
                >
                  <MoreHorizontal className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <span>Actions</span>
                </button>

                {actionsMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-dark-surface p-1.5 shadow-xl z-50 animate-fade-in space-y-0.5">
                    <button
                      onClick={() => {
                        handleCopyId();
                        setActionsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                    >
                      <Copy className="w-4 h-4 text-zinc-400" />
                      <span>Copy Full Contract ID</span>
                    </button>

                    <button
                      onClick={() => {
                        setActionsMenuOpen(false);
                        if (contract.teamId) {
                          navigate(`/team-project/${contract.teamId}`);
                        } else {
                          navigate(isFreelancer ? `/dashboard/tasks/${contract.id}` : `/dashboard/review/${contract.id}`);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                    >
                      <ExternalLink className="w-4 h-4 text-zinc-400" />
                      <span>
                        {contract.teamId
                          ? "Open Project Workspace"
                          : contract.status === "Active"
                          ? (isFreelancer ? "Open Task Delivery Workspace" : "Open Progress & Review")
                          : (isFreelancer ? "View Task History" : "View Progress History")}
                      </span>
                    </button>

                    {contract.status === "Active" && !activeCancellation && !contract.activeDispute && (
                      <button
                        onClick={() => {
                          setActionsMenuOpen(false);
                          setCancellationReason("Mutual agreement to end project");
                          setCancellationMessage("");
                          setCancellationModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                      >
                        <Ban className="w-4 h-4 text-zinc-400" />
                        <span>Request Cancellation</span>
                      </button>
                    )}

                    <div className="border-t border-zinc-100 dark:border-white/5 my-1" />

                    {contract.activeDispute ? (
                      <button
                        onClick={() => {
                          setActionsMenuOpen(false);
                          navigate(contract.activeDispute?.visibility
                            ? `/disputes/${contract.activeDispute.id}`
                            : "/contracts/disputes");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        <span>View active dispute</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setActionsMenuOpen(false);
                          navigate(`/contracts/dispute-form?contractId=${contract.id}`);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        <span>Report a Dispute</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-44 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 p-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 h-96 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 p-6" />
              <div className="h-96 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 p-6" />
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Contract Error</h3>
            <p className="text-sm text-rose-700 dark:text-rose-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => navigate("/contracts")}
              className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold shadow hover:opacity-90 transition"
            >
              Return to Contracts List
            </button>
          </div>
        )}

        {/* Main Contract Document Content */}
        {!loading && contract && (
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {viewMode === "workspace" ? (
                <div className="space-y-6">
            {/* Mutual Cancellation Pending Banner */}
            {activeCancellation && activeCancellation.status === "pending" && (
              <div className="rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/30 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                          Mutual Contract Cancellation Requested
                        </h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                          Pending Response
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1">
                        {isCancellationInitiator
                          ? "You requested mutual cancellation. The other party has 72 hours to respond."
                          : `${activeCancellation.initiator_name || (activeCancellation.initiator_role === "client" ? "Client" : "Freelancer")} requested to cancel this contract mutually.`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[11px] font-mono font-semibold text-amber-900 dark:text-amber-200 block">
                      Auto-resolves: {new Date(activeCancellation.auto_cancel_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5 inline-block">
                      ⏱ {formatRemainingTime(activeCancellation.auto_cancel_at)}
                    </span>
                  </div>
                </div>

                {/* Stated Reason & Message */}
                <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-white/80 dark:bg-black/30 p-3.5 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-amber-700 dark:text-amber-400 block font-semibold">Stated Reason</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeCancellation.reason}</span>
                  </div>
                  {activeCancellation.message && (
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-amber-700 dark:text-amber-400 block font-semibold">Message from Initiator</span>
                      <p className="text-zinc-700 dark:text-zinc-300 italic whitespace-pre-wrap">{activeCancellation.message}</p>
                    </div>
                  )}
                </div>

                {/* Response / Withdraw Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  {isCancellationInitiator ? (
                    <button
                      type="button"
                      onClick={handleWithdrawCancellation}
                      disabled={actionLoading}
                      className="rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition shadow-2xs disabled:opacity-50"
                    >
                      {actionLoading ? "Processing..." : "Withdraw Request"}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDeclineReason("");
                          setDeclineModalOpen(true);
                        }}
                        disabled={actionLoading}
                        className="rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition shadow-2xs disabled:opacity-50"
                      >
                        Decline Request
                      </button>
                      <button
                        type="button"
                        onClick={handleAcceptCancellation}
                        disabled={actionLoading || Boolean(contract.activeDispute)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                      >
                        {actionLoading ? "Processing..." : "Accept Cancellation & Refund Escrow"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {contract.activeDispute ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 shadow-sm dark:border-rose-500/40 dark:bg-rose-500/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
                  <div>
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-100">This contract is under dispute</p>
                    <p className="mt-1 text-xs text-rose-800 dark:text-rose-200">
                      Remaining escrow is frozen. Credits cannot be released or refunded until staff close the case.
                      {contract.activeDispute.visibility
                        ? (contract.activeDispute.number
                          ? ` Dispute ${contract.activeDispute.number} is open to both parties.`
                          : " This dispute is open to both parties.")
                        : " You filed this dispute. Add more information for staff until they open it to the other party."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(contract.activeDispute?.visibility
                    ? `/disputes/${contract.activeDispute.id}`
                    : "/contracts/disputes")}
                  className="shrink-0 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  View dispute
                </button>
              </div>
            ) : null}

            {/* Contract Hero Header & Financial Summary */}
            <div className={`rounded-2xl border bg-white dark:bg-dark-surface p-6 sm:p-8 shadow-sm space-y-6 ${
              contract.activeDispute
                ? "border-rose-300 dark:border-rose-500/40"
                : "border-zinc-200 dark:border-white/10"
            }`}>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-white/10">
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {contract.activeDispute ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40">
                        Under dispute
                      </span>
                    ) : null}
                    {getStatusBadge(contract.status)}
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                      {contract.contractType === "Gig"
                        ? `Gig Contract (Tier: ${contract.targetMilestoneTitle || "Selected Tier"})`
                        : `Job Contract (${contract.jobHiringType === "multiple" || contract.targetMilestoneTitle ? "Team Milestone Job" : "Individual Freelancer Job"})`
                      }
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Fixed Price Escrow
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight break-words [overflow-wrap:anywhere]">
                    {contract.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      Created: <strong className="text-zinc-700 dark:text-zinc-300">{new Date(contract.dateCreated).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</strong>
                    </span>
                    {contract.dateStarted && (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Clock className="w-4 h-4" />
                        Started: {new Date(contract.dateStarted).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    )}
                    {contract.dueDate && (
                      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                        <Calendar className="w-4 h-4" />
                        Due: {new Date(contract.dueDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Total Value & Platform Fee Card */}
                <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] p-4 min-w-[260px] shrink-0 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Value</span>
                    <div className="flex items-center gap-1.5 font-extrabold text-lg text-zinc-900 dark:text-white">
                      <CreditIcon className="w-5 h-5 text-amber-500" />
                      <span>{contract.totalValueCredits.toLocaleString()}</span>
                      <span className="text-xs font-semibold text-zinc-500">Credits</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs border-t border-zinc-200 dark:border-white/10 pt-2.5 font-mono">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Client Range:</span>
                      <span className="font-semibold">{contract.clientRange}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Platform Fee (10%):</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">- {Math.floor(contract.totalValueCredits * 0.1).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 border-t border-zinc-200 dark:border-white/10 pt-1.5">
                      <span>Net Payout:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{Math.floor(contract.totalValueCredits * 0.9).toLocaleString()} Credits</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-white/10 pt-1.5">
                      <span>Additional Work Rate:</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{contract.addOnRate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Summary Strip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    Milestone Progress Overview
                  </span>
                  <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {claimedCount} of {totalMilestones} Completed ({completionPercent}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300/60 dark:border-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      completionPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2-Column Document Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Scope of Work, Deliverables, and Milestones (2 cols) */}
              <div className="lg:col-span-2 space-y-6 min-w-0">
                {/* SECTION I: SCOPE OF WORK & DELIVERABLES */}
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                      <h2 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                        I. Scope of Work & Deliverables
                      </h2>
                    </div>
                    {contract.jobId && (
                      <a
                        href={`/jobs/postings/${contract.jobId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Original Job Post <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Designated Role Banner (for Team Jobs or Gig Tiers) */}
                  {(contract.targetMilestoneTitle || contract.jobHiringType === "multiple") && (
                    <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/70 dark:bg-purple-950/20 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
                        <Users className="w-4 h-4" />
                        <span>Assigned Milestone Role</span>
                      </div>
                      <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                        {contract.targetMilestoneTitle || "Designated Team Role"}
                      </h3>
                      {contract.targetMilestoneDescription && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          {contract.targetMilestoneDescription}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Deliverables / Tasks Checklist */}
                  {contract.targetMilestoneTasks && contract.targetMilestoneTasks.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <ListTodo className="w-4 h-4 text-blue-500" />
                          Role Deliverables & Tasks Checklist ({contract.targetMilestoneTasks.length})
                        </h4>
                        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                          {claimedCount === totalMilestones ? "All Deliverables Completed" : "In Progress"}
                        </span>
                      </div>

                      <div className="grid gap-2">
                        {contract.targetMilestoneTasks.map((task: string, tIdx: number) => (
                          <div
                            key={tIdx}
                            className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.02] shadow-2xs"
                          >
                            <div className="mt-0.5 p-1 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
                              {task}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Project Description */}
                  <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Full Project Description
                    </span>
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans break-words [overflow-wrap:anywhere] max-w-full">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed break-words [overflow-wrap:anywhere]" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-zinc-900 dark:text-white break-words" {...props} />,
                          em: ({ node, ...props }) => <em className="italic break-words" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 my-2 space-y-1 break-words" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 my-2 space-y-1 break-words" {...props} />,
                          li: ({ node, ...props }) => <li className="pl-1 leading-relaxed break-words [overflow-wrap:anywhere]" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-sm font-bold text-zinc-900 dark:text-white mt-3 mb-1 break-words" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-xs font-bold text-zinc-900 dark:text-white mt-2.5 mb-1 break-words" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-zinc-900 dark:text-white mt-2 mb-1 break-words" {...props} />,
                        }}
                      >
                        {contract.jobDescription || ''}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Add-on Work Rate */}
                  <div className="flex items-center justify-between text-xs font-medium pt-3 border-t border-zinc-200 dark:border-white/10">
                    <span className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Additional Work Rate (Set by Freelancer)</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">{contract.addOnRate}</span>
                  </div>

                  {/* Specialist Terms of Service */}
                  <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-white/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      Specialist Terms of Service ({contract.freelancerTosTitle || "Standard Terms"})
                    </span>
                    <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {contract.freelancerTosContent || "Standard platform service terms apply to this agreement. All deliverables shall be provided in accordance with agreed milestone specifications and quality standards."}
                    </div>
                  </div>
                </div>

                {/* SECTION II: LOCKED MILESTONES & SCHEDULE */}
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                      <h2 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                        II. Locked Milestones & Timeline
                      </h2>
                    </div>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {totalMilestones} {totalMilestones === 1 ? "Milestone" : "Milestones"}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 dark:bg-white/[0.04] border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3 text-center w-10">#</th>
                          <th className="px-4 py-3">Milestone Name</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-center">Revisions</th>
                          <th className="px-4 py-3">Deadline</th>
                          <th className="px-4 py-3 text-right">Credits</th>
                          {isClient && contract.status === "Active" && (
                            <th className="px-4 py-3 text-right">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-white/5 text-zinc-700 dark:text-zinc-300 font-medium">
                        {contract.milestones.map((m, idx) => (
                          <tr key={m.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3 text-center font-bold text-zinc-400">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-zinc-900 dark:text-white block">{m.name}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                m.status === "Claimed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                                  : m.status === "In Progress"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30"
                                  : m.status === "Under Review"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
                                  : m.status === "Cancelled"
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30"
                                  : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                              }`}>
                                {m.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono">{m.revisions}</td>
                            <td className="px-4 py-3 font-mono text-[11px]">{m.deadline}</td>
                            <td className="px-4 py-3 text-right font-extrabold text-zinc-900 dark:text-white font-mono">
                              {m.credits.toLocaleString()}
                            </td>
                            {isClient && contract.status === "Active" && (
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {m.status === "Under Review" && (
                                    <>
                                      <button
                                        onClick={() => handleMilestoneAction("approve", m)}
                                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition shadow-2xs"
                                        title="Approve deliverable and release escrow"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleMilestoneAction("revision", m)}
                                        className="px-2 py-1 rounded border border-amber-300 dark:border-amber-500/30 bg-amber-50 text-amber-800 text-[10px] font-bold hover:bg-amber-100 transition shadow-2xs"
                                        title="Request revision"
                                      >
                                        Revision
                                      </button>
                                    </>
                                  )}
                                  {m.status !== "Claimed" && m.status !== "Cancelled" && (
                                    <button
                                      onClick={() => {
                                        setMilestoneAction({ type: "extend", milestoneId: m.id, milestoneName: m.name });
                                        setExtensionDays(3);
                                      }}
                                      className="p-1 rounded text-zinc-400 hover:text-blue-500 transition"
                                      title="Extend deadline"
                                    >
                                      <CalendarPlus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION III: PROJECT TEAM & SUBCONTRACTS */}
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                          III. Project Team &amp; Subcontracts
                        </h2>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Creative specialists collaborating on this contract. The lead contractor can allocate and transfer funds upon milestone completion.
                      </p>
                    </div>

                    {canManageTeam && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEditor(null);
                            setMemberSearchQuery("");
                            setEditorRole("Video Editor");
                            setEditorAgreedCredits("");
                            setEditorNotes("");
                            setAddMemberModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-white/5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 transition shadow-2xs"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Editor
                        </button>
                        <button
                          type="button"
                          disabled={
                            teamMembers.length === 0 ||
                            (teamBudget?.remaining_distributable_credits || 0) <= 0
                          }
                          onClick={() => {
                            const init: Record<string, string> = {};
                            teamMembers.forEach((m) => {
                              if (m.agreed_credits && m.agreed_credits > m.total_received_credits) {
                                init[m.account_id] = String(m.agreed_credits - m.total_received_credits);
                              } else {
                                init[m.account_id] = "";
                              }
                            });
                            setAllocations(init);
                            setDistributionNote("");
                            setDistributeModalOpen(true);
                          }}
                          title={
                            (teamBudget?.remaining_distributable_credits || 0) <= 0
                              ? "No released contract earnings available to distribute yet."
                              : "Distribute contract earnings to your team members"
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Distribute Funds
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Fund Allocation Budget Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] p-3 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Total Contract</span>
                      <span className="font-extrabold text-sm text-zinc-900 dark:text-white font-mono mt-0.5 block">
                        {(teamBudget?.total_rate_credits || contract.totalValueCredits || 0).toLocaleString()} Cr
                      </span>
                    </div>

                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.04] p-3 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Released to Lead</span>
                      <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 block">
                        {(teamBudget?.released_credits || 0).toLocaleString()} Cr
                      </span>
                    </div>

                    <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/[0.04] p-3 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">Paid to Team</span>
                      <span className="font-extrabold text-sm text-purple-700 dark:text-purple-300 font-mono mt-0.5 block">
                        {(teamBudget?.distributed_credits || 0).toLocaleString()} Cr
                      </span>
                    </div>

                    <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/[0.04] p-3 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Distributable Pool</span>
                      <span className="font-extrabold text-sm text-blue-700 dark:text-blue-300 font-mono mt-0.5 block">
                        {(teamBudget?.remaining_distributable_credits || 0).toLocaleString()} Cr
                      </span>
                    </div>
                  </div>

                  {/* Team Members List */}
                  {teamLoading ? (
                    <div className="py-8 flex items-center justify-center text-xs text-zinc-400">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading project team…
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/10 p-6 text-center space-y-2">
                      <Users className="w-8 h-8 text-zinc-400 mx-auto" />
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        No additional video editors assigned under this contract yet.
                      </p>
                      <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                        {canManageTeam
                          ? "As the lead contractor, you can add editors to collaborate under this contract and allocate earnings to them when milestones complete."
                          : "The contractor has not added any sub-editors to this contract."}
                      </p>
                      {canManageTeam && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEditor(null);
                            setMemberSearchQuery("");
                            setEditorRole("Video Editor");
                            setEditorAgreedCredits("");
                            setEditorNotes("");
                            setAddMemberModalOpen(true);
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Video Editor
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/10">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-zinc-50 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/10 font-bold uppercase text-[10px] text-zinc-500">
                            <tr>
                              <th className="px-4 py-3">Team Member</th>
                              <th className="px-4 py-3">Contract Role</th>
                              <th className="px-4 py-3 text-right">Agreed Target</th>
                              <th className="px-4 py-3 text-right">Paid to Date</th>
                              {canManageTeam && <th className="px-4 py-3 text-center w-12">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 dark:divide-white/5 text-zinc-700 dark:text-zinc-300">
                            {teamMembers.map((member) => (
                              <tr key={member.account_id} className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {member.avatar_url ? (
                                      <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                                    ) : (
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                                        {(member.display_name || member.handle || "U")[0].toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-zinc-900 dark:text-white truncate">{member.display_name}</p>
                                      <p className="text-[11px] text-zinc-400">@{member.handle}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30">
                                    {member.role_title}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                  {member.agreed_credits !== null ? (
                                    <span className="font-semibold">{member.agreed_credits.toLocaleString()} Cr</span>
                                  ) : (
                                    <span className="text-zinc-400 italic">Flexible</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                  <span className={`font-bold ${member.total_received_credits > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                                    {member.total_received_credits.toLocaleString()} Cr
                                  </span>
                                </td>
                                {canManageTeam && (
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMember(member.account_id, member.handle)}
                                      className="p-1 rounded text-zinc-400 hover:text-red-500 transition"
                                      title="Remove from contract team"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Payout History Toggle */}
                      {distributions.length > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setHistoryOpen(!historyOpen)}
                            className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                          >
                            {historyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            <span>Past Distributions ({distributions.length})</span>
                          </button>

                          {historyOpen && (
                            <div className="mt-2 space-y-2">
                              {distributions.map((dist) => (
                                <div
                                  key={dist.distribution_id}
                                  className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.01] p-3 text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-zinc-900 dark:text-white">
                                      Transferred to <span className="text-blue-600 dark:text-blue-400">@{dist.recipient_handle}</span>
                                    </p>
                                    <p className="text-[11px] text-zinc-400">
                                      {new Date(dist.created_at).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      {dist.notes && ` • "${dist.notes}"`}
                                    </p>
                                  </div>
                                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    +{dist.amount_credits.toLocaleString()} Credits
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Parties Involved & Escrow Policy (1 col) */}
              <div className="space-y-6 min-w-0">
                {/* PARTIES INVOLVED CARD */}
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-white/10 pb-3">
                    Parties Involved
                  </h3>

                  {/* Client Card */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02]">
                    <img
                      src={contract.clientAvatar || getFallbackAvatarUrl(contract.clientName)}
                      alt={contract.clientName}
                      className="h-10 w-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = getFallbackAvatarUrl(contract.clientName);
                        if (target.src !== fallback) target.src = fallback;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
                        Client (Hirer)
                      </span>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {contract.clientName}
                      </p>
                    </div>
                    {contract.clientAccountId && (
                      <button
                        onClick={() => navigate(`/profile/${contract.clientAccountId}`)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        Profile
                      </button>
                    )}
                  </div>

                  {/* Freelancer Card */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02]">
                    <img
                      src={contract.freelancerAvatar || getFallbackAvatarUrl(contract.freelancerName)}
                      alt={contract.freelancerName}
                      className="h-10 w-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = getFallbackAvatarUrl(contract.freelancerName);
                        if (target.src !== fallback) target.src = fallback;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 block">
                        Freelancer (Contractor)
                      </span>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {contract.freelancerName}
                      </p>
                    </div>
                    {contract.freelancerAccountId && (
                      <button
                        onClick={() => navigate(`/profile/${contract.freelancerAccountId}`)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        Profile
                      </button>
                    )}
                  </div>
                </div>

                {/* ACTIVE MILESTONE TIMER COUNTDOWN */}
                <ActiveMilestoneTimerCard
                  milestones={contract.milestones}
                  contractStatus={contract.status}
                  contractDateStarted={contract.dateStarted}
                  contractDueDate={contract.dueDate}
                  isClient={isClient}
                  isFreelancer={isFreelancer}
                />

                {/* WORKFLOW & OPERATIONAL TERMS CARD */}
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      Workflow & Operational Terms
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* 1. Client initiates project */}
                    <div className="flex items-start gap-3">
                      {contract.initiatorRole === "Client" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">
                          Client initiates the project?
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {contract.initiatorRole === "Client"
                            ? "Yes, the client will create the project upon hiring."
                            : "No, the freelancer is expected to create the project."}
                        </p>
                      </div>
                    </div>

                    {/* 2. Client linked existing project */}
                    <div className="flex items-start gap-3">
                      {contract.isExistingProject ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">
                          Client linked an existing project?
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {contract.isExistingProject
                            ? "Yes, a project is already prepared for this job."
                            : "No, a project has not been linked yet."}
                        </p>
                      </div>
                    </div>

                    {/* 3. Require NDA */}
                    <div className="flex items-start gap-3">
                      {contract.requireNDA ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">
                          Require Confidentiality (NDA)?
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {contract.requireNDA
                            ? "Yes, freelancers cannot share details about this project during development."
                            : "No, a strict confidentiality agreement is not required."}
                        </p>
                      </div>
                    </div>

                    {/* 4. Allow Portfolio Use */}
                    <div className="flex items-start gap-3">
                      {contract.portfolioUseAllowed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">
                          Allow Portfolio Use?
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {contract.portfolioUseAllowed
                            ? `Yes, allowed to use output for portfolio (Up to ${contract.portfolioDuration || 60} secs).`
                            : "No, not allowed to use final output for personal portfolio."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ESCROW & DISPUTE GUARANTEE CARD */}
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-sm">
                    <img
                      src="/ensemble_lg.svg"
                      alt="Ensemble"
                      className="h-5 w-5 object-contain invert dark:invert-0 shrink-0"
                    />
                    <span>Ensemble Escrow Guarantee</span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    All contract funds are safely held in Ensemble Escrow and only released when milestones are explicitly approved by the client or auto-approved upon passing review deadlines without conflict.
                  </p>

                  <div className="space-y-2 border-t border-zinc-200 dark:border-white/10 pt-3 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>72-hour dispute and cancellation protection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Formal deliverable task verification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Transparent platform fee allocation</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PaperContractDocument contract={contract} />
        )}
      </motion.div>
    </AnimatePresence>
  )}
      </div>

      {/* EXTEND DEADLINE MODAL */}
      {milestoneAction && milestoneAction.type === "extend" && contract && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Extend Milestone Deadline
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Grant additional time for <strong>"{milestoneAction.milestoneName}"</strong>.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                Additional Days to Add
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={extensionDays}
                onChange={(e) => setExtensionDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setMilestoneAction(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMilestoneAction("extend", { id: milestoneAction.milestoneId, name: milestoneAction.milestoneName } as any)}
                disabled={milestoneLoading || extensionDays < 1}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {milestoneLoading ? "Processing..." : `Extend by ${extensionDays} Day${extensionDays > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MUTUAL CANCELLATION REQUEST MODAL */}
      {cancellationModalOpen && contract && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Request Mutual Contract Cancellation
                </h3>
              </div>
              <button onClick={() => setCancellationModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestCancellation} className="space-y-4 text-xs">
              <p className="text-zinc-600 dark:text-zinc-300">
                Requesting to mutually end <strong>"{contract.title}"</strong>. The other party will have <strong>72 hours</strong> to review and accept or decline.
              </p>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                >
                  <option value="Mutual agreement to end project">Mutual agreement to end project</option>
                  <option value="Unresponsive party">Unresponsive party</option>
                  <option value="Scope changed significantly">Scope changed significantly</option>
                  <option value="Quality not meeting agreed expectations">Quality not meeting agreed expectations</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                  Additional Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={cancellationMessage}
                  onChange={(e) => setCancellationMessage(e.target.value)}
                  placeholder="Explain why cancellation is requested..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-950/20 space-y-1 text-amber-900 dark:text-amber-300 text-[11px]">
                <span className="font-bold block">Escrow Refund Summary:</span>
                <div>• Completed milestone earnings are retained by the freelancer.</div>
                <div>• Unfinished milestone held escrow is returned to the client upon approval.</div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setCancellationModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCancellation}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {submittingCancellation ? "Submitting..." : "Send Cancellation Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DECLINE CANCELLATION MODAL */}
      {declineModalOpen && contract && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Decline Cancellation Request
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Please share why you are declining the cancellation request:
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="State your reason for declining..."
              className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeclineModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeclineCancellation}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TEAM EDITOR MODAL */}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Add Video Editor / Subcontractor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddMemberModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 text-xs">
              <p className="text-zinc-600 dark:text-zinc-300">
                Add an editor from Ensemble to collaborate under this contract. You can allocate milestone earnings to them upon completion.
              </p>

              <div>
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Search Video Editor
                </label>
                {selectedEditor ? (
                  <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 p-3">
                    <div className="flex items-center gap-3">
                      {selectedEditor.avatar_url ? (
                        <img src={selectedEditor.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                          {(selectedEditor.display_name || selectedEditor.handle || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">{selectedEditor.display_name}</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400">@{selectedEditor.handle}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEditor(null);
                        setMemberSearchQuery("");
                      }}
                      className="rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      autoComplete="off"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Search editor by username (@handle)..."
                      className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 py-2.5 pl-9 pr-10 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                    {searchingMembers && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-zinc-400" />
                    )}
                    {memberSuggestions.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 py-1 shadow-xl">
                        {memberSuggestions.map((u) => (
                          <button
                            key={u.account_id}
                            type="button"
                            onClick={() => {
                              setSelectedEditor(u);
                              setMemberSuggestions([]);
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-white/5"
                          >
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                                {(u.display_name || u.handle || "U")[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">{u.display_name}</p>
                              <p className="truncate text-[11px] text-zinc-400">@{u.handle}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Contract Role
                </label>
                <input
                  type="text"
                  required
                  value={editorRole}
                  onChange={(e) => setEditorRole(e.target.value)}
                  placeholder="e.g. Rough Cut Editor, Colorist, Sound Designer"
                  className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["Video Editor", "Rough Cut Editor", "Colorist", "Sound & Audio", "Motion Graphics", "VFX Artist", "Assistant"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setEditorRole(role)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition ${
                        editorRole === role
                          ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40"
                          : "border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Agreed Target Split (Credits) <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={editorAgreedCredits}
                  onChange={(e) => setEditorAgreedCredits(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Target compensation to allocate to this editor upon completing their deliverables.
                </span>
              </div>

              <div>
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Notes / Scope Memo <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editorNotes}
                  onChange={(e) => setEditorNotes(e.target.value)}
                  placeholder="e.g. Responsible for Episode 1 rough cut and scene transitions"
                  className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember || !selectedEditor || !editorRole.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {addingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Add to Project Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISTRIBUTE TEAM FUNDS MODAL */}
      {distributeModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Distribute Contract Funds to Team
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDistributeModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDistributeFunds} className="space-y-4 text-xs">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 block">
                    Distributable Contract Balance
                  </span>
                  <span className="text-2xl font-extrabold text-zinc-900 dark:text-white font-mono mt-0.5 block">
                    {(teamBudget?.remaining_distributable_credits || 0).toLocaleString()} Credits
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Released from contract escrow to your account wallet.
                  </span>
                </div>
                <div className="text-right text-[11px] text-zinc-400 font-mono">
                  <div>Released: {(teamBudget?.released_credits || 0).toLocaleString()} Cr</div>
                  <div>Distributed: {(teamBudget?.distributed_credits || 0).toLocaleString()} Cr</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                  Team Member Allocations
                </label>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {teamMembers.map((member) => (
                    <div
                      key={member.account_id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.01]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                            {(member.display_name || member.handle || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 dark:text-white truncate">{member.display_name}</p>
                          <p className="text-[11px] text-zinc-400">
                            @{member.handle} • <span className="text-indigo-500 font-semibold">{member.role_title}</span>
                          </p>
                          {member.agreed_credits !== null && (
                            <p className="text-[10px] text-zinc-500">
                              Target: {member.agreed_credits.toLocaleString()} Cr (Paid: {member.total_received_credits.toLocaleString()} Cr)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          placeholder="0"
                          value={allocations[member.account_id] ?? ""}
                          onChange={(e) =>
                            setAllocations({
                              ...allocations,
                              [member.account_id]: e.target.value,
                            })
                          }
                          className="w-24 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-right font-mono text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                        />
                        <span className="text-[11px] text-zinc-400">Cr</span>
                        {member.agreed_credits && member.agreed_credits > member.total_received_credits && (
                          <button
                            type="button"
                            onClick={() =>
                              setAllocations({
                                ...allocations,
                                [member.account_id]: String(member.agreed_credits! - member.total_received_credits),
                              })
                            }
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Match
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation Strip */}
              {(() => {
                const totalAllocated = Object.values(allocations).reduce(
                  (sum, v) => sum + (Number(v) || 0),
                  0
                );
                const remaining = (teamBudget?.remaining_distributable_credits || 0) - totalAllocated;
                return (
                  <div className="rounded-xl border border-zinc-200 dark:border-white/10 p-3 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-zinc-500">
                      <span>Total Payout to Team:</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{totalAllocated.toLocaleString()} Credits</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 border-t border-zinc-200 dark:border-white/5 pt-1.5">
                      <span>Lead Retained Balance:</span>
                      <span className={`font-bold ${remaining < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {remaining.toLocaleString()} Credits
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Distribution Note / Memo <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={distributionNote}
                  onChange={(e) => setDistributionNote(e.target.value)}
                  placeholder="e.g. Final deliverable milestone compensation"
                  className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setDistributeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    distributingFunds ||
                    Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0) <= 0 ||
                    Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0) >
                      (teamBudget?.remaining_distributable_credits || 0)
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {distributingFunds && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm &amp; Distribute Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Print Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, nav, aside, .print\\:hidden, button {
            display: none !important;
          }
          .custom-scrollbar::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ContractDetailsPage;
