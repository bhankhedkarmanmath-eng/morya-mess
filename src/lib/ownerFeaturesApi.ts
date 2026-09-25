import { supabase } from './supabase';
import { 
  OwnerNotification, 
  OwnerNotificationType, 
  SupabasePaymentRecord, 
  PaymentMode, 
  PaymentStatus, 
  TrialStudent, 
  TrialStatus,
  Customer 
} from '../types/mess';
import { loadCustomers, saveCustomers } from './storage';

export const DEFAULT_MESS_ID = '63b00e12-a702-492f-bd56-1e260338699f';
const PAYMENTS_STORAGE_KEY = 'morya_v3_payments_records';
const NOTIFICATIONS_STORAGE_KEY = 'morya_v3_notifications';

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

function loadLocalNotifications(): OwnerNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalNotifications(records: OwnerNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save local notifications:', e);
  }
}

// ==========================================
// FEATURE 1: Professional Notification Center
// ==========================================

export async function fetchOwnerNotifications(messId: string = DEFAULT_MESS_ID): Promise<OwnerNotification[]> {
  const localNotifs = loadLocalNotifications();

  if (!supabase) {
    if (localNotifs.length > 0) return localNotifs;
    return await generateDynamicNotifications(messId);
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('mess_id', messId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data || data.length === 0) {
      if (localNotifs.length > 0) return localNotifs;
      return await generateDynamicNotifications(messId);
    }

    const remoteNotifs: OwnerNotification[] = data.map((n: any) => ({
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
    }));

    // Merge remote and local by ID
    const notifMap = new Map<string, OwnerNotification>();
    localNotifs.forEach(n => notifMap.set(n.id, n));
    remoteNotifs.forEach(n => notifMap.set(n.id, n));

    return Array.from(notifMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.warn('fetchOwnerNotifications err:', err);
    if (localNotifs.length > 0) return localNotifs;
    return await generateDynamicNotifications(messId);
  }
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
  const newNotif: OwnerNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
  saveLocalNotifications([newNotif, ...existing]);

  // Realtime notification event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('morya_notification_created', { detail: newNotif }));
    window.dispatchEvent(new Event('storage'));
  }

  // 2. Attempt remote sync
  if (!supabase) return true;
  try {
    await supabase
      .from('notifications')
      .insert({
        id: newNotif.id,
        mess_id: messId,
        type: params.type,
        title: params.title,
        message: params.message,
        customer_id: params.customerId || null,
        customer_name: params.customerName || null,
        related_record_id: params.relatedRecordId || null,
        priority: params.priority || 'medium',
        is_read: false
      });
  } catch {
    // Fail silently since local storage already has it
  }

  return true;
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  // Update local
  const notifs = loadLocalNotifications().map(n => 
    n.id === notificationId ? { ...n, isRead: true } : n
  );
  saveLocalNotifications(notifs);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
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

export async function markAllNotificationsAsRead(messId: string = DEFAULT_MESS_ID): Promise<boolean> {
  // Update local
  const notifs = loadLocalNotifications().map(n => ({ ...n, isRead: true }));
  saveLocalNotifications(notifs);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
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

// Synthesize dynamic notifications from active leave requests, pending payments & expiring members
async function generateDynamicNotifications(messId: string): Promise<OwnerNotification[]> {
  const notifs: OwnerNotification[] = [];
  if (!supabase) return notifs;

  try {
    // 1. Pending Leaves
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('id, customer_id, start_date, end_date, reason, status, created_at, customers(full_name)')
      .eq('mess_id', messId)
      .eq('status', 'pending')
      .limit(10);

    if (leaves) {
      leaves.forEach((l: any) => {
        const studentName = (Array.isArray(l.customers) ? l.customers[0]?.full_name : l.customers?.full_name) || 'Student';
        notifs.push({
          id: `dyn-leave-${l.id}`,
          messId,
          type: 'leave_request',
          title: 'Student Leave Request',
          message: `${studentName} requested leave from ${l.start_date} to ${l.end_date}.`,
          customerId: l.customer_id,
          customerName: studentName,
          relatedRecordId: l.id,
          priority: 'high',
          isRead: false,
          createdAt: l.created_at || new Date().toISOString()
        });
      });
    }

    // 2. Pending UPI Payments
    const { data: pendingPays } = await supabase
      .from('payment_logs')
      .select('id, customer_id, amount, payment_mode, created_at, notes, customers(full_name)')
      .eq('mess_id', messId)
      .eq('notes', 'PENDING_VERIFICATION')
      .limit(10);

    if (pendingPays) {
      pendingPays.forEach((p: any) => {
        const studentName = (Array.isArray(p.customers) ? p.customers[0]?.full_name : p.customers?.full_name) || 'Student';
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
      });
    }

    // 3. Subscriptions Expiring in 3 Days
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
  if (!supabase || !customerId) return null;

  try {
    // 1. Customer + Subscription
    const { data: custData, error: custErr } = await supabase
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
      `)
      .eq('id', customerId)
      .maybeSingle();

    if (custErr || !custData) return null;

    const activeSub = (custData.subscriptions || []).sort((a: any, b: any) => 
      new Date(b.created_at || b.end_date || 0).getTime() - new Date(a.created_at || a.end_date || 0).getTime()
    )[0];
    const tariff = activeSub?.tariff_plans ? (Array.isArray(activeSub.tariff_plans) ? activeSub.tariff_plans[0] : activeSub.tariff_plans) : null;
    const isFemale = (tariff?.plan_name || '').toLowerCase().includes('girls');

    const customer: Customer = {
      id: custData.id,
      name: custData.full_name,
      phone: custData.phone,
      gender: isFemale ? 'female' : 'male',
      collegeOrWork: custData.college_name || '',
      hostelOrAddress: `${custData.hostel_name || ''} ${custData.room_number || ''}`.trim(),
      planType: tariff?.plan_name || 'Standard Plan',
      startDate: activeSub?.start_date || custData.created_at?.split('T')[0] || '2026-09-01',
      endDate: activeSub?.end_date || '2026-09-30',
      totalAmount: Number(activeSub?.final_amount || 2500),
      paidAmount: Number(activeSub?.amount_paid || 2500),
      balance: Number(activeSub?.balance_due || 0),
      status: custData.is_active ? 'active' : 'inactive',
      createdAt: custData.created_at,
      notes: custData.notes
    };

    // 2. Payments
    const { data: payRows } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    const payments: SupabasePaymentRecord[] = (payRows || []).map((p: any) => ({
      id: p.id,
      customerId: p.customer_id,
      customerName: custData.full_name,
      customerPhone: custData.phone,
      messId: p.mess_id || messId,
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
    }));

    // 3. Attendance Logs
    const { data: attRows } = await supabase
      .from('attendance_logs')
      .select('id, meal_date, meal_shift, is_valid, scanned_at')
      .eq('customer_id', customerId)
      .order('scanned_at', { ascending: false })
      .limit(60);

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7);

    const attendanceLogs = (attRows || []).map((a: any) => ({
      id: a.id,
      mealDate: a.meal_date,
      mealShift: a.meal_shift,
      isValid: a.is_valid,
      scannedAt: a.scanned_at
    }));

    const attendanceCount = {
      today: attendanceLogs.some(a => a.mealDate === todayStr && a.isValid),
      currentMonth: attendanceLogs.filter(a => a.mealDate?.startsWith(currentMonthPrefix) && a.isValid).length,
      total: attendanceLogs.filter(a => a.isValid).length,
      lunch: attendanceLogs.filter(a => a.mealShift === 'lunch' && a.isValid).length,
      dinner: attendanceLogs.filter(a => a.mealShift === 'dinner' && a.isValid).length
    };

    // 4. Leave Requests
    const { data: leaveRows } = await supabase
      .from('leave_requests')
      .select('id, start_date, end_date, reason, status, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    const leaveHistory = (leaveRows || []).map((l: any) => ({
      id: l.id,
      startDate: l.start_date,
      endDate: l.end_date,
      reason: l.reason,
      status: l.status,
      createdAt: l.created_at
    }));

    return {
      customer,
      payments,
      attendanceCount,
      attendanceLogs,
      leaveHistory,
      complaints: [],
      reviews: []
    };
  } catch (err) {
    console.error('fetchCustomer360Profile error:', err);
    return null;
  }
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

// ==========================================
// FEATURE 6: Trial Student Management
// ==========================================

export async function fetchTrialStudents(messId: string = DEFAULT_MESS_ID): Promise<TrialStudent[]> {
  if (!supabase) return [];
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
      .ilike('notes', '%TRIAL_STUDENT%')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const todayStr = new Date().toISOString().split('T')[0];

    return data.map((d: any) => {
      // Parse trial metadata stored in notes
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
      else if (endDate < todayStr || mealsUsed >= mealLimit) status = 'EXPIRED';
      else if (endDate === todayStr) status = 'ENDING_SOON';

      return {
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
      };
    });
  } catch (err) {
    console.warn('fetchTrialStudents error:', err);
    return [];
  }
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
  notes?: string;
}): Promise<{ success: boolean; trialId?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not connected' };
  const messId = params.messId || DEFAULT_MESS_ID;

  try {
    const trialNotes = `TRIAL_STUDENT;START:${params.startDate};END:${params.endDate};TYPE:${params.mealType};LIMIT:${params.mealLimit};${params.notes || ''}`;

    const { data, error } = await supabase
      .from('customers')
      .insert({
        mess_id: messId,
        full_name: params.fullName.trim(),
        phone: params.phone.trim(),
        is_active: true,
        notes: trialNotes,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Owner notification
    await createOwnerNotification({
      messId,
      type: 'new_trial',
      title: 'New Trial Student Registered',
      message: `${params.fullName} registered for ${params.mealLimit} trial meals (${params.startDate} to ${params.endDate}).`,
      customerId: data.id,
      priority: 'medium'
    });

    return { success: true, trialId: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to add trial student' };
  }
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
    upiPayeeName: 'Morya Mess Latur',
    upiQrCodeImage: ''
  };

  if (!supabase) {
    try {
      const local = localStorage.getItem('morya_mess_upi_config');
      return local ? JSON.parse(local) : defaultConfig;
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
