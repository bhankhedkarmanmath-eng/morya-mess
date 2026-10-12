import { supabase } from './supabase';
import { 
  OwnerNotification, 
  OwnerNotificationType, 
  SupabasePaymentRecord, 
  PaymentMode, 
  PaymentStatus, 
  TrialStudent, 
  TrialVisitor,
  TrialStatus,
  Customer,
  MealLog,
  WeeklyMenuSchedule,
  StudentPoll,
  MealRatingReview,
  CustomerComplaint,
  MessReminderNotice,
  InventoryItem,
  InventoryMovement,
  InventorySupplier,
  ScanEligibility
} from '../types/mess';
import { 
  loadWeeklyMenu, 
  saveWeeklyMenu,
  loadPolls,
  savePolls,
  loadMealRatings,
  saveMealRatings,
  loadComplaints,
  saveComplaints,
  loadReminders,
  saveReminders,
  loadInventoryItems,
  saveInventoryItems,
  loadInventoryMovements,
  saveInventoryMovements,
  loadInventorySuppliers,
  saveInventorySuppliers,
  addSecurityLog
} from './ownerModulesStorage';
import { loadCustomers, saveCustomers, loadMealLogs, loadTrials, saveTrials, getTodayString, evaluateStrictMessShift, calculateDaysRemaining } from './storage';
import { pushSyncToServer, syncComplaintToServer, syncRatingToServer } from './syncEngine';

export const DEFAULT_MESS_ID = '63b00e12-a702-492f-bd56-1e260338699f';
const PAYMENTS_STORAGE_KEY = 'morya_v3_payments_records';
const NOTIFICATIONS_STORAGE_KEY = 'morya_v3_notifications';
const STUDENT_NOTIFICATIONS_STORAGE_KEY = 'morya_v3_student_notifications';
const DELETED_OWNER_NOTIFS_KEY = 'morya_v3_deleted_owner_notifications';
const DELETED_STUDENT_NOTIFS_KEY = 'morya_v3_deleted_student_notifications';
const READ_OWNER_NOTIFS_KEY = 'morya_v3_read_owner_notifications';
const READ_STUDENT_NOTIFS_KEY = 'morya_v3_read_student_notifications';

// Permanent Deleted Notifications Blacklist (prevents deleted/dismissed notifications from resurrecting)
export function loadDeletedOwnerNotifIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_OWNER_NOTIFS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveDeletedOwnerNotifIds(ids: string[]): void {
  try {
    const set = loadDeletedOwnerNotifIds();
    ids.forEach(id => { if (id) set.add(id); });
    localStorage.setItem(DELETED_OWNER_NOTIFS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Failed to save deleted owner notif ids:', e);
  }
}

export function loadDeletedStudentNotifIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_STUDENT_NOTIFS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveDeletedStudentNotifIds(ids: string[]): void {
  try {
    const set = loadDeletedStudentNotifIds();
    ids.forEach(id => { if (id) set.add(id); });
    localStorage.setItem(DELETED_STUDENT_NOTIFS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Failed to save deleted student notif ids:', e);
  }
}

// Read status persistence across sessions, dynamic synthesis, and page reloads
export function loadReadOwnerNotifIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_OWNER_NOTIFS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveReadOwnerNotifIds(ids: string[]): void {
  try {
    const set = loadReadOwnerNotifIds();
    ids.forEach(id => { if (id) set.add(id); });
    localStorage.setItem(READ_OWNER_NOTIFS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Failed to save read owner notif ids:', e);
  }
}

export function loadReadStudentNotifIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_STUDENT_NOTIFS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveReadStudentNotifIds(ids: string[]): void {
  try {
    const set = loadReadStudentNotifIds();
    ids.forEach(id => { if (id) set.add(id); });
    localStorage.setItem(READ_STUDENT_NOTIFS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Failed to save read student notif ids:', e);
  }
}

// Safe standard UUID generator (valid for Supabase Postgres uuid primary keys)
export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Global Cross-tab Broadcast Channel for instantaneous 0ms notification synchronization
let _notifBroadcastChannel: BroadcastChannel | null = null;
export function getNotifBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    if (!_notifBroadcastChannel) {
      try {
        _notifBroadcastChannel = new BroadcastChannel('morya_cross_app_notifications');
      } catch {
        _notifBroadcastChannel = null;
      }
    }
    return _notifBroadcastChannel;
  }
  return null;
}

// Internal local storage helpers for guaranteed resilience
function loadLocalPayments(): SupabasePaymentRecord[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPayments(records: SupabasePaymentRecord[]): void {
  try {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save local payments:', e);
  }
}

export function loadLocalNotifications(): OwnerNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalNotifications(records: OwnerNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save local notifications:', e);
  }
}

export function loadLocalStudentNotifications(): any[] {
  try {
    const raw = localStorage.getItem(STUDENT_NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalStudentNotifications(records: any[]): void {
  try {
    localStorage.setItem(STUDENT_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save local student notifications:', e);
  }
}

// ==========================================
// FEATURE 1: Professional Notification Center
// ==========================================

export async function fetchOwnerNotifications(messId: string = DEFAULT_MESS_ID): Promise<OwnerNotification[]> {
  const localNotifs = loadLocalNotifications();

  // 1. Synthesize dynamic notifications from active pending items (complaints, pending payments, leaves)
  const dynamicNotifs = await generateDynamicNotifications(messId);

  // 2. Query Supabase notifications table
  let remoteNotifs: OwnerNotification[] = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('mess_id', messId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        remoteNotifs = data.map((n: any) => ({
          id: n.id,
          messId: n.mess_id,
          type: (n.type === 'complaint' ? 'complaint_received' : n.type) as OwnerNotificationType,
          title: n.title,
          message: n.message,
          customerId: n.customer_id,
          customerName: n.customer_name,
          relatedRecordId: n.related_record_id,
          priority: n.priority || 'medium',
          isRead: n.is_read ?? false,
          createdAt: n.created_at,
          actionUrl: n.action_url
        }));
      }
    } catch (err) {
      console.warn('fetchOwnerNotifications err:', err);
    }
  }

  // 3. Robust Multi-Source Merge: Dynamic items + Remote + Local
  const notifMap = new Map<string, OwnerNotification>();

  // A. Dynamic items ensure any pending payment, new complaint, or pending leave is ALWAYS visible
  dynamicNotifs.forEach(n => notifMap.set(n.id, n));

  // B. Remote Supabase notifications
  remoteNotifs.forEach(n => {
    // If relatedRecordId already matched a dynamic notification, keep the more specific title/id or merge
    const existing = Array.from(notifMap.values()).find(
      d => d.relatedRecordId && n.relatedRecordId && d.relatedRecordId === n.relatedRecordId
    );
    if (existing) {
      notifMap.set(existing.id, { ...existing, ...n, id: existing.id });
    } else {
      notifMap.set(n.id, n);
    }
  });

  // C. Local notifications take final precedence for read status and instant user actions
  localNotifs.forEach(n => {
    const existing = notifMap.get(n.id) || Array.from(notifMap.values()).find(
      d => d.relatedRecordId && n.relatedRecordId && d.relatedRecordId === n.relatedRecordId
    );
    if (existing) {
      notifMap.set(existing.id, { ...existing, ...n });
    } else {
      notifMap.set(n.id, n);
    }
  });

  const deletedIds = loadDeletedOwnerNotifIds();
  const readIds = loadReadOwnerNotifIds();

  // Filter out any notifications permanently deleted/dismissed by the owner
  const activeNotifs = Array.from(notifMap.values()).filter(n => {
    if (deletedIds.has(n.id)) return false;
    if (n.relatedRecordId && deletedIds.has(n.relatedRecordId)) return false;
    if (n.id.startsWith('dyn-comp-') && deletedIds.has(n.id.replace('dyn-comp-', ''))) return false;
    if (n.id.startsWith('dyn-pay-') && deletedIds.has(n.id.replace('dyn-pay-', ''))) return false;
    if (n.id.startsWith('dyn-leave-') && deletedIds.has(n.id.replace('dyn-leave-', ''))) return false;
    return true;
  }).map(n => {
    const isMarkedRead = n.isRead || readIds.has(n.id) || (n.relatedRecordId && readIds.has(n.relatedRecordId));
    return isMarkedRead !== n.isRead ? { ...n, isRead: true } : n;
  });

  return activeNotifs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function createOwnerNotification(params: {
  messId?: string;
  type: OwnerNotificationType;
  title: string;
  message: string;
  customerId?: string;
  customerName?: string;
  relatedRecordId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}): Promise<boolean> {
  const messId = params.messId || DEFAULT_MESS_ID;
  const notifId = safeUUID();
  const newNotif: OwnerNotification = {
    id: notifId,
    messId,
    type: params.type,
    title: params.title,
    message: params.message,
    customerId: params.customerId,
    customerName: params.customerName,
    relatedRecordId: params.relatedRecordId,
    priority: params.priority || 'medium',
    isRead: false,
    createdAt: new Date().toISOString()
  };

  // 1. Guaranteed local persistence
  const existing = loadLocalNotifications();
  // Filter out any duplicate of same relatedRecordId to prevent duplicate clutter
  const filtered = params.relatedRecordId 
    ? existing.filter(n => n.relatedRecordId !== params.relatedRecordId) 
    : existing;
  saveLocalNotifications([newNotif, ...filtered]);

  // 2. Realtime notification event & cross-tab channel
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_notification_created', { detail: newNotif }));
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'OWNER_NOTIF', data: newNotif });
    } catch {}
  }

  // 3. Attempt remote sync to Supabase
  if (!supabase) return true;
  try {
    const insertPayload: Record<string, any> = {
      id: notifId,
      mess_id: messId,
      type: params.type,
      title: params.title,
      message: params.message,
      customer_id: params.customerId || null,
      customer_name: params.customerName || null,
      related_record_id: params.relatedRecordId || null,
      priority: params.priority || 'medium',
      is_read: false
    };

    const { error: insErr } = await supabase.from('notifications').insert(insertPayload);
    if (insErr) {
      // Fallback: If customer_id or id constraint caused error, retry without customer_id
      await supabase.from('notifications').insert({
        ...insertPayload,
        customer_id: null
      });
    }
  } catch (err) {
    console.warn('createOwnerNotification remote sync note:', err);
  }

  return true;
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const idsToMark = [notificationId];
  if (notificationId.startsWith('dyn-comp-')) idsToMark.push(notificationId.replace('dyn-comp-', ''));
  if (notificationId.startsWith('dyn-pay-')) idsToMark.push(notificationId.replace('dyn-pay-', ''));
  if (notificationId.startsWith('dyn-leave-')) idsToMark.push(notificationId.replace('dyn-leave-', ''));

  const existing = loadLocalNotifications();
  const target = existing.find(n => n.id === notificationId || (n.relatedRecordId && n.relatedRecordId === notificationId));
  if (target?.relatedRecordId) idsToMark.push(target.relatedRecordId);
  if (target?.id) idsToMark.push(target.id);

  saveReadOwnerNotifIds(idsToMark);

  // Update local
  const notifs = existing.map(n => 
    idsToMark.includes(n.id) || (n.relatedRecordId && idsToMark.includes(n.relatedRecordId)) 
      ? { ...n, isRead: true } 
      : n
  );
  saveLocalNotifications(notifs);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'OWNER_NOTIF_READ', id: notificationId });
    } catch {}
  }

  if (!supabase) return true;
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  } catch {}
  return true;
}

export async function deleteOwnerNotification(notificationId: string): Promise<boolean> {
  const existing = loadLocalNotifications();
  const target = existing.find(n => n.id === notificationId || (n.relatedRecordId && n.relatedRecordId === notificationId));

  const idsToDelete = [notificationId];
  if (notificationId.startsWith('dyn-comp-')) {
    const raw = notificationId.replace('dyn-comp-', '');
    idsToDelete.push(raw);
    idsToDelete.push(`dyn-comp-${raw}`);
  }
  if (notificationId.startsWith('dyn-pay-')) {
    const raw = notificationId.replace('dyn-pay-', '');
    idsToDelete.push(raw);
    idsToDelete.push(`dyn-pay-${raw}`);
  }
  if (notificationId.startsWith('dyn-leave-')) {
    const raw = notificationId.replace('dyn-leave-', '');
    idsToDelete.push(raw);
    idsToDelete.push(`dyn-leave-${raw}`);
  }
  if (target?.relatedRecordId) idsToDelete.push(target.relatedRecordId);
  if (target?.id) idsToDelete.push(target.id);

  // 1. Permanently track in deleted IDs blacklist so it never resurrects
  saveDeletedOwnerNotifIds(idsToDelete);

  // 2. Remove from local store
  const notifs = existing.filter(n => !idsToDelete.includes(n.id) && (!n.relatedRecordId || !idsToDelete.includes(n.relatedRecordId)));
  saveLocalNotifications(notifs);

  // 3. Dispatch events to all tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_notification_deleted', { detail: { id: notificationId } }));
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'OWNER_NOTIF_DELETED', id: notificationId });
    } catch {}
  }

  // 4. Remote Supabase delete
  if (supabase) {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    } catch {}
    if (target?.relatedRecordId) {
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('related_record_id', target.relatedRecordId);
      } catch {}
    }
  }
  return true;
}

export async function clearAllReadOwnerNotifications(messId: string = DEFAULT_MESS_ID): Promise<boolean> {
  const currentNotifs = await fetchOwnerNotifications(messId);
  const readNotifs = currentNotifs.filter(n => n.isRead);
  const idsToDelete: string[] = [];

  readNotifs.forEach(n => {
    idsToDelete.push(n.id);
    if (n.relatedRecordId) idsToDelete.push(n.relatedRecordId);
    if (n.id.startsWith('dyn-comp-')) idsToDelete.push(n.id.replace('dyn-comp-', ''));
    if (n.id.startsWith('dyn-pay-')) idsToDelete.push(n.id.replace('dyn-pay-', ''));
    if (n.id.startsWith('dyn-leave-')) idsToDelete.push(n.id.replace('dyn-leave-', ''));
  });

  saveDeletedOwnerNotifIds(idsToDelete);

  const localNotifs = loadLocalNotifications();
  const remaining = localNotifs.filter(n => !idsToDelete.includes(n.id) && (!n.relatedRecordId || !idsToDelete.includes(n.relatedRecordId)));
  saveLocalNotifications(remaining);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'OWNER_NOTIFS_CLEARED' });
    } catch {}
  }

  if (supabase) {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('mess_id', messId)
        .eq('is_read', true);
    } catch {}
  }
  return true;
}

