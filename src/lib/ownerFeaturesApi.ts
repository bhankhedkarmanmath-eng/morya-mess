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

export const DEFAULT_MESS_ID = '63b00e12-a702-492f-bd56-1e260338699f';

// ==========================================
// FEATURE 1: Professional Notification Center
// ==========================================

export async function fetchOwnerNotifications(messId: string = DEFAULT_MESS_ID): Promise<OwnerNotification[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('mess_id', messId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Supabase notifications fetch note:', error.message);
      // Fallback: generate real-time notification records synthesized from existing pending records
      return await generateDynamicNotifications(messId);
    }

    return (data || []).map((n: any) => ({
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
  } catch (err) {
    console.warn('fetchOwnerNotifications err:', err);
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
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
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
    return !error;
  } catch {
    return false;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    return !error;
  } catch {
    return false;
  }
}

export async function markAllNotificationsAsRead(messId: string = DEFAULT_MESS_ID): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('mess_id', messId)
      .eq('is_read', false);
    return !error;
  } catch {
    return false;
  }
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
  if (!supabase) return [];
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

    if (error || !data) return [];

    return data.map((d: any) => {
      const cust = Array.isArray(d.customers) ? d.customers[0] : d.customers;
      const isPending = d.notes === 'PENDING_VERIFICATION';
      return {
        id: d.id,
        customerId: d.customer_id,
        customerName: cust?.full_name || 'Member',
        customerPhone: cust?.phone,
        messId: d.mess_id,
        amount: Number(d.amount),
        paymentMode: (d.payment_mode || 'cash').toLowerCase() as PaymentMode,
        transactionReference: d.notes && d.notes.includes('UTR:') ? d.notes.split('UTR:')[1].trim() : undefined,
        status: isPending ? 'pending' : 'verified',
        notes: d.notes,
        recordedBy: 'Counter Staff',
        createdAt: d.created_at
      };
    });
  } catch (err) {
    console.warn('fetchPaymentsFromSupabase error:', err);
    return [];
  }
}

export async function recordNewPaymentInSupabase(params: {
  messId?: string;
  customerId: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionReference?: string;
  notes?: string;
  recordedBy?: string;
  status?: PaymentStatus;
}): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not connected' };
  const messId = params.messId || DEFAULT_MESS_ID;

  try {
    const formattedNotes = params.transactionReference 
      ? `${params.notes || ''} UTR:${params.transactionReference}`.trim()
      : params.notes;

    const { data, error } = await supabase
      .from('payment_logs')
      .insert({
        mess_id: messId,
        customer_id: params.customerId,
        amount: params.amount,
        payment_mode: params.paymentMode,
        notes: params.status === 'pending' ? 'PENDING_VERIFICATION' : formattedNotes,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update customer subscription balance if payment is verified
    if (params.status !== 'pending') {
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

    // Create owner notification for real-time visibility
    await createOwnerNotification({
      messId,
      type: params.paymentMode === 'upi' ? 'upi_payment' : 'cash_payment',
      title: `${params.paymentMode.toUpperCase()} Payment Recorded`,
      message: `₹${params.amount} recorded for customer ID: ${params.customerId}.`,
      customerId: params.customerId,
      relatedRecordId: data?.id,
      priority: params.status === 'pending' ? 'urgent' : 'medium'
    });

    return { success: true, paymentId: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Payment write error' };
  }
}

export async function verifyPaymentInSupabase(
  paymentId: string, 
  verifierName: string = 'Owner Desk'
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not connected' };
  try {
    const { data: payment, error: pErr } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (pErr || !payment) return { success: false, error: 'Payment record not found' };

    // Update payment record to verified
    const { error } = await supabase
      .from('payment_logs')
      .update({
        notes: `VERIFIED by ${verifierName} on ${new Date().toLocaleDateString('en-GB')}`
      })
      .eq('id', paymentId);

    if (error) return { success: false, error: error.message };

    // Adjust subscription balance
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, amount_paid, balance_due')
      .eq('customer_id', payment.customer_id)
      .eq('status', 'active')
      .limit(1);

    if (subs && subs.length > 0) {
      const sub = subs[0];
      const newPaid = Number(sub.amount_paid || 0) + Number(payment.amount);
      const newDue = Math.max(0, Number(sub.balance_due || 0) - Number(payment.amount));
      await supabase
        .from('subscriptions')
        .update({
          amount_paid: newPaid,
          balance_due: newDue,
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to verify payment' };
  }
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
  if (!supabase) return { success: false, error: 'Database not connected' };
  const messId = params.messId || DEFAULT_MESS_ID;

  try {
    // 1. Mark original payment as reversed
    await supabase
      .from('payment_logs')
      .update({
        notes: `REVERSED: ${params.reason} by ${params.reversedBy || 'Owner Desk'}`
      })
      .eq('id', params.originalPaymentId);

    // 2. Insert compensatory negative adjustment record
    await supabase
      .from('payment_logs')
      .insert({
        mess_id: messId,
        customer_id: params.customerId,
        amount: -Math.abs(params.amount),
        payment_mode: 'adjustment',
        notes: `REVERSAL of #${params.originalPaymentId}: ${params.reason}`,
        created_at: new Date().toISOString()
      });

    // 3. Reverse subscription balance
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

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reverse payment' };
  }
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
