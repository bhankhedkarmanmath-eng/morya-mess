import React, { useState } from 'react';
import { StudentPoll, Customer } from '../../../types/mess';
import { submitStudentVote } from '../../../lib/ownerFeaturesApi';
import { Vote, CheckCircle2, AlertCircle, Clock, Check, BarChart2, RefreshCw } from 'lucide-react';

interface StudentPollsTabProps {
  customer: Customer;
  polls: StudentPoll[];
  pollVotes: Record<string, Record<string, string>>; // pollId -> customerId -> optionId
  onPollVoted: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const StudentPollsTab: React.FC<StudentPollsTabProps> = ({
  customer,
  polls,
  pollVotes,
  onPollVoted,
  onRefresh,
  isRefreshing = false
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [submittingPollId, setSubmittingPollId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ pollId: string; type: 'success' | 'error'; message: string } | null>(null);

  const activePolls = polls.filter(p => p.status === 'active');
  const closedPolls = polls.filter(p => p.status === 'closed');

  const handleVote = async (pollId: string) => {
    const optionId = selectedOptions[pollId];
    if (!optionId) {
      setFeedback({ pollId, type: 'error', message: 'Please select an option to submit your vote.' });
      return;
    }

    setSubmittingPollId(pollId);
    setFeedback(null);

    const res = await submitStudentVote(pollId, optionId, customer.id);
    setSubmittingPollId(null);

    if (res.success) {
      setFeedback({ pollId, type: 'success', message: 'Thank you! Your vote has been recorded in Supabase.' });
      onPollVoted();
    } else {
      setFeedback({ pollId, type: 'error', message: res.error || 'Failed to submit vote. Please try again.' });
    }
  };

  return (
    <div className="w-full max-w-full sm:max-w-2xl space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">
                Student Community Voice
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Mess Polls & Voting
              </h2>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Refresh Polls"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Vote on weekly special menu items, festival feasts, and dining hall preferences. Each student gets 1 verified vote per poll.
        </p>
      </div>

      {/* Active Polls Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Active Polls ({activePolls.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Supabase Synchronized</span>
        </div>

        {activePolls.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Vote className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-sm">No Active Polls Right Now</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Mess management hasn't opened any new polls at the moment. Check back soon for upcoming feast and menu polls!
            </p>
          </div>
        ) : (
          activePolls.map(poll => {
            const studentVotedOptionId = pollVotes[poll.id]?.[customer.id];
            const hasVoted = Boolean(studentVotedOptionId);
            const isSubmittingThis = submittingPollId === poll.id;
            const currentSelected = selectedOptions[poll.id] || studentVotedOptionId;

            return (
              <div 
                key={poll.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4"
              >
                {/* Poll Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-block">
                      Live Poll
                    </span>
                    <h4 className="font-black text-slate-900 text-base leading-snug">
                      {poll.question}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <BarChart2 className="w-3.5 h-3.5 text-orange-600" />
                      <span>{poll.totalVotes || 0} Votes</span>
                    </span>
                  </div>
                </div>

                {/* Feedback Alert */}
                {feedback && feedback.pollId === poll.id && (
                  <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                    feedback.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}>
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-medium">{feedback.message}</span>
                  </div>
                )}

                {/* Options List */}
                <div className="space-y-2.5">
                  {poll.options.map(opt => {
                    const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                    const isStudentVote = studentVotedOptionId === opt.id;
                    const isSelected = currentSelected === opt.id;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          if (!hasVoted) {
                            setSelectedOptions(prev => ({ ...prev, [poll.id]: opt.id }));
                          }
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left text-xs transition relative overflow-hidden flex items-center justify-between ${
                          hasVoted
                            ? isStudentVote
                              ? 'border-emerald-500 bg-emerald-50/50 font-bold text-emerald-950'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                            : isSelected
                              ? 'border-orange-500 bg-orange-50 font-bold text-orange-950 cursor-pointer shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer'
                        }`}
                      >
                        {/* Vote Percentage Fill (Visible once voted) */}
                        {hasVoted && (
                          <div 
                            className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 ${
                              isStudentVote ? 'bg-emerald-200/50' : 'bg-slate-200/40'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        )}

                        <div className="relative z-10 flex items-center gap-2.5">
                          {!hasVoted && (
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-orange-600 bg-orange-600' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          )}

                          {isStudentVote && (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                              ✓
                            </span>
                          )}

                          <span className={`text-xs ${isStudentVote ? 'font-black text-emerald-950' : 'font-semibold'}`}>
                            {opt.text}
                          </span>
                        </div>

                        <div className="relative z-10 flex items-center gap-2 text-[11px]">
                          {isStudentVote && (
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                              Your Vote
                            </span>
                          )}
                          {hasVoted && (
                            <span className="font-mono font-bold text-slate-500">
                              {pct}% ({opt.votes})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vote Action or Voted Status */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  {hasVoted ? (
                    <div className="w-full p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>You have cast your vote on this poll</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700">Verified</span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400">
                        {currentSelected ? 'Ready to submit' : 'Select an option above to vote'}
                      </span>
                      <button
                        onClick={() => handleVote(poll.id)}
                        disabled={isSubmittingThis || !currentSelected}
                        className="py-2.5 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center gap-2"
                      >
                        {isSubmittingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Vote className="w-3.5 h-3.5" />
                            <span>Submit Vote</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Closed Polls Section */}
      {closedPolls.length > 0 && (
        <div className="space-y-3 pt-3">
          <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider px-1">
            Past Poll Results ({closedPolls.length})
          </h3>
          <div className="space-y-3">
            {closedPolls.map(poll => (
              <div key={poll.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-xs">{poll.question}</h4>
                  <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                    Closed
                  </span>
                </div>
                <div className="space-y-1.5">
                  {poll.options.map(opt => {
                    const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                    return (
                      <div key={opt.id} className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
                        <span className="text-slate-600">{opt.text}</span>
                        <span className="font-mono font-bold text-slate-500">{pct}% ({opt.votes})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