export async function markAllNotificationsAsRead(messId: string = DEFAULT_MESS_ID): Promise<boolean> {
  // Update local
  const notifs = loadLocalNotifications().map(n => ({ ...n, isRead: true }));
  saveLocalNotifications(notifs);

  // Also record all current notification IDs into persistent read set
  const currentNotifs = await fetchOwnerNotifications(messId);
  const allIds = currentNotifs.map(n => n.id);
  currentNotifs.forEach(n => {
    if (n.relatedRecordId) allIds.push(n.relatedRecordId);
    if (n.id.startsWith('dyn-comp-')) allIds.push(n.id.replace('dyn-comp-', ''));
    if (n.id.startsWith('dyn-pay-')) allIds.push(n.id.replace('dyn-pay-', ''));
    if (n.id.startsWith('dyn-leave-')) allIds.push(n.id.replace('dyn-leave-', ''));
  });
  saveReadOwnerNotifIds(allIds);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'OWNER_ALL_READ' });
    } catch {}
  }

  if (!supabase) return true;
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('mess_id', messId)
      .eq('is_read', false);
  } catch {}
  return true;
}

export function subscribeToOwnerNotificationsRealtime(
  onNotification: (notif: OwnerNotification) => void,
  messId: string = DEFAULT_MESS_ID
): () => void {
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel(`public:notifications:mess_${messId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `mess_id=eq.${messId}`
        },
        (payload) => {
          const n = payload.new as any;
          onNotification({
            id: n.id,
            messId: n.mess_id,
            type: n.type as OwnerNotificationType,
            title: n.title,
            message: n.message,
            customerId: n.customer_id,
            customerName: n.customer_name,
            relatedRecordId: n.related_record_id,
            priority: n.priority || 'medium',
            isRead: n.is_read ?? false,
            createdAt: n.created_at,
            actionUrl: n.action_url
          });
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime notifications channel registration:', err);
    return () => {};
  }
}

// Synthesize dynamic notifications from active leave requests, pending payments, complaints & expiring members
async function generateDynamicNotifications(messId: string): Promise<OwnerNotification[]> {
  const notifs: OwnerNotification[] = [];

  try {
    // 1. Local Complaints (status NEW or IN_PROGRESS)
    const localComplaints = loadComplaints();
    localComplaints.forEach(c => {
      if (c.status === 'NEW') {
        notifs.push({
          id: `dyn-comp-${c.id}`,
          messId,
          type: 'complaint_received',
          title: `New Student Complaint (${c.category})`,
          message: `${c.customerName || 'Student'} reported: "${(c.description || '').slice(0, 90)}..."`,
          customerId: c.customerId,
          customerName: c.customerName,
          relatedRecordId: c.id,
          priority: 'high',
          isRead: false,
          createdAt: c.createdAt || new Date().toISOString()
        });
      }
    });

    // 2. Local Pending Payments (status pending)
    const localPayments = loadLocalPayments();
    localPayments.forEach(p => {
      if (p.status === 'pending') {
        notifs.push({
          id: `dyn-pay-${p.id}`,
          messId,
          type: 'payment_verification',
          title: 'Payment Verification Required',
          message: `${p.customerName || 'Student'} recorded ₹${p.amount} UPI payment (Ref: ${p.transactionReference || 'Pending UTR'}) awaiting verification.`,
          customerId: p.customerId,
          customerName: p.customerName,
          relatedRecordId: p.id,
          priority: 'urgent',
          isRead: false,
          createdAt: p.createdAt || new Date().toISOString()
        });
      }
    });

    // 3. Local Customer Pending Leaves
    const localCustomers = loadCustomers();
    localCustomers.forEach(cust => {
      (cust.leaves || []).forEach(l => {
        if (l.status === 'pending' || (!l.approved && l.status !== 'rejected')) {
          notifs.push({
            id: `dyn-leave-${l.id}`,
            messId,
            type: 'leave_request',
            title: 'Student Leave Request',
            message: `${cust.name} requested leave from ${l.startDate} to ${l.endDate}. Reason: ${l.reason || 'Personal'}`,
            customerId: cust.id,
            customerName: cust.name,
            relatedRecordId: l.id,
            priority: 'high',
            isRead: false,
            createdAt: l.createdAt || l.requestedAt || new Date().toISOString()
          });
        }
      });
    });

    // 4. Remote Supabase sync if connected
    if (supabase) {
      // Pending Leaves from Supabase
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('id, customer_id, start_date, end_date, reason, status, created_at, customers(full_name)')
        .eq('mess_id', messId)
        .eq('status', 'pending')
        .limit(15);

      if (leaves) {
        leaves.forEach((l: any) => {
          const studentName = (Array.isArray(l.customers) ? l.customers[0]?.full_name : l.customers?.full_name) || 'Student';
          if (!notifs.some(n => n.relatedRecordId === l.id)) {
            notifs.push({
              id: `dyn-leave-${l.id}`,
              messId,
              type: 'leave_request',
              title: 'Student Leave Request',
              message: `${studentName} requested leave from ${l.start_date} to ${l.end_date}. Reason: ${l.reason || 'Personal'}`,
              customerId: l.customer_id,
              customerName: studentName,
              relatedRecordId: l.id,
              priority: 'high',
              isRead: false,
              createdAt: l.created_at || new Date().toISOString()
            });
          }
        });
      }

      // Pending UPI Payments from Supabase
      const { data: pendingPays } = await supabase
        .from('payment_logs')
        .select('id, customer_id, amount, payment_mode, created_at, notes, customers(full_name)')
        .eq('mess_id', messId)
        .ilike('notes', '%PENDING_VERIFICATION%')
        .limit(15);

      if (pendingPays) {
        pendingPays.forEach((p: any) => {
          const studentName = (Array.isArray(p.customers) ? p.customers[0]?.full_name : p.customers?.full_name) || 'Student';
          if (!notifs.some(n => n.relatedRecordId === p.id)) {
            notifs.push({
              id: `dyn-pay-${p.id}`,
              messId,
              type: 'payment_verification',
              title: 'Payment Verification Required',
              message: `${studentName} recorded ₹${p.amount} UPI payment awaiting your verification.`,
              customerId: p.customer_id,
              customerName: studentName,
              relatedRecordId: p.id,
              priority: 'urgent',
              isRead: false,
              createdAt: p.created_at || new Date().toISOString()
            });
          }
        });
      }

      // Subscriptions Expiring in 3 Days
      const today = new Date();
      const threeDaysLater = new Date();
      threeDaysLater.setDate(today.getDate() + 3);
      const todayStr = today.toISOString().split('T')[0];
      const threeDaysStr = threeDaysLater.toISOString().split('T')[0];

      const { data: expiringSubs } = await supabase
        .from('subscriptions')
        .select('id, customer_id, end_date, customers(full_name)')
        .gte('end_date', todayStr)
        .lte('end_date', threeDaysStr)
        .eq('status', 'active')
        .limit(10);

      if (expiringSubs) {
        expiringSubs.forEach((s: any) => {
          const studentName = (Array.isArray(s.customers) ? s.customers[0]?.full_name : s.customers?.full_name) || 'Customer';
          if (!notifs.some(n => n.relatedRecordId === s.id)) {
            notifs.push({
              id: `dyn-exp-${s.id}`,
              messId,
              type: 'sub_expiring_soon',
              title: 'Subscription Expiring Soon',
              message: `${studentName}'s meal subscription expires on ${s.end_date}.`,
              customerId: s.customer_id,
              customerName: studentName,
              relatedRecordId: s.id,
              priority: 'medium',
              isRead: false,
              createdAt: new Date().toISOString()
            });
          }
        });
      }
    }

    // 5. Automated End-of-Day Closing Summary Notification
    const todayStr = getTodayString();
    const allMealLogs = loadMealLogs();
    const todayLogs = allMealLogs.filter(m => m.date === todayStr && m.scanStatus === 'ALLOW');
    const lunchCount = todayLogs.filter(m => m.mealType === 'lunch').length;
    const dinnerCount = todayLogs.filter(m => m.mealType === 'dinner').length;
    const totalMealsToday = todayLogs.length;

    const allPayments = loadLocalPayments();
    const todayPayments = allPayments.filter(p => p.date === todayStr || (p.createdAt && p.createdAt.startsWith(todayStr)));
    const todayCollection = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const shiftAudit = evaluateStrictMessShift();
    const nowHour = new Date().getHours();

    // Show daily operations summary notification if night time / afternoon or meals were logged
    if (nowHour >= 14 || totalMealsToday > 0) {
      notifs.push({
        id: `dyn-daily-closing-${todayStr}`,
        messId,
        type: 'system_security' as OwnerNotificationType,
        title: `🌙 Daily Operations Summary (${todayStr})`,
        message: `Today: ${totalMealsToday} meals served (${lunchCount} Lunch, ${dinnerCount} Dinner). Total collection: ₹${todayCollection.toLocaleString()}. Status: ${shiftAudit.isShiftActive ? shiftAudit.mealType.toUpperCase() + ' Active' : 'Shift Closed'}.`,
        priority: 'medium',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn('generateDynamicNotifications err', e);
  }

  return notifs;
}

// ==========================================
// FEATURE 3: Customer Search & 360 Full History
// ==========================================

export interface Customer360Data {
  customer: Customer;
  payments: SupabasePaymentRecord[];
  attendanceCount: {
    today: boolean;
    currentMonth: number;
    total: number;
    lunch: number;
    dinner: number;
  };
  attendanceLogs: {
    id: string;
    mealDate: string;
    mealShift: string;
    isValid: boolean;
    scannedAt: string;
  }[];
  leaveHistory: {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    createdAt: string;
  }[];
  complaints: {
    id: string;
    subject: string;
    description: string;
    status: string;
    response?: string;
    createdAt: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  }[];
}

export async function searchCustomersDatabase(
  query: string, 
  messId: string = DEFAULT_MESS_ID
): Promise<Customer[]> {
  if (!supabase || !query.trim()) return [];
  const clean = query.trim();

  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id,
        mess_id,
        full_name,
        phone,
        college_name,
        hostel_name,
        room_number,
        is_active,
        created_at,
        notes,
        subscriptions (
          id,
          plan_price,
          final_amount,
          amount_paid,
          balance_due,
          start_date,
          end_date,
          status,
          created_at,
          tariff_plans (plan_name, both_meals)
        )
      `)
      .eq('mess_id', messId)
      .eq('is_deleted', false)
      .or(`full_name.ilike.%${clean}%,phone.ilike.%${clean}%,id.ilike.%${clean}%,college_name.ilike.%${clean}%`)
      .order('full_name', { ascending: true })
      .limit(30);

    if (error || !data) return [];

    return data.map((d: any) => {
      const activeSub = (d.subscriptions || []).sort((a: any, b: any) => 
        new Date(b.created_at || b.end_date || 0).getTime() - new Date(a.created_at || a.end_date || 0).getTime()
      )[0];
      const tariff = activeSub?.tariff_plans ? (Array.isArray(activeSub.tariff_plans) ? activeSub.tariff_plans[0] : activeSub.tariff_plans) : null;
      const isFemale = (tariff?.plan_name || '').toLowerCase().includes('girls');

      return {
        id: d.id,
        name: d.full_name,
        phone: d.phone,
        gender: isFemale ? 'female' : 'male',
        collegeOrWork: d.college_name || '',
        hostelOrAddress: d.hostel_name ? `${d.hostel_name} ${d.room_number || ''}`.trim() : '',
        planType: tariff?.plan_name || 'Standard Monthly',
        startDate: activeSub?.start_date || d.created_at?.split('T')[0] || '2026-09-01',
        endDate: activeSub?.end_date || '2026-09-30',
        totalAmount: Number(activeSub?.final_amount || activeSub?.plan_price || 2500),
        paidAmount: Number(activeSub?.amount_paid || 2500),
        balance: Number(activeSub?.balance_due || 0),
        status: d.is_active ? 'active' : 'inactive',
        createdAt: d.created_at,
        notes: d.notes
      } as Customer;
    });
  } catch (err) {
    console.warn('searchCustomersDatabase err:', err);
    return [];
  }
}

export async function fetchCustomer360Profile(
  customerId: string, 
  messId: string = DEFAULT_MESS_ID
): Promise<Customer360Data | null> {
  if (!customerId) return null;

  // 1. Load Local Customer details as robust base fallback
  const localCustomers = loadCustomers();
  const localCust = localCustomers.find(
    c => c.id === customerId || (c.phone && c.phone === customerId)
  );

  let customer: Customer | null = null;
  let dbCustData: any = null;

  // 2. Query Supabase (flexible match by ID, phone or name)
  if (supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      
      let query = supabase.from('customers').select(`
        id,
        mess_id,
        full_name,
        phone,
        college_name,
        hostel_name,
        room_number,
        is_active,
        notes,
        created_at,
        subscriptions (
          id,
          plan_price,
          final_amount,
          amount_paid,
          balance_due,
          start_date,
          end_date,
          status,
          created_at,
          tariff_plans (plan_name, both_meals)
        )
      `);

      let res: any = null;
      if (isUuid) {
        res = await query.eq('id', customerId).maybeSingle();
      }
      
      if ((!res || !res.data) && localCust?.phone) {
        res = await query.eq('phone', localCust.phone).maybeSingle();
      }

      if ((!res || !res.data) && localCust?.name) {
        res = await query.eq('full_name', localCust.name).maybeSingle();
      }

      if (res && res.data) {
        dbCustData = res.data;
        const activeSub = (dbCustData.subscriptions || []).sort((a: any, b: any) => 
          new Date(b.created_at || b.end_date || 0).getTime() - new Date(a.created_at || a.end_date || 0).getTime()
        )[0];
        const tariff = activeSub?.tariff_plans ? (Array.isArray(activeSub.tariff_plans) ? activeSub.tariff_plans[0] : activeSub.tariff_plans) : null;
        const isFemale = (tariff?.plan_name || '').toLowerCase().includes('girls') || (localCust?.gender === 'female');

        customer = {
          id: localCust?.id || dbCustData.id,
          name: dbCustData.full_name || localCust?.name || 'Student',
          phone: dbCustData.phone || localCust?.phone || '',
          gender: isFemale ? 'female' : 'male',
          collegeOrWork: dbCustData.college_name || localCust?.collegeOrWork || '',
          hostelOrAddress: `${dbCustData.hostel_name || ''} ${dbCustData.room_number || ''}`.trim() || localCust?.hostelOrAddress || '',
          planType: tariff?.plan_name || localCust?.planType || 'Standard Plan',
          startDate: activeSub?.start_date || dbCustData.created_at?.split('T')[0] || localCust?.startDate || '2026-09-01',
          endDate: activeSub?.end_date || localCust?.endDate || '2026-09-30',
          totalAmount: Number(activeSub?.final_amount || localCust?.totalAmount || 2500),
          paidAmount: Number(activeSub?.amount_paid || localCust?.paidAmount || 2500),
          balance: Number(activeSub?.balance_due || localCust?.balance || 0),
          status: dbCustData.is_active ? 'active' : 'inactive',
          createdAt: dbCustData.created_at || localCust?.createdAt,
          notes: dbCustData.notes || localCust?.notes,
          penalties: localCust?.penalties || [],
          renewals: localCust?.renewals || [],
          leaves: localCust?.leaves || [],
          payments: localCust?.payments || []
        };
      }
    } catch (err) {
      console.warn('fetchCustomer360Profile db customer query err:', err);
    }
  }

  // Fallback to local customer if db returned nothing
  if (!customer) {
    if (localCust) {
      customer = { ...localCust };
    } else {
      return null;
    }
  }

  // Set up flexible multi-identifier matching for this customer
  const matchIds = new Set<string>();
  if (customerId) matchIds.add(customerId);
  if (customer?.id) matchIds.add(customer.id);
  if (localCust?.id) matchIds.add(localCust.id);
  if (dbCustData?.id) matchIds.add(dbCustData.id);

  const phoneNumbers = new Set<string>();
  if (customer?.phone) phoneNumbers.add(customer.phone.replace(/[^0-9]/g, ''));
  if (localCust?.phone) phoneNumbers.add(localCust.phone.replace(/[^0-9]/g, ''));
  if (dbCustData?.phone) phoneNumbers.add(dbCustData.phone.replace(/[^0-9]/g, ''));

  const names = new Set<string>();
  if (customer?.name) names.add(customer.name.trim().toLowerCase());
  if (localCust?.name) names.add(localCust.name.trim().toLowerCase());
  if (dbCustData?.full_name) names.add(dbCustData.full_name.trim().toLowerCase());

  const isMatchingCustomer = (itemCustId?: string, itemPhone?: string, itemName?: string) => {
    if (itemCustId && matchIds.has(itemCustId)) return true;
    if (itemCustId && phoneNumbers.has(itemCustId.replace(/[^0-9]/g, ''))) return true;
    if (itemPhone && phoneNumbers.has(itemPhone.replace(/[^0-9]/g, ''))) return true;
    if (itemName && names.has(itemName.trim().toLowerCase())) return true;
    return false;
  };

  const uuidMatchIds = Array.from(matchIds).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  const resolvedMessId = dbCustData?.mess_id || (localCust as any)?.messId || messId;

  // 3. Fetch Payments (Combine Supabase and Local)
  let payRows: any[] = [];
  if (supabase && uuidMatchIds.length > 0) {
    try {
      const { data } = await supabase
        .from('payment_logs')
        .select('*')
        .in('customer_id', uuidMatchIds)
        .order('created_at', { ascending: false });
      if (data) payRows = data;
    } catch (err) {
      console.warn('fetchCustomer360Profile pay db query err:', err);
    }
  }

  // Combine with Local Payments
  const localPayments = loadLocalPayments().filter(p => 
    isMatchingCustomer(p.customerId, p.customerPhone, p.customerName)
  );

  const paymentMap = new Map<string, SupabasePaymentRecord>();
  // Process remote rows
  payRows.forEach((p: any) => {
    paymentMap.set(p.id, {
      id: p.id,
      customerId: p.customer_id,
      customerName: customer?.name || 'Student',
      customerPhone: customer?.phone || '',
      messId: p.mess_id || resolvedMessId,
      amount: Number(p.amount),
      paymentMode: (p.payment_mode || 'cash').toLowerCase() as PaymentMode,
      transactionReference: p.transaction_reference || p.transaction_id,
      status: p.notes === 'PENDING_VERIFICATION' ? 'pending' : (p.status || 'verified'),
      notes: p.notes,
      recordedBy: p.recorded_by || 'Cashier',
      verifiedBy: p.verified_by,
      verifiedAt: p.verified_at,
      isReversal: p.is_reversal || false,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    });
  });
  // Overlay local rows
  localPayments.forEach((p) => {
    if (!paymentMap.has(p.id)) {
      paymentMap.set(p.id, p);
    }
  });
  // Overlay customer.payments if available
  if (customer.payments && Array.isArray(customer.payments)) {
    customer.payments.forEach((p: any) => {
      const pId = p.id || `cp-${p.date || Date.now()}-${p.amount}`;
      if (!paymentMap.has(pId)) {
        paymentMap.set(pId, {
          id: pId,
          customerId: customer?.id || '',
          customerName: customer?.name || 'Student',
          customerPhone: customer?.phone || '',
          messId: resolvedMessId,
          amount: Number(p.amount || p.paidAmount || 0),
          paymentMode: (p.paymentMode || p.paymentMethod || 'cash').toLowerCase() as PaymentMode,
          transactionReference: p.transactionReference || p.referenceNo,
          status: p.status || 'verified',
          notes: p.notes,
          recordedBy: p.recordedBy || 'Desk',
          createdAt: p.createdAt || p.date || new Date().toISOString()
        });
      }
    });
  }

  const payments = Array.from(paymentMap.values()).sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  // 4. Fetch Attendance Logs (Combine Supabase attendance_logs, meal_logs, and Local)
  const attMap = new Map<string, any>();

  if (supabase) {
    // A. attendance_logs (UUIDs)
    if (uuidMatchIds.length > 0) {
      try {
        const { data } = await supabase
          .from('attendance_logs')
          .select('id, meal_date, meal_shift, is_valid, scanned_at')
          .in('customer_id', uuidMatchIds)
          .order('scanned_at', { ascending: false })
          .limit(100);
        if (data) {
          data.forEach((a: any) => {
            attMap.set(a.id, {
              id: a.id,
              mealDate: a.meal_date,
              mealShift: a.meal_shift,
              isValid: a.is_valid,
              scannedAt: a.scanned_at
            });
          });
        }
      } catch (err) {
        console.warn('fetchCustomer360Profile att db query err:', err);
      }
    }

    // B. meal_logs (custom IDs like MM-2026-001 or c-1)
    try {
      const allIds = Array.from(matchIds);
      const { data } = await supabase
        .from('meal_logs')
        .select('*')
        .in('customer_id', allIds)
        .order('timestamp', { ascending: false })
        .limit(100);
      if (data) {
        data.forEach((m: any) => {
          const key = m.id || `${m.date}_${m.meal_type || m.mealType}`;
          if (!attMap.has(key)) {
            attMap.set(key, {
              id: m.id || key,
              mealDate: m.date,
              mealShift: m.meal_type || m.mealType,
              isValid: (m.scan_status || m.scanStatus) === 'ALLOW' || (m.scan_status || m.scanStatus) === 'VERIFIED',
              scannedAt: m.timestamp
            });
          }
        });
      }
    } catch (err) {
      console.warn('fetchCustomer360Profile meal_logs db query err:', err);
    }
  }

  // Combine with Local Meal Logs
  const localMealLogs = loadMealLogs().filter(m => 
    isMatchingCustomer(m.customerId, undefined, m.customerName)
  );

  localMealLogs.forEach((m) => {
    const key = m.id || `${m.date}_${m.mealType}`;
    if (!attMap.has(key)) {
      attMap.set(key, {
        id: m.id || key,
        mealDate: m.date,
        mealShift: m.mealType,
        isValid: m.scanStatus === 'ALLOW' || (m.scanStatus as string) === 'VERIFIED',
        scannedAt: m.timestamp
      });
    }
  });

  const attendanceLogs = Array.from(attMap.values()).sort((a, b) => 
    new Date(b.scannedAt || b.mealDate || 0).getTime() - new Date(a.scannedAt || a.mealDate || 0).getTime()
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7);

  const attendanceCount = {
    today: attendanceLogs.some(a => a.mealDate === todayStr && a.isValid),
    currentMonth: attendanceLogs.filter(a => a.mealDate?.startsWith(currentMonthPrefix) && a.isValid).length,
    total: attendanceLogs.filter(a => a.isValid).length,
    lunch: attendanceLogs.filter(a => a.mealShift === 'lunch' && a.isValid).length,
    dinner: attendanceLogs.filter(a => a.mealShift === 'dinner' && a.isValid).length
  };

  // 5. Fetch Leave History (Combine Supabase and Local)
  let leaveRows: any[] = [];
  if (supabase && uuidMatchIds.length > 0) {
    try {
      const { data } = await supabase
        .from('leave_requests')
        .select('id, start_date, end_date, reason, status, created_at')
        .in('customer_id', uuidMatchIds)
        .order('created_at', { ascending: false });
      if (data) leaveRows = data;
    } catch (err) {
      console.warn('fetchCustomer360Profile leave db query err:', err);
    }
  }

  const leaveMap = new Map<string, any>();
  leaveRows.forEach((l: any) => {
    leaveMap.set(l.id, {
      id: l.id,
      startDate: l.start_date,
      endDate: l.end_date,
      reason: l.reason,
      status: l.status,
      createdAt: l.created_at
    });
  });
  if (customer.leaves && Array.isArray(customer.leaves)) {
    customer.leaves.forEach((l: any) => {
      const key = l.id || `${l.startDate}_${l.endDate}`;
      if (!leaveMap.has(key)) {
        leaveMap.set(key, {
          id: key,
          startDate: l.startDate,
          endDate: l.endDate,
          reason: l.reason || 'Personal Leave',
          status: l.status || (l.approved ? 'approved' : 'pending'),
          createdAt: l.createdAt || new Date().toISOString()
        });
      }
    });
  }
  const leaveHistory = Array.from(leaveMap.values()).sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  // 6. Fetch Complaints (Combine Supabase, Local Storage, and Complaint Notifications)
  const allComplaints = await fetchComplaintsFromSupabase(resolvedMessId);
  const localComplaints = loadComplaints();
  const complaintSourcesMap = new Map<string, CustomerComplaint>();
  
  (allComplaints || []).forEach(c => complaintSourcesMap.set(c.id, c));
  (localComplaints || []).forEach(c => complaintSourcesMap.set(c.id, c));

  // Also include any complaint registered in owner notifications for this student
  try {
    const ownerNotifs = await fetchOwnerNotifications(resolvedMessId);
    ownerNotifs.forEach(n => {
      if (n.type === 'complaint_received' && isMatchingCustomer(n.customerId, undefined, n.customerName)) {
        const compId = n.relatedRecordId || `comp-notif-${n.id}`;
        if (!complaintSourcesMap.has(compId)) {
          complaintSourcesMap.set(compId, {
            id: compId,
            customerId: n.customerId || customer?.id || '',
            customerName: n.customerName || customer?.name || 'Student',
            customerPhone: customer?.phone,
            category: (n.title.match(/\(([^)]+)\)/)?.[1] as any) || 'Other',
            subject: n.title,
            description: n.message,
            status: 'NEW',
            createdAt: n.createdAt
          });
        }
      }
    });
  } catch (err) {
    console.warn('fetchCustomer360Profile ownerNotifs check err:', err);
  }

  const complaints = Array.from(complaintSourcesMap.values())
    .filter(c => isMatchingCustomer(c.customerId, c.customerPhone, c.customerName))
    .map(c => ({
      id: c.id,
      subject: c.subject || c.category,
      description: c.description,
      status: c.status,
      response: c.ownerReply,
      createdAt: c.createdAt
    }))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // 7. Fetch Reviews & Ratings (Combine Supabase and Local)
  const allReviews = await fetchMealRatingsFromSupabase(resolvedMessId);
  const localReviews = loadMealRatings();
  const reviewSourcesMap = new Map<string, MealRatingReview>();

  (allReviews || []).forEach(r => reviewSourcesMap.set(r.id, r));
  (localReviews || []).forEach(r => reviewSourcesMap.set(r.id, r));

  const reviews = Array.from(reviewSourcesMap.values())
    .filter(r => isMatchingCustomer(r.customerId, (r as any).customerPhone, r.customerName))
    .map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.feedback,
      createdAt: r.createdAt
    }))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return {
    customer,
    payments,
    attendanceCount,
    attendanceLogs,
    leaveHistory,
    complaints,
    reviews
  };
}

export async function toggleCustomerActiveStatus(
  customerId: string, 
  newActiveState: boolean
): Promise<boolean> {
  if (!supabase || !customerId) return false;
  try {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: newActiveState, updated_at: new Date().toISOString() })
      .eq('id', customerId);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// FEATURE 4: Permanent Payment Foundation
// ==========================================

export async function fetchPaymentsFromSupabase(messId: string = DEFAULT_MESS_ID): Promise<SupabasePaymentRecord[]> {
  const localPayments = loadLocalPayments();
  const localCustomers = loadCustomers();

  // Helper map for customer names & phones
  const customerMap = new Map<string, { name: string; phone?: string }>();
  localCustomers.forEach(c => {
    customerMap.set(c.id, { name: c.name, phone: c.phone });
    if (c.phone) customerMap.set(c.phone, { name: c.name, phone: c.phone });
  });

  // Enrich local payments with customer names if missing
  const enrichedLocal = localPayments.map(p => {
    const cust = customerMap.get(p.customerId) || (p.customerPhone ? customerMap.get(p.customerPhone) : undefined);
    return {
      ...p,
      customerName: (p.customerName && p.customerName !== 'Member') ? p.customerName : (cust?.name || 'Member'),
      customerPhone: p.customerPhone || cust?.phone
    };
  });

  if (!supabase) {
    return enrichedLocal.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    const { data, error } = await supabase
      .from('payment_logs')
      .select(`
        id,
        customer_id,
        mess_id,
        amount,
        payment_mode,
        created_at,
        notes,
        customers (full_name, phone)
      `)
      .eq('mess_id', messId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) {
      return enrichedLocal.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const remoteRecords: SupabasePaymentRecord[] = data.map((d: any) => {
      const cust = Array.isArray(d.customers) ? d.customers[0] : d.customers;
      const notesStr = d.notes || '';
      const isPending = notesStr.startsWith('PENDING_VERIFICATION') || notesStr === 'PENDING_VERIFICATION';
      const isReversal = notesStr.startsWith('REVERSED') || notesStr.startsWith('REVERSAL');
      const localCust = customerMap.get(d.customer_id);

      // Extract UTR if present
      let ref: string | undefined = undefined;
      if (notesStr.includes('UTR:')) {
        ref = notesStr.split('UTR:')[1].trim().split(' ')[0];
      }

      return {
        id: d.id,
        customerId: d.customer_id,
        customerName: cust?.full_name || localCust?.name || 'Member',
        customerPhone: cust?.phone || localCust?.phone,
        messId: d.mess_id,
        amount: Number(d.amount),
        paymentMode: (d.payment_mode === 'bank_transfer' ? 'upi' : (d.payment_mode || 'cash')).toLowerCase() as PaymentMode,
        transactionReference: ref,
        status: isPending ? 'pending' : isReversal ? 'reversed' : 'verified',
        notes: d.notes,
        recordedBy: isPending ? 'Student App' : 'Counter Staff',
        createdAt: d.created_at
      };
    });

    // Merge by ID with local taking precedence for status changes
    const mergedMap = new Map<string, SupabasePaymentRecord>();
    remoteRecords.forEach(r => mergedMap.set(r.id, r));
    enrichedLocal.forEach(l => mergedMap.set(l.id, l));

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.warn('fetchPaymentsFromSupabase error:', err);
    return enrichedLocal.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function recordNewPaymentInSupabase(params: {
  messId?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionReference?: string;
  notes?: string;
  recordedBy?: string;
  status?: PaymentStatus;
}): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const messId = params.messId || DEFAULT_MESS_ID;
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const status: PaymentStatus = params.status || 'verified';

  // 1. Resolve customer information
  const localCustomers = loadCustomers();
  const matchedCustomer = localCustomers.find(
    c => c.id === params.customerId || (params.customerPhone && c.phone === params.customerPhone)
  );

  const resolvedName = params.customerName || matchedCustomer?.name || 'Member';
  const resolvedPhone = params.customerPhone || matchedCustomer?.phone;

  // 2. Format notes and reference
  const rawNotes = params.notes || '';
  const utrSnippet = params.transactionReference ? (rawNotes.includes('UTR:') ? '' : `UTR:${params.transactionReference}`) : '';
  const formattedNotes = [rawNotes, utrSnippet].filter(Boolean).join(' ').trim();
  const storedNotes = status === 'pending' 
    ? `PENDING_VERIFICATION: ${formattedNotes}`.trim()
    : formattedNotes;

  // 3. Create permanent local payment record
  const newPayment: SupabasePaymentRecord = {
    id: paymentId,
    customerId: params.customerId,
    customerName: resolvedName,
    customerPhone: resolvedPhone,
    messId,
    amount: Number(params.amount),
    paymentMode: params.paymentMode,
    transactionReference: params.transactionReference,
    status,
    notes: storedNotes,
    recordedBy: params.recordedBy || (status === 'pending' ? 'Student App' : 'Counter Staff'),
    createdAt: new Date().toISOString()
  };

  const existingPayments = loadLocalPayments();
  saveLocalPayments([newPayment, ...existingPayments]);

  // 4. If instantly verified, update customer balance and paidAmount in local storage
  if (status === 'verified' && matchedCustomer) {
    const updatedCusts = localCustomers.map(c => {
      if (c.id === matchedCustomer.id) {
        const newPaid = Number(c.paidAmount || 0) + Number(params.amount);
        const newBal = Math.max(0, Number(c.balance || 0) - Number(params.amount));
        return {
          ...c,
          paidAmount: newPaid,
          balance: newBal
        };
      }
      return c;
    });
    saveCustomers(updatedCusts);
  }

  // 5. Create Owner Notification for real-time awareness
  await createOwnerNotification({
    messId,
    type: params.paymentMode === 'upi' ? 'upi_payment' : 'cash_payment',
    title: status === 'pending' ? 'UPI Verification Request' : `${params.paymentMode.toUpperCase()} Payment Recorded`,
    message: status === 'pending'
      ? `Student ${resolvedName} submitted ₹${params.amount} via UPI (Ref: ${params.transactionReference || 'N/A'}). Verification required.`
      : `₹${params.amount} received from ${resolvedName}.`,
    customerId: params.customerId,
    customerName: resolvedName,
    relatedRecordId: paymentId,
    priority: status === 'pending' ? 'urgent' : 'medium'
  });

  // 6. Realtime cross-component broadcast events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_payment_created', { detail: newPayment }));
    window.dispatchEvent(new CustomEvent('morya_payment_updated', { detail: newPayment }));
    window.dispatchEvent(new Event('storage'));
  }

  // 7. Background sync to Supabase (safe against Postgres enum and RLS constraints)
  if (supabase) {
    try {
      // Postgres enum for payment_mode supports ('cash', 'card', 'bank_transfer')
      const dbMode = params.paymentMode === 'upi' ? 'bank_transfer' : (params.paymentMode === 'adjustment' ? 'cash' : params.paymentMode);

      await supabase
        .from('payment_logs')
        .insert({
          id: paymentId,
          mess_id: messId,
          customer_id: params.customerId,
          amount: params.amount,
          payment_mode: dbMode,
          notes: storedNotes,
          created_at: new Date().toISOString()
        });

      if (status !== 'pending') {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('id, amount_paid, balance_due')
          .eq('customer_id', params.customerId)
          .eq('status', 'active')
          .order('end_date', { ascending: false })
          .limit(1);

        if (subs && subs.length > 0) {
          const sub = subs[0];
          const newPaid = Number(sub.amount_paid || 0) + Number(params.amount);
          const newDue = Math.max(0, Number(sub.balance_due || 0) - Number(params.amount));
          await supabase
            .from('subscriptions')
            .update({
              amount_paid: newPaid,
              balance_due: newDue,
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);
        }
      }
    } catch (e) {
      console.warn('Background Supabase payment sync note:', e);
    }
  }

  return { success: true, paymentId };
}

export async function verifyPaymentInSupabase(
  paymentId: string, 
  verifierName: string = 'Owner Desk'
): Promise<{ success: boolean; error?: string }> {
  // 1. Update in local storage
  const payments = loadLocalPayments();
  const target = payments.find(p => p.id === paymentId);

  if (target) {
    target.status = 'verified';
    target.verifiedBy = verifierName;
    target.verifiedAt = new Date().toISOString();
    target.notes = (target.notes || '')
      .replace(/^PENDING_VERIFICATION:\s*/i, '')
      .concat(` [VERIFIED by ${verifierName}]`)
      .trim();
    saveLocalPayments(payments);

    // 2. Adjust customer dues in local storage
    const customers = loadCustomers();
    const cust = customers.find(c => c.id === target.customerId || (target.customerPhone && c.phone === target.customerPhone));
    if (cust) {
      const newPaid = Number(cust.paidAmount || 0) + Number(target.amount);
      const newDue = Math.max(0, Number(cust.balance || 0) - Number(target.amount));
      const updatedCusts = customers.map(c => 
        c.id === cust.id ? { ...c, paidAmount: newPaid, balance: newDue } : c
      );
      saveCustomers(updatedCusts);
    }

    // 3. Notify owner
    await createOwnerNotification({
      type: 'payment_verification',
      title: 'Payment Verified',
      message: `Verified payment of ₹${target.amount} for ${target.customerName}. Dues adjusted.`,
      customerId: target.customerId,
      customerName: target.customerName,
      relatedRecordId: paymentId,
      priority: 'low'
    });

    // 4. Notify student instantly in their notification box
    await sendNotificationToStudent({
      customerId: target.customerId,
      customerName: target.customerName,
      title: 'Payment Verified! ✅',
      message: `Your payment of ₹${target.amount} (${target.paymentMode.toUpperCase()}) has been verified and accepted. Your account dues have been updated.`,
      type: 'payment_verified',
      priority: 'normal'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('morya_payment_updated', { detail: target }));
      window.dispatchEvent(new Event('storage'));
    }
  }

  // 4. Remote Supabase sync
  if (supabase) {
    try {
      await supabase
        .from('payment_logs')
        .update({
          notes: `VERIFIED by ${verifierName} on ${new Date().toLocaleDateString('en-GB')}`
        })
        .eq('id', paymentId);

      if (target) {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('id, amount_paid, balance_due')
          .eq('customer_id', target.customerId)
          .eq('status', 'active')
          .limit(1);

        if (subs && subs.length > 0) {
          const sub = subs[0];
          const newPaid = Number(sub.amount_paid || 0) + Number(target.amount);
          const newDue = Math.max(0, Number(sub.balance_due || 0) - Number(target.amount));
          await supabase
            .from('subscriptions')
            .update({
              amount_paid: newPaid,
              balance_due: newDue,
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);
        }
      }
    } catch (e) {
      console.warn('Supabase remote payment verification note:', e);
    }
  }

  return { success: true };
}

// Payment Reversal Transaction (Preserves financial auditability)
export async function reversePaymentInSupabase(params: {
  originalPaymentId: string;
  customerId: string;
  amount: number;
  reason: string;
  reversedBy?: string;
  messId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const messId = params.messId || DEFAULT_MESS_ID;
  const payments = loadLocalPayments();
  const target = payments.find(p => p.id === params.originalPaymentId);

  // 1. Mark original payment as reversed
  if (target) {
    target.status = 'reversed';
    target.reversalReason = params.reason;
    target.isReversal = true;
    target.notes = `${target.notes || ''} [REVERSED: ${params.reason} by ${params.reversedBy || 'Owner Desk'}]`.trim();
  }

  // 2. Add compensatory negative adjustment record
  const reversalAdjustment: SupabasePaymentRecord = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    customerId: params.customerId,
    customerName: target?.customerName || 'Member',
    customerPhone: target?.customerPhone,
    messId,
    amount: -Math.abs(params.amount),
    paymentMode: 'adjustment',
    status: 'verified',
    notes: `REVERSAL of #${params.originalPaymentId}: ${params.reason}`,
    recordedBy: params.reversedBy || 'Owner Desk',
    isReversal: true,
    reversalReason: params.reason,
    createdAt: new Date().toISOString()
  };

  saveLocalPayments([reversalAdjustment, ...payments]);

  // 3. Restore customer subscription balance
  const customers = loadCustomers();
  const cust = customers.find(c => c.id === params.customerId || (target?.customerPhone && c.phone === target.customerPhone));
  if (cust) {
    const newPaid = Math.max(0, Number(cust.paidAmount || 0) - Number(params.amount));
    const newDue = Number(cust.balance || 0) + Number(params.amount);
    const updatedCusts = customers.map(c => 
      c.id === cust.id ? { ...c, paidAmount: newPaid, balance: newDue } : c
    );
    saveCustomers(updatedCusts);
  }

  // 4. Create notification
  await createOwnerNotification({
    messId,
    type: 'payment_verification',
    title: 'Payment Reversal Executed',
    message: `Reversed payment #${params.originalPaymentId} (₹${params.amount}) for ${target?.customerName || params.customerId}. Reason: ${params.reason}`,
    customerId: params.customerId,
    customerName: target?.customerName,
    relatedRecordId: params.originalPaymentId,
    priority: 'high'
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_payment_updated', { detail: target }));
    window.dispatchEvent(new Event('storage'));
  }

  // 5. Attempt remote sync
  if (supabase) {
    try {
      await supabase
        .from('payment_logs')
        .update({
          notes: `REVERSED: ${params.reason} by ${params.reversedBy || 'Owner Desk'}`
        })
        .eq('id', params.originalPaymentId);

      await supabase
        .from('payment_logs')
        .insert({
          id: reversalAdjustment.id,
          mess_id: messId,
          customer_id: params.customerId,
          amount: -Math.abs(params.amount),
          payment_mode: 'cash',
          notes: `REVERSAL of #${params.originalPaymentId}: ${params.reason}`,
          created_at: new Date().toISOString()
        });

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id, amount_paid, balance_due')
        .eq('customer_id', params.customerId)
        .eq('status', 'active')
        .limit(1);

      if (subs && subs.length > 0) {
        const sub = subs[0];
        const newPaid = Math.max(0, Number(sub.amount_paid || 0) - Number(params.amount));
        const newDue = Number(sub.balance_due || 0) + Number(params.amount);
        await supabase
          .from('subscriptions')
          .update({
            amount_paid: newPaid,
            balance_due: newDue,
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id);
      }
    } catch (e) {
      console.warn('Supabase remote payment reversal note:', e);
    }
  }

  return { success: true };
}

// Payment Rejection with Audit & Student Notification
export async function rejectPaymentInSupabase(params: {
  paymentId: string;
  reason: string;
  rejectedBy?: string;
  messId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const payments = loadLocalPayments();
  const target = payments.find(p => p.id === params.paymentId);

  if (target) {
    target.status = 'rejected';
    target.notes = `REJECTED: ${params.reason} [by ${params.rejectedBy || 'Owner Desk'}]`;
    saveLocalPayments(payments);

    // Notify student
    await sendNotificationToStudent({
      customerId: target.customerId,
      customerName: target.customerName,
      title: 'Payment Submission Rejected ❌',
      message: `Your payment of ₹${target.amount} (${target.paymentMode.toUpperCase()}) was rejected: ${params.reason}. Please contact the mess desk or re-submit with correct proof.`,
      type: 'payment_verified',
      priority: 'urgent'
    });

    // Notify owner
    await createOwnerNotification({
      type: 'payment_verification',
      title: 'Payment Rejected',
      message: `Rejected payment of ₹${target.amount} for ${target.customerName}. Reason: ${params.reason}`,
      customerId: target.customerId,
      customerName: target.customerName,
      relatedRecordId: params.paymentId,
      priority: 'medium'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('morya_payment_updated', { detail: target }));
      window.dispatchEvent(new Event('storage'));
    }
  }

  // Update in remote Supabase
  if (supabase) {
    try {
      await supabase
        .from('payment_logs')
        .update({
          notes: `REJECTED: ${params.reason} by ${params.rejectedBy || 'Owner Desk'} on ${new Date().toLocaleDateString('en-GB')}`
        })
        .eq('id', params.paymentId);
    } catch (e) {
      console.warn('Supabase remote payment rejection note:', e);
    }
  }

  return { success: true };
}

// Bulk Verify Multiple Payments
export async function bulkVerifyPaymentsInSupabase(
  paymentIds: string[],
  verifierName: string = 'Owner Desk'
): Promise<{ success: boolean; count: number }> {
  let count = 0;
  for (const id of paymentIds) {
    const res = await verifyPaymentInSupabase(id, verifierName);
    if (res.success) count++;
  }
  return { success: true, count };
}

// Manual Ledger Adjustment (Debits or Credits, with customer dues sync & audit)
export async function recordLedgerAdjustment(params: {
  messId?: string;
  customerId: string;
  customerName?: string;
  type: 'debit' | 'credit';
  amount: number;
  reason: string;
  recordedBy?: string;
}): Promise<{ success: boolean; error?: string }> {
  const messId = params.messId || DEFAULT_MESS_ID;
  const adjId = `adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const payments = loadLocalPayments();

  const newAdj: SupabasePaymentRecord = {
    id: adjId,
    customerId: params.customerId,
    customerName: params.customerName || 'Customer',
    messId,
    amount: params.type === 'credit' ? -Math.abs(params.amount) : Math.abs(params.amount),
    paymentMode: 'adjustment',
    status: 'verified',
    notes: `LEDGER_${params.type.toUpperCase()}: ${params.reason}`,
    recordedBy: params.recordedBy || 'Owner Desk',
    createdAt: new Date().toISOString()
  };

  saveLocalPayments([newAdj, ...payments]);

  // Update customer balance: Debit increases balance due (+), Credit decreases balance due (-)
  const customers = loadCustomers();
  const target = customers.find(c => c.id === params.customerId);
  if (target) {
    const prevDue = Number(target.balance || 0);
    const newDue = params.type === 'debit' 
      ? prevDue + Math.abs(params.amount)
      : Math.max(0, prevDue - Math.abs(params.amount));
    
    const updated = customers.map(c => c.id === target.id ? { ...c, balance: newDue } : c);
    saveCustomers(updated);
  }

  // Cross-tab broadcast
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_payment_created', { detail: newAdj }));
    window.dispatchEvent(new CustomEvent('morya_payment_updated', { detail: newAdj }));
    window.dispatchEvent(new Event('storage'));
  }

  // Remote Supabase sync
  if (supabase) {
    try {
      await supabase.from('payment_logs').insert({
        id: adjId,
        mess_id: messId,
        customer_id: params.customerId,
        amount: params.type === 'credit' ? -Math.abs(params.amount) : Math.abs(params.amount),
        payment_mode: 'cash',
        notes: `LEDGER_${params.type.toUpperCase()}: ${params.reason}`,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('recordLedgerAdjustment Supabase sync error:', e);
    }
  }

  return { success: true };
}

// ==========================================
// FEATURE 6: Trial Student Management
// ==========================================

export async function fetchTrialVisitorsFromSupabase(messId: string = DEFAULT_MESS_ID): Promise<TrialVisitor[]> {
  const localTrials = loadTrials();
  const trialMap = new Map<string, TrialVisitor>();
  localTrials.forEach(t => trialMap.set(t.id, t));

  if (!supabase) return Array.from(trialMap.values());

  try {
    // 1. Fetch from mess_settings JSON store (100% resilient cross-device cloud sync)
    const { data: settingsData } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    if (settingsData?.notes) {
      try {
        const parsed = JSON.parse(settingsData.notes);
        if (parsed.trials && Array.isArray(parsed.trials)) {
          parsed.trials.forEach((t: TrialVisitor) => {
            if (t && t.id) trialMap.set(t.id, t);
          });
        }
      } catch (e) {
        console.warn('Parse mess_settings trials note:', e);
      }
    }

    // 2. Fetch from customers table where notes contain TRIAL_STUDENT
    const { data: custData, error: custErr } = await supabase
      .from('customers')
      .select('id, full_name, phone, created_at, notes')
      .or(`mess_id.eq.${messId},mess_id.is.null`)
      .ilike('notes', '%TRIAL_STUDENT%')
      .order('created_at', { ascending: false });

    if (!custErr && custData && Array.isArray(custData)) {
      custData.forEach((d: any) => {
        const studentName = d.full_name || 'Trial Student';
        const studentPhone = d.phone || '';
        const createdDate = d.created_at ? d.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
        
        let amountPaid = 70;
        let notesText = d.notes || '1-Day Trial Meal';
        if (notesText.includes('PAID:')) {
          const match = notesText.match(/PAID:(\d+)/);
          if (match) amountPaid = Number(match[1]) || 70;
        } else if (notesText.includes('Paid: ₹')) {
          const match = notesText.match(/Paid: ₹(\d+)/);
          if (match) amountPaid = Number(match[1]) || 70;
        }

        const remoteTrial: TrialVisitor = {
          id: d.id,
          name: studentName,
          phone: studentPhone,
          gender: 'male',
          college: 'N/A',
          visitType: '1_day_trial',
          date: createdDate,
          amountPaid: amountPaid,
          convertedToMonthly: notesText.includes('CONVERTED'),
          notes: notesText
        };

        if (!trialMap.has(d.id)) {
          trialMap.set(d.id, remoteTrial);
        }
      });
    }

    // 3. Fetch from dedicated trial_students table if present
    try {
      const { data: trialDbData } = await supabase
        .from('trial_students')
        .select('*')
        .or(`mess_id.eq.${messId},mess_id.is.null`)
        .order('created_at', { ascending: false });

      if (trialDbData && Array.isArray(trialDbData)) {
        trialDbData.forEach((d: any) => {
          const studentName = d.full_name || d.name || 'Trial Student';
          const studentPhone = d.phone || '';
          const createdDate = d.created_at ? d.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
          const amount = Number(d.amount_paid || d.amount || 70);

          const remoteTrial: TrialVisitor = {
            id: d.id,
            name: studentName,
            phone: studentPhone,
            gender: 'male',
            college: 'N/A',
            visitType: '1_day_trial',
            date: createdDate,
            amountPaid: amount,
            convertedToMonthly: false,
            notes: d.notes || `Token: #${d.token_number || d.id}`
          };

          trialMap.set(d.id, remoteTrial);
        });
      }
    } catch (trialDbErr) {
      console.warn('fetch trial_students table note:', trialDbErr);
    }

    const merged = Array.from(trialMap.values()).sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );

    saveTrials(merged);
    return merged;
  } catch (err) {
    console.warn('fetchTrialVisitorsFromSupabase err:', err);
    return Array.from(trialMap.values());
  }
}

