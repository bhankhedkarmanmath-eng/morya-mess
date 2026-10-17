import React, { useMemo } from 'react';
import { MessReminderNotice } from '../../../types/mess';
import { Bell, AlertTriangle, Info, Calendar, RefreshCw, CheckCircle2 } from 'lucide-react';

interface StudentAnnouncementsTabProps {
  reminders: MessReminderNotice[];
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const StudentAnnouncementsTab: React.FC<StudentAnnouncementsTabProps> = ({
  reminders,
  onRefresh,
  isRefreshing = false
}) => {
  // Deduplicate notices by unique ID and title/message
  const activeNotices = useMemo(() => {
    const seenIds = new Set<string>();
    const seenContent = new Set<string>();

    return reminders.filter(r => {
      if (r.isActive === false) return false;
      const contentKey = `${(r.title || '').trim().toLowerCase()}|${(r.message || '').trim().toLowerCase()}`;
      if ((r.id && seenIds.has(r.id)) || seenContent.has(contentKey)) {
        return false;
      }
      if (r.id) seenIds.add(r.id);
      seenContent.add(contentKey);
      return true;
    });
  }, [reminders]);

  return (
    <div className="w-full max-w-full sm:max-w-2xl space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">
                Official Mess Board
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Notices & Announcements
              </h2>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-orange-200/80 hover:bg-orange-50 text-slate-600 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Refresh Notices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Official mess schedule changes, holiday announcements, festival feasts, and maintenance updates from the management.
        </p>
      </div>

      {/* Notices List */}
      <div className="space-y-3">
        {activeNotices.length === 0 ? (
          <div className="bg-white rounded-3xl border border-orange-200/80 p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200/60 flex items-center justify-center mx-auto text-orange-400">
              <Info className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-xs">No Active Announcements</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              There are no special notices right now. All mess shifts are operating normally.
            </p>
          </div>
        ) : (
          activeNotices.map((notice, idx) => {
            const isUrgent = notice.priority === 'urgent';

            return (
              <div
                key={notice.id || idx}
                className={`p-5 rounded-3xl border shadow-2xs space-y-3 ${
                  isUrgent 
                    ? 'bg-rose-50/60 border-rose-200' 
                    : 'bg-white border-orange-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isUrgent 
                          ? 'bg-rose-200 text-rose-900 border border-rose-300' 
                          : 'bg-orange-100 text-orange-800 border border-orange-200'
                      }`}>
                        {isUrgent ? '⚡ Urgent Notice' : 'Notice'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : 'Active'}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug">
                      {notice.title}
                    </h3>
                  </div>

                  {isUrgent && (
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-orange-50/20 p-3 rounded-2xl border border-orange-100">
                  {notice.message}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-orange-100">
                  <span className="font-medium">Issued by: Morya Mess Management</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Official Notice</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
