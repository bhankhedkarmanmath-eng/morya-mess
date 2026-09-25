import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase, verifyPaymentInSupabase } from '../../lib/ownerFeaturesApi';
import { 
  QrCode, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter,
  Check,
  RefreshCw,
  Copy
} from 'lucide-react';

interface UPIPaymentsViewProps {
  customers: Customer[];
  onBack: () => void;
  onOpenCustomer360?: (c: Customer) => void;
}

export const UPIPaymentsView: React.FC<UPIPaymentsViewProps> = ({
  customers,
  onBack,
  onOpenCustomer360
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadUpiPayments();
  }, []);

  const loadUpiPayments = async () => {
    setIsLoading(true);
    const data = await fetchPaymentsFromSupabase();
    // Exclusively UPI payments
    const upiOnly = data.filter(p => p.paymentMode === 'upi');
    setPayments(upiOnly);
    setIsLoading(false);
  };

  const handleVerify = async (paymentId: string) => {
    setVerifyingId(paymentId);
    await verifyPaymentInSupabase(paymentId, 'Owner Desk');
    await loadUpiPayments();
    setVerifyingId(null);
  };

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.customerPhone && p.customerPhone.includes(q)) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
        p.amount.toString().includes(q);

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchTerm, statusFilter]);

  const totalUpiAmount = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  const pendingUpiCount = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Billing"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-orange-600" />
              <span>UPI Payments & VPA Collections</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Dedicated UPI transaction register with UTR reference verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs">
          <div className="bg-orange-50 border border-orange-200 px-3.5 py-1.5 rounded-xl font-bold text-orange-800">
            Total UPI Verified: <span className="font-black">₹{totalUpiAmount.toLocaleString()}</span>
          </div>
          <button
            onClick={loadUpiPayments}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, phone, or 12-digit UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['all', 'pending', 'verified'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                statusFilter === st 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'pending' ? `Pending (${pendingUpiCount})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* UPI Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading UPI payments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <QrCode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No UPI Payments Found</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {searchTerm ? 'No UPI payments match your search query.' : 'No UPI payments recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">UTR / Reference</th>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-black text-slate-900">{p.customerName || 'Diner'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.customerPhone || 'N/A'}</div>
                    </td>
                    <td className="px-5 py-3.5 font-black text-slate-900 text-sm">
                      ₹{p.amount}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.transactionReference ? (
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {p.transactionReference}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                      <div className="text-slate-400">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      ) : p.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 animate-pulse" />
                          <span>Pending Review</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p.status === 'pending' ? (
                        <button
                          onClick={() => handleVerify(p.id)}
                          disabled={verifyingId === p.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Check className="w-3 h-3" />
                          <span>{verifyingId === p.id ? 'Verifying...' : 'Verify'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Recorded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