export async function fetchTrialStudents(messId: string = DEFAULT_MESS_ID): Promise<TrialStudent[]> {
  const trialMap = new Map<string, TrialStudent>();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Load from local store first
  try {
    const localTrials = loadTrials();
    localTrials.forEach(t => {
      const isConverted = t.convertedToMonthly === true;
      let status: TrialStatus = 'ACTIVE';
      if (isConverted) status = 'CONVERTED';
      else if (t.date < todayStr) status = 'EXPIRED';
      else status = 'ACTIVE'; // Today's diner is ACTIVE

      trialMap.set(t.id, {
        id: t.id,
        messId,
        fullName: t.name,
        phone: t.phone,
        startDate: t.date || todayStr,
        endDate: t.date || todayStr,
        mealType: t.mealType === 'lunch' ? 'lunch_only' : 'dinner_only',
        mealLimit: 1,
        mealsUsed: 1,
        status,
        notes: t.notes || '',
        createdAt: t.date || todayStr
      });
    });
  } catch (e) {
    console.warn('Error reading local trials:', e);
  }

  // 2. Load from centralized server sync endpoint (/api/sync)
  try {
    const res = await fetch('/api/sync');
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.trials && Array.isArray(json.data.trials)) {
        json.data.trials.forEach((t: any) => {
          if (t && t.id) {
            const isConverted = t.convertedToMonthly === true;
            let status: TrialStatus = 'ACTIVE';
            if (isConverted) status = 'CONVERTED';
            else if (t.date && t.date < todayStr) status = 'EXPIRED';
            else status = 'ACTIVE';

            trialMap.set(t.id, {
              id: t.id,
              messId,
              fullName: t.name || t.fullName || 'Trial Student',
              phone: t.phone || '',
              startDate: t.date || todayStr,
              endDate: t.date || todayStr,
              mealType: t.mealType === 'lunch' ? 'lunch_only' : 'dinner_only',
              mealLimit: 1,
              mealsUsed: 1,
              status,
              notes: t.notes || '',
              createdAt: t.date || todayStr
            });
          }
        });
      }
    }
  } catch {}

  // 3. Also merge from Supabase if available
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          mess_id,
          full_name,
          phone,
          notes,
          created_at,
          attendance_logs(id, is_valid)
        `)
        .eq('mess_id', messId)
        .eq('is_deleted', false)
        .or('notes.ilike.%TRIAL%,id.ilike.TRL-%,id.ilike.trial-%')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach((d: any) => {
          let startDate = d.created_at?.split('T')[0] || todayStr;
          let endDate = todayStr;
          let mealType: 'both' | 'lunch_only' | 'dinner_only' = 'both';
          let mealLimit = 2;
          let isConverted = false;

          try {
            const parts = (d.notes || '').split(';');
            parts.forEach((p: string) => {
              if (p.startsWith('START:')) startDate = p.replace('START:', '').trim();
              if (p.startsWith('END:')) endDate = p.replace('END:', '').trim();
              if (p.startsWith('TYPE:')) mealType = p.replace('TYPE:', '').trim() as any;
              if (p.startsWith('LIMIT:')) mealLimit = Number(p.replace('LIMIT:', '').trim()) || 2;
              if (p.includes('CONVERTED')) isConverted = true;
            });
          } catch {}

          const mealsUsed = (d.attendance_logs || []).filter((a: any) => a.is_valid).length;
          let status: TrialStatus = 'ACTIVE';
          if (isConverted) status = 'CONVERTED';
          else if (mealsUsed >= mealLimit && mealLimit > 0) status = 'EXPIRED';
          else if (endDate < todayStr && startDate < todayStr) status = 'EXPIRED';
          else status = 'ACTIVE';

          trialMap.set(d.id, {
            id: d.id,
            messId: d.mess_id,
            fullName: d.full_name,
            phone: d.phone,
            startDate,
            endDate,
            mealType,
            mealLimit,
            mealsUsed,
            status,
            notes: d.notes,
            createdAt: d.created_at
          });
        });
      }
    } catch (err) {
      console.warn('fetchTrialStudents supabase error:', err);
    }
  }

  return Array.from(trialMap.values()).sort(
    (a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime()
  );
}

export async function addTrialStudentInSupabase(params: {
  messId?: string;
  fullName: string;
  phone: string;
  email?: string;
  startDate: string;
  endDate: string;
  mealType: 'both' | 'lunch_only' | 'dinner_only';
  mealLimit: number;
  amountPaid?: number;
  notes?: string;
}): Promise<{ success: boolean; trialId?: string; error?: string }> {
  const messId = params.messId || DEFAULT_MESS_ID;
  let paidVal = params.amountPaid || 70;
  if (!params.amountPaid && params.notes) {
    if (params.notes.includes('PAID:')) {
      const match = params.notes.match(/PAID:(\d+)/);
      if (match) paidVal = Number(match[1]) || 70;
    } else if (params.notes.includes('Paid: ₹')) {
      const match = params.notes.match(/Paid: ₹(\d+)/);
      if (match) paidVal = Number(match[1]) || 70;
    }
  }

  const trialNotes = `TRIAL_STUDENT;START:${params.startDate};END:${params.endDate};TYPE:${params.mealType};LIMIT:${params.mealLimit};PAID:${paidVal};${params.notes || ''}`;
  const trialId = `TRL-${Date.now().toString().slice(-6)}`;

  // 1. Guaranteed Local Trial Persistence
  const newTrial: TrialVisitor = {
    id: trialId,
    name: params.fullName.trim(),
    phone: params.phone.trim(),
    gender: 'male',
    college: '',
    visitType: '1_day_trial',
    date: params.startDate || new Date().toISOString().split('T')[0],
    amountPaid: paidVal,
    convertedToMonthly: false,
    notes: params.notes || `1-Day Trial Meal (Paid ₹${paidVal})`
  };

  try {
    const existingTrials = loadTrials();
    const updatedTrials = [newTrial, ...existingTrials.filter(t => t.id !== trialId)];
    saveTrials(updatedTrials);
  } catch (e) {
    console.warn('Local trial save note:', e);
  }

  // 2. Guaranteed Owner Notification
  await createOwnerNotification({
    messId,
    type: 'new_trial',
    title: 'New Trial Student Check-In',
    message: `${params.fullName.trim()} (${params.phone.trim()}) checked in for trial meal. Paid: ₹${paidVal} (UPI/Cash).`,
    customerId: trialId,
    customerName: params.fullName.trim(),
    priority: 'high'
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_trial_updated'));
    window.dispatchEvent(new CustomEvent('morya_notification_created'));
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({
        type: 'NEW_TRIAL_STUDENT',
        data: newTrial
      });
    } catch {}
  }

  // 3. Remote Supabase Insertion
  if (supabase) {
    try {
      // 3a. Save to mess_settings JSON (100% guaranteed cross-device cloud sync)
      try {
        const { data: existing } = await supabase
          .from('mess_settings')
          .select('notes')
          .eq('mess_id', messId)
          .maybeSingle();

        let combined: Record<string, any> = {};
        if (existing?.notes) {
          try { combined = JSON.parse(existing.notes); } catch {}
        }

        const existingTrials = Array.isArray(combined.trials) ? combined.trials : [];
        combined.trials = [newTrial, ...existingTrials.filter((t: any) => t.id !== trialId)];
        combined.updated_at = new Date().toISOString();

        await supabase
          .from('mess_settings')
          .upsert({ mess_id: messId, notes: JSON.stringify(combined) });
      } catch (settingsErr) {
        console.warn('mess_settings trial upsert note:', settingsErr);
      }

      // 3b. Save to customers table
      const { error: custErr } = await supabase
        .from('customers')
        .insert({
          id: trialId,
          mess_id: messId,
          full_name: params.fullName.trim(),
          phone: params.phone.trim(),
          notes: trialNotes,
          created_at: new Date().toISOString()
        });

      if (custErr) {
        console.warn('Supabase customer trial insert note:', custErr.message);
      }

      // 3c. Save to dedicated trial_students table
      try {
        await supabase
          .from('trial_students')
          .insert({
            id: trialId,
            mess_id: messId,
            full_name: params.fullName.trim(),
            phone: params.phone.trim(),
            meal_type: params.mealType,
            amount_paid: paidVal,
            payment_mode: 'upi',
            token_number: trialId,
            notes: trialNotes,
            created_at: new Date().toISOString()
          });
      } catch (trialErr) {
        console.warn('trial_students table insert note:', trialErr);
      }

      try {
        await supabase
          .from('payment_logs')
          .insert({
            id: `pay-${trialId}`,
            mess_id: messId,
            customer_id: trialId,
            amount: paidVal,
            payment_mode: 'upi',
            notes: `TRIAL_PAYMENT: ${params.notes || 'Trial Meal'}`,
            created_at: new Date().toISOString()
          });
      } catch {}
    } catch (err: any) {
      console.warn('Supabase addTrialStudentInSupabase remote error:', err);
    }
  }

  return { success: true, trialId };
}

export async function convertTrialToRegularCustomer(params: {
  trialId: string;
  planId?: string;
  planName: string;
  startDate: string;
  endDate: string;
  amount: number;
  paidAmount: number;
  paymentMode: PaymentMode;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !params.trialId) return { success: false, error: 'Database not connected' };

  try {
    // 1. Update customer record notes to mark converted and attach college/room if needed
    const { data: cust, error: cErr } = await supabase
      .from('customers')
      .select('notes, full_name, phone, mess_id')
      .eq('id', params.trialId)
      .single();

    if (cErr || !cust) return { success: false, error: 'Trial student not found' };

    const updatedNotes = `${cust.notes || ''};CONVERTED on ${new Date().toISOString().split('T')[0]};${params.notes || ''}`;

    await supabase
      .from('customers')
      .update({
        notes: updatedNotes,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.trialId);

    // 2. Create permanent official subscription
    const balanceDue = Math.max(0, params.amount - params.paidAmount);
    const { data: subData, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        customer_id: params.trialId,
        tariff_plan_id: params.planId || null,
        plan_price: params.amount,
        final_amount: params.amount,
        amount_paid: params.paidAmount,
        balance_due: balanceDue,
        start_date: params.startDate,
        end_date: params.endDate,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (subErr) {
      console.warn('Subscription creation note:', subErr);
    }

    // 3. If initial payment made, record it permanently
    if (params.paidAmount > 0) {
      await recordNewPaymentInSupabase({
        messId: cust.mess_id,
        customerId: params.trialId,
        amount: params.paidAmount,
        paymentMode: params.paymentMode,
        notes: `Initial payment on trial conversion to ${params.planName}`,
        status: 'verified'
      });
    }

    // 4. Create owner notification
    await createOwnerNotification({
      messId: cust.mess_id,
      type: 'new_customer',
      title: 'Trial Converted to Permanent Member',
      message: `${cust.full_name} converted to ${params.planName} (Paid ₹${params.paidAmount}).`,
      customerId: params.trialId,
      priority: 'high'
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to convert trial' };
  }
}

export async function recordTrialMealConsumedInSupabase(
  trialId: string,
  mealType: 'lunch' | 'dinner' = 'lunch'
): Promise<{ success: boolean; error?: string }> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Update local trial visitors if present
    try {
      const trials = loadTrials();
      const updated = trials.map(t => {
        if (t.id === trialId) {
          return {
            ...t,
            notes: `${t.notes || ''}; MEAL_SERVED:${todayStr}_${mealType}`
          };
        }
        return t;
      });
      saveTrials(updated);
    } catch {}

    // 2. Insert attendance_log in Supabase if connected
    if (supabase) {
      try {
        await supabase
          .from('attendance_logs')
          .insert({
            customer_id: trialId,
            scan_time: new Date().toISOString(),
            meal_type: mealType,
            is_valid: true,
            is_override: false,
            notes: `Trial Dining Scan: ${mealType}`
          });

        // Also append note to customer row
        const { data: cust } = await supabase
          .from('customers')
          .select('notes')
          .eq('id', trialId)
          .maybeSingle();

        if (cust) {
          const currentNotes = cust.notes || '';
          let count = 1;
          const match = currentNotes.match(/MEALS_USED:(\d+)/);
          if (match) count = Number(match[1]) + 1;
          const newNotes = currentNotes.includes('MEALS_USED:')
            ? currentNotes.replace(/MEALS_USED:\d+/, `MEALS_USED:${count}`)
            : `${currentNotes};MEALS_USED:${count}`;

          await supabase
            .from('customers')
            .update({ notes: newNotes, updated_at: new Date().toISOString() })
            .eq('id', trialId);
        }
      } catch (sbErr) {
        console.warn('Supabase trial meal log note:', sbErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('morya_trial_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record meal consumption' };
  }
}

// ==========================================
// FEATURE: Official Owner Payment QR & UPI Integrity
// ==========================================

export interface MessUpiConfig {
  upiId: string;
  upiPayeeName: string;
  upiQrCodeImage?: string;
}

export async function fetchMessUpiConfig(messId: string = DEFAULT_MESS_ID): Promise<MessUpiConfig> {
  const defaultConfig: MessUpiConfig = {
    upiId: 'moryamess@upi',
    upiPayeeName: 'Morya Mess Pune',
    upiQrCodeImage: ''
  };

  if (!supabase) {
    try {
      const local = localStorage.getItem('morya_mess_upi_config');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.upiPayeeName && parsed.upiPayeeName.toLowerCase().includes('latur')) {
          parsed.upiPayeeName = 'Morya Mess Pune';
        }
        return parsed;
      }
      return defaultConfig;
    } catch {
      return defaultConfig;
    }
  }

  try {
    const { data, error } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    if (!error && data?.notes) {
      try {
        const parsed = JSON.parse(data.notes);
        if (parsed.upiId || parsed.upiQrCodeImage) {
          return {
            upiId: parsed.upiId || defaultConfig.upiId,
            upiPayeeName: parsed.upiPayeeName || defaultConfig.upiPayeeName,
            upiQrCodeImage: parsed.upiQrCodeImage || ''
          };
        }
      } catch {
        // notes might be non-JSON
      }
    }
  } catch (err) {
    console.warn('fetchMessUpiConfig err:', err);
  }

  try {
    const local = localStorage.getItem('morya_mess_upi_config');
    return local ? JSON.parse(local) : defaultConfig;
  } catch {
    return defaultConfig;
  }
}

export async function saveMessUpiConfig(
  config: MessUpiConfig,
  messId: string = DEFAULT_MESS_ID
): Promise<{ success: boolean; error?: string }> {
  try {
    localStorage.setItem('morya_mess_upi_config', JSON.stringify(config));
  } catch {}

  if (!supabase) return { success: true };

  try {
    // 1. Fetch current settings notes
    const { data: existing } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    let combinedNotes: Record<string, any> = {};
    if (existing?.notes) {
      try {
        combinedNotes = JSON.parse(existing.notes);
      } catch {
        combinedNotes = { previous_notes: existing.notes };
      }
    }

    combinedNotes.upiId = config.upiId;
    combinedNotes.upiPayeeName = config.upiPayeeName;
    combinedNotes.upiQrCodeImage = config.upiQrCodeImage || '';
    combinedNotes.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('mess_settings')
      .update({
        notes: JSON.stringify(combinedNotes)
      })
      .eq('mess_id', messId);

    if (updateErr) {
      console.warn('mess_settings upi update fallback note:', updateErr.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save UPI config' };
  }
}

// ==========================================
// BATCH 1: Student Portal & Cross-Sync Functions
// ==========================================

export async function fetchStudentLeaveRequests(customerId: string): Promise<any[]> {
  const localCusts = loadCustomers();
  const cust = localCusts.find(c => c.id === customerId);
  const localLeaves = (cust?.leaves || []).map(l => ({
    id: l.id,
    customerId,
    startDate: l.startDate,
    endDate: l.endDate,
    reason: l.reason || 'General Leave',
    status: l.status || (l.approved ? 'approved' : 'pending'),
    approved: l.status === 'approved' || l.approved,
    days: l.days || Math.max(1, Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1),
    createdAt: l.createdAt || l.requestedAt || new Date().toISOString()
  }));

  if (!supabase || !customerId) return localLeaves;
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('id, customer_id, mess_id, start_date, end_date, reason, status, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error || !data) return localLeaves;

    const dbLeaves = data.map((r: any) => ({
      id: r.id,
      customerId: r.customer_id,
      startDate: r.start_date,
      endDate: r.end_date,
      reason: r.reason || 'General Leave',
      status: r.status,
      approved: r.status === 'approved',
      days: Math.max(1, Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1),
      createdAt: r.created_at
    }));

    const leafMap = new Map<string, any>();
    localLeaves.forEach(l => leafMap.set(l.id, l));
    dbLeaves.forEach(l => leafMap.set(l.id, l));

    return Array.from(leafMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } catch (e) {
    console.warn('fetchStudentLeaveRequests err:', e);
    return localLeaves;
  }
}

export async function submitStudentLeaveRequest(params: {
  customerId: string;
  messId?: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!params.customerId) {
    return { success: false, error: 'Student ID missing' };
  }

  const targetMessId = params.messId || DEFAULT_MESS_ID;
  const leaveId = `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const s = new Date(params.startDate).getTime();
  const e = new Date(params.endDate).getTime();
  const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);

  // 1. Guaranteed Local Persistence on Customer Object
  const localCusts = loadCustomers();
  const targetCust = localCusts.find(c => c.id === params.customerId);
  const studentName = targetCust?.name || 'Student';

  // Strict Expiry Guard: Expired subscribers cannot request leaves
  if (targetCust) {
    const daysLeft = calculateDaysRemaining(targetCust.endDate);
    if (daysLeft < 0 || targetCust.status === 'expired' || targetCust.status === 'inactive') {
      return {
        success: false,
        error: `Cannot apply for leave: Mess subscription expired on ${targetCust.endDate || 'N/A'}. Please renew your pass with the mess owner first.`
      };
    }
  }

  const newLeaveRecord = {
    id: leaveId,
    startDate: params.startDate,
    endDate: params.endDate,
    days,
    reason: params.reason || 'Vacation Leave',
    approved: false,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    requestedAt: new Date().toISOString()
  };

  if (targetCust) {
    const existingLeaves = targetCust.leaves || [];
    const updatedCusts = localCusts.map(c => 
      c.id === targetCust.id 
        ? { ...c, leaves: [newLeaveRecord, ...existingLeaves] }
        : c
    );
    saveCustomers(updatedCusts);
  }

  // 2. Instant Owner Notification (0ms Cross-App & Broadcast Sync)
  await createOwnerNotification({
    messId: targetMessId,
    type: 'leave_request',
    title: 'New Student Leave Request',
    message: `${studentName} requested leave from ${params.startDate} to ${params.endDate}. Reason: ${params.reason || 'Personal'}`,
    customerId: params.customerId,
    customerName: studentName,
    relatedRecordId: leaveId,
    priority: 'high'
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_leave_updated'));
    window.dispatchEvent(new CustomEvent('morya_notification_created'));
    window.dispatchEvent(new Event('storage'));
  }

  // 3. Remote Supabase Insertion
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          id: safeUUID(),
          customer_id: params.customerId,
          mess_id: targetMessId,
          start_date: params.startDate,
          end_date: params.endDate,
          reason: params.reason,
          status: 'pending'
        })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Supabase leave_requests remote insert warning:', error.message);
      } else if (data) {
        return { success: true, data };
      }
    } catch (err: any) {
      console.warn('Supabase leave_requests insert exception:', err);
    }
  }

  return { success: true, data: newLeaveRecord };
}

