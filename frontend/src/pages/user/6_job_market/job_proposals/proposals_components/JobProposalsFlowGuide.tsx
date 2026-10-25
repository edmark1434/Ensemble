import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export const JobProposalsFlowGuide: React.FC = () => {
    const navigate = useNavigate();

    const steps = [
        {
            num: '01',
            title: 'Discovery & Proposal Pitch',
            status: 'Pending',
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
            desc: 'Freelancers discover open jobs with active countdowns and submit bids, cover letters, and milestones (10 credits submission fee).',
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
            title: 'Acceptance & Offer',
            status: 'Accepted',
            badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            desc: 'Client accepts the selected proposal. Delivery terms, timelines, and payment milestone amounts are locked for contract formation.',
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
            desc: 'Job listing is published and visible across the marketplace. A live countdown timer shows remaining intake time (12h, 24h, 3d, 7d, 14d). Freelancers can submit pitches.',
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
            name: 'Accepted',
            badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            desc: 'Client approved the proposal terms; contract created and awaiting escrow funding.',
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
            desc: 'Client declined proposal or selected other applicants for available positions.',
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
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
            desc: 'If an open job post reaches the end of its application window with 0 applicants, or if the client force-closes the job with 0 proposals, the 50-credit posting fee is immediately refunded back to the client wallet.',
        },
        {
            title: 'Freelancer 100% Submission Fee Refund',
            amount: '10 Credits Per Applicant',
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
            desc: 'If a client allows the application window to close or expire without hiring any applicant, all submitted proposal fees (10 credits each) are returned immediately to each applicant’s wallet. Zero wasted credits on inactive clients.',
        },
        {
            title: 'Fixed Application Windows & Countdown',
            amount: '12h · 24h · 3d · 7d · 14d',
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
            desc: 'Every job post operates on a clear intake window with a live countdown timer. This ensures applicants know exactly when decisions will be rendered and prevents posts from hanging indefinitely.',
        },
    ];

    const hiringModels = [
        {
            type: 'Solo Job Listing',
            badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
            desc: 'Client hires one lead freelancer for the entire scope. All milestones are assigned to the accepted applicant.',
        },
        {
            type: 'Team Job Listing',
            badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
            desc: 'Multiple roles available. Each contributor applies to and delivers exactly one specialized milestone role.',
        },
        {
            type: 'Escrow Commitment',
            badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            desc: 'Upon acceptance, milestone funds are held in secure escrow and paid out per approved milestone.',
        },
        {
            type: 'Revision Quota',
            badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',
            desc: 'Proposals specify additional work rates (+15% to +50%) for revisions requested beyond milestone agreements.',
        },
    ];

    return (
        <div className="space-y-6 w-full animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Header - Strictly No Icon Beside Title */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Job Proposals Workflow & Status Guide
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1.5 leading-relaxed max-w-4xl">
                    Comprehensive overview of proposal pitch cycles, application intake windows, listing statuses (Open vs Closed), and platform automated refund guarantees.
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
                                <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-zinc-200 text-xs font-mono font-bold flex items-center justify-center border border-gray-200/80 dark:border-white/10">
                                    {s.num}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${s.badgeClass}`}>
                                    {s.status}
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
                                {s.title}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
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
                            className="p-4 rounded-xl border border-gray-200/90 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] space-y-2.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${js.badgeClass}`}>
                                    {js.name}
                                </span>
                                <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
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
                <div className="border-l-4 border-l-amber-400 pl-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                        Application Windows & Automatic Refund Guarantees
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Built-in escrow and fee protections safeguarding both clients and applicants against abandoned or inactive postings.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {refundGuarantees.map((rg) => (
                        <div
                            key={rg.title}
                            className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] flex flex-col justify-between space-y-3"
                        >
                            <div>
                                <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-bold mb-2 ${rg.badgeClass}`}>
                                    {rg.amount}
                                </span>
                                <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                                    {rg.title}
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 leading-relaxed">
                                    {rg.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Proposal Statuses & Hiring Models */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Proposal Statuses */}
                <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Proposal Statuses
                    </h3>
                    <div className="space-y-2">
                        {proposalStatuses.map((st) => (
                            <div key={st.name} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                <span className={`w-28 shrink-0 font-bold px-2 py-0.5 rounded text-center border text-[11px] uppercase ${st.badgeClass}`}>
                                    {st.name}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                                    {st.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hiring Rules & Protections */}
                <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Hiring Rules & Escrow
                    </h3>
                    <div className="space-y-2">
                        {hiringModels.map((hm) => (
                            <div key={hm.type} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                <span className={`w-36 shrink-0 font-bold px-2 py-0.5 rounded text-center border text-[11px] uppercase ${hm.badgeClass}`}>
                                    {hm.type}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                                    {hm.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
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
