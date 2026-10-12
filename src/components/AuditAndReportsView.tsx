import React, { useState, useEffect } from 'react';
import { Customer, Expense, TrialVisitor, Worker, CleanPlateNomination } from '../types/mess';
import { calculateDaysRemaining, getTodayString, loadRules } from '../lib/storage';
import { exportToSpreadsheet } from '../lib/exportUtils';
import { loadCleanPlateNominations, saveCleanPlateNominations } from '../lib/ownerModulesStorage';
import { 
  TrendingUp, 
  AlertCircle, 
  UserCheck, 
  Plus, 
  CreditCard, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  Phone,
  ShieldCheck,
  XCircle,
  FileSpreadsheet,
  Download,
  QrCode,
  Sparkles,
  Trophy
} from 'lucide-react';

interface AuditAndReportsViewProps {
  customers: Customer[];
  expenses: Expense[];
  workers: Worker[];
  trials: TrialVisitor[];
  onOpenRenew: (c: Customer) => void;
  onOpenCustomer360: (c: Customer) => void;
  onAddTrial: (trial: TrialVisitor) => void;
  onConvertTrialToCustomer: (trial: TrialVisitor) => void;
  onApproveLeave?: (customerId: string, leaveId: string, days: number) => void;
  onRejectLeave?: (customerId: string, leaveId: string) => void;
  onOpenTrialQr?: () => void;
  onOpenPredictCampaignResults?: () => void;
  initialTab?: 'pnl' | 'expiry_watch' | 'trials' | 'leave_approvals';
  onTabChange?: (tab: 'pnl' | 'expiry_watch' | 'trials' | 'leave_approvals') => void;
}