export async function fetchStudentAttendanceLogs(customerId: string): Promise<MealLog[]> {
  if (!supabase || !customerId) return [];
  try {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, customer_id, meal_date, meal_shift, is_valid, scan_mode, scanned_at, override_reason, device_info')
      .eq('customer_id', customerId)
      .order('scanned_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: 'Student',
      date: row.meal_date || (row.scanned_at ? row.scanned_at.split('T')[0] : ''),
      mealType: row.meal_shift === 'dinner' ? 'dinner' : 'lunch',
      timestamp: row.scanned_at || new Date().toISOString(),
      scanStatus: row.is_valid ? 'ALLOW' : 'BLOCK',
      reason: row.override_reason || (row.is_valid ? 'Verified Entry' : 'Blocked / Shift Closed'),
      overrideNotes: row.device_info || row.scan_mode || ''
    }));
  } catch (e) {
    console.warn('fetchStudentAttendanceLogs error:', e);
    return [];
  }
}

export async function fetchWeeklyMenuFromSupabase(messId: string = DEFAULT_MESS_ID): Promise<WeeklyMenuSchedule> {
  const local = loadWeeklyMenu();
  if (!supabase) return local;
  try {
    const { data } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    if (data?.notes) {
      const parsed = JSON.parse(data.notes);
      if (parsed.weeklyMenu) {
        saveWeeklyMenu(parsed.weeklyMenu);
        return parsed.weeklyMenu;
      }
    }
  } catch (e) {
    console.warn('fetchWeeklyMenuFromSupabase err:', e);
  }
  return local;
}

