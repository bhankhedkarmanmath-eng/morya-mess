import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Check, 
  X, 
  Save, 
  CheckCircle2, 
  Lock, 
  UserCheck 
} from 'lucide-react';

interface RolesPermissionsViewProps {
  onBack: () => void;
}

interface PermissionRow {
  module: string;
  owner: boolean;
  manager: boolean;
  counterStaff: boolean;
  kitchenCook: boolean;
}

const DEFAULT_PERMISSIONS: PermissionRow[] = [
  { module: 'Register & Edit Diners', owner: true, manager: true, counterStaff: true, kitchenCook: false },
  { module: 'Scan Gate Attendance', owner: true, manager: true, counterStaff: true, kitchenCook: true },
  { module: 'Record Cash Payments', owner: true, manager: true, counterStaff: true, kitchenCook: false },
  { module: 'Verify / Reject UPI Payments', owner: true, manager: true, counterStaff: false, kitchenCook: false },
  { module: 'Execute Payment Reversals', owner: true, manager: false, counterStaff: false, kitchenCook: false },
  { module: 'Record Mess Expenses', owner: true, manager: true, counterStaff: false, kitchenCook: false },
  { module: 'Approve Leaves & Extensions', owner: true, manager: true, counterStaff: false, kitchenCook: false },
  { module: 'Modify Mess Rules & Pricing', owner: true, manager: false, counterStaff: false, kitchenCook: false },
  { module: 'Edit Weekly Menu Timetable', owner: true, manager: true, counterStaff: false, kitchenCook: true },
  { module: 'View Financial P&L Reports', owner: true, manager: false, counterStaff: false, kitchenCook: false }
];

export const RolesPermissionsView: React.FC<RolesPermissionsViewProps> = ({ onBack }) => {
  const [permissions, setPermissions] = useState<PermissionRow[]>(DEFAULT_PERMISSIONS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggle = (rowIndex: number, role: 'manager' | 'counterStaff' | 'kitchenCook') => {
    setPermissions(prev => {
      const copy = [...prev];
      copy[rowIndex] = {
        ...copy[rowIndex],
        [role]: !copy[rowIndex][role]
      };
      return copy;
    });
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              <span>Roles & Access Permissions Matrix</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Role-based access control (RBAC) across Owner, Manager, Counter Cashier, and Kitchen Staff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Matrix Saved!</span>
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Permissions</span>
          </button>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">System Capability / Module</th>
                <th className="px-5 py-3.5 text-center">Owner (Super Admin)</th>
                <th className="px-5 py-3.5 text-center">Manager (Desk Lead)</th>
                <th className="px-5 py-3.5 text-center">Counter Staff (POS)</th>
                <th className="px-5 py-3.5 text-center">Kitchen Head Cook</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissions.map((p, idx) => (
                <tr key={p.module} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {p.module}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800">
                      <Check className="w-4 h-4" />
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleToggle(idx, 'manager')}
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition cursor-pointer ${
                        p.manager ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {p.manager ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleToggle(idx, 'counterStaff')}
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition cursor-pointer ${
                        p.counterStaff ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {p.counterStaff ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleToggle(idx, 'kitchenCook')}
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition cursor-pointer ${
                        p.kitchenCook ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {p.kitchenCook ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