export const AuditAndReportsView: React.FC<AuditAndReportsViewProps> = ({
  customers,
  expenses,
  workers,
  trials,
  onOpenRenew,
  onOpenCustomer360,
  onAddTrial,
  onConvertTrialToCustomer,
  onApproveLeave,
  onRejectLeave,
  onOpenTrialQr,
  onOpenPredictCampaignResults,
  initialTab,
  onTabChange
}) => {
  const today = getTodayString();
  const rules = loadRules();
  const [activeTab, setActiveTab] = useState<'pnl' | 'expiry_watch' | 'trials' | 'leave_approvals' | 'clean_plate'>(initialTab || 'pnl');
  const [leaveFilter, setLeaveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Clean Plate Nominations State
  const [cleanPlateNoms, setCleanPlateNoms] = useState<CleanPlateNomination[]>(() => loadCleanPlateNominations());

  useEffect(() => {
    const handleCPUpdate = () => {
      setCleanPlateNoms(loadCleanPlateNominations());
    };
    window.addEventListener('morya_clean_plate_updated', handleCPUpdate);
    window.addEventListener('storage', handleCPUpdate);
    return () => {
      window.removeEventListener('morya_clean_plate_updated', handleCPUpdate);
      window.removeEventListener('storage', handleCPUpdate);
    };
  }, []);

  const handleApproveCleanPlate = (nomId: string) => {
    const updated = cleanPlateNoms.map(n => n.id === nomId ? { ...n, status: 'APPROVED_WINNER' as const, awardedDiscountAmount: 50 } : n);
    setCleanPlateNoms(updated);
    saveCleanPlateNominations(updated);
    alert('🏆 Winner Selected! ₹50 Discount Awarded for Clean Plate Campaign.');
  };

  const handleRejectCleanPlate = (nomId: string) => {
    const updated = cleanPlateNoms.map(n => n.id === nomId ? { ...n, status: 'REJECTED' as const } : n);
    setCleanPlateNoms(updated);
    saveCleanPlateNominations(updated);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSelectTab = (tab: 'pnl' | 'expiry_watch' | 'trials' | 'leave_approvals' | 'clean_plate') => {
    setActiveTab(tab);
    onTabChange?.(tab as any);
  };

  // Add Trial state
  const [isAddTrialOpen, setIsAddTrialOpen] = useState(false);
  const [trialName, setTrialName] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialGender, setTrialGender] = useState<'female' | 'male'>('female');
  const [trialCollege, setTrialCollege] = useState('');
  const [trialType, setTrialType] = useState<'1_day_trial' | '2_day_trial'>('1_day_trial');
  const [trialAmount, setTrialAmount] = useState<number>(90);
  const [trialNotes, setTrialNotes] = useState('');

  // Financial calculations
  const totalRevenue = customers.reduce((sum, c) => {
    const renewalsSum = c.renewals?.reduce((rSum, r) => rSum + r.paidAmount, 0) || 0;
    return sum + c.paidAmount + renewalsSum;
  }, 0);

  const trialRevenue = trials.reduce((sum, t) => sum + t.amountPaid, 0);
  const totalGrossInflow = totalRevenue + trialRevenue;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalGrossInflow - totalExpenses;
  const pendingReceivables = customers.reduce((sum, c) => sum + c.balance, 0);

  // Expiry buckets
  const expiredCustomers = customers.filter(c => calculateDaysRemaining(c.endDate) < 0);
  const expiringSoonCustomers = customers.filter(c => {
    const days = calculateDaysRemaining(c.endDate);
    return days >= 0 && days <= 3;
  });

  const penaltyUnpaidCustomers = customers.filter(c => {
    const unpaid = c.penalties?.filter(p => p.status === 'pending').length || 0;
    return unpaid > 0 || (!c.penaltyPaid && (c.penaltyAmount || 0) > 0);
  });

  // Aggregate all leaves from all customers
  const allLeaves = customers.flatMap(c => 
    (c.leaves || []).map(l => ({
      ...l,
      customerId: c.id,
      customerName: c.name,
      customerPhone: c.phone,
      customerEndDate: c.endDate
    }))
  ).sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());

  const pendingLeaves = allLeaves.filter(l => !l.approved && l.status !== 'rejected');
  const approvedLeaves = allLeaves.filter(l => l.approved || l.status === 'approved');
  const rejectedLeaves = allLeaves.filter(l => l.status === 'rejected');

  const filteredLeaves = allLeaves.filter(l => {
    if (leaveFilter === 'PENDING') return !l.approved && l.status !== 'rejected';
    if (leaveFilter === 'APPROVED') return l.approved || l.status === 'approved';
    if (leaveFilter === 'REJECTED') return l.status === 'rejected';
    return true;
  });

  const handleSaveTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialName.trim()) return;
    const newTrial: TrialVisitor = {
      id: `tr-${Date.now()}`,
      name: trialName.trim(),
      phone: trialPhone.trim() || 'N/A',
      gender: trialGender,
      college: trialCollege.trim(),
      visitType: trialType,
      date: today,
      amountPaid: Number(trialAmount),
      convertedToMonthly: false,
      notes: trialNotes.trim()
    };
    onAddTrial(newTrial);
    setIsAddTrialOpen(false);
    setTrialName('');
    setTrialPhone('');
    setTrialCollege('');
    setTrialNotes('');
  };

  const handleExportTabToExcel = () => {
    const todayStr = getTodayString();
    if (activeTab === 'pnl') {
      const pnlData = [
        { 'Metric Category': 'REVENUE', 'Metric Name': 'Subscription Inflow', 'Amount (INR)': totalRevenue },
        { 'Metric Category': 'REVENUE', 'Metric Name': 'Trial Diners Inflow', 'Amount (INR)': trialRevenue },
        { 'Metric Category': 'REVENUE', 'Metric Name': 'Gross Revenue Inflow', 'Amount (INR)': totalGrossInflow },
        { 'Metric Category': 'EXPENSE', 'Metric Name': 'Operating Kitchen Expenses', 'Amount (INR)': totalExpenses },
        { 'Metric Category': 'PROFIT', 'Metric Name': 'Net Operating Profit', 'Amount (INR)': netProfit },
        { 'Metric Category': 'RECEIVABLE', 'Metric Name': 'Pending Member Fees', 'Amount (INR)': pendingReceivables }
      ];
      exportToSpreadsheet(pnlData, {
        filename: `Morya_Mess_PnL_Statement_${todayStr}`,
        sheetName: 'PnL_Statement',
        format: 'xlsx'
      });
    } else if (activeTab === 'expiry_watch') {
      const listToExport = [...expiredCustomers, ...expiringSoonCustomers, ...penaltyUnpaidCustomers];
      if (listToExport.length === 0) {
        alert('No records available for the selected expiry filter.');
        return;
      }
      const custData = listToExport.map(c => ({
        'Customer ID': c.id,
        'Name': c.name,
        'Phone': c.phone,
        'College / Hostel': c.college || c.collegeOrWork || c.hostel || c.hostelOrAddress || 'Hostel',
        'Plan': (c.planType || 'Monthly').replace(/_/g, ' ').toUpperCase(),
        'End Date': c.endDate,
        'Days Remaining': calculateDaysRemaining(c.endDate),
        'Balance Due (INR)': c.balance,
        'Unpaid Penalty (INR)': c.penaltyAmount || 0,
        'Status': (c.status || 'active').toUpperCase()
      }));
      exportToSpreadsheet(custData, {
        filename: `Morya_Mess_Customers_Watchlist_${todayStr}`,
        sheetName: 'Customer_Report',
        format: 'xlsx'
      });
    } else if (activeTab === 'trials') {
      if (trials.length === 0) {
        alert('No trial diner records available to export.');
        return;
      }
      const trialData = trials.map(t => ({
        'Trial ID': t.id,
        'Name': t.name,
        'Phone': t.phone,
        'College': t.college,
        'Visit Type': t.visitType,
        'Fee Paid (INR)': t.amountPaid,
        'Date': t.date,
        'Converted to Monthly': t.convertedToMonthly ? 'YES' : 'NO',
        'Notes': t.notes || ''
      }));
      exportToSpreadsheet(trialData, {
        filename: `Morya_Mess_Trial_Students_${todayStr}`,
        sheetName: 'Trial_Students',
        format: 'xlsx'
      });
    } else if (activeTab === 'leave_approvals') {
      if (filteredLeaves.length === 0) {
        alert('No leave records available for the selected filter.');
        return;
      }
      const leaveData = filteredLeaves.map(l => ({
        'Customer ID': l.customerId,
        'Name': l.customerName,
        'Phone': l.customerPhone,
        'Start Date': l.startDate,
        'End Date': l.endDate,
        'Days': l.days,
        'Reason': l.reason,
        'Status': l.approved ? 'APPROVED' : 'PENDING',
        'Auto-Extend Applied': l.autoExtendApplied ? 'YES' : 'NO'
      }));
      exportToSpreadsheet(leaveData, {
        filename: `Morya_Mess_Student_Leaves_${todayStr}`,
        sheetName: 'Leaves_Report',
        format: 'xlsx'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Business Audit & Financial Intelligence</h2>
          <p className="text-xs text-slate-500">
            Monthly P&L, Card Expiry Fraud Prevention Watchlist & Trial Customer Conversions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleExportTabToExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            title="Export this report to Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          {activeTab === 'trials' && (
            <button
              id="btn-add-trial-visitor"
              onClick={() => setIsAddTrialOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Trial Visitor (1 or 2 Days)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/90 gap-6 text-xs font-bold text-slate-500">
        <button
          id="tab-pnl"
          onClick={() => handleSelectTab('pnl')}
          className={`pb-3 relative cursor-pointer transition-colors ${
            activeTab === 'pnl'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'hover:text-slate-900'
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          id="tab-expiry"
          onClick={() => handleSelectTab('expiry_watch')}
          className={`pb-3 relative cursor-pointer transition-colors ${
            activeTab === 'expiry_watch'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'hover:text-slate-900'
          }`}
        >
          Expiry & Fraud Watchlist ({expiredCustomers.length + expiringSoonCustomers.length})
        </button>
        <button
          id="tab-trials"
          onClick={() => handleSelectTab('trials')}
          className={`pb-3 relative cursor-pointer transition-colors ${
            activeTab === 'trials'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'hover:text-slate-900'
          }`}
        >
          Trial Diners Tracker ({trials.length})
        </button>
        <button
          id="tab-leave-approvals"
          onClick={() => handleSelectTab('leave_approvals')}
          className={`pb-3 relative cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'leave_approvals'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'hover:text-slate-900'
          }`}
        >
          <span>Student Leave Requests</span>
          {pendingLeaves.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
              {pendingLeaves.length}
            </span>
          )}
        </button>

        <button
          id="tab-clean-plate"
          onClick={() => handleSelectTab('clean_plate')}
          className={`pb-3 relative cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'clean_plate'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'hover:text-slate-900'
          }`}
        >
          <span>🌿 Clean Plate Nominations</span>
          {cleanPlateNoms.filter(n => n.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
              {cleanPlateNoms.filter(n => n.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: P&L Statement */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          {/* Main 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>Total Collected Revenue</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">₹{totalGrossInflow.toLocaleString()}</div>
              <span className="text-[11px] text-slate-500">Subscription + Trial fees</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>Total Operating Expenses</span>
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </span>
              <div className="text-2xl font-bold text-rose-600 mt-1">₹{totalExpenses.toLocaleString()}</div>
              <span className="text-[11px] text-slate-500">Ration, utilities & salaries</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Net Profit / Surplus</span>
              <div className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{netProfit.toLocaleString()}
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {netProfit >= 0 ? 'Net positive mess margin' : 'Cash deficit'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Pending Uncollected Dues</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">₹{pendingReceivables.toLocaleString()}</div>
              <span className="text-[11px] text-amber-700 font-semibold">Student balances to recover</span>
            </div>
          </div>

          {/* Detailed Audit Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue breakdown */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <span>Revenue Breakdown</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Monthly Memberships ({customers.length} total):</span>
                  <span className="font-bold text-slate-900">₹{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Trial Visitors ({trials.length} trials):</span>
                  <span className="font-bold text-slate-900">₹{trialRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Girls Hostels Active Members:</span>
                  <span className="font-bold text-orange-700">
                    {customers.filter(c => c.gender === 'female').length} Students
                  </span>
                </div>
                <div className="flex justify-between py-2 font-bold text-sm pt-2">
                  <span className="text-slate-900">Total Realized Inflow:</span>
                  <span className="text-emerald-600">₹{totalGrossInflow.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Expenses breakdown */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-600" />
                <span>Major Cost Centers</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Ration & Vegetables:</span>
                  <span className="font-bold text-slate-900">
                    ₹{expenses.filter(e => e.category === 'ration_saman' || e.category === 'vegetables').reduce((s, e) => s + e.amount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Utilities (Gas, Rent, Electricity, Water):</span>
                  <span className="font-bold text-slate-900">
                    ₹{expenses.filter(e => ['gas_cylinder', 'rent', 'electricity', 'water_tanker'].includes(e.category)).reduce((s, e) => s + e.amount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Staff Payroll ({workers.length} workers):</span>
                  <span className="font-bold text-slate-900">
                    ₹{workers.reduce((s, w) => s + w.monthlySalary, 0).toLocaleString()} / mo
                  </span>
                </div>
                <div className="flex justify-between py-2 font-bold text-sm pt-2">
                  <span className="text-slate-900">Total Recorded Outflows:</span>
                  <span className="text-rose-600">₹{totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Expiry & Fraud Prevention Watchlist */}
      {activeTab === 'expiry_watch' && (
        <div className="space-y-6">
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-700 shrink-0" />
            <p className="text-xs text-orange-900">
              <strong>Anti-Fraud Protection:</strong> The gate scanner automatically blocks expired cards. Below is your proactive watchlist to notify students before disputes occur.
            </p>
          </div>

          {/* Expired List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2 uppercase tracking-wider">
              <span>⚠️ Expired Subscriptions ({expiredCustomers.length})</span>
            </h3>
            {expiredCustomers.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                No expired cards right now. All students have valid subscriptions!
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Member</th>
                      <th className="px-4 py-3 font-semibold">End Date</th>
                      <th className="px-4 py-3 font-semibold">Days Overdue</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expiredCustomers.map(c => {
                      const days = Math.abs(calculateDaysRemaining(c.endDate));
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <span className="font-mono text-[10px] text-orange-700 font-bold">{c.id}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-rose-600 font-bold">{c.endDate}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                              {days} days expired
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{c.phone}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                                  const msg = `Namaste ${c.name} ji! 🙏 Gentle reminder from Morya Mess: Your dining pass expired on ${c.endDate}. Please renew today to continue meals. Pay via UPI: ${rules.upiId || 'moryamess@upi'}. Thank you!`;
                                  window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 cursor-pointer flex items-center gap-1"
                                title="Send WhatsApp Renewal Reminder"
                              >
                                <span>📱 Remind</span>
                              </button>
                              <button
                                onClick={() => onOpenRenew(c)}
                                className="px-3 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 cursor-pointer"
                              >
                                Renew Now
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expiring Soon List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2 uppercase tracking-wider">
              <span>⏰ Expiring within 3 Days ({expiringSoonCustomers.length})</span>
            </h3>
            {expiringSoonCustomers.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                No cards expiring in the next 3 days.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Member</th>
                      <th className="px-4 py-3 font-semibold">Expiry Date</th>
                      <th className="px-4 py-3 font-semibold">Days Left</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expiringSoonCustomers.map(c => {
                      const days = calculateDaysRemaining(c.endDate);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <span className="font-mono text-[10px] text-orange-700 font-bold">{c.id}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800 font-bold">{c.endDate}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              {days === 0 ? 'Expires TODAY' : `${days} days left`}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{c.phone}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                                  const msg = `Namaste ${c.name} ji! 🙏 Friendly reminder from Morya Mess: Your dining pass expires on ${c.endDate}. Renew early to avoid meal interruption. Pay via UPI: ${rules.upiId || 'moryamess@upi'}. Thank you!`;
                                  window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 cursor-pointer flex items-center gap-1"
                                title="Send WhatsApp Renewal Reminder"
                              >
                                <span>📱 Remind</span>
                              </button>
                              <button
                                onClick={() => onOpenRenew(c)}
                                className="px-3 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 cursor-pointer"
                              >
                                Renew Card
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Penalty Pending List */}
          {penaltyUnpaidCustomers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2 uppercase tracking-wider">
                <span>⚠️ Unpaid Lost Card Penalties (₹60 Fines Pending)</span>
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Member</th>
                      <th className="px-4 py-3 font-semibold">Hostel</th>
                      <th className="px-4 py-3 font-semibold">Penalty Reason</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {penaltyUnpaidCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <span className="font-mono text-[10px] text-orange-700 font-bold">{c.id}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.hostelOrAddress || 'N/A'}</td>
                        <td className="px-4 py-3 text-rose-600 font-semibold">
                          ₹{c.penaltyAmount || 60} ({c.penaltyReason || 'Lost Card Fee'})
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onOpenCustomer360(c)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                          >
                            Open Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Trial Diners Tracker */}
      {activeTab === 'trials' && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                Trial Students & Guest Dining Entries ({trials.length})
              </h3>
              <p className="text-xs text-slate-500">
                Total Trial Revenue Collected: <strong className="text-emerald-700 font-bold">₹{trialRevenue}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenTrialQr && (
                <button
                  onClick={onOpenTrialQr}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                  title="Open Trial Student QR Standee"
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>📱 Trial Student QR Standee</span>
                </button>
              )}
              <button
                onClick={() => setIsAddTrialOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold transition shadow-xs shadow-orange-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Manual Trial Entry</span>
              </button>
            </div>
          </div>

          {trials.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Trial Visitors Logged</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Whenever a new college girl or boy comes for a 1-day (₹90) or 2-day trial, record them here so you can convert them into full monthly subscribers.
              </p>
              <button
                onClick={() => setIsAddTrialOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log First Trial Diner</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Student Name</th>
                    <th className="px-4 py-3 font-semibold">Meal / Shift Type</th>
                    <th className="px-4 py-3 font-semibold">Trial Period</th>
                    <th className="px-4 py-3 font-semibold">Paid (₹)</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Convert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trials.map(t => {
                    const notesLower = (t.notes || '').toLowerCase();
                    const isDinner = t.mealType === 'dinner' || notesLower.includes('dinner') || notesLower.includes('night');
                    const shiftText = isDinner ? 'DINNER' : 'LUNCH';
                    
                    let foodItemText = t.foodItem || '';
                    if (!foodItemText && t.notes) {
                      if (t.notes.includes('Food:')) {
                        foodItemText = t.notes.split('Food:')[1]?.split(';')[0]?.trim() || '';
                      } else if (t.notes.includes('ITEM:')) {
                        foodItemText = t.notes.split('ITEM:')[1]?.split(';')[0]?.trim() || '';
                      }
                    }
                    if (!foodItemText) {
                      foodItemText = t.amountPaid === 50 ? 'Rice and Dal' : 'Regular Veg Thali';
                    }

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500 font-semibold">{t.date}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{t.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{t.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              isDinner 
                                ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}>
                              {shiftText}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {foodItemText}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800">
                            {t.visitType === '1_day_trial' ? '1-Day Trial' : '2-Day Trial'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-black text-emerald-700">₹{t.amountPaid}</td>
                        <td className="px-4 py-3">
                          {t.convertedToMonthly ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Converted to Monthly</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700">
                              <span>Trial Only</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!t.convertedToMonthly && (
                            <button
                              onClick={() => onConvertTrialToCustomer(t)}
                              className="px-3 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 cursor-pointer"
                            >
                              Convert to Member
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Student Leave Requests & Approvals */}
      {activeTab === 'leave_approvals' && (
        <div className="space-y-6">
          {/* Header & Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Pending Approvals</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{pendingLeaves.length} Requests</div>
              <span className="text-[11px] text-slate-500">Requires owner action</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Approved Leaves</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {allLeaves.filter(l => l.approved).length} Approved
              </div>
              <span className="text-[11px] text-slate-500">Subscriptions auto-extended</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Recorded Leaves</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{allLeaves.length} Total</div>
              <span className="text-[11px] text-slate-500">All-time student leaves</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs font-bold flex-wrap">
            <button
              onClick={() => setLeaveFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                leaveFilter === 'PENDING'
                  ? 'bg-amber-100 text-amber-900 font-extrabold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pending Review ({pendingLeaves.length})
            </button>
            <button
              onClick={() => setLeaveFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                leaveFilter === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-900 font-extrabold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Approved ({approvedLeaves.length})
            </button>
            <button
              onClick={() => setLeaveFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                leaveFilter === 'REJECTED'
                  ? 'bg-rose-100 text-rose-900 font-extrabold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rejected ({rejectedLeaves.length})
            </button>
            <button
              onClick={() => setLeaveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                leaveFilter === 'ALL'
                  ? 'bg-slate-200 text-slate-900 font-extrabold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Records ({allLeaves.length})
            </button>
          </div>

          {/* Requests List */}
          {filteredLeaves.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Leave Requests Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {leaveFilter === 'PENDING'
                  ? 'There are currently no pending leave requests from students.'
                  : 'No student leave records match the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLeaves.map(leave => {
                const currentEnd = new Date(leave.customerEndDate);
                const projectedEnd = new Date(currentEnd);
                projectedEnd.setDate(projectedEnd.getDate() + leave.days);
                const isRejected = leave.status === 'rejected';
                const isApproved = leave.approved || leave.status === 'approved';

                return (
                  <div 
                    key={leave.id}
                    className={`p-5 rounded-2xl bg-white border transition-shadow shadow-xs space-y-4 ${
                      isRejected ? 'border-rose-200 bg-rose-50/10' : !isApproved ? 'border-amber-300 shadow-amber-500/5' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{leave.customerName}</h4>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {leave.customerId}
                          </span>
                        </div>
                        {leave.customerPhone && (
                          <a 
                            href={`tel:${leave.customerPhone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-orange-600 hover:underline mt-0.5"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{leave.customerPhone}</span>
                          </a>
                        )}
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isRejected
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                      }`}>
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Approved</span>
                          </>
                        ) : isRejected ? (
                          <>
                            <X className="w-3 h-3 text-rose-600" />
                            <span>Rejected</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Review</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Leave Dates & Reason */}
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500">Leave Period:</span>
                        <span className="font-bold text-slate-900">
                          {leave.startDate} to {leave.endDate} ({leave.days} Days)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500">Reason:</span>
                        <span className="font-medium text-slate-800 italic">
                          {leave.reason || 'Personal Leave'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-500">Extension Status:</span>
                        <span className={`font-bold ${isApproved ? 'text-emerald-700' : isRejected ? 'text-rose-600' : 'text-slate-600'}`}>
                          {isApproved 
                            ? `${leave.customerEndDate} ➔ ${projectedEnd.toISOString().split('T')[0]} (+${leave.days}d)`
                            : isRejected 
                            ? 'No Extension (Request Rejected)' 
                            : `Pending (+${leave.days}d proposed)`}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      {!isApproved && !isRejected ? (
                        <>
                          {onRejectLeave && (
                            <button
                              onClick={() => {
                                onRejectLeave(leave.customerId, leave.id);
                              }}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Reject Request
                            </button>
                          )}
                          {onApproveLeave && (
                            <button
                              onClick={() => onApproveLeave(leave.customerId, leave.id, leave.days)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve & Extend Plan (+{leave.days}d)</span>
                            </button>
                          )}
                        </>
                      ) : isApproved ? (
                        <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Approved & Subscription Extended</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          <span>Leave Application Rejected</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Clean Plate Campaign Nominations Management */}
      {activeTab === 'clean_plate' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌿</span>
                <h3 className="text-base font-extrabold text-white">
                  Clean Plate Campaign Nominations
                </h3>
              </div>
              <p className="text-xs text-emerald-100">
                Review automated student entries for 25+ days zero food wastage. Pick up to 5 Winners each month for ₹50 renewal discount.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-2 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-400/30 text-xs font-bold text-amber-200">
                <span>Winners:</span>
                <strong className="text-white text-sm font-black font-mono">
                  {cleanPlateNoms.filter(n => n.status === 'APPROVED_WINNER').length} / 5
                </strong>
              </div>

              {onOpenPredictCampaignResults && (
                <button
                  onClick={onOpenPredictCampaignResults}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trophy className="w-4 h-4 text-emerald-900" />
                  <span>🏆 Predict 5 Campaign Winners</span>
                </button>
              )}
            </div>
          </div>

          {cleanPlateNoms.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <span className="text-3xl">🌿</span>
              <h4 className="font-extrabold text-slate-800 text-sm">No Nominations Submitted Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Students can nominate themselves from their Student Portal when they complete 25+ days of zero food waste.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-4 py-3">Student / Member</th>
                    <th className="px-4 py-3">Clean Days Streak</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Owner Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {cleanPlateNoms.map(nom => (
                    <tr key={nom.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{nom.customerName || nom.studentName || 'Student Contender'}</div>
                        <div className="text-[10px] font-mono text-slate-500">{nom.customerId || nom.id} &bull; {nom.customerPhone || nom.phone || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] font-mono">
                          {nom.cleanDaysCount || 25} Days Clean Plate
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{nom.monthYear || nom.createdMonth || today}</td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {nom.submittedAt ? new Date(nom.submittedAt).toLocaleDateString() : (nom.date || today)}
                      </td>
                      <td className="px-4 py-3">
                        {nom.status === 'APPROVED_WINNER' ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">
                            🏆 WINNER SELECTED (₹50 OFF)
                          </span>
                        ) : nom.status === 'REJECTED' ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                            REJECTED / DISMISSED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] animate-pulse">
                            PENDING OWNER REVIEW
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {nom.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRejectCleanPlate(nom.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveCleanPlate(nom.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer shadow-xs"
                            >
                              🏆 Select Winner (₹50 Off)
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-bold">Action Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Trial Modal */}
      {isAddTrialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Trial Customer</h3>
                  <p className="text-[11px] text-slate-500">1 or 2-day trial before monthly membership</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddTrialOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrial} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Visitor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohini Patil"
                  value={trialName}
                  onChange={e => setTrialName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={trialPhone}
                    onChange={e => setTrialPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Gender
                  </label>
                  <select
                    value={trialGender}
                    onChange={e => setTrialGender(e.target.value as 'female' | 'male')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  >
                    <option value="female">Girl / Female</option>
                    <option value="male">Boy / Male</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    College / Hostel
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Modern College"
                    value={trialCollege}
                    onChange={e => setTrialCollege(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Trial Package
                  </label>
                  <select
                    value={trialType}
                    onChange={e => {
                      const type = e.target.value as '1_day_trial' | '2_day_trial';
                      setTrialType(type);
                      setTrialAmount(type === '1_day_trial' ? 90 : 180);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  >
                    <option value="1_day_trial">1-Day Trial (₹90)</option>
                    <option value="2_day_trial">2-Day Trial (₹180)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={trialAmount}
                  onChange={e => setTrialAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Came with hostel roommate, liked chapati"
                  value={trialNotes}
                  onChange={e => setTrialNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddTrialOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Trial Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
