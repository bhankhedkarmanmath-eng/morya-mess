import React, { useState } from 'react';
import { Worker, CleaningInspection } from '../../types/mess';
import { 
  UserCheck, 
  ArrowLeft, 
  Plus, 
  Phone, 
  DollarSign, 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  X,
  Sparkles
} from 'lucide-react';

interface StaffManagementViewProps {
  workers: Worker[];
  cleanings: CleaningInspection[];
  onBack: () => void;
  onAddWorker: (worker: Omit<Worker, 'id' | 'attendance'>) => void;
  onDeleteWorker?: (id: string) => void;
  onUpdateWorkerAttendance?: (id: string, date: string, status: 'present' | 'absent' | 'half_day' | 'leave') => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  workers,
  cleanings,
  onBack,
  onAddWorker,
  onDeleteWorker,
  onUpdateWorkerAttendance
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Head Cook' | 'Assistant Cook' | 'Roti Maker' | 'Cleaner & Dishwasher' | 'Helper & Delivery'>('Head Cook');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !monthlySalary) return;

    onAddWorker({
      name: name.trim(),
      phone: phone.trim() || 'N/A',
      role,
      monthlySalary: Number(monthlySalary),
      joiningDate,
      status: 'active'
    });

    setName('');
    setPhone('');
    setMonthlySalary('');
    setIsAddOpen(false);
  };

  const totalMonthlyPayroll = workers.reduce((sum, w) => sum + (w.monthlySalary || 0), 0);

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
              <UserCheck className="w-5 h-5 text-orange-600" />
              <span>Staff Management & Kitchen Personnel</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Head cooks, chapati makers, cleaners, daily attendance registers, and monthly wages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs">
          <div className="bg-slate-100 px-3.5 py-2 rounded-xl font-bold text-slate-700">
            Total Staff: <span className="text-slate-900 font-black">{workers.length}</span> (₹{totalMonthlyPayroll.toLocaleString()}/mo)
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Add Staff Member</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Staff Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Shinde"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role / Designation</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                >
                  <option value="Head Cook">Head Cook (Maharaj)</option>
                  <option value="Assistant Cook">Assistant Cook</option>
                  <option value="Roti Maker">Chapati / Roti Maker</option>
                  <option value="Cleaner & Dishwasher">Cleaner & Dishwasher</option>
                  <option value="Helper & Delivery">Counter Helper & Server</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Monthly Salary (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 15000"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Joining Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map(w => {
          const todayStatus = w.attendance?.[todayStr] || 'present';

          return (
            <div key={w.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{w.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                    {w.role}
                  </span>
                </div>

                {onDeleteWorker && (
                  <button
                    onClick={() => onDeleteWorker(w.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Remove staff"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{w.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span>Monthly Wage:</span>
                  <span className="font-black text-slate-900 font-mono">₹{w.monthlySalary?.toLocaleString()}</span>
                </div>
              </div>

              {/* Attendance Quick Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                  Today's Attendance ({todayStr})
                </span>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  {(['present', 'half_day', 'absent'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => onUpdateWorkerAttendance && onUpdateWorkerAttendance(w.id, todayStr, st)}
                      className={`py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                        todayStatus === st
                          ? st === 'present' ? 'bg-emerald-600 text-white' :
                            st === 'half_day' ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
