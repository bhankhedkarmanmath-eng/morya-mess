import React, { useState, useEffect } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase } from '../../lib/ownerFeaturesApi';
import { 
  CreditCard, 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  FileText,
  RotateCcw,
  Plus
} from 'lucide-react';

interface BillingOverviewViewProps {
  customers: Customer[];
  onBack: () => void;
  onNavigateSubModule: (module: 'upi_payments' | 'cash_payments' | 'pending_payments' | 'payment_verification' | 'payment_history' | 'customer_ledger' | 'statement_calc' | 'qr_settings') => void;
  onOpenCustomer360?: (c: Customer) => void;
}

export const BillingOverviewView: React.FC<BillingOverviewViewProps> = ({
  customers,
  onBack,
  onNavigateSubModule,
  onOpenCustomer360
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchPaymentsFromSupabase();
    setPayments(data);
    setIsLoading(false);
  };

  // Financial aggregates
  const verifiedPayments = payments.filter(p => p.status === 'verified');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  const totalInflow = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
  const upiInflow = verifiedPayments.filter(p => p.paymentMode === 'upi').reduce((sum, p) => sum + p.amount, 0);
  const cashInflow = verifiedPayments.filter(p => p.paymentMode === 'cash').reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstandingDues = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

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
              <CreditCard className="w-5 h-5 text-orange-600" />
              <span>Billing & Payments Overview</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial health, collections split, pending verifications, and module shortcuts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onNavigateSubModule('cash_payments')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Cash</span>
          </button>
          <button
            onClick={() => onNavigateSubModule('qr_settings')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-orange-400" />
            <span>Mess QR Standee</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Verified Inflow</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹{totalInflow.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 font-medium">All recorded student subscriptions</div>
        </div>

        <div 
          onClick={() => onNavigateSubModule('upi_payments')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1 hover:border-orange-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">UPI Inflow</span>
            <QrCode className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-600">₹{upiInflow.toLocaleString()}</div>
          <div className="text-[11px] text-orange-600 font-bold flex items-center justify-between">
            <span>Direct VPA transfers</span>
            <span>View ➔</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateSubModule('cash_payments')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1 hover:border-emerald-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash Inflow</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">₹{cashInflow.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600 font-bold flex items-center justify-between">
            <span>Counter cash receipts</span>
            <span>View ➔</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateSubModule('pending_payments')}
          className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-1 bg-amber-50/30 hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Verification</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800">
            {pendingPayments.length} <span className="text-sm font-bold font-mono">({pendingAmount > 0 ? `₹${pendingAmount}` : '₹0'})</span>
          </div>
          <div className="text-[11px] text-amber-700 font-bold flex items-center justify-between">
            <span>Review submitted UTRs</span>
            <span>Verify ➔</span>
          </div>
        </div>
      </div>

      {/* Module Shortcuts Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Dedicated Payment Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div 
            onClick={() => onNavigateSubModule('upi_payments')}
            className="p-4 rounded-xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">UPI Payments</h4>
                <p className="text-[11px] text-slate-400">View & filter UPI transactions with UTR</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          <div 
            onClick={() => onNavigateSubModule('cash_payments')}
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Cash Payments</h4>
                <p className="text-[11px] text-slate-400">Record cash & view counter receipts</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          <div 
            onClick={() => onNavigateSubModule('payment_verification')}
            className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Payment Verification</h4>
                <p className="text-[11px] text-slate-400">Verify student submitted UTR payments</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          <div 
            onClick={() => onNavigateSubModule('payment_history')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Payment History</h4>
                <p className="text-[11px] text-slate-400">Complete historical financial ledger</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          <div 
            onClick={() => onNavigateSubModule('customer_ledger')}
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Customer Ledger</h4>
                <p className="text-[11px] text-slate-400">Chronological charges, dues & balances</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          <div 
            onClick={() => onNavigateSubModule('statement_calc')}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Monthly Statement</h4>
                <p className="text-[11px] text-slate-400">Deterministic statement calculator & PDF</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Recent Verified Payments Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Recent Payment Transactions</h3>
          <button
            onClick={() => onNavigateSubModule('payment_history')}
            className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
          >
            View Full History ➔
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading transactions...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No payment records found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.slice(0, 8).map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/60 transition">
                <div className="space-y-0.5">
                  <div className="font-black text-slate-900 flex items-center gap-2">
                    <span>{p.customerName || 'Member'}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {p.paymentMode}
                    </span>
                    {p.transactionReference && (
                      <span className="text-[10px] font-mono text-slate-400">UTR: {p.transactionReference}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {new Date(p.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-slate-900 text-sm">₹{p.amount}</div>
                  <span className={`text-[10px] font-bold uppercase ${
                    p.status === 'verified' ? 'text-emerald-600' :
                    p.status === 'pending' ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
