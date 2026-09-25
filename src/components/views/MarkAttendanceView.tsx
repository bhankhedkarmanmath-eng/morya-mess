import React, { useState } from 'react';
import { Customer, MealLog, MealType } from '../../types/mess';
import { 
  CheckCircle, 
  ArrowLeft, 
  Search, 
  Utensils, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  QrCode,
  UserCheck
} from 'lucide-react';

interface MarkAttendanceViewProps {
  customers: Customer[];
  mealLogs: MealLog[];
  onBack: () => void;
  onRecordMeal: (customerId: string, manualShift?: MealType) => { success: boolean; message: string };
  onOpenScanner: () => void;
}

export const MarkAttendanceView: React.FC<MarkAttendanceViewProps> = ({
  customers,
  mealLogs,
  onBack,
  onRecordMeal,
  onOpenScanner
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter today's meal logs for selected meal
  const todayMealLogs = mealLogs.filter(m => m.date === selectedDate && m.mealType === selectedMeal);

  // Search filtered customers
  const filteredCustomers = customers.filter(c => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.id.toLowerCase().includes(q);
  });

  const handleMark = (customerId: string) => {
    setActionFeedback(null);
    // Check if duplicate
    const alreadyMarked = mealLogs.some(
      m => m.customerId === customerId && m.date === selectedDate && m.mealType === selectedMeal
    );

    if (alreadyMarked) {
      setActionFeedback({
        type: 'error',
        message: `Attendance for this member was ALREADY RECORDED for ${selectedMeal.toUpperCase()} on ${selectedDate}!`
      });
      return;
    }

    const res = onRecordMeal(customerId, selectedMeal);
    if (res.success) {
      setActionFeedback({
        type: 'success',
        message: `Attendance marked successfully for ${selectedMeal.toUpperCase()}!`
      });
    } else {
      setActionFeedback({
        type: 'error',
        message: res.message || 'Could not record attendance'
      });
    }
  };

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
              <CheckCircle className="w-5 h-5 text-orange-600" />
              <span>Mark Gate Attendance (Manual / Counter Desk)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct counter entry for students without smartphone, duplicate check enforced
            </p>
          </div>
        </div>

        <button
          onClick={onOpenScanner}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <QrCode className="w-4 h-4 text-orange-400" />
          <span>Launch QR Scanner Screen</span>
        </button>
      </div>

      {/* Control Strip: Meal Shift & Date */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Meal Shift</label>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['lunch', 'dinner'] as const).map(meal => (
              <button
                key={meal}
                onClick={() => setSelectedMeal(meal)}
                className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition cursor-pointer ${
                  selectedMeal === meal ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {meal === 'lunch' ? '☀️ Lunch' : '🌙 Dinner'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Attendance Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-slate-900"
          />
        </div>

        <div className="bg-orange-50/60 border border-orange-100 p-3 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-800 block">Current Roster</span>
            <span className="font-black text-slate-900 text-sm">
              {todayMealLogs.length} Marked
            </span>
          </div>
          <span className="text-[10px] font-mono text-orange-700 uppercase bg-orange-100/80 px-2 py-0.5 rounded font-bold">
            {selectedMeal}
          </span>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
          actionFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
            : 'bg-rose-50 border-rose-200 text-rose-900 font-bold'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button 
            onClick={() => setActionFeedback(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two Column Layout: Student Search to Mark + Today's Live Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Search & Mark */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search member by Name, Phone, or ID to mark attendance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No matching registered diners.
                </div>
              ) : (
                filteredCustomers.map(cust => {
                  const alreadyMarked = mealLogs.some(
                    m => m.customerId === cust.id && m.date === selectedDate && m.mealType === selectedMeal
                  );

                  return (
                    <div key={cust.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-slate-900 text-xs">{cust.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                          <span>{cust.phone}</span>
                          <span>•</span>
                          <span className="capitalize">{cust.planType?.replace('_', ' ')}</span>
                          {cust.balance > 0 && (
                            <span className="text-rose-600 font-bold">Due: ₹{cust.balance}</span>
                          )}
                        </div>
                      </div>

                      <div>
                        {alreadyMarked ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Marked</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMark(cust.id)}
                            className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                          >
                            Mark Present
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Roster of Marked Attendance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Marked for {selectedMeal.toUpperCase()}</span>
            </h3>
            <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {todayMealLogs.length}
            </span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto">
            {todayMealLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No entries recorded yet for this shift.
              </div>
            ) : (
              todayMealLogs.map((log, idx) => (
                <div key={log.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-black text-slate-900">{log.customerName || 'Diner'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {log.time || 'Counter desk'}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-emerald-100 text-emerald-800">
                    {log.isManual ? 'Counter' : 'QR Scan'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
