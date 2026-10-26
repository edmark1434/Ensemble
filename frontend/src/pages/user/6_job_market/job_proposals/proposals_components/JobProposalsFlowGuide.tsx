import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, ChevronDown, HelpCircle, CheckCircle2 } from 'lucide-react';

export const JobProposalsFlowGuide: React.FC = () => {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggleFaq = (idx: number) => {
        setOpenFaq(prev => prev === idx ? null : idx);
    };

    const steps = [
        {
            num: '01',
            title: 'Discovery & Proposal Pitch',
            status: 'Pending',
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
            desc: 'Freelancers or teams discover open jobs with active countdowns and submit bids, cover letters, and milestones (10 credits submission fee).',
        },
        {
            num: '02',
            title: 'Evaluation & Shortlisting',
            status: 'Shortlisted',
            badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
            desc: 'Clients inspect incoming applicant pitches, review portfolio proof, and mark top candidates for direct messaging or negotiation.',
        },
        {
            num: '03',
            title: 'Extend Formal Offer',
            status: 'Offer Sent',
            badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            desc: 'Client approves terms and extends a formal contract offer with credits locked in escrow upfront. Proposal status displays as Offer Sent while the contract enters Waiting status.',
        },
        {
            num: '04',
            title: 'Escrow & Active Contract',
            status: 'Hired',
            badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
            desc: 'Escrow funds are deposited, an official contract workspace is launched, and milestone work proceeds under platform escrow protection.',
        },
    ];

    const jobStatuses = [
        {
            name: 'Open',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
            summary: 'Actively accepting proposals within application window',
            desc: 'Job listing is published and visible across the marketplace. A live countdown timer shows remaining intake time (12h, 24h, 3d, 7d, 14d). Freelancers and teams can submit pitches.',
        },
        {
            name: 'Closed',
            badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
            summary: 'Intake concluded; submissions locked',
            desc: 'Application window expired, positions filled, or author closed early. Submissions are locked. If closed without a hire, applicant submission fees are refunded automatically.',
        },
    ];

    const proposalStatuses = [
        {
            name: 'Pending',
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
            desc: 'Fresh submission awaiting client review in the Incoming Proposals tab.',
        },
        {
            name: 'Shortlisted',
            badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
            desc: 'Client marked this applicant as a top contender for further interview or negotiation.',
        },
        {
            name: 'Offer Sent',
            badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            desc: 'Client extended a formal contract offer with escrow locked upfront. Waiting for talent or team to review and sign.',
        },
        {
            name: 'Hired',
            badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
            desc: 'Contract activated; milestone work and escrow management underway.',
        },
        {
            name: 'Closed',
            badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
            desc: 'Job listing closed or window expired without hire. The 10-credit proposal fee is automatically refunded to wallet.',
        },
        {
            name: 'Rejected',
            badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
            desc: 'Client rejected proposal or selected other applicants for available positions.',
        },
        {
            name: 'Withdrawn',
            badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
            desc: 'Applicant voluntarily cancelled their proposal before client decision.',
        },
    ];

    const refundGuarantees = [
        {
            title: 'Client 100% Posting Fee Refund',
            amount: '50 Credits Refunded',
            desc: 'If an open job post reaches the end of its application window with 0 applicants, or if the client force-closes the job with 0 proposals, the 50-credit posting fee is immediately refunded back to the client wallet.',
        },
        {
            title: 'Applicant 100% Submission Fee Refund',
            amount: '10 Credits Per Applicant',
            desc: 'If a client allows the application window to close or expire without hiring any applicant, all submitted proposal fees (10 credits each) are returned immediately to each applicant’s wallet. Zero wasted credits on inactive clients.',
        },
        {
            title: 'Fixed Application Windows & Countdown',
            amount: '12h · 24h · 3d · 7d · 14d',
            desc: 'Every job post operates on a clear intake window with a live countdown timer. This ensures applicants know exactly when decisions will be rendered and prevents posts from hanging indefinitely.',
        },
    ];

    const hiringRulesTable = [
        {
            model: 'Solo Freelancer Hire',
            badge: 'Individual Escrow',
            escrowFlow: '100% of the contract amount is locked into the Freelancer Escrow Wallet upon offer extension. When milestones are approved, credits transfer directly to the freelancer\'s personal available wallet.',
            clientProtection: 'If the hired freelancer fails to deliver or agreement is cancelled before work begins, escrow credits return in full to the client wallet.',
            freelancerProtection: 'Funds are pre-committed before drafting begins. Milestone payout is guaranteed upon deliverable approval.',
        },
        {
            model: 'Team Hire (Team Entity)',
            badge: 'Team Leader & Team Fund',
            escrowFlow: 'Escrow is held in the Team Leader\'s Escrow Wallet. Upon client milestone approval, credits release into the Team Fund (Team Account Wallet). The Team Leader then allocates and distributes the credits to members based on assigned milestone tasks.',
            clientProtection: 'Team leader assumes centralized contractual accountability for all multi-contributor deliverables.',
            freelancerProtection: 'Internal milestone splits and payouts are managed transparently from the verified Team Fund.',
        },
        {
            model: 'Milestone Tranche Release',
            badge: 'Sequential Milestones',
            escrowFlow: 'Total contract rate is divided across sequential milestone deliverables (Phase 1, 2, 3...). Credits are released tranche-by-tranche as each deliverable passes review.',
            clientProtection: 'Credits only transfer after the client inspects and explicitly approves that specific milestone deliverable.',
            freelancerProtection: 'Client cannot arbitrarily withdraw locked milestone funds while work is actively in progress within deadline.',
        },
        {
            model: 'Revision Quota & Overages',
            badge: 'Scope Control',
            escrowFlow: 'Pre-negotiated rate multiplier (+15% to +50%) applied when revisions exceed the included quota specified in the contract agreement.',
            clientProtection: 'Contract strictly stipulates the exact number of included free revisions per phase before add-ons apply.',
            freelancerProtection: 'Protects contributors against unpaid scope creep. Requests beyond quota require explicit escrow add-on funding.',
        },
        {
            model: 'Offer Lapse & Cancellation',
            badge: 'Pre-Signature',
            escrowFlow: 'Funds remain held in client escrow while the contract offer is awaiting signature (Pending Signature).',
            clientProtection: 'Client can withdraw an unaccepted offer at any time with an instant 100% escrow balance refund.',
            freelancerProtection: 'Full autonomy to accept or decline. Offers never bind automatically and carry zero penalties for declining.',
        },
    ];

    const faqs = [
        {
            q: 'How does escrow payout differ between Solo Freelancers and Teams?',
            a: 'For Solo Freelancers, client escrow transfers to the freelancer\'s individual escrow wallet and releases directly into their personal wallet upon milestone approval. For Teams, the contract offer is directed to the Team Leader\'s escrow wallet. Upon client milestone approval, the funds release into the Team Fund (the team\'s shared account balance), where the Team Leader allocates and disburses the credits to contributing team members according to their agreed milestone split.',
        },
        {
            q: 'Where does accepting (hiring a proposal) start and end in the job lifecycle?',
            a: 'Accepting starts immediately as soon as the first proposal is submitted—clients do not need to wait for the 3-day or 7-day application window to run out before making an offer. Accepting ends either when all available hire seats are filled (which automatically closes the job) or when the application intake deadline expires without a hire.',
        },
        {
            q: 'What happens if I submit a proposal and the client never accepts anyone before the window closes?',
            a: 'If the application window expires without any candidate being hired, the job automatically transitions to Closed, and all active proposals on that job are marked as Closed. You are protected by our 100% Submission Fee Refund Guarantee: your 10 Credits proposal fee is automatically credited back to your wallet with an in-app confirmation notification.',
        },
        {
            q: 'If I receive a contract offer, is there a time limit to answer, and will it ever automatically accept?',
            a: 'A contract offer will NEVER automatically accept. A contract legally and operationally requires your explicit review and manual confirmation ("Acknowledge & Accept Offer"). The offer remains pending while the job post is active; if the client withdraws the offer, hires another candidate, or the listing expires, the pending offer will simply lapse.',
        },
        {
            q: 'Will I receive any penalty or strike if I decline or don’t accept a contract offer?',
            a: 'Zero penalty. Freelancers and teams maintain full autonomy over their working agreements. If you decline an offer—whether due to schedule, scope, or rate disagreements—there is no deduction from your Performance Merit Score, no account warnings, and no strikes. The client’s escrow hold is simply refunded back to their wallet.',
        },
        {
            q: 'What happens if a client extends offers to multiple candidates at the same time?',
            a: 'Clients must fund escrow upfront for every offer extended. For Single-Hire jobs (1 hire), acceptance is protected by atomic database locks: the first candidate to accept claims the position, auto-closing the post. If another candidate subsequently tries to accept, the system politely blocks it, cancels the pending contract, and automatically refunds the client’s unused escrow hold. For Multi-Hire jobs, each candidate who accepts is assigned a separate active contract until the hire quota is met.',
        },
        {
            q: 'If my proposal was rejected by the client, do I get my credits refunded?',
            a: 'If the job expires or is cancelled without ANY hire made, all applicants receive a 100% refund of their 10 Credits submission fee. However, if the client actively reviewed proposals and selected another applicant, the submission fee is consumed as the application cost of pitching for that opportunity.',
        },
        {
            q: 'What is the lifecycle progression from "Offer Sent" to "Hired"?',
            a: 'When a client extends a formal contract offer, the proposal is marked as "Offer Sent" and the corresponding contract enters "Waiting" status (with the client’s credits safely locked in platform escrow). The proposal transitions to "Hired" and the contract becomes "Active" only when the freelancer or team explicitly accepts and signs the contract.',
        },
        {
            q: 'Can a contract start date be set in the past or yesterday?',
            a: 'No. Contract start dates can never be set in the past. The platform enforces a strict minimum of Now across the datepicker and backend controllers. Work begins either immediately upon hire or is scheduled for an agreed future date.',
        },
    ];

    return (
        <div className="space-y-6 w-full animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Header */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Job Proposals Workflow &amp; Status Guide
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1.5 leading-relaxed max-w-4xl">
                    Comprehensive overview of proposal pitch cycles, application intake windows, listing statuses (Open vs Closed), hiring rules, and platform automated refund guarantees.
                </p>
            </div>

            {/* 4 Steps Linear Pipeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {steps.map((s) => (
                    <div 
                        key={s.num}
                        className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 text-xs font-mono font-bold flex items-center justify-center border border-gray-200 dark:border-white/10">
                                    {s.num}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${s.badgeClass}`}>
                                    {s.status}
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
                                {s.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                                {s.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Job Listing Statuses: Open vs Closed */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                        Job Listing Statuses (Open vs Closed)
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        All job postings operate strictly in one of two states to maintain clarity and transparency.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {jobStatuses.map((js) => (
                        <div
                            key={js.name}
                            className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.01] space-y-2.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${js.badgeClass}`}>
                                    {js.name}
                                </span>
                                <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                                    {js.summary}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                                {js.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Application Window & Automated Refund Guarantees */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                        Application Windows &amp; Automatic Refund Guarantees
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Built-in escrow and fee protections safeguarding both clients and applicants against abandoned or inactive postings.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {refundGuarantees.map((rg) => (
                        <div
                            key={rg.title}
                            className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.01] flex flex-col justify-between space-y-3"
                        >
                            <div>
                                <span className="inline-block px-2 py-0.5 rounded border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 text-[10px] font-mono font-bold mb-2">
                                    {rg.amount}
                                </span>
                                <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                                    {rg.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">
                                    {rg.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Proposal Lifecycle Statuses */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Proposal Lifecycle Statuses
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Understanding proposal states from initial submission to contract execution or closure.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {proposalStatuses.map((st) => (
                        <div key={st.name} className="flex items-start gap-3 p-2.5 rounded-xl border border-gray-200/60 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.01]">
                            <span className={`w-28 shrink-0 font-bold px-2 py-0.5 rounded text-center border text-[11px] uppercase ${st.badgeClass}`}>
                                {st.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                                {st.desc}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hiring Rules & Escrow Mechanisms - Crisp Table Format */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                        Hiring Rules &amp; Escrow Protections
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Detailed breakdown of escrow funding, deliverable release triggers, and mutual safeguards for solo freelancers and teams.
                    </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                                <th className="py-3 px-4 w-48">Hiring Model / Policy</th>
                                <th className="py-3 px-4 w-64">Escrow Mechanism &amp; Flow</th>
                                <th className="py-3 px-4">Client Protection</th>
                                <th className="py-3 px-4">Contributor Protection</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {hiringRulesTable.map((row) => (
                                <tr key={row.model} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <td className="py-3.5 px-4 align-top">
                                        <div className="font-bold text-gray-900 dark:text-white text-xs mb-1">
                                            {row.model}
                                        </div>
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300">
                                            {row.badge}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 align-top text-gray-600 dark:text-zinc-300 leading-relaxed">
                                        {row.escrowFlow}
                                    </td>
                                    <td className="py-3.5 px-4 align-top text-gray-500 dark:text-zinc-400 leading-relaxed">
                                        <div className="flex items-start gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                                            <span>{row.clientProtection}</span>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4 align-top text-gray-500 dark:text-zinc-400 leading-relaxed">
                                        <div className="flex items-start gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                                            <span>{row.freelancerProtection}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Collapsible FAQ Section */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300">
                            <HelpCircle className="w-4 h-4" />
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                                Questions &amp; Answers
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                Common questions about proposal lifecycles, team fund disbursements, contract offers, and credit refunds.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq !== null ? null : 0)}
                        className="text-xs font-semibold text-gray-700 hover:text-black dark:text-zinc-300 dark:hover:text-white underline cursor-pointer"
                    >
                        {openFaq !== null ? 'Collapse All' : 'Expand Top Question'}
                    </button>
                </div>

                <div className="space-y-2.5 pt-1">
                    {faqs.map((faq, idx) => {
                        const isOpen = openFaq === idx;
                        return (
                            <div
                                key={idx}
                                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                                    isOpen
                                        ? 'border-gray-300 dark:border-white/20 bg-gray-50/60 dark:bg-white/[0.02]'
                                        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 hover:border-gray-300 dark:hover:border-white/20'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleFaq(idx)}
                                    className="w-full py-3.5 px-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                                >
                                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                        {faq.q}
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 text-gray-400 dark:text-zinc-400 shrink-0 transition-transform duration-200 ${
                                            isOpen ? 'transform rotate-180 text-gray-700 dark:text-zinc-200' : ''
                                        }`}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="px-4 pb-4 pt-1 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed border-t border-gray-100 dark:border-white/5 animate-fade-in">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Bar */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </span>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            Ready to Review Incoming Proposals?
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                            Click on any active job post to view applicants, compare proposed milestone rates, and award contracts.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/jobs/proposals')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors shrink-0 shadow-xs active:scale-98 cursor-pointer"
                >
                    <span>View Incoming Proposals</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default JobProposalsFlowGuide;
