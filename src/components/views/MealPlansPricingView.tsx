import React, { useState } from 'react';
import { STANDARD_PRICING } from '../../lib/storage';
import { 
  DollarSign, 
  ArrowLeft, 
  Plus, 
  Check, 
  Edit2, 
  Sparkles, 
  CheckCircle2,
  Users
} from 'lucide-react';

interface MealPlansPricingViewProps {
  onBack: () => void;
}

interface PlanItem {
  id: string;
  name: string;
  code: string;
  mealsPerDay: number;
  description: string;
  boysFee: number;
  girlsFee: number;
  isActive: boolean;
}

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 'p-1',
    name: 'Monthly 2 Meals (Lunch + Dinner)',
    code: 'both_meals',
    mealsPerDay: 2,
    description: 'Unlimited Chapatis, 2 Sabjis, Dal, Rice & Weekend Sweet',
    boysFee: 3000,
    girlsFee: 2500,
    isActive: true
  },
  {
    id: 'p-2',
    name: 'Monthly 1 Meal (Lunch OR Dinner)',
    code: 'one_meal',
    mealsPerDay: 1,
    description: 'Single shift dining access per day for office or college students',
    boysFee: 1600,
    girlsFee: 1300,
    isActive: true
  },
  {
    id: 'p-3',
    name: '15-Day Half-Month Plan',
    code: 'half_month',
    mealsPerDay: 2,
    description: 'Short-term pass for students visiting for practical exams / viva',
    boysFee: 1600,
    girlsFee: 1350,
    isActive: true
  }
];

export const MealPlansPricingView: React.FC<MealPlansPricingViewProps> = ({ onBack }) => {
  const [plans, setPlans] = useState<PlanItem[]>(DEFAULT_PLANS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBoysFee, setEditBoysFee] = useState('');
  const [editGirlsFee, setEditGirlsFee] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleStartEdit = (p: PlanItem) => {
    setEditingId(p.id);
    setEditBoysFee(p.boysFee.toString());
    setEditGirlsFee(p.girlsFee.toString());
  };

  const handleSaveEdit = (id: string) => {
    setPlans(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          boysFee: Number(editBoysFee) || p.boysFee,
          girlsFee: Number(editGirlsFee) || p.girlsFee
        };
      }
      return p;
    }));
    setEditingId(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              <span>Meal Plans & Subscription Pricing</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Official hostel mess tariff tiers, boys vs girls fee structure, and plan allowances
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pricing Updated!</span>
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map(p => {
          const isEditing = editingId === p.id;

          return (
            <div 
              key={p.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 relative flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-slate-900 text-base">{p.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-800">
                    {p.mealsPerDay} Meals / Day
                  </span>
                </div>
                <p className="text-xs text-slate-500">{p.description}</p>
              </div>

              {isEditing ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Boys Fee (₹)</label>
                    <input
                      type="number"
                      value={editBoysFee}
                      onChange={(e) => setEditBoysFee(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-black"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Girls Fee (₹)</label>
                    <input
                      type="number"
                      value={editGirlsFee}
                      onChange={(e) => setEditGirlsFee(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-black"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleSaveEdit(p.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Rate</span>
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold">Boys Monthly Rate:</span>
                    <span className="text-base font-black text-slate-900 font-mono">₹{p.boysFee}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold">Girls Monthly Rate:</span>
                    <span className="text-base font-black text-orange-600 font-mono">₹{p.girlsFee}</span>
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">30-day validity</span>
                  <button
                    onClick={() => handleStartEdit(p)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Tariff</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
