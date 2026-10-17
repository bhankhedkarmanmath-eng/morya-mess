import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Utensils, 
  ShieldAlert,
  Send,
  Loader2
} from 'lucide-react';
import { MealLog, Customer } from '../../../types/mess';
import { submitAttendanceDispute } from '../../../lib/ownerFeaturesApi';

interface AttendanceDisputeModalProps {
  isOpen: boolean;
  log: MealLog | null;
  customer: Customer;
  onClose: () => void;
  onDisputeSubmitted: (logId: string) => void;
}

const DISPUTE_REASONS = [
  'I was not present and did not consume this meal',
  'Incorrect meal shift (e.g. took lunch but marked dinner)',
  'Duplicate entry recorded for the same meal',
  'Wrong date or inaccurate timestamp',
  'Other attendance discrepancy'
];

export const AttendanceDisputeModal: React.FC<AttendanceDisputeModalProps> = ({
  isOpen,
  log,
  customer,
  onClose,
  onDisputeSubmitted
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(DISPUTE_REASONS[0]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  if (!isOpen || !log) return null;

  const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const methodStr = log.overrideNotes || (log.reason?.includes('Counter') ? 'Counter Verification' : 'Gate QR Scanner');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await submitAttendanceDispute({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        mealLogId: log.id,
        date: log.date,
        mealType: log.mealType,
        disputeReason: selectedReason,
        notes: additionalNotes.trim()
      });

      if (res.success) {
        setIsSubmittedSuccess(true);
        onDisputeSubmitted(log.id);
        setTimeout(() => {
          setIsSubmittedSuccess(false);
          onClose();
        }, 1800);
      } else {
        setErrorMessage(res.error || 'Failed to submit dispute. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error while submitting dispute.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-orange-200/90 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Report Attendance Issue</h3>
              <p className="text-[11px] text-orange-100">Dispute will be reviewed by Mess Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Target Record Card */}
          <div className="bg-orange-50/60 rounded-2xl border border-orange-200/80 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-orange-600" />
                {log.mealType} Meal Record
              </span>
              <span className="font-mono text-[10px] text-slate-500">ID: {log.id.slice(0, 12)}...</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span><strong>Date:</strong> {log.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span><strong>Time:</strong> {timeStr}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 pt-1 border-t border-orange-200/60 flex items-center justify-between">
              <span>Method: <strong className="text-slate-800">{methodStr}</strong></span>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                {log.scanStatus === 'ALLOW' ? 'Verified Entry' : log.scanStatus}
              </span>
            </div>
          </div>

          {/* Authoritative Notice */}
          <div className="p-3 rounded-xl bg-orange-50/30 border border-orange-200/70 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Notice on Attendance Records:
            </p>
            <p className="leading-relaxed">
              Attendance records are authoritative and cannot be directly deleted by students. Submitting this dispute registers a ticket for the Mess Owner to review against gate scan and shift logs.
            </p>
          </div>

          {isSubmittedSuccess ? (
            <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
              <h4 className="font-black text-emerald-900 text-base">Dispute Submitted Successfully</h4>
              <p className="text-xs text-emerald-700">
                Your report has been forwarded to the Mess Owner. Your original record remains active pending verification.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Reasons Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Reason for Dispute
                </label>
                <div className="space-y-2">
                  {DISPUTE_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        selectedReason === reason
                          ? 'bg-orange-50 border-orange-400 text-orange-950 font-bold'
                          : 'bg-white border-orange-200/70 text-slate-700 hover:bg-orange-50/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="disputeReason"
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="mt-0.5 text-orange-600 focus:ring-orange-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="e.g. I was at college lectures from 11 AM to 2 PM on this day..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-orange-200/80 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition bg-orange-50/20 focus:bg-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-orange-200/80 text-slate-700 font-bold text-xs hover:bg-orange-50/50 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Dispute</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