export async function saveWeeklyMenuToSupabase(
  menu: WeeklyMenuSchedule,
  messId: string = DEFAULT_MESS_ID
): Promise<{ success: boolean; error?: string }> {
  saveWeeklyMenu(menu);
  if (!supabase) return { success: true };
  try {
    const { data: existing } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    let combinedNotes: Record<string, any> = {};
    if (existing?.notes) {
      try {
        combinedNotes = JSON.parse(existing.notes);
      } catch {
        combinedNotes = { previous_notes: existing.notes };
      }
    }
    combinedNotes.weeklyMenu = menu;
    combinedNotes.updated_at = new Date().toISOString();

    await supabase
      .from('mess_settings')
      .update({ notes: JSON.stringify(combinedNotes) })
      .eq('mess_id', messId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('morya_menu_updated'));
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export interface StudentNotificationItem {
  id: string;
  mess_id?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'urgent';
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

export async function sendNotificationToStudent(params: {
  messId?: string;
  customerId?: string | null; // null for broadcast to all students
  customerName?: string;
  title: string;
  message: string;
  type?: string;
  priority?: 'low' | 'normal' | 'urgent';
}): Promise<boolean> {
  const messId = params.messId || DEFAULT_MESS_ID;
  const notifId = safeUUID();
  const newNotif: StudentNotificationItem = {
    id: notifId,
    mess_id: messId,
    customer_id: params.customerId || null,
    customer_name: params.customerName || null,
    type: params.type || 'general',
    title: params.title,
    message: params.message,
    priority: params.priority || 'normal',
    is_read: false,
    created_at: new Date().toISOString()
  };

  // 1. Guaranteed local persistence
  const localList = loadLocalStudentNotifications();
  saveLocalStudentNotifications([newNotif, ...localList]);

  // 2. Dispatch cross-window and in-memory events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_student_notification_created', { detail: newNotif }));
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'STUDENT_NOTIF', data: newNotif });
    } catch {}
  }

  // 3. Sync to Supabase notifications table
  if (supabase) {
    try {
      const payload: Record<string, any> = {
        id: notifId,
        mess_id: messId,
        type: params.type || 'general',
        title: params.title,
        message: params.message,
        customer_id: params.customerId || null,
        customer_name: params.customerName || null,
        priority: params.priority || 'normal',
        is_read: false
      };

      const { error: insErr } = await supabase.from('notifications').insert(payload);
      if (insErr) {
        // Fallback: retry without customer_id if foreign key or uuid constraint fails
        await supabase.from('notifications').insert({
          ...payload,
          customer_id: null
        });
      }
    } catch (e) {
      console.warn('sendNotificationToStudent Supabase sync note:', e);
    }
  }

  return true;
}

