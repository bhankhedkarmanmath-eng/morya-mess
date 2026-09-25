import React, { useState, useEffect, useMemo } from 'react';
import { WalkinPOSToken } from '../../types/mess';
import { loadWalkinTokens } from '../../lib/ownerModulesStorage';
import { 
  CreditCard, 
  ArrowLeft, 
  Search, 
  DollarSign, 
  QrCode, 
  Download, 
  Printer, 
  Utensils, 
  RefreshCw,
  Calendar
} from 'lucide-react';

interface WalkinPaymentsViewProps {
  onBack: () => void;
  onNavigatePOS?: () => void;
}

export const WalkinPaymentsView: React.FC<WalkinPaymentsViewProps> = ({
  onBack,
  onNavigatePOS
}) => {
  const [tokens, setTokens] = useState<WalkinPOSToken[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'cash' | 'upi'>('all');

  useEffect(() => {
    setTokens(loadWalkinTokens());
  }, []);

  const filtered = useMemo(() => {
    return tokens.filter(t => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        t.guestName.toLowerCase().includes(q) ||
        (t.guestPhone && t.guestPhone.includes(q)) ||
        t.tokenNumber.toString().includes(q) ||
        t.mealTypeName.toLowerCase().includes(q);

      const matchesMode = modeFilter === 'all' || t.paymentMode === modeFilter;
      return matchesSearch && matchesMode;
    });
  }, [tokens, searchTerm, modeFilter]);

  const totalWalkinRevenue = tokens.reduce((sum, t) => sum + (t.status === 'paid' ? t.totalAmount : 0), 0);
  const totalTokensSold = tokens.filter(t => t.status === 'paid').length;

  const handleExportCSV = () => {
    let csv = `Token #,Guest Name,Phone,Meal Type,Quantity,Rate,Total (₹),Mode,UTR,Status,Date Time\n`;
    filtered.forEach(t => {
      csv += `${t.tokenNumber},"${t.guestName}","${t.guestPhone || ''}","${t.mealTypeName}",${t.quantity},${t.ratePerMeal},${t.totalAmount},"${t.paymentMode}","${t.utrReference || ''}","${t.status}","${t.createdAt}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Walkin_POS_Sales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to POS"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <span>Walk-in POS Sales & Payment History</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Audited historical sales of casual visitor tokens, guest plates, and day passes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          {onNavigatePOS && (
            <button
              onClick={onNavigatePOS}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              + Issue New Token
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total POS Revenue</span>
          <div className="text-2xl font-black text-emerald-700">₹{totalWalkinRevenue.toLocaleString()}</div>
          <span className="text-[11px] text-slate-400 font-medium">All walk-in tokens sold</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Plates Sold</span>
          <div className="text-2xl font-black text-slate-900">{totalTokensSold}</div>
          <span className="text-[11px] text-slate-400 font-medium">Guest tokens issued</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Ticket Size</span>
          <div className="text-2xl font-black text-orange-600">
            ₹{totalTokensSold > 0 ? Math.round(totalWalkinRevenue / totalTokensSold) : 80}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Revenue per guest transaction</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by token #, guest name, or meal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['all', 'cash', 'upi'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                modeFilter === mode 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode === 'all' ? 'All Modes' : mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Walk-in POS Records</h4>
            <p className="text-xs text-slate-500 mt-0.5">Use the Walk-in POS console to issue casual dining tokens.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Token #</th>
                  <th className="px-5 py-3.5">Guest Diner</th>
                  <th className="px-5 py-3.5">Meal Thali</th>
                  <th className="px-5 py-3.5">Qty</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5 text-right">Time & Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono font-black text-slate-900 text-sm">
                      #{t.tokenNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{t.guestName}</div>
                      {t.guestPhone && <div className="text-[10px] text-slate-400 font-mono">{t.guestPhone}</div>}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {t.mealTypeName}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-700">
                      {t.quantity}
                    </td>
                    <td className="px-5 py-3.5 font-black text-emerald-700 text-sm">
                      ₹{t.totalAmount}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold font-mono uppercase px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                        {t.paymentMode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-500">
                      <div>{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</div>
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
