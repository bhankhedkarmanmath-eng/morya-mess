import React, { useState } from 'react';
import { Customer, CustomerComplaint } from '../../../types/mess';
import { submitStudentComplaint } from '../../../lib/ownerFeaturesApi';
import { MessageSquare, AlertCircle, CheckCircle2, Clock, RefreshCw, Send, ShieldCheck, ChevronRight } from 'lucide-react';

interface StudentComplaintsTabProps {
  customer: Customer;
  complaints: CustomerComplaint[];
  isExpired?: boolean;
  onComplaintSubmitted: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const StudentComplaintsTab: React.FC<StudentComplaintsTabProps> = ({
  customer,
  complaints,
  isExpired = false,
  onComplaintSubmitted,
  onRefresh,
  isRefreshing = false
}) => {
  const [category, setCategory] = useState<'Food Quality' | 'Cleanliness' | 'Staff Behavior' | 'Quantity' | 'Other'>('Food Quality');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // My complaints
  const myComplaints = complaints.filter(c => c.customerId === customer.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      setStatusMessage({
        type: 'error',
        text: `Cannot submit: Mess subscription expired on ${customer.endDate || 'N/A'}. Please renew your pass with the owner first.`
      });
      return;
    }

    if (!description.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter details about your complaint or feedback.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await submitStudentComplaint({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      category,
      description: description.trim()
    });

    setIsSubmitting(false);

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: 'Your complaint has been registered and forwarded to the mess owner for immediate review.'
      });
      setDescription('');
      onComplaintSubmitted();
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Failed to submit complaint. Please try again.'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
            ✓ Resolved
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
            ⏳ In Progress
          </span>
        );
      case 'CLOSED':
        return (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
            Closed
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
            ● Received
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-full sm:max-w-2xl space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">
                Student Helpdesk
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Complaints & Grievances
              </h2>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Refresh Complaints"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Report any issue regarding food hygiene, quality, seating cleanliness, or service. Management resolves complaints with priority.
        </p>
      </div>

      {/* Submission Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-orange-600" />
          <span>Register a Complaint / Request</span>
        </h3>

        {/* Status Message */}
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
                Subscription Expired — Helpdesk Locked
              </h4>
              <p className="text-xs text-rose-800 leading-relaxed max-w-md mx-auto">
                Your mess membership ended on <strong>{customer.endDate || 'N/A'}</strong>. Submitting complaints, hygiene grievances, or service requests is strictly restricted to active diners.
              </p>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-200/80 text-rose-900 text-[11px] font-black">
                🔒 Please renew your mess pass with owner to file complaints
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-bold text-xs text-slate-700 block mb-1">
                Select Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {(['Food Quality', 'Cleanliness', 'Staff Behavior', 'Quantity', 'Other'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 px-3 rounded-xl border text-left font-bold transition cursor-pointer flex items-center justify-between ${
                      category === cat
                        ? 'border-orange-500 bg-orange-50 text-orange-950 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {category === cat && <span className="text-orange-600 font-bold ml-1">●</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-xs text-slate-700 block mb-1">
                Description of the Issue
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe clearly what happened, date, meal shift, and any specific details..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Registering Complaint...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Grievance to Management</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* My Complaints List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span>My Registered Grievances ({myComplaints.length})</span>
          </h3>
          <span className="text-[10px] text-slate-400">Database Synced</span>
        </div>

        {myComplaints.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-xs">No Active Complaints</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              You haven't filed any complaints. We hope you're having an excellent dining experience at Morya Mess!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myComplaints.map(comp => (
              <div
                key={comp.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-orange-600 block">
                      {comp.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Ref: #{comp.id.slice(-6)} • {new Date(comp.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    {getStatusBadge(comp.status)}
                  </div>
                </div>

                {/* Complaint Text */}
                <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {comp.description}
                </p>

                {/* Owner Reply Box (If available) */}
                {comp.ownerReply && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-900">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mess Owner Response:</span>
                    </div>
                    <p className="text-xs text-emerald-950 font-medium leading-relaxed pl-5">
                      "{comp.ownerReply}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
