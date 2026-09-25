import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Filter,
  Check,
  ShieldCheck,
  Phone
} from 'lucide-react';
import { SupportTicket } from '../../types/mess';
import { loadSupportTickets, saveSupportTickets } from '../../lib/ownerModulesStorage';

interface SupportRequestsViewProps {
  onBack: () => void;
  onNavigateHelpSupport?: () => void;
}

export const SupportRequestsView: React.FC<SupportRequestsViewProps> = ({
  onBack,
  onNavigateHelpSupport
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'IN_REVIEW' | 'RESOLVED'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // New ticket state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'Technical' | 'Billing' | 'Feature Request' | 'Account'>('Technical');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [message, setMessage] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    setTickets(loadSupportTickets());
  }, []);

  const filteredTickets = tickets.filter(t => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    const newTicket: SupportTicket = {
      id: `tic-${Date.now().toString().slice(-4)}`,
      subject: subject.trim(),
      category,
      message: message.trim(),
      priority,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    saveSupportTickets(updated);

    // Reset form
    setSubject('');
    setMessage('');
    setIsCreateOpen(false);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 4000);
  };

  const handleResolveTicket = (id: string) => {
    const updated = tickets.map(t => 
      t.id === id ? { ...t, status: 'RESOLVED' as const } : t
    );
    setTickets(updated);
    saveSupportTickets(updated);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
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
              <MessageSquare className="w-5 h-5 text-orange-600" />
              <span>Support Requests & Issue Tracker</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit technical tickets, feature requests, or billing queries directly to our engineer team
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateHelpSupport && (
            <button
              onClick={onNavigateHelpSupport}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Browse FAQs & Help
            </button>
          )}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Support Request</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Support request submitted successfully! A support engineer has been notified.</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer ${
              statusFilter === 'all' ? 'bg-orange-600 text-white' : 'hover:bg-slate-100'
            }`}
          >
            All Requests ({tickets.length})
          </button>
          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer ${
              statusFilter === 'OPEN' ? 'bg-orange-600 text-white' : 'hover:bg-slate-100'
            }`}
          >
            Open ({tickets.filter(t => t.status === 'OPEN').length})
          </button>
          <button
            onClick={() => setStatusFilter('IN_REVIEW')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer ${
              statusFilter === 'IN_REVIEW' ? 'bg-orange-600 text-white' : 'hover:bg-slate-100'
            }`}
          >
            In Review ({tickets.filter(t => t.status === 'IN_REVIEW').length})
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer ${
              statusFilter === 'RESOLVED' ? 'bg-orange-600 text-white' : 'hover:bg-slate-100'
            }`}
          >
            Resolved ({tickets.filter(t => t.status === 'RESOLVED').length})
          </button>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-sm text-slate-700">No support requests found</div>
            <p className="text-xs text-slate-400">
              Need assistance with your mess setup or hardware? Click "New Support Request" above.
            </p>
          </div>
        ) : (
          filteredTickets.map(ticket => (
            <div
              key={ticket.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-slate-400">#{ticket.id}</span>
                  <h3 className="font-black text-sm text-slate-900">{ticket.subject}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-slate-100 text-slate-600">
                    {ticket.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    ticket.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                    ticket.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {ticket.priority}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                    ticket.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {ticket.message}
              </p>

              {ticket.response && (
                <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                    <span>Support Engineer Response:</span>
                  </div>
                  <p className="text-xs text-orange-950 font-medium">
                    {ticket.response}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                <span>Submitted: {new Date(ticket.createdAt).toLocaleString()}</span>
                {ticket.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleResolveTicket(ticket.id)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark as Resolved</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Request Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-600" />
                <span>Submit Support Request</span>
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Subject / Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Need assistance setting up thermal printer"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  >
                    <option value="Technical">Technical / Bug</option>
                    <option value="Billing">Billing & UPI</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Account">Account & Access</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent (Blocking Mess)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe what happened, what device or browser you are using, or what assistance you need..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
