import React, { useState, useEffect } from 'react';
import { StudentPoll } from '../../types/mess';
import { loadPolls, savePolls } from '../../lib/ownerModulesStorage';
import { 
  HelpCircle, 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  BarChart2, 
  Clock, 
  X, 
  Trash2,
  Users
} from 'lucide-react';

interface PollsManagerViewProps {
  onBack: () => void;
}

export const PollsManagerView: React.FC<PollsManagerViewProps> = ({ onBack }) => {
  const [polls, setPolls] = useState<StudentPoll[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  useEffect(() => {
    setPolls(loadPolls());
  }, []);

  const handleAddOptionField = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim().length > 0);
    if (!question.trim() || validOptions.length < 2) return;

    const newPoll: StudentPoll = {
      id: `poll-${Date.now()}`,
      question: question.trim(),
      options: validOptions.map((opt, i) => ({
        id: `opt-${i + 1}`,
        text: opt.trim(),
        votes: 0
      })),
      totalVotes: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const updated = [newPoll, ...polls];
    setPolls(updated);
    savePolls(updated);

    setQuestion('');
    setOptions(['', '']);
    setIsCreateOpen(false);
  };

  const handleToggleStatus = (pollId: string) => {
    const updated = polls.map(p => {
      if (p.id === pollId) {
        return {
          ...p,
          status: p.status === 'active' ? ('closed' as const) : ('active' as const)
        };
      }
      return p;
    });
    setPolls(updated);
    savePolls(updated);
  };

  const handleDelete = (pollId: string) => {
    const updated = polls.filter(p => p.id !== pollId);
    setPolls(updated);
    savePolls(updated);
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
              <HelpCircle className="w-5 h-5 text-orange-600" />
              <span>Student Dining Polls & Menu Feedback</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Engage hostel members by letting them vote on weekend feast dishes and preferred timings
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Poll</span>
        </button>
      </div>

      {/* Create Poll Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Create Dining Poll</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Poll Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Which dessert would you prefer for Sunday lunch?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">Voting Options (Minimum 2)</label>
                {options.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    required
                    placeholder={`Option ${i + 1} (e.g. Gulab Jamun)`}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50"
                  />
                ))}

                {options.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    className="text-xs font-bold text-orange-600 hover:underline pt-1 cursor-pointer"
                  >
                    + Add another option
                  </button>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  Publish Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Polls Cards */}
      <div className="space-y-4">
        {polls.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Active Polls</h4>
            <p className="text-xs text-slate-500 mt-0.5">Click "Create New Poll" to gather diner feedback.</p>
          </div>
        ) : (
          polls.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-base mt-1">{p.question}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(p.id)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    {p.status === 'active' ? 'Close Poll' : 'Reopen'}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Delete poll"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Options Progress Bars */}
              <div className="space-y-2.5 pt-2">
                {p.options.map(opt => {
                  const percentage = p.totalVotes > 0 ? Math.round((opt.votes / p.totalVotes) * 100) : 0;

                  return (
                    <div key={opt.id} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-800">{opt.text}</span>
                        <span className="text-slate-500 font-mono">{opt.votes} votes ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-orange-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-bold">
                  <Users className="w-3.5 h-3.5" />
                  <span>Total Votes: {p.totalVotes}</span>
                </span>
                <span className="text-[11px]">Synced to Student App</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