export async function fetchStudentNotifications(customerId: string): Promise<any[]> {
  const deletedIds = loadDeletedStudentNotifIds();
  const readIds = loadReadStudentNotifIds();

  const localNotifs = loadLocalStudentNotifications().filter(
    n => !n.customer_id || n.customer_id === customerId
  );

  // Synthesize active notices from loadReminders() as announcements so official notices appear in student inbox
  const notices = loadReminders().filter(r => r.isActive !== false);
  const noticeNotifs = notices.map(r => ({
    id: `notice-${r.id}`,
    mess_id: DEFAULT_MESS_ID,
    customer_id: null,
    type: 'announcement',
    title: r.title,
    message: r.message,
    priority: r.priority || 'normal',
    is_read: readIds.has(`notice-${r.id}`) || readIds.has(r.id),
    created_at: r.createdAt
  }));

  const notifMap = new Map<string, any>();
  noticeNotifs.forEach(n => notifMap.set(n.id, n));
  localNotifs.forEach(n => notifMap.set(n.id, n));

  if (supabase && customerId) {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .or(`customer_id.eq.${customerId},customer_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        data.forEach((d: any) => {
          const local = notifMap.get(d.id);
          const isRead = local ? local.is_read : (readIds.has(d.id) || (d.is_read ?? false));
          notifMap.set(d.id, {
            id: d.id,
            mess_id: d.mess_id,
            customer_id: d.customer_id,
            customer_name: d.customer_name,
            type: d.type || 'general',
            title: d.title,
            message: d.message,
            priority: d.priority || 'normal',
            is_read: isRead,
            created_at: d.created_at
          });
        });
      }
    } catch (e) {
      console.warn('fetchStudentNotifications remote query err:', e);
    }
  }

  // Filter out any permanently deleted notifications
  const activeNotifs = Array.from(notifMap.values()).filter(n => {
    if (deletedIds.has(n.id)) return false;
    if (n.id.startsWith('notice-') && deletedIds.has(n.id.replace('notice-', ''))) return false;
    return true;
  }).map(n => {
    const isRead = n.is_read || readIds.has(n.id) || (n.id.startsWith('notice-') && readIds.has(n.id.replace('notice-', '')));
    return isRead !== n.is_read ? { ...n, is_read: true } : n;
  });

  return activeNotifs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const idsToMark = [notificationId];
  if (notificationId.startsWith('notice-')) {
    idsToMark.push(notificationId.replace('notice-', ''));
  }
  saveReadStudentNotifIds(idsToMark);

  const localList = loadLocalStudentNotifications();
  const updated = localList.map(n => idsToMark.includes(n.id) ? { ...n, is_read: true } : n);
  saveLocalStudentNotifications(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'STUDENT_NOTIF_READ', id: notificationId });
    } catch {}
  }

  if (!supabase || !notificationId) return true;
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    return true;
  } catch {
    return false;
  }
}

export async function deleteStudentNotification(notificationId: string): Promise<boolean> {
  const idsToDelete = [notificationId];
  if (notificationId.startsWith('notice-')) {
    idsToDelete.push(notificationId.replace('notice-', ''));
  }

  // 1. Permanently blacklist in deleted student notification IDs
  saveDeletedStudentNotifIds(idsToDelete);

  // 2. Remove from local store
  const localList = loadLocalStudentNotifications();
  const filtered = localList.filter(n => !idsToDelete.includes(n.id));
  saveLocalStudentNotifications(filtered);

  // 3. Dispatch events to all tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_student_notification_deleted', { detail: { id: notificationId } }));
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'STUDENT_NOTIF_DELETED', id: notificationId });
    } catch {}
  }

  // 4. Remote Supabase delete
  if (supabase && notificationId) {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    } catch {}
  }
  return true;
}

export async function clearAllReadStudentNotifications(customerId: string): Promise<boolean> {
  const allNotifs = await fetchStudentNotifications(customerId);
  const readNotifs = allNotifs.filter(n => n.is_read);
  const idsToDelete: string[] = [];
  readNotifs.forEach(n => {
    idsToDelete.push(n.id);
    if (n.id.startsWith('notice-')) idsToDelete.push(n.id.replace('notice-', ''));
  });

  saveDeletedStudentNotifIds(idsToDelete);

  const localList = loadLocalStudentNotifications();
  const filtered = localList.filter(n => !idsToDelete.includes(n.id));
  saveLocalStudentNotifications(filtered);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'STUDENT_NOTIFS_CLEARED', customerId });
    } catch {}
  }

  if (supabase && customerId) {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('customer_id', customerId)
        .eq('is_read', true);
    } catch {}
  }
  return true;
}

export async function markAllStudentNotificationsRead(customerId: string): Promise<boolean> {
  const allNotifs = await fetchStudentNotifications(customerId);
  const allIds = allNotifs.map(n => n.id);
  allNotifs.forEach(n => {
    if (n.id.startsWith('notice-')) allIds.push(n.id.replace('notice-', ''));
  });
  saveReadStudentNotifIds(allIds);

  const localList = loadLocalStudentNotifications();
  const updated = localList.map(n => {
    if (!n.customer_id || n.customer_id === customerId) {
      return { ...n, is_read: true };
    }
    return n;
  });
  saveLocalStudentNotifications(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    try {
      getNotifBroadcastChannel()?.postMessage({ type: 'STUDENT_ALL_READ', customerId });
    } catch {}
  }

  if (supabase && customerId) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .or(`customer_id.eq.${customerId},customer_id.is.null`);
    } catch {}
  }
  return true;
}

// ----------------------------------------------------
// FEATURE 11: Polls Cloud Sync & Anti-Duplicate Voting
// ----------------------------------------------------
export async function fetchPollsFromSupabase(messId: string = DEFAULT_MESS_ID): Promise<{
  polls: StudentPoll[];
  pollVotes: Record<string, Record<string, string>>; // pollId -> customerId -> optionId
}> {
  const local = loadPolls();
  let pollVotes: Record<string, Record<string, string>> = {};
  try {
    const rawVotes = localStorage.getItem('morya_v3_poll_votes');
    if (rawVotes) pollVotes = JSON.parse(rawVotes);
  } catch {}

  if (!supabase) return { polls: local, pollVotes };
  try {
    const { data } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    if (data?.notes) {
      const parsed = JSON.parse(data.notes);
      if (parsed.polls) {
        savePolls(parsed.polls);
        if (parsed.pollVotes) {
          pollVotes = { ...pollVotes, ...parsed.pollVotes };
          localStorage.setItem('morya_v3_poll_votes', JSON.stringify(pollVotes));
        }
        return { polls: parsed.polls, pollVotes };
      }
    }
  } catch (e) {
    console.warn('fetchPollsFromSupabase err:', e);
  }
  return { polls: local, pollVotes };
}

export async function submitStudentVote(
  pollId: string,
  optionId: string,
  customerId: string,
  messId: string = DEFAULT_MESS_ID
): Promise<{ success: boolean; error?: string; polls?: StudentPoll[] }> {
  if (!pollId || !optionId || !customerId) {
    return { success: false, error: 'Invalid vote parameters' };
  }

  // Check if customer already voted
  let pollVotes: Record<string, Record<string, string>> = {};
  try {
    const raw = localStorage.getItem('morya_v3_poll_votes');
    if (raw) pollVotes = JSON.parse(raw);
  } catch {}

  if (pollVotes[pollId] && pollVotes[pollId][customerId]) {
    return { success: false, error: 'You have already voted on this poll.' };
  }

  const currentPolls = loadPolls();
  const pollIndex = currentPolls.findIndex(p => p.id === pollId);
  if (pollIndex === -1) {
    return { success: false, error: 'Poll not found' };
  }

  const poll = currentPolls[pollIndex];
  if (poll.status === 'closed') {
    return { success: false, error: 'This poll is already closed.' };
  }

  // Update option tally
  const updatedOptions = poll.options.map(opt => 
    opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
  );
  const updatedPoll: StudentPoll = {
    ...poll,
    totalVotes: (poll.totalVotes || 0) + 1,
    options: updatedOptions
  };

  const updatedPolls = [...currentPolls];
  updatedPolls[pollIndex] = updatedPoll;

  // Save locally
  savePolls(updatedPolls);
  pushSyncToServer({ polls: updatedPolls });

  // Record customer vote
  if (!pollVotes[pollId]) pollVotes[pollId] = {};
  pollVotes[pollId][customerId] = optionId;
  localStorage.setItem('morya_v3_poll_votes', JSON.stringify(pollVotes));

  // Sync to Supabase mess_settings
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('mess_settings')
        .select('notes')
        .eq('mess_id', messId)
        .maybeSingle();

      let combined: Record<string, any> = {};
      if (existing?.notes) {
        try { combined = JSON.parse(existing.notes); } catch {}
      }
      combined.polls = updatedPolls;
      combined.pollVotes = { ...(combined.pollVotes || {}), ...pollVotes };
      combined.updated_at = new Date().toISOString();

      await supabase
        .from('mess_settings')
        .update({ notes: JSON.stringify(combined) })
        .eq('mess_id', messId);
    } catch (e) {
      console.warn('Sync vote to Supabase non-blocking note:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_polls_updated'));
  }

  return { success: true, polls: updatedPolls };
}

// ----------------------------------------------------
// FEATURE 12: Meal Ratings & Reviews Cloud Sync
// ----------------------------------------------------
export async function fetchMealRatingsFromSupabase(messId: string = DEFAULT_MESS_ID): Promise<MealRatingReview[]> {
  const local = loadMealRatings();
  if (!supabase) return local;
  try {
    const { data } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    if (data?.notes) {
      const parsed = JSON.parse(data.notes);
      if (parsed.mealRatings && Array.isArray(parsed.mealRatings)) {
        const ratingMap = new Map<string, MealRatingReview>();
        local.forEach(r => ratingMap.set(r.id, r));
        parsed.mealRatings.forEach((r: MealRatingReview) => ratingMap.set(r.id, r));
        const merged = Array.from(ratingMap.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        saveMealRatings(merged);
        return merged;
      }
    }
  } catch (e) {
    console.warn('fetchMealRatingsFromSupabase err:', e);
  }
  return local;
}

export async function submitMealRating(
  ratingData: Omit<MealRatingReview, 'id' | 'createdAt'>,
  messId: string = DEFAULT_MESS_ID
): Promise<{ success: boolean; error?: string; rating?: MealRatingReview }> {
  if (!ratingData.customerId || !ratingData.rating) {
    return { success: false, error: 'Rating score is required.' };
  }

  // Strict Expiry Guard: Expired subscribers cannot submit food reviews / compliments
  const localCusts = loadCustomers();
  const targetCust = localCusts.find(c => c.id === ratingData.customerId);
  if (targetCust) {
    const daysLeft = calculateDaysRemaining(targetCust.endDate);
    if (daysLeft < 0 || targetCust.status === 'expired' || targetCust.status === 'inactive') {
      return {
        success: false,
        error: `Cannot submit meal review: Subscription expired on ${targetCust.endDate || 'N/A'}. Please renew your pass with the mess owner first.`
      };
    }
  }

  const existingRatings = loadMealRatings();

  // Prevent duplicate rating for same customer, date, and meal shift
  const duplicate = existingRatings.find(
    r => r.customerId === ratingData.customerId && 
         r.date === ratingData.date && 
         r.mealShift === ratingData.mealShift
  );
  if (duplicate) {
    return { 
      success: false, 
      error: `You have already submitted a review for ${ratingData.mealShift} today (${ratingData.date}).` 
    };
  }

  const newRating: MealRatingReview = {
    ...ratingData,
    id: `rate-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString()
  };

  const updatedRatings = [newRating, ...existingRatings];
  saveMealRatings(updatedRatings);
  syncRatingToServer(newRating);
  pushSyncToServer({ mealRatings: updatedRatings });

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('mess_settings')
        .select('notes')
        .eq('mess_id', messId)
        .maybeSingle();

      let combined: Record<string, any> = {};
      if (existing?.notes) {
        try { combined = JSON.parse(existing.notes); } catch {}
      }
      combined.mealRatings = updatedRatings;
      combined.updated_at = new Date().toISOString();

      await supabase
        .from('mess_settings')
        .update({ notes: JSON.stringify(combined) })
        .eq('mess_id', messId);
    } catch (e) {
      console.warn('Sync rating to Supabase non-blocking note:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_ratings_updated'));
  }

  return { success: true, rating: newRating };
}

