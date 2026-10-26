import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const DeliveryFlowGuide: React.FC = () => {
    const navigate = useNavigate();

    const steps = [
        {
            num: '01',
            title: 'Agreement & Escrow',
            status: 'Waiting',
            badgeClass: 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800',
            desc: 'Terms are confirmed and full payment is deposited into escrow before work begins.',
        },
        {
            num: '02',
            title: 'Milestone Execution & Payout',
            status: 'Active',
            badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
            desc: 'Freelancer submits deliverables. Payouts are released per milestone upon client approval.',
        },
        {
            num: '03',
            title: 'All Milestones Approved',
            status: 'Done',
            badgeClass: 'bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800',
            desc: 'All milestone deliverables accepted and paid out. Contract reaches Done and opens the 24h review window.',
        },
        {
            num: '04',
            title: 'Mutual Ratings & Archive',
            status: 'Closed',
            badgeClass: 'bg-zinc-200 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
            desc: 'Both parties exchange ratings. Once submitted or window closes, contract is safely archived.',
        },
    ];

    const contractStatuses = [
        { 
            name: 'Waiting', 
            badgeClass: 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800',
            desc: 'Contract drafted; awaiting mutual signature or escrow funding.' 
        },
        { 
            name: 'Active', 
            badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
            desc: 'Work in progress; milestones are completed, reviewed, and paid out sequentially.' 
        },
        { 
            name: 'Done', 
            badgeClass: 'bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800',
            desc: 'All milestones approved and paid; awaiting ratings in the "To Rate" tab (24h window).' 
        },
        { 
            name: 'Closed', 
            badgeClass: 'bg-zinc-200 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
            desc: 'Reviews exchanged or window closed; all milestone payouts fulfilled and contract archived.' 
        },
        { 
            name: 'Cancelled', 
            badgeClass: 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800',
            desc: 'Contract terminated before completion; unreleased escrow funds refunded.' 
        },
        { 
            name: 'Dispute Filed', 
            badgeClass: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
            desc: 'Mediation requested; escrow funds held safely pending staff resolution.' 
        },
    ];

    const milestoneStatuses = [
        { 
            name: 'Locked', 
            badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
            desc: 'Upcoming milestone waiting for previous milestones to finish.' 
        },
        { 
            name: 'In Progress', 
            badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
            desc: 'Active phase currently being completed by the freelancer.' 
        },
        { 
            name: 'Under Review', 
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
            desc: 'Deliverables uploaded; client must approve or request revisions.' 
        },
        { 
            name: 'Revision Request', 
            badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',
            desc: 'Client requested adjustments before approving.' 
        },
        { 
            name: 'Approved', 
            badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            desc: 'Accepted by client; this milestone’s escrow payout is released immediately.' 
        },
    ];

    return (
        <div className="space-y-6 w-full animate-fade-in" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {/* Header */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Delivery Workflow
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
                    How contracts and milestones progress from start to finish on Ensemble.
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
                            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                                {s.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Status Breakdown Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contract Statuses */}
                <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Contract Statuses
                    </h3>
                    <div className="space-y-2">
                        {contractStatuses.map(cs => (
                            <div key={cs.name} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                <span className={`w-24 shrink-0 font-bold px-2 py-0.5 rounded text-center border text-[11px] uppercase ${cs.badgeClass}`}>
                                    {cs.name}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                                    {cs.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Milestone Statuses */}
                <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Milestone Statuses
                    </h3>
                    <div className="space-y-2">
                        {milestoneStatuses.map(ms => (
                            <div key={ms.name} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                <span className={`w-32 shrink-0 font-bold px-2 py-0.5 rounded text-center border text-[11px] uppercase ${ms.badgeClass}`}>
                                    {ms.name}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                                    {ms.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 24-Hour Review Window */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        24-Hour Review Window
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                        Ratings are double-blind — neither party can see the other's score until both have submitted (or 24 hours expire). Escrow payouts are released per milestone upon client approval, while reviews finalize your public reputation.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/dashboard/rate')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors shrink-0 shadow-xs active:scale-98"
                >
                    <span>Go to "To Rate"</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};
