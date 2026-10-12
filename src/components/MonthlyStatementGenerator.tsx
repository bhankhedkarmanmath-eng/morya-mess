import React, { useState, useMemo } from 'react';
import { Customer } from '../types/mess';
import { Customer360Data, fetchCustomer360Profile } from '../lib/ownerFeaturesApi';
import { 
  FileText, 
  Download, 
  Calendar, 
  Search, 
  Printer, 
  CheckCircle, 
  Utensils, 
  CreditCard,
  RefreshCw,
  ArrowDown,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Phone,
  Building,
  ShieldCheck,
  Send
} from 'lucide-react';

interface MonthlyStatementGeneratorProps {
  customers: Customer[];
  selectedCustomer?: Customer | null;
}

export const MonthlyStatementGenerator: React.FC<MonthlyStatementGeneratorProps> = ({
  customers,
  selectedCustomer: initialCustomer
}) => {
  const [selectedCustId, setSelectedCustId] = useState(initialCustomer?.id || customers[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [statementData, setStatementData] = useState<Customer360Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchDiner, setSearchDiner] = useState('');

  const activeCust = statementData?.customer || customers.find(c => c.id === selectedCustId);

  // Filtered customer list for quick selection
  const filteredDiners = useMemo(() => {
    if (!searchDiner.trim()) return customers.slice(0, 20);
    const q = searchDiner.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.id.toLowerCase().includes(q));
  }, [customers, searchDiner]);

  const handleGenerate = async () => {
    if (!selectedCustId) return;
    setIsLoading(true);
    try {
      const data = await fetchCustomer360Profile(selectedCustId);
      setStatementData(data);
    } catch {}
    setIsLoading(false);
  };

  // Filter payments & attendance for selected month
  const monthPayments = useMemo(() => {
    if (!activeCust) return [];
    const directPayments = (activeCust.payments || []).filter(p => p.date?.startsWith(selectedMonth));
    const remotePayments = (statementData?.payments || []).filter(p => p.createdAt?.startsWith(selectedMonth));
    
    // Merge
    const map = new Map<string, any>();
    directPayments.forEach(p => map.set(p.id, {
      date: p.date,
      amount: p.amount,
      mode: p.mode,
      reference: p.transactionId || 'Direct Payment',
      status: 'verified'
    }));
    remotePayments.forEach(p => map.set(p.id, {
      date: p.createdAt?.split('T')[0],
      amount: p.amount,
      mode: p.paymentMode,
      reference: p.transactionReference || p.notes || 'Verified',
      status: p.status
    }));

    return Array.from(map.values());
  }, [activeCust, statementData, selectedMonth]);

  const monthAttendance = useMemo(() => {
    return (statementData?.attendanceLogs || []).filter(a => a.mealDate?.startsWith(selectedMonth));
  }, [statementData, selectedMonth]);

  const totalPaidInMonth = monthPayments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const lunchCount = monthAttendance.filter(a => a.mealShift === 'lunch' && a.isValid).length;
  const dinnerCount = monthAttendance.filter(a => a.mealShift === 'dinner' && a.isValid).length;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsAppBill = () => {
    if (!activeCust) return;
    const cleanPhone = activeCust.phone.replace(/[^0-9]/g, '');
    const billText = `📄 *MORYA MESS — MONTHLY DINING STATEMENT & BILL*\n\n👤 *Student Name:* ${activeCust.name} (ID: ${activeCust.id})\n📅 *Billing Cycle:* ${selectedMonth}\n🍲 *Meal Plan:* ${(activeCust.mealPreference || activeCust.planType || 'Full Mess').toUpperCase()}\n\n💰 *FINANCIAL SUMMARY:*\n• Total Plan Fee: ₹${activeCust.totalAmount || 2500}\n• Amount Paid in ${selectedMonth}: ₹${totalPaidInMonth}\n• Closing Balance Due: ₹${activeCust.balance || 0}\n\n🍽️ *ATTENDANCE BREAKDOWN:*\n• Total Lunches Eaten: ${lunchCount}\n• Total Dinners Eaten: ${dinnerCount}\n• Total Plates: ${lunchCount + dinnerCount}\n\n_Thank you for dining with Morya Mess Pune! For any query, feel free to contact owner desk._`;
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(billText)}`;
    window.open(url, '_blank');
  };

  const handleExportCSV = () => {
    if (!activeCust) return;

    let csv = `MORYA MESS MONTHLY SETTLEMENT INVOICE\n`;
    csv += `Customer Name,${activeCust.name}\n`;
    csv += `Customer ID,${activeCust.id}\n`;
    csv += `Mobile,${activeCust.phone}\n`;
    csv += `Billing Month,${selectedMonth}\n`;
    csv += `College,${activeCust.college || activeCust.collegeOrWork || 'N/A'}\n\n`;

    csv += `PAYMENT TRANSACTIONS\n`;
    csv += `Date,Amount,Mode,Reference,Status\n`;
    monthPayments.forEach(p => {
      csv += `${p.date},${p.amount},${p.mode},"${p.reference}",${p.status}\n`;
    });

    csv += `\nATTENDANCE LOGS SUMMARY\n`;
    csv += `Total Meals,${monthAttendance.length}\n`;
    csv += `Lunch Meals,${lunchCount}\n`;
    csv += `Dinner Meals,${dinnerCount}\n\n`;

    csv += `FINANCIAL SETTLEMENT\n`;
    csv += `Plan Fee,${activeCust.totalAmount || 2500}\n`;
    csv += `Total Paid in Month,${totalPaidInMonth}\n`;
    csv += `Current Due Balance,${activeCust.balance || 0}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Statement_${activeCust.name.replace(/\s+/g, '_')}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Selector & Generator Controls Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              <span>Monthly Settlements & Bill Invoices</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official tax / fee settlement invoice generator with attendance audit and payment receipts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Load Full 360° Data</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Invoice</span>
            </button>
            <button
              onClick={handleSendWhatsAppBill}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Bill</span>
            </button>
          </div>
        </div>

        {/* Diner and Month Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">1. Choose Billing Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">2. Select Student Diner</label>
            <div className="flex gap-2">
              <select
                value={selectedCustId}
                onChange={(e) => setSelectedCustId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id}) • {c.phone} • {c.college || 'Hostel'}
                  </option>
                ))}
              </select>
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl shrink-0 transition"
                title="Download CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OFFICIAL PRINTABLE A4 INVOICE & STATEMENT CARD */}
      {activeCust && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-10 max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-slate-200 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-[10px] font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-orange-600" />
                <span>OFFICIAL DINING STATEMENT & BILL INVOICE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                MORYA MESS PUNE
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Near Boys & Girls Hostel, College Road, Pune - 411038
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Reg No: MH-PUN-MESS-2026 • Contact: +91 84850 27826
              </p>
            </div>

            <div className="text-right sm:text-right bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Statement Period</span>
              <span className="text-base font-black text-slate-900 block">{selectedMonth}</span>
              <span className="text-[11px] text-slate-500 font-mono block mt-1">Invoice ID: INV-{activeCust.id.replace(/[^0-9]/g, '') || '001'}</span>
            </div>
          </div>

          {/* Student Diner Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold">Student Name:</span>
              <span className="font-black text-slate-900 text-sm">{activeCust.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Student ID & Mobile:</span>
              <span className="font-mono font-bold text-slate-900">{activeCust.id} • {activeCust.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">College / Hostel:</span>
              <span className="font-bold text-slate-900">{activeCust.collegeOrWork || activeCust.college || 'Hostel Room #' + ((activeCust as any).roomNo || 'N/A')}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Meal Subscription:</span>
              <span className="font-bold text-orange-700 uppercase">{(activeCust.mealPreference || activeCust.planType || 'Full Mess').replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Table 1: Payments Made in Billing Month */}
          <div className="space-y-2">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payments Received During Billing Cycle</span>
            </h3>

            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Amount (INR)</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Transaction UTR / Notes</th>
                  <th className="p-3 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 font-medium">
                      No payments recorded during {selectedMonth}. Total dues carried forward.
                    </td>
                  </tr>
                ) : (
                  monthPayments.map((p, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-slate-800">{p.date}</td>
                      <td className="p-3 font-black text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 uppercase font-semibold text-slate-700">{p.mode}</td>
                      <td className="p-3 font-mono text-slate-500">{p.reference}</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                          ✓ {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table 2: Meal Attendance Record for Billing Month */}
          <div className="space-y-2">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Utensils className="w-4 h-4 text-orange-600" />
              <span>Dining Attendance & Gate Scan Summary</span>
            </h3>

            <div className="grid grid-cols-3 gap-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-200 text-center">
              <div>
                <span className="text-xs text-slate-500 block">Total Plates Served</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{lunchCount + dinnerCount} Meals</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Lunch Scans</span>
                <span className="text-xl font-black text-orange-600 mt-0.5 block">{lunchCount} Lunches</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Dinner Scans</span>
                <span className="text-xl font-black text-indigo-600 mt-0.5 block">{dinnerCount} Dinners</span>
              </div>
            </div>
          </div>

          {/* Final Financial Settlement Box */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-300 border-b border-slate-800 pb-2">
              <span>Standard Subscription Fee:</span>
              <span className="font-bold text-white">₹{activeCust.totalAmount || 2500}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300 border-b border-slate-800 pb-2">
              <span>Total Fees Collected in {selectedMonth}:</span>
              <span className="font-bold text-emerald-400">₹{totalPaidInMonth}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-black pt-1">
              <span>Closing Net Balance Due / (Advance):</span>
              <span className={activeCust.balance > 0 ? 'text-rose-400 text-base' : 'text-emerald-400 text-base'}>
                ₹{activeCust.balance || 0}
              </span>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-700">Thank you for dining with Morya Mess!</p>
              <p>Computer generated invoice, valid without physical stamp.</p>
            </div>
            <div className="text-right">
              <div className="w-32 border-b border-slate-400 mb-1" />
              <span className="font-bold text-slate-800">Authorized Signatory</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
