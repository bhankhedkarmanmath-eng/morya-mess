import React, { useState } from 'react';
import { 
  OwnerNotification, 
  OwnerNotificationType 
} from '../types/mess';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Check, 
  Clock, 
  ArrowUpRight, 
  Filter, 
  CreditCard, 
  UserCheck, 
  MessageSquare, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: OwnerNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectRecord?: (type: OwnerNotificationType, customerId?: string, recordId?: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectRecord,
  onRefresh,
  isLoading = false
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'payments' | 'customers' | 'complaints' | 'system'>('all');

  if (!isOpen) return null;

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'payments') {
      return ['payment_received', 'cash_payment', 'upi_payment', 'payment_verification', 'outstanding_fee'].includes(n.type);
    }
    if (filter === 'customers') {
      return ['new_customer', 'new_trial', 'sub_expiring_soon', 'sub_expired', 'leave_request', 'skip_meal'].includes(n.type);
    }
    if (filter === 'complaints') {
      return ['complaint_received', 'complaint_updated', 'meal_rating', 'poll_response'].includes(n.type);
    }
    if (filter === 'system') {
      return ['system_security', 'staff_activity'].includes(n.type);
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: OwnerNotificationType) => {
    switch (type) {
      case 'payment_received':
      case 'cash_payment':
      case 'upi_payment':
      case 'payment_verification':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'new_customer':
      case 'new_trial':
      case 'sub_expiring_soon':
      case 'sub_expired':
      case 'leave_request':
        return <UserCheck className="w-4 h-4 text-orange-600" />;
      case 'complaint_received':
      case 'complaint_updated':
        return <MessageSquare className="w-4 h-4 text-amber-600" />;
      case 'system_security':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'urgent') {
      return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">Urgent</span>;
    }
    if (priority === 'high') {
      return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">High</span>;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-slate-900/40 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div 
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">Notification Center</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Real-time alerts & activity feed</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Refresh notifications"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-600' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          {/* Filters */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-bold text-slate-600 no-scrollbar">
            {(['all', 'unread', 'payments', 'customers', 'complaints', 'system'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-colors cursor-pointer ${
                  filter === f 
                    ? 'bg-orange-600 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 whitespace-nowrap cursor-pointer hover:underline"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* List of Notifications */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No notifications found</p>
              <p className="text-[11px] mt-0.5">All updates and alerts will appear here in real-time.</p>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) onMarkAsRead(n.id);
                  if (onSelectRecord && n.customerId) {
                    onSelectRecord(n.type, n.customerId, n.relatedRecordId);
                    onClose();
                  }
                }}
                className={`group relative p-3 rounded-xl transition-all cursor-pointer border ${
                  n.isRead
                    ? 'bg-white border-transparent hover:bg-slate-50'
                    : 'bg-orange-50/40 border-orange-200/60 hover:bg-orange-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    n.isRead ? 'bg-slate-100' : 'bg-white border border-orange-200 shadow-xs'
                  }`}>
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {n.title}
                        </span>
                        {getPriorityBadge(n.priority)}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {n.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      {n.customerName && (
                        <span className="font-medium text-slate-500">
                          Student: <span className="text-slate-800 font-semibold">{n.customerName}</span>
                        </span>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        {!n.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(n.id);
                            }}
                            className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-0.5"
                          >
                            <Check className="w-3 h-3" /> Mark read
                          </button>
                        )}
                        {n.customerId && (
                          <span className="inline-flex items-center gap-0.5 font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
                            View Record <ArrowUpRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Synced directly with Supabase Database</span>
          <span className="font-semibold text-slate-700">{notifications.length} Total</span>
        </div>
      </div>
    </div>
  );
};
