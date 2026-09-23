import { useState, useEffect } from 'react';
import { Check, Edit, X, Save, AlertTriangle } from 'lucide-react';
import api from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/components/utility/toast';

interface Feature {
  feature_id: string;
  category: string;
  title: string;
  value: string;
}

interface Plan {
  plan_id: string;
  name: string;
  description: string;
  price: number;
  days_of_trials: number;
  features: Feature[];
}

export function AdminSubscriptionsTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    price: number;
    days_of_trials: number;
    selectedFeatures: { feature_id: string; value: string }[];
  }>({ name: '', description: '', price: 0, days_of_trials: 0, selectedFeatures: [] });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/api/admin/subscriptions/plans');
      if (res.data?.success) {
        setPlans(res.data.data.plans);
        setAllFeatures(res.data.data.allFeatures);
      }
    } catch (err) {
      console.error('Failed to fetch admin plans:', err);
      showErrorToast('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "premium":
        return "/icons/subscription/premium.png";
      case "business":
      case "studio":
        return "/icons/subscription/studio.png";
      default:
        return "/icons/subscription/freemium.png";
    }
  };

  const handleEditClick = (plan: Plan) => {
    setEditingPlan(plan);
    setEditForm({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      days_of_trials: plan.days_of_trials,
      selectedFeatures: plan.features.map(f => ({ feature_id: f.feature_id, value: f.value })),
    });
  };

  const toggleFeature = (featureId: string, defaultValue: string) => {
    setEditForm(prev => {
      const isSelected = prev.selectedFeatures.some(f => f.feature_id === featureId);
      return {
        ...prev,
        selectedFeatures: isSelected 
          ? prev.selectedFeatures.filter(f => f.feature_id !== featureId)
          : [...prev.selectedFeatures, { feature_id: featureId, value: defaultValue }]
      };
    });
  };

  const updateFeatureValue = (featureId: string, newValue: string) => {
    setEditForm(prev => ({
      ...prev,
      selectedFeatures: prev.selectedFeatures.map(f => 
        f.feature_id === featureId ? { ...f, value: newValue } : f
      )
    }));
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    setIsSaving(true);
    try {
      // Save plan details
      await api.put(`/api/admin/subscriptions/plans/${editingPlan.plan_id}`, {
        name: editForm.name,
        description: editForm.description,
        price: editForm.price,
        days_of_trials: editForm.days_of_trials
      });

      // Save features
      await api.put(`/api/admin/subscriptions/plans/${editingPlan.plan_id}/features`, {
        features: editForm.selectedFeatures
      });

      showSuccessToast(`${editForm.name} updated successfully!`);
      setEditingPlan(null);
      await fetchPlans(); // Refetch to show updated data
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to update plan');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Subscription Packages</h2>
          <p className="text-sm text-zinc-400">Manage the plans, prices, and exact features offered to users.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {plans.map((tier) => {
          const isFree = tier.price === 0;
          const isPremium = tier.name.toLowerCase() === "premium";
          const isBusiness = tier.name.toLowerCase() === "business" || tier.name.toLowerCase() === "studio";

          return (
            <div
              key={tier.plan_id}
              className={`flex flex-col justify-between rounded-2xl border p-6 relative transition-all duration-300 backdrop-blur-xl ${
                isPremium
                  ? "border-amber-500/40 bg-gradient-to-b from-amber-500/[0.08] via-amber-500/[0.02] to-transparent shadow-[0_0_20px_rgba(245,158,11,0.05)]"
                  : isBusiness
                  ? "border-cyan-500/40 bg-gradient-to-br from-cyan-500/[0.08] via-transparent to-purple-500/[0.08] shadow-[0_0_20px_rgba(6,182,212,0.05)]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                    <img
                      src={getSubscriptionIcon(tier.name)}
                      alt={tier.name}
                      className="h-8 w-8 object-contain drop-shadow-[0_3px_10px_rgba(255,255,255,0.18)]"
                    />
                    <span>{tier.name}</span>
                  </h3>
                  {isPremium && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mb-5">{tier.description}</p>

                <div className="text-3xl font-extrabold text-white mb-2">
                  {isFree ? "Free" : `₱${tier.price.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                  {!isFree && <span className="text-sm font-normal text-zinc-500 ml-1">/mo</span>}
                </div>
                {tier.days_of_trials > 0 && (
                  <p className="text-xs text-blue-400 font-medium mb-6">{tier.days_of_trials}-Day Free Trial Included</p>
                )}

                <div className="h-px bg-white/10 my-6" />

                <ul className="space-y-3 mb-8">
                  {tier.features && tier.features.length > 0 ? (
                    tier.features.map((feature) => (
                      <li key={feature.feature_id} className="flex items-start gap-2 text-xs">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-zinc-300">
                          {feature.title}{" "}
                          <strong className="font-bold text-white ml-1">{feature.value}</strong>
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-zinc-500">No features assigned</li>
                  )}
                </ul>
              </div>

              <button 
                onClick={() => handleEditClick(tier)}
                className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  isPremium
                    ? "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                <Edit className="h-4 w-4" /> Edit Plan Details
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-bold text-white">Edit {editingPlan.name} Plan</h3>
                <p className="text-xs text-zinc-400">Changes will reflect instantly on the user side.</p>
              </div>
              <button onClick={() => setEditingPlan(null)} className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
              {/* Left Column: Basic Info */}
              <div className="md:w-1/3 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Plan Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-[#0a0b0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Description</label>
                  <textarea 
                    value={editForm.description} 
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                    rows={3}
                    className="w-full bg-[#0a0b0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Monthly Price (PHP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500">₱</span>
                    <input 
                      type="number" 
                      value={editForm.price} 
                      onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                      className="w-full bg-[#0a0b0f] border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Trial Days</label>
                  <input 
                    type="number" 
                    value={editForm.days_of_trials} 
                    onChange={e => setEditForm({...editForm, days_of_trials: Number(e.target.value)})}
                    className="w-full bg-[#0a0b0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Right Column: Features Toggle */}
              <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-8">
                <label className="block text-xs font-semibold text-zinc-400 mb-3 uppercase flex items-center justify-between">
                  <span>Included Features</span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{editForm.selectedFeatures.length} active</span>
                </label>
                <div className="bg-[#0a0b0f] border border-white/10 rounded-xl overflow-hidden h-[300px] overflow-y-auto">
                  <div className="divide-y divide-white/5">
                    {allFeatures.map(feature => {
  const selectedFeat = editForm.selectedFeatures.find(f => f.feature_id === feature.feature_id);
  const isSelected = !!selectedFeat;
  return (
    <div 
      key={feature.feature_id}
      className={`flex items-center gap-3 p-3 transition-colors ${isSelected ? 'bg-blue-500/[0.03]' : ''}`}
    >
      <div 
        onClick={() => toggleFeature(feature.feature_id, feature.value || '')}
        className={`cursor-pointer shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors hover:border-blue-500 ${isSelected ? 'bg-blue-600 border-blue-500' : 'bg-transparent border-white/20'}`}
      >
        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
        <p 
          onClick={() => toggleFeature(feature.feature_id, feature.value || '')}
          className={`text-sm cursor-pointer transition-colors ${isSelected ? 'text-white font-medium' : 'text-zinc-400'}`}
        >
          {feature.title}
        </p>
        {isSelected && (
          <input
            type="text"
            value={selectedFeat.value}
            onChange={(e) => updateFeatureValue(feature.feature_id, e.target.value)}
            placeholder="e.g. 1080p, Unlimited"
            className="w-1/2 bg-[#1a1b23] border border-white/10 rounded px-2 py-1 text-xs text-emerald-400 focus:outline-none focus:border-blue-500 text-right"
          />
        )}
      </div>
    </div>
  );
})}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500/80 text-xs font-medium">
                <AlertTriangle className="h-4 w-4" /> Editing live subscription tier
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
