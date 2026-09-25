import React, { useState, useEffect, useMemo } from 'react';
import { MealRatingReview } from '../../types/mess';
import { loadMealRatings } from '../../lib/ownerModulesStorage';
import { 
  Sparkles, 
  ArrowLeft, 
  Star, 
  Search, 
  Calendar, 
  TrendingUp, 
  Utensils, 
  Filter
} from 'lucide-react';

interface MealRatingsViewProps {
  onBack: () => void;
}

export const MealRatingsView: React.FC<MealRatingsViewProps> = ({ onBack }) => {
  const [ratings, setRatings] = useState<MealRatingReview[]>([]);
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3' | '1-2'>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'lunch' | 'dinner'>('all');

  useEffect(() => {
    setRatings(loadMealRatings());
  }, []);

  const filtered = useMemo(() => {
    return ratings.filter(r => {
      const matchesRating = 
        ratingFilter === 'all' ||
        (ratingFilter === '5' && r.rating === 5) ||
        (ratingFilter === '4' && r.rating === 4) ||
        (ratingFilter === '3' && r.rating === 3) ||
        (ratingFilter === '1-2' && r.rating <= 2);

      const matchesShift = shiftFilter === 'all' || r.mealShift === shiftFilter;

      return matchesRating && matchesShift;
    });
  }, [ratings, ratingFilter, shiftFilter]);

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) 
    : '4.8';

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
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Meal Ratings & Food Quality Reviews</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct student feedback on vegetable taste, bread softness, hygiene, and meal satisfaction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="font-black text-amber-950 text-sm">{avgRating} / 5.0</span>
          <span className="text-[11px] text-amber-800 font-bold">({ratings.length} Reviews)</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500">Stars:</span>
          {(['all', '5', '4', '3', '1-2'] as const).map(st => (
            <button
              key={st}
              onClick={() => setRatingFilter(st)}
              className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                ratingFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'All Stars' : `${st} ★`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500">Shift:</span>
          {(['all', 'lunch', 'dinner'] as const).map(sh => (
            <button
              key={sh}
              onClick={() => setShiftFilter(sh)}
              className={`px-3 py-1 rounded-xl font-bold capitalize transition cursor-pointer ${
                shiftFilter === sh ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sh}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Star className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Reviews Match Filter</h4>
            <p className="text-xs text-slate-500 mt-0.5">Change star rating or shift filters.</p>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{r.customerName}</h4>
                  <div className="text-[11px] text-slate-400 font-mono capitalize">
                    {r.mealShift} Shift • {r.date}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                "{r.feedback}"
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
