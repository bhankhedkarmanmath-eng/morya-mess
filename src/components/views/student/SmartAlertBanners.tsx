import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  X, 
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { Customer, SupabasePaymentRecord } from '../../../types/mess';

interface SmartAlertBannersProps {
  customer: Customer;
  payments: SupabasePaymentRecord[];
  leaveRequests: any[];
  authoritativeBalance: number;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  onNavigateTab: (tab: string) => void;
}

export const SmartAlertBanners: React.FC<SmartAlertBannersProps> = ({
  customer,
  payments,
  leaveRequests,
  authoritativeBalance,
  daysRemaining,
  isExpired,
  isExpiringSoon,
  onNavigateTab
}) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});

  const handleDismiss = (id: string) => {
    setDismissedAlerts(prev => ({ ...prev, [id]: true }));
  };

  // 1. Subscription Alerts (Feature 22)
  const isInactive = customer.status === 'inactive';
  const approvedLeaves = (customer.leaves || []).filter(l => l.approved || l.status === 'approved');
  const totalApprovedLeaveDays = approvedLeaves.reduce((acc, l) => acc + (l.days || 0), 0);

  // 2. Payment Alerts (Feature 23)
  const pendingPayment = payments.find(p => p.status === 'pending');
  const latestVerifiedPayment = payments.find(p => p.status === 'verified');
  const latestRejectedPayment = payments.find(p => p.status === 'rejected');

  // Check if verified payment was within last 5 days
  const isRecentVerified = latestVerifiedPayment && (
    (Date.now() - new Date(latestVerifiedPayment.date || latestVerifiedPayment.createdAt || 0).getTime()) < 5 * 24 * 60 * 60 * 1000
  );

  // 3. Leave Alerts (Feature 24)
  const pendingLeave = leaveRequests.find(l => l.status === 'pending' || (!l.approved && l.status !== 'rejected'));
  const recentApprovedLeave = leaveRequests.find(l => l.status === 'approved' || l.approved);

  return (
    <div className="space-y-2.5">
      {/* ---------------------------------------------------- */}
      {/* FEATURE 22: SUBSCRIPTION ALERTS                     */}
      {/* ---------------------------------------------------- */}
      {isInactive && !dismissedAlerts['sub_inactive'] && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Subscription Inactive</p>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Your mess account is currently marked inactive. Please contact mess management to reactivate your meal pass.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDismiss('sub_inactive')}
            className="text-rose-400 hover:text-rose-600 p-0.5 cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isExpired && !dismissedAlerts['sub_expired'] && (
        <div className="p-3.5 rounded-2xl bg-rose-600 text-white flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-white shrink-0 animate-pulse" />
            <div>
              <p className="font-black text-sm">Meal Subscription Expired</p>
              <p className="text-[11px] text-white/90">
                Plan expired on <strong>{customer.endDate}</strong> ({Math.abs(daysRemaining)} day{Math.abs(daysRemaining) === 1 ? '' : 's'} ago). Pay now to continue dining.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('payments')}
            className="px-3 py-1.5 rounded-xl bg-white text-rose-700 font-black text-xs hover:bg-rose-50 transition cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
          >
            Renew Now
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* FEATURE 23: PAYMENT ALERTS                          */}
      {/* ---------------------------------------------------- */}
      {pendingPayment && !dismissedAlerts[`pay_pending_${pendingPayment.id}`] && (
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-bold text-blue-900">Payment Pending Verification</p>
              <p className="text-[11px] text-blue-800 mt-0.5">
                ₹{pendingPayment.amount} submitted via UPI on {pendingPayment.date || 'today'} (UTR: {pendingPayment.utrNumber || 'Submitted'}). Awaiting Mess Owner verification.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('payments')}
            className="text-blue-700 font-bold hover:underline shrink-0 text-xs cursor-pointer flex items-center gap-0.5"
          >
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {latestRejectedPayment && !dismissedAlerts[`pay_rejected_${latestRejectedPayment.id}`] && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">Payment Rejected</p>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Payment submission of ₹{latestRejectedPayment.amount} was marked rejected by Mess Owner. {latestRejectedPayment.rejectReason ? `Reason: ${latestRejectedPayment.rejectReason}` : 'Please re-check your UTR reference.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('payments')}
            className="text-xs bg-rose-600 text-white font-bold px-2 py-1 rounded-lg shrink-0 cursor-pointer hover:bg-rose-700"
          >
            Re-submit
          </button>
        </div>
      )}

      {/* Outstanding Balance Alert */}
      {authoritativeBalance > 0 && !pendingPayment && !dismissedAlerts['bal_due_notice'] && (
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <span className="font-bold text-amber-900">Outstanding Balance: ₹{authoritativeBalance}</span>
              <p className="text-[11px] text-amber-800">
                Mess fee balance is due. Tap below to clear via UPI QR.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('payments')}
            className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-bold text-[11px] hover:bg-orange-700 transition cursor-pointer shrink-0"
          >
            Pay ₹{authoritativeBalance}
          </button>
        </div>
      )}
    </div>
  );
};
