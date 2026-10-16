import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';

export const GigOrdersFlowGuide: React.FC = () => {
    const navigate = useNavigate();

    const steps = [
        {
            num: '01',
            title: 'Order Pitch & Tier Selection',
            status: 'Pending',
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
            desc: 'Clients choose a service tier (Basic, Standard, Premium) or submit a custom order pitch with milestones.',
        },
        {
            num: '02',
            title: 'Seller Review & Acceptance',
            status: 'Accepted',
            badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
            desc: 'Sellers inspect project scope, raw assets, and timeline before accepting the order into their queue.',
        },
        {
            num: '03',
            title: 'Escrow Secured & Execution',
            status: 'In Contract',
            badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            desc: 'Order forms an active contract with escrow funded. Delivery proceeds sequentially in the Delivery Dashboard.',
        },
        {
            num: '04',
            title: 'Delivery, Approval & Rating',
            status: 'Completed',
            badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
            desc: 'Deliverables are approved, milestone funds are paid out, and mutual ratings conclude the order.',
        },
    ];

    const orderStatuses = [
        {
            name: 'Pending',
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
            desc: 'New order submission awaiting seller evaluation in the Incoming Orders tab.',
        },
        {
            name: 'Accepted',
            badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
            desc: 'Seller accepted scope and timeline; transitioning to active escrow contract.',
        },
        {
            name: 'In Contract',
            badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            desc: 'Escrow funded; milestone deliverables are actively submitted and reviewed.',
        },
        {
            name: 'Completed',
            badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
            desc: 'All milestone deliverables accepted, payouts released, and contract archived.',
        },
        {
            name: 'Rejected',
            badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
            desc: 'Seller declined order (e.g. conflicting timeline or out-of-scope requirements).',
        },
        {
            name: 'Withdrawn',
            badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
            desc: 'Client cancelled the order inquiry before seller acceptance.',
        },
    ];

    const servicePolicies = [
        {
            type: 'Service Tiers',
            badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
            desc: 'Predefined packages (Basic, Standard, Premium) guarantee transparent deliverables, turnaround, and pricing.',
        },
        {
            type: 'Slot Capacity',
            badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
            desc: 'Sellers configure slot limits to ensure high quality and prevent queue overloading.',
        },
        {
            type: 'Milestone Escrow',
            badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            desc: 'Payments are protected in escrow and released per milestone immediately upon client approval.',
        },
        {
            type: 'Revision Terms',
            badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',
            desc: 'Extra revision rates (+10% to +30%) apply only if the client requests revisions beyond the tier agreement.',
        },
    ];

    return (
        <div className="space-y-6 w-full animate-fade-in" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {/* Header */}
            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <ShoppingBag className="w-4 h-4" />
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Gig Orders Workflow & Status Guide
                    </h2>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
                    How client orders progress from package selection to seller acceptance, milestone delivery, and payout.
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

            {/* Status Breakdown & Policies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order Statuses */}
                <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Order Statuses
                    </h3>
                    <div className="space-y-2">
                        {orderStatuses.map((st) => (
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

                {/* Service Policies */}
                <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Service Policies & Escrow
                    </h3>
                    <div className="space-y-2">
                        {servicePolicies.map((sp) => (
                            <div key={sp.type} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                <span className={`w-36 shrink-0 font-bold px-2 py-0.5 rounded text-center border text-[11px] uppercase ${sp.badgeClass}`}>
                                    {sp.type}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                                    {sp.desc}
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
                            Ready to Review Incoming Orders?
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                            Click on any published service to view client requests, accept orders, and launch active delivery.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/gigs/orders')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors shrink-0 shadow-xs active:scale-98"
                >
                    <span>View Incoming Orders</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default GigOrdersFlowGuide;