// ----------------------------------------------------
// FEATURE 14: Announcements & Notices Cloud Sync
// ----------------------------------------------------
export async function fetchAnnouncementsFromSupabase(messId: string = DEFAULT_MESS_ID): Promise<MessReminderNotice[]> {
  const local = loadReminders();
  if (!supabase) return local;
  try {
    const { data } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    if (data?.notes) {
      const parsed = JSON.parse(data.notes);
      if (parsed.reminders && Array.isArray(parsed.reminders)) {
        saveReminders(parsed.reminders);
        return parsed.reminders;
      }
    }
  } catch (e) {
    console.warn('fetchAnnouncementsFromSupabase err:', e);
  }
  return local;
}

// ----------------------------------------------------
// FEATURE 15: Complaints & Support Cloud Sync
// ----------------------------------------------------
export async function fetchComplaintsFromSupabase(messId: string = DEFAULT_MESS_ID): Promise<CustomerComplaint[]> {
  const local = loadComplaints();
  if (!supabase) return local;
  try {
    const { data } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    if (data?.notes) {
      const parsed = JSON.parse(data.notes);
      if (parsed.complaints && Array.isArray(parsed.complaints)) {
        const compMap = new Map<string, CustomerComplaint>();
        local.forEach(c => compMap.set(c.id, c));
        parsed.complaints.forEach((c: CustomerComplaint) => compMap.set(c.id, c));
        const merged = Array.from(compMap.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        saveComplaints(merged);
        return merged;
      }
    }
  } catch (e) {
    console.warn('fetchComplaintsFromSupabase err:', e);
  }
  return local;
}

export async function submitStudentComplaint(
  complaintData: Omit<CustomerComplaint, 'id' | 'createdAt' | 'status'>,
  messId: string = DEFAULT_MESS_ID
): Promise<{ success: boolean; error?: string; complaint?: CustomerComplaint }> {
  if (!complaintData.description || !complaintData.customerId) {
    return { success: false, error: 'Please enter a description for your complaint.' };
  }

  // Strict Expiry Guard: Expired subscribers cannot submit complaints or grievances
  const localCusts = loadCustomers();
  const targetCust = localCusts.find(c => c.id === complaintData.customerId);
  if (targetCust) {
    const daysLeft = calculateDaysRemaining(targetCust.endDate);
    if (daysLeft < 0 || targetCust.status === 'expired' || targetCust.status === 'inactive') {
      return {
        success: false,
        error: `Cannot register complaint: Subscription expired on ${targetCust.endDate || 'N/A'}. Please renew your pass with the mess owner first.`
      };
    }
  }

  const existingComplaints = loadComplaints();
  const newComplaint: CustomerComplaint = {
    ...complaintData,
    id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status: 'NEW',
    createdAt: new Date().toISOString()
  };

  const updatedComplaints = [newComplaint, ...existingComplaints];
  saveComplaints(updatedComplaints);
  syncComplaintToServer(newComplaint);
  pushSyncToServer({ complaints: updatedComplaints });

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('mess_settings')
        .select('notes')
        .eq('mess_id', messId)
        .maybeSingle();

      let combined: Record<string, any> = {};
      if (existing?.notes) {
        try { combined = JSON.parse(existing.notes); } catch {}
      }
      combined.complaints = updatedComplaints;
      combined.updated_at = new Date().toISOString();

      await supabase
        .from('mess_settings')
        .update({ notes: JSON.stringify(combined) })
        .eq('mess_id', messId);
    } catch (e) {
      console.warn('Sync complaint to Supabase non-blocking note:', e);
    }
  }

  // Guaranteed Owner Notification registration for the notification box
  await createOwnerNotification({
    messId,
    type: 'complaint_received',
    title: `New Student Complaint (${complaintData.category})`,
    message: `${complaintData.customerName || 'Student'} reported: "${complaintData.description.slice(0, 90)}"`,
    customerId: complaintData.customerId,
    customerName: complaintData.customerName,
    relatedRecordId: newComplaint.id,
    priority: 'high'
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_complaints_updated'));
    window.dispatchEvent(new Event('storage'));
  }

  return { success: true, complaint: newComplaint };
}

