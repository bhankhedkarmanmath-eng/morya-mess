import React, { useState, useEffect } from 'react';
import { MessReminderNotice } from '../../types/mess';
import { loadReminders, saveReminders } from '../../lib/ownerModulesStorage';
import { 
  Clock, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Bell, 
  AlertCircle, 
  CheckCircle2, 
  X
} from 'lucide-react';

interface RemindersNoticesViewProps {
  onBack: () => void;
}

export const RemindersNoticesView: React.FC<RemindersNoticesViewProps> = ({ onBack }) => {
  const [reminders, setReminders] = useState<MessReminderNotice[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('normal');

  useEffect(() => {
    setReminders(loadReminders());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const newReminder: MessReminderNotice = {
      id: `rem-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      priority,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const updated = [newReminder, ...reminders];
    setReminders(updated);
    saveReminders(updated);

    setTitle('');
    setMessage('');
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    saveReminders(updated);
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
              <Bell className="w-5 h-5 text-orange-600" />
              <span>Reminders & Official Mess Notice Board</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Post announcements, fee due notifications, holiday notices, and kitchen cleaning updates
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Post Notice</span>
        </button>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Publish Notice to Student Portal</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Notice Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mess Closed on Sunday Evening"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Detailed Announcement Message</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Write clear instructions for students..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'normal', 'urgent'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`p-2 rounded-xl border font-bold capitalize transition cursor-pointer ${
                        priority === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  Post Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notices Board */}
      <div className="space-y-3">
        {reminders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Active Notices</h4>
            <p className="text-xs text-slate-500 mt-0.5">Click "Post Notice" to create an announcement.</p>
          </div>
        ) : (
          reminders.map(r => (
            <div 
              key={r.id}
              className={`p-5 rounded-2xl border bg-white shadow-2xs space-y-2 relative transition ${
                r.priority === 'urgent' ? 'border-l-4 border-l-rose-500 border-slate-200' :
                r.priority === 'normal' ? 'border-l-4 border-l-orange-500 border-slate-200' :
                'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      r.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                      r.priority === 'normal' ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {r.priority}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-sm mt-1">{r.title}</h3>
                </div>

                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Remove Notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {r.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
