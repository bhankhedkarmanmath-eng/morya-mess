import React, { useState } from 'react';
import { Customer, MealRatingReview, MessShiftAudit } from '../../../types/mess';
import { submitMealRating } from '../../../lib/ownerFeaturesApi';
import { Star, Utensils, CheckCircle2, AlertCircle, RefreshCw, MessageSquare, Calendar, Clock } from 'lucide-react';

interface StudentRatingsTabProps {
  customer: Customer;
  ratings: MealRatingReview[];
  currentShift: MessShiftAudit;
  isExpired?: boolean;
  onRatingSubmitted: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const StudentRatingsTab: React.FC<StudentRatingsTabProps> = ({
  customer,
  ratings,
  currentShift,
  isExpired = false,
  onRatingSubmitted,
  onRefresh,
  isRefreshing = false
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedShift, setSelectedShift] = useState<'lunch' | 'dinner' | 'breakfast'>(
    currentShift.mealType === 'dinner' ? 'dinner' : 'lunch'
  );
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // My ratings
  const myRatings = ratings.filter(r => r.customerId === customer.id);

  // Check if student already submitted rating for the chosen date and shift
  const alreadyReviewed = myRatings.some(
    r => r.date === selectedDate && r.mealShift === selectedShift
  );

  const starLabels = ['', 'Poor', 'Average', 'Good', 'Very Good', 'Excellent / Delicious!'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      setStatusMessage({
        type: 'error',
        text: `Cannot submit: Mess subscription expired on ${customer.endDate || 'N/A'}. Please renew your pass with the owner first.`
      });
      return;
    }

    if (!ratingScore) {
      setStatusMessage({ type: 'error', text: 'Please select a star rating.' });
      return;
    }

    if (alreadyReviewed) {
      setStatusMessage({ 
        type: 'error', 
        text: `You have already reviewed ${selectedShift.toUpperCase()} for ${selectedDate}.` 
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await submitMealRating({
      customerId: customer.id,
      customerName: customer.name,
      rating: ratingScore,
      feedback: feedbackText.trim() || 'Food was good and properly served.',
      mealShift: selectedShift,
      date: selectedDate
    });

    setIsSubmitting(false);

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Thank you, ${customer.name}! Your review for ${selectedShift.toUpperCase()} has been submitted to the mess owner.`
      });
      setFeedbackText('');
      onRatingSubmitted();
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Failed to submit review. Please try again.'
      });
    }
  };

  return (
    <div className="w-full max-w-full sm:max-w-2xl space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-orange-500 text-orange-500" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">
                Food Quality Feedback
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Meal Ratings & Reviews
              </h2>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-orange-200/80 hover:bg-orange-50 text-slate-600 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Refresh Ratings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Rate daily dining taste, sabzi quality, roti softness, and kitchen hygiene. Your reviews are sent directly to the mess owner to keep quality high.
        </p>
      </div>

      {/* Review Submission Card */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-orange-600" />
            <span>Rate Today's Meal</span>
          </h3>
          <span className="text-[10px] font-bold uppercase bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
            Shift: {currentShift.mealType.toUpperCase()}
          </span>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {isExpired ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-rose-50 border-2 border-rose-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-rose-950 text-sm sm:text-base">
                Subscription Expired — Meal Reviews & Compliments Locked
              </h4>
              <p className="text-xs text-rose-800 leading-relaxed max-w-md mx-auto">
                Your mess pass ended on <strong>{customer.endDate || 'N/A'}</strong>. Meal ratings, culinary feedback, and chef compliments are restricted to active diners.
              </p>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-200/80 text-rose-900 text-[11px] font-black">
                🔒 Please renew your subscription with the mess owner to rate meals
              </span>
            </div>
          </div>
        ) : alreadyReviewed ? (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-amber-950 text-sm">Meal Already Reviewed</h4>
            <p className="text-xs text-amber-800 leading-relaxed max-w-sm mx-auto">
              You have already submitted a review for <strong>{selectedShift.toUpperCase()}</strong> on <strong>{selectedDate}</strong>. Only 1 review per meal shift is allowed to keep ratings fair.
            </p>
            <div className="pt-1">
              <span className="text-[11px] font-bold text-slate-500">
                You can select a different date or shift above if you missed one.
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Shift & Date Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Meal Shift</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedShift('lunch')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedShift === 'lunch'
                        ? 'border-orange-500 bg-orange-50 text-orange-800 shadow-2xs'
                        : 'border-orange-200/70 bg-white hover:bg-orange-50/50 text-slate-700'
                    }`}
                  >
                    <span>☀️ Lunch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShift('dinner')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedShift === 'dinner'
                        ? 'border-orange-500 bg-orange-50 text-orange-800 shadow-2xs'
                        : 'border-orange-200/70 bg-white hover:bg-orange-50/50 text-slate-700'
                    }`}
                  >
                    <span>🌙 Dinner</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Meal Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-orange-200/80 font-medium text-xs text-slate-800 bg-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Interactive Star Rating */}
            <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100 text-center space-y-2">
              <label className="font-extrabold text-xs text-slate-800 block">
                How was the taste and quality?
              </label>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(score => {
                  const isFilled = (hoveredScore ?? ratingScore) >= score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onMouseEnter={() => setHoveredScore(score)}
                      onMouseLeave={() => setHoveredScore(null)}
                      onClick={() => setRatingScore(score)}
                      className="p-1 transition-transform transform hover:scale-125 focus:outline-hidden cursor-pointer"
                      title={`${score} Stars`}
                    >
                      <Star 
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled ? 'fill-amber-400 text-amber-500' : 'text-slate-300 fill-slate-100'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>

              <div className="h-5">
                <span className="text-xs font-extrabold text-orange-700">
                  {starLabels[hoveredScore ?? ratingScore]}
                </span>
              </div>
            </div>

            {/* Feedback Comment */}
            <div>
              <label className="font-bold text-slate-700 text-xs block mb-1">
                Your Feedback / Suggestions (Optional)
              </label>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                rows={3}
                placeholder="E.g., Sabzi was delicious today! Soft chapatis. Dal salt was balanced."
                className="w-full px-3 py-2.5 rounded-xl border border-orange-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Review...</span>
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 fill-white" />
                  <span>Submit Meal Review</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Submitted Reviews History */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
            <span>My Submitted Reviews ({myRatings.length})</span>
          </h3>
          <span className="text-[10px] text-slate-400">Owner Verified</span>
        </div>

        {myRatings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-orange-200/80 p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200/60 flex items-center justify-center mx-auto text-orange-400">
              <Utensils className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-xs">No Reviews Submitted Yet</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Share your thoughts on today's meals to help mess cooks keep the food tasty and healthy!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {myRatings.map(rev => (
              <div 
                key={rev.id}
                className="bg-white rounded-2xl border border-orange-200/70 p-4 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                      {rev.mealShift}
                    </span>
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {rev.date}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star 
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200 fill-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed bg-orange-50/20 p-2.5 rounded-xl border border-orange-100">
                  "{rev.feedback}"
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Student ID: {customer.id}</span>
                  <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
