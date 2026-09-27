import React, { useState } from 'react';
import { Customer } from '../../../types/mess';
import { markNotificationRead } from '../../../lib/ownerFeaturesApi';
import { 
  Bell, 
  CheckCircle2, 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  MessageSquare, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  CheckCheck,
  Filter
} from 'lucide-react';

interface StudentNotificationsTabProps {
  customer: Customer;
  notifications: any[];
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const StudentNotificationsTab: React.FC<StudentNotificationsTabProps> = ({
  customer,
  notifications,
  onRefresh,
  isRefreshing = false
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'payment' | 'leave' | 'general'>('all');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'payment') return n.type?.includes('payment') || n.type?.includes('fee');
    if (filter === 'leave') return n.type?.includes('leave') || n.type?.includes('skip');
    if (filter === 'general') return !n.type?.includes('payment') && !n.type?.includes('leave');
    return true;
  });

  const handleMarkAsRead = async (id: string) => {
    setMarkingId(id);
    await markNotificationRead(id);
    setMarkingId(null);
    onRefresh();
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    for (const item of unread) {
      if (item.id) await markNotificationRead(item.id);
    }
    onRefresh();
  };

  const getNotificationIcon = (type: string = '') => {
    if (type.includes('payment') || type.includes('fee')) {
      return <CreditCard className="w-4 h-4 text-emerald-600" />;
    }
    if (type.includes('leave') || type.includes('skip')) {
      return <Calendar className="w-4 h-4 text-indigo-600" />;
    }
    if (type.includes('complaint')) {
      return <MessageSquare className="w-4 h-4 text-rose-600" />;
    }
    if (type.includes('security') || type.includes('expiry')) {
      return <ShieldAlert className="w-4 h-4 text-amber-600" />;
    }
    return <Bell className="w-4 h-4 text-orange-600" />;
  };

  return (
    <div className="w-full max-w-full sm:max-w-2xl space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">
                Activity & Updates
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Notifications Center
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="py-1.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Mark All Read</span>
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Refresh Notifications"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
          <span>Unread alerts: <strong className="text-orange-600">{unreadCount}</strong></span>
          <span>•</span>
          <span>Total: <strong className="text-slate-800">{notifications.length}</strong></span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`py-1.5 px-3 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
            filter === 'all' 
              ? 'bg-slate-900 text-white shadow-2xs' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`py-1.5 px-3 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
            filter === 'unread' 
              ? 'bg-orange-600 text-white shadow-xs' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('payment')}
          className={`py-1.5 px-3 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
            filter === 'payment' 
              ? 'bg-emerald-600 text-white shadow-2xs' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setFilter('leave')}
          className={`py-1.5 px-3 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
            filter === 'leave' 
              ? 'bg-indigo-600 text-white shadow-2xs' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Leaves
        </button>
        <button
          onClick={() => setFilter('general')}
          className={`py-1.5 px-3 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
            filter === 'general' 
              ? 'bg-amber-600 text-white shadow-2xs' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          General
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Bell className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-xs">No Notifications Found</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              You are all caught up! Important payment updates, leave approvals, and mess notices will appear here.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif: any, idx: number) => {
            const isUnread = !notif.is_read;
            const dateStr = notif.created_at ? new Date(notif.created_at).toLocaleString() : 'Just now';

            return (
              <div
                key={notif.id || idx}
                className={`p-4 rounded-2xl border transition shadow-2xs flex items-start gap-3.5 ${
                  isUnread
                    ? 'bg-orange-50/40 border-orange-200'
                    : 'bg-white border-slate-200 opacity-90'
                }`}
              >
                {/* Icon Circle */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isUnread
                    ? 'bg-white border-orange-300 shadow-2xs'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                      {notif.title || 'Morya Mess Notification'}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {dateStr}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="font-mono text-slate-400 uppercase">
                      {notif.type ? notif.type.replace(/_/g, ' ') : 'General'}
                    </span>

                    {isUnread && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        disabled={markingId === notif.id}
                        className="font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                      >
                        {markingId === notif.id ? 'Marking...' : 'Mark as read'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Unread indicator dot */}
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0 mt-1"></span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