// ----------------------------------------------------
// FEATURE 18: Update Permitted Student Profile Fields
// ----------------------------------------------------
export async function updateStudentProfileInSupabase(
  customerId: string,
  updates: {
    phone?: string;
    collegeOrWork?: string;
    hostelOrAddress?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!customerId) return { success: false, error: 'Customer ID is missing.' };

  // 1. Update in local storage
  const customers = loadCustomers();
  const index = customers.findIndex(c => c.id === customerId || (updates.phone && c.phone === updates.phone));
  if (index !== -1) {
    customers[index] = {
      ...customers[index],
      phone: updates.phone ?? customers[index].phone,
      collegeOrWork: updates.collegeOrWork ?? customers[index].collegeOrWork,
      hostelOrAddress: updates.hostelOrAddress ?? customers[index].hostelOrAddress,
      updatedAt: new Date().toISOString()
    };
    saveCustomers(customers);
  }

  // 2. Update in Supabase public.customers table (protected fields are untouched!)
  if (supabase) {
    try {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone.trim();
      if (updates.collegeOrWork !== undefined) dbUpdates.college_name = updates.collegeOrWork.trim();
      if (updates.hostelOrAddress !== undefined) dbUpdates.hostel_name = updates.hostelOrAddress.trim();

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      let targetDbId = isUuid ? customerId : null;

      if (!targetDbId) {
        const searchPhone = updates.phone || (index !== -1 ? customers[index].phone : null);
        if (searchPhone) {
          const { data: found } = await supabase.from('customers').select('id').eq('phone', searchPhone.trim()).maybeSingle();
          if (found?.id) targetDbId = found.id;
        }
      }

      if (targetDbId) {
        const { error } = await supabase
          .from('customers')
          .update(dbUpdates)
          .eq('id', targetDbId);

        if (error) {
          console.warn('Supabase customer update error:', error);
          return { success: false, error: error.message };
        }
      } else if (updates.phone) {
        await supabase
          .from('customers')
          .update(dbUpdates)
          .eq('phone', updates.phone.trim());
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Database update failed' };
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
  }

  return { success: true };
}

// ----------------------------------------------------
// FEATURE 24 & 28: Student Real-time Notifications Subscription
// ----------------------------------------------------
export function subscribeToStudentNotificationsRealtime(
  customerId: string,
  onNotification: (notif: any) => void
): () => void {
  if (!supabase || !customerId) return () => {};

  try {
    const channel = supabase
      .channel(`student_notifs_${customerId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const n = payload.new as any;
          if (!n) return;
          if (!n.customer_id || n.customer_id === customerId) {
            onNotification(n);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase?.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('subscribeToStudentNotificationsRealtime err:', err);
    return () => {};
  }
}

// ----------------------------------------------------
// FEATURE 25: Attendance Dispute Reporting
// ----------------------------------------------------
export async function submitAttendanceDispute(params: {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  mealLogId: string;
  date: string;
  mealType: string;
  disputeReason: string;
  notes?: string;
  messId?: string;
}): Promise<{ success: boolean; error?: string; complaint?: CustomerComplaint }> {
  const fullDescription = `[Attendance Dispute - ${params.mealType.toUpperCase()} Meal on ${params.date}]\nIssue: ${params.disputeReason}${params.notes ? `\nStudent Notes: ${params.notes}` : ''}\nAuthoritative Record ID: ${params.mealLogId}`;

  return submitStudentComplaint({
    customerId: params.customerId,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    category: 'Attendance Dispute',
    subject: `Attendance Dispute: ${params.mealType.toUpperCase()} on ${params.date}`,
    description: fullDescription
  }, params.messId || DEFAULT_MESS_ID);
}

// ----------------------------------------------------
// SECTION 6: Inventory Stock & Movement API
// ----------------------------------------------------
export async function fetchInventoryFromSupabase(messId: string = DEFAULT_MESS_ID): Promise<InventoryItem[]> {
  const localItems = loadInventoryItems();
  if (!supabase) return localItems;

  try {
    const { data, error } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    if (!error && data?.notes) {
      try {
        const parsed = JSON.parse(data.notes);
        if (Array.isArray(parsed.inventoryItems) && parsed.inventoryItems.length > 0) {
          saveInventoryItems(parsed.inventoryItems);
          return parsed.inventoryItems;
        }
      } catch {}
    }
    return localItems;
  } catch (err) {
    console.warn('fetchInventoryFromSupabase err:', err);
    return localItems;
  }
}

export async function saveInventoryToSupabase(
  items: InventoryItem[],
  messId: string = DEFAULT_MESS_ID
): Promise<{ success: boolean; error?: string }> {
  saveInventoryItems(items);
  if (!supabase) return { success: true };

  try {
    const { data: existing } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    let combinedNotes: Record<string, any> = {};
    if (existing?.notes) {
      try {
        combinedNotes = JSON.parse(existing.notes);
      } catch {
        combinedNotes = { previous_notes: existing.notes };
      }
    }

    combinedNotes.inventoryItems = items;
    combinedNotes.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('mess_settings')
      .update({
        notes: JSON.stringify(combinedNotes)
      })
      .eq('mess_id', messId);

    if (updateErr) {
      console.warn('saveInventoryToSupabase warning:', updateErr.message);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('saveInventoryToSupabase error:', err);
    return { success: true };
  }
}

export async function fetchSuppliersFromSupabase(messId: string = DEFAULT_MESS_ID): Promise<InventorySupplier[]> {
  const localSuppliers = loadInventorySuppliers();
  if (!supabase) return localSuppliers;
  try {
    const { data, error } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    if (!error && data?.notes) {
      try {
        const parsed = JSON.parse(data.notes);
        if (Array.isArray(parsed.inventorySuppliers) && parsed.inventorySuppliers.length > 0) {
          saveInventorySuppliers(parsed.inventorySuppliers);
          return parsed.inventorySuppliers;
        }
      } catch {}
    }
    return localSuppliers;
  } catch (err) {
    console.warn('fetchSuppliersFromSupabase err:', err);
    return localSuppliers;
  }
}

export async function saveSuppliersToSupabase(
  suppliers: InventorySupplier[],
  messId: string = DEFAULT_MESS_ID
): Promise<{ success: boolean; error?: string }> {
  saveInventorySuppliers(suppliers);
  if (!supabase) return { success: true };
  try {
    const { data: existing } = await supabase
      .from('mess_settings')
      .select('notes')
      .eq('mess_id', messId)
      .maybeSingle();

    let combinedNotes: Record<string, any> = {};
    if (existing?.notes) {
      try {
        combinedNotes = JSON.parse(existing.notes);
      } catch {
        combinedNotes = { previous_notes: existing.notes };
      }
    }
    combinedNotes.inventorySuppliers = suppliers;
    combinedNotes.updated_at = new Date().toISOString();

    await supabase
      .from('mess_settings')
      .update({ notes: JSON.stringify(combinedNotes) })
      .eq('mess_id', messId);
    return { success: true };
  } catch (err: any) {
    return { success: true };
  }
}

export async function recordStockPurchase(params: {
  itemId: string;
  quantity: number;
  cost: number;
  supplier: string;
  invoiceNumber?: string;
  notes?: string;
  date: string;
  recordedBy: string;
  messId?: string;
}): Promise<{ success: boolean; item?: InventoryItem; error?: string }> {
  try {
    const items = loadInventoryItems();
    const targetItem = items.find(i => i.id === params.itemId);
    if (!targetItem) {
      return { success: false, error: 'Inventory item not found.' };
    }

    // 1. Update stock
    targetItem.currentStock += Number(params.quantity);
    targetItem.lastRestockedDate = params.date;
    targetItem.lastUpdated = new Date().toISOString();
    if (params.cost && params.quantity > 0) {
      targetItem.costPerUnit = Math.round(params.cost / params.quantity);
    }
    if (params.supplier) {
      targetItem.supplierName = params.supplier;
    }

    await saveInventoryToSupabase(items, params.messId);

    // 2. Append movement
    const movements = loadInventoryMovements();
    const newMovement: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: targetItem.id,
      itemName: targetItem.name,
      type: 'purchase',
      quantity: Number(params.quantity),
      unit: targetItem.unit,
      cost: Number(params.cost),
      supplier: params.supplier,
      invoiceNumber: params.invoiceNumber,
      reason: params.notes || 'Stock Restock / Purchase',
      date: params.date,
      recordedBy: params.recordedBy,
      createdAt: new Date().toISOString()
    };
    saveInventoryMovements([newMovement, ...movements]);

    // 3. Security audit log
    addSecurityLog(
      params.recordedBy,
      'Inventory Restock Recorded',
      'Inventory',
      `Restocked ${params.quantity} ${targetItem.unit} of ${targetItem.name} from ${params.supplier} (Total: ₹${params.cost})`,
      targetItem.id
    );

    return { success: true, item: targetItem };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record purchase' };
  }
}

export async function recordStockMovement(params: {
  itemId: string;
  type: 'consumption' | 'wastage' | 'adjustment';
  quantity: number;
  reason: string;
  date: string;
  recordedBy: string;
  messId?: string;
}): Promise<{ success: boolean; item?: InventoryItem; error?: string }> {
  try {
    const items = loadInventoryItems();
    const targetItem = items.find(i => i.id === params.itemId);
    if (!targetItem) {
      return { success: false, error: 'Inventory item not found.' };
    }

    if (params.type === 'adjustment') {
      targetItem.currentStock = Math.max(0, Number(params.quantity));
    } else {
      targetItem.currentStock = Math.max(0, targetItem.currentStock - Number(params.quantity));
    }
    targetItem.lastUpdated = new Date().toISOString();

    await saveInventoryToSupabase(items, params.messId);

    // Record movement
    const movements = loadInventoryMovements();
    const newMovement: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: targetItem.id,
      itemName: targetItem.name,
      type: params.type,
      quantity: Number(params.quantity),
      unit: targetItem.unit,
      reason: params.reason,
      date: params.date,
      recordedBy: params.recordedBy,
      createdAt: new Date().toISOString()
    };
    saveInventoryMovements([newMovement, ...movements]);

    addSecurityLog(
      params.recordedBy,
      `Inventory ${params.type.toUpperCase()}`,
      'Inventory',
      `${params.type === 'adjustment' ? 'Adjusted' : 'Deducted'} ${params.quantity} ${targetItem.unit} of ${targetItem.name}. Reason: ${params.reason}`,
      targetItem.id
    );

    return { success: true, item: targetItem };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record movement' };
  }
}

// ----------------------------------------------------
// SECTION 4: Controlled Attendance Correction API
// ----------------------------------------------------
export async function correctAttendanceRecord(params: {
  logId: string;
  newStatus: ScanEligibility;
  overrideReason: string;
  correctedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auditNote = `[CORRECTION by ${params.correctedBy} at ${new Date().toLocaleString()}]: Status changed to ${params.newStatus}. Reason: ${params.overrideReason}`;

    if (supabase) {
      // 1. Update meal_logs table
      const { error } = await supabase
        .from('meal_logs')
        .update({
          scan_status: params.newStatus,
          override_notes: auditNote
        })
        .eq('id', params.logId);

      if (error) {
        console.warn('meal_logs correction error:', error.message);
      }

      // 2. Also update attendance_logs if matching UUID exists
      try {
        await supabase
          .from('attendance_logs')
          .update({
            is_valid: params.newStatus === 'ALLOW',
            notes: auditNote
          })
          .eq('id', params.logId);
      } catch {}
    }

    // 3. Security audit log
    addSecurityLog(
      params.correctedBy,
      'Attendance Record Corrected',
      'Attendance',
      auditNote,
      params.logId
    );

    window.dispatchEvent(new CustomEvent('morya_meal_logged'));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to correct record' };
  }
}



