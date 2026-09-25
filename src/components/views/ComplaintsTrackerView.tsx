import React, { useState, useEffect, useMemo } from 'react';
import { CustomerComplaint } from '../../types/mess';
import { loadComplaints, saveComplaints } from '../../lib/ownerModulesStorage';
import { 
  FileText, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Send, 
  Filter,
  Check
} from 'lucide-react';

interface ComplaintsTrackerViewProps {
  onBack: () => void;
}

export const ComplaintsTrackerView: React.FC<ComplaintsTrackerViewProps> = ({ onBack }) => {
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('all');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    setComplaints(loadComplaints());
  }, []);

  const filtered = useMemo(() => {
    return complaints.filter(c => statusFilter === 'all' || c.status === statusFilter);
  }, [complaints, statusFilter]);

  const handleUpdateStatus = (id: string, newStatus: CustomerComplaint['status']) => {
    const updated = complaints.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: newStatus,
          resolvedAt: newStatus === 'RESOLVED' || newStatus === 'CLOSED' ? new Date().toISOString() : c.resolvedAt
        };
      }
      return c;
    });
    setComplaints(updated);
    saveComplaints(updated);
  };

  const handleSendReply = (id: string) => {
    if (!replyText.trim()) return;

    const updated = complaints.map(c => {
      if (c.id === id) {
        return {
          ...c,
          ownerReply: replyText.trim(),
          status: c.status === 'NEW' ? ('IN_PROGRESS' as const) : c.status
        };
      }
      return c;
    });

    setComplaints(updated);
    saveComplaints(updated);
    setActiveReplyId(null);
    setReplyText('');
  };

  const newCount = complaints.filter(c => c.status === 'NEW').length;
  const inProgressCount = complaints.filter(c => c.status === 'IN_PROGRESS').length;

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
              <FileText className="w-5 h-5 text-rose-600" />
              <span>Customer Grievances & Complaints Tracker</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Food hygiene, roti softness, taste issues, and prompt owner resolution responses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="bg-rose-50 border border-rose-200 text-rose-900 font-bold px-3 py-1.5 rounded-xl">
            Active Issues: <span className="font-black">{newCount + inProgressCount}</span>
          </span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer shrink-0 ${
              statusFilter === st ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st === 'all' ? 'All Complaints' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Complaints Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Grievances Found</h4>
            <p className="text-xs text-slate-500 mt-0.5">No student complaints match this status category.</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      c.status === 'NEW' ? 'bg-rose-100 text-rose-800' :
                      c.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                      c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <span className="font-black text-slate-900 text-sm">{c.customerName}</span>
                    {c.customerPhone && <span className="text-slate-400 font-mono text-xs">({c.customerPhone})</span>}
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {c.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{c.description}"
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono block">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => handleUpdateStatus(c.id, 'IN_PROGRESS')}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(c.id, 'RESOLVED')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition cursor-pointer"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>

              {/* Owner Reply */}
              {c.ownerReply ? (
                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 text-xs space-y-1">
                  <span className="font-bold text-orange-950 flex items-center gap-1 text-[11px]">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
                    <span>Owner Resolution Note:</span>
                  </span>
                  <p className="text-slate-700 font-medium">{c.ownerReply}</p>
                </div>
              ) : activeReplyId === c.id ? (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type official response / action taken..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setActiveReplyId(null)}
                      className="px-3 py-1 text-slate-500 font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSendReply(c.id)}
                      className="px-4 py-1.5 bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send Reply</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setActiveReplyId(c.id);
                    setReplyText('');
                  }}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Reply to Diner</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
