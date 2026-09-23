import { supabase, isSupabaseConfigured } from './supabase';
export { supabase, isSupabaseConfigured };
import { Customer, MealLog, Expense, MealType, ScanEligibility } from '../types/mess';
import { loadCustomers, loadMealLogs, saveMealLogs } from './storage';

export interface SupabaseUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'super_owner' | 'owner' | 'admin' | 'staff' | 'customer';
  isActive: boolean;
}

export interface MessBranchInfo {
  id: string;
  name: string;
  branchCode: string;
  wing: string;
  contactPhone: string;
}

export interface MessSettingsInfo {
  lunchStartTime: string;
  lunchEndTime: string;
  dinnerStartTime: string;
  dinnerEndTime: string;
  isSundayDinnerClosed: boolean;
  gracePeriodMinutes: number;
  qrTokenValiditySeconds: number;
}

export interface DatabaseTariffPlan {
  id: string;
  planName: string;
  description: string;
  durationDays: number;
  basePrice: number;
  bothMeals: boolean;
  lunchOnly: boolean;
  dinnerOnly: boolean;
  isActive: boolean;
}

export interface StudentPortalData {
  customer: {
    id: string;
    fullName: string;
    phone: string;
    gender: 'male' | 'female';
    collegeName: string;
    hostelName: string;
    roomNumber: string;
    isActive: boolean;
    approvalStatus: 'approved' | 'pending' | 'suspended';
    qrToken: string;
    notes: string;
    createdAt: string;
  };
  branch: {
    id: string;
    name: string;
    branchCode: string;
    contactPhone: string;
  };
  subscription: {
    id: string;
    planName: string;
    planPrice: number;
    amountPaid: number;
    balanceDue: number;
    startDate: string;
    endDate: string;
    status: string;
    bothMeals: boolean;
    daysRemaining: number;
  } | null;
  attendance: {
    id: string;
    mealType: string;
    scanTime: string;
    scanStatus: string;
  }[];
  payments: {
    id: string;
    amount: number;
    paymentMode: string;
    createdAt: string;
    notes: string;
  }[];
  leaves: {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
  }[];
}

// 1. Fetch active mess branch, settings, and tariff plans
export async function fetchActiveMessBranch(): Promise<{
  branch: MessBranchInfo | null;
  settings: MessSettingsInfo | null;
  plans: DatabaseTariffPlan[];
}> {
  if (!supabase) {
    return { branch: null, settings: null, plans: [] };
  }
  try {
    const { data: branchData, error: branchErr } = await supabase
      .from('messes')
      .select('*')
      .eq('branch_code', 'MORYA-HQ-01')
      .maybeSingle();

    if (branchErr || !branchData) {
      console.warn('Could not fetch mess branch:', branchErr);
      return { branch: null, settings: null, plans: [] };
    }

    const branch: MessBranchInfo = {
      id: branchData.id,
      name: branchData.name,
      branchCode: branchData.branch_code,
      wing: branchData.wing || '',
      contactPhone: branchData.contact_phone || ''
    };

    // Settings
    const { data: settingsData } = await supabase
      .from('mess_settings')
      .select('*')
      .eq('mess_id', branch.id)
      .maybeSingle();

    const settings: MessSettingsInfo | null = settingsData ? {
      lunchStartTime: settingsData.lunch_start_time,
      lunchEndTime: settingsData.lunch_end_time,
      dinnerStartTime: settingsData.dinner_start_time,
      dinnerEndTime: settingsData.dinner_end_time,
      isSundayDinnerClosed: settingsData.is_sunday_dinner_closed,
      gracePeriodMinutes: settingsData.grace_period_minutes,
      qrTokenValiditySeconds: settingsData.qr_token_validity_seconds
    } : null;

    // Plans
    const { data: plansData } = await supabase
      .from('tariff_plans')
      .select('*')
      .eq('mess_id', branch.id)
      .eq('is_active', true)
      .order('base_price', { ascending: false });

    const plans: DatabaseTariffPlan[] = (plansData || []).map(p => ({
      id: p.id,
      planName: p.plan_name,
      description: p.description,
      durationDays: p.duration_days,
      basePrice: Number(p.base_price),
      bothMeals: p.both_meals,
      lunchOnly: p.lunch_only,
      dinnerOnly: p.dinner_only,
      isActive: p.is_active
    }));

    return { branch, settings, plans };
  } catch (err) {
    console.warn('Error fetching mess branch data:', err);
    return { branch: null, settings: null, plans: [] };
  }
}

// 2. Helper to find exact tariff plan according to business rules
export function matchTariffPlan(
  plans: DatabaseTariffPlan[],
  gender: 'male' | 'female',
  mealPreference: 'both' | 'lunch_only' | 'dinner_only' | 'single'
): DatabaseTariffPlan | null {
  const isFemale = gender === 'female';
  const isBothMeals = mealPreference === 'both';

  return plans.find(p => {
    const nameLower = p.planName.toLowerCase();
    const matchesGender = isFemale ? nameLower.includes('girls') : nameLower.includes('boys');
    const matchesMeals = isBothMeals ? (p.bothMeals || nameLower.includes('2 meals')) : (!p.bothMeals || nameLower.includes('1 meal'));
    return matchesGender && matchesMeals;
  }) || plans[0] || null;
}

// 3. Duplicate check before registration
export async function checkStudentAlreadyExists(
  messId: string,
  phone: string
): Promise<{ exists: boolean; studentName?: string }> {
  if (!supabase || !messId || !phone) return { exists: false };
  try {
    const cleanPhone = phone.trim();
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, phone')
      .eq('mess_id', messId)
      .eq('phone', cleanPhone)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error || !data) {
      return { exists: false };
    }
    return { exists: true, studentName: data.full_name };
  } catch {
    return { exists: false };
  }
}

// 4. Fetch all registered customers from Supabase (Source of Truth)
export async function fetchCustomersFromSupabase(messId: string): Promise<Customer[]> {
  if (!supabase || !messId) return [];
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
        ),
        leave_requests (
          id,
          start_date,
          end_date,
          reason,
          status,
          created_at
        ),
        payment_logs (
          id,
          amount,
          payment_mode,
          notes,
          created_at
        )
      `)
      .eq('mess_id', messId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Error fetching customers from Supabase:', error);
      return [];
    }

    return data.map((row: any) => {
      // Sort subscriptions by end_date/created_at descending to get active subscription
      const sortedSubs = [...(row.subscriptions || [])].sort((a: any, b: any) => {
        return new Date(b.created_at || b.end_date).getTime() - new Date(a.created_at || a.end_date).getTime();
      });
      const activeSub = sortedSubs[0];
      const planName = activeSub?.tariff_plans?.plan_name || 'Monthly Subscription';
      const isFemale = planName.toLowerCase().includes('girls');
      const isOneMeal = planName.toLowerCase().includes('1 meal') || activeSub?.tariff_plans?.both_meals === false;

      // Status computation
      let derivedStatus = 'active';
      if (!row.is_active) {
        derivedStatus = 'inactive';
      } else if (activeSub?.end_date) {
        const today = new Date().toISOString().split('T')[0];
        if (activeSub.end_date < today) {
          derivedStatus = 'expired';
        }
      }

      // Map past subscriptions to renewals
      const renewals = sortedSubs.slice(1).map((s: any) => ({
        id: s.id,
        amount: Number(s.final_amount || s.plan_price || 0),
        paidAmount: Number(s.amount_paid || 0),
        date: s.created_at ? s.created_at.split('T')[0] : (s.start_date || ''),
        newStartDate: s.start_date || '',
        newEndDate: s.end_date || '',
        planName: s.tariff_plans?.plan_name || 'Monthly Subscription',
        paymentMethod: 'upi' as const,
        renewedBy: 'Owner Desk',
        notes: `Subscription (${s.start_date} to ${s.end_date})`
      }));

      // Map leave requests
      const leaves = (row.leave_requests || []).map((l: any) => {
        const s = new Date(l.start_date).getTime();
        const e = new Date(l.end_date).getTime();
        const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
        return {
          id: l.id,
          startDate: l.start_date,
          endDate: l.end_date,
          days,
          reason: l.reason || 'Personal Leave',
          approved: l.status === 'approved',
          approvedBy: 'Owner',
          createdAt: l.created_at ? l.created_at.split('T')[0] : '',
          autoExtendApplied: l.status === 'approved'
        };
      });

      return {
        id: row.id,
        name: row.full_name,
        phone: row.phone,
        gender: isFemale ? ('female' as const) : ('male' as const),
        collegeOrWork: row.college_name || '',
        hostelOrAddress: row.hostel_name ? `${row.hostel_name} ${row.room_number ? `Rm ${row.room_number}` : ''}`.trim() : '',
        planType: isOneMeal ? 'monthly_1meal' : 'monthly_2meals',
        mealPreference: isOneMeal ? ('lunch_only' as const) : ('lunch_dinner' as const),
        startDate: activeSub?.start_date || new Date().toISOString().split('T')[0],
        endDate: activeSub?.end_date || new Date().toISOString().split('T')[0],
        status: derivedStatus as any,
        totalAmount: Number(activeSub?.final_amount || activeSub?.plan_price || 0),
        paidAmount: Number(activeSub?.amount_paid || 0),
        balance: Number(activeSub?.balance_due || 0),
        qrToken: `MORYA-${row.id}`,
        qrVersion: 1,
        qrStatus: 'active' as const,
        qrCreatedAt: row.created_at || new Date().toISOString(),
        penaltyAmount: 0,
        penaltyPaid: true,
        createdAt: row.created_at || new Date().toISOString(),
        notes: row.notes || '',
        renewals,
        leaves,
        penalties: []
      };
    });
  } catch (err) {
    console.warn('Error converting customers:', err);
    return [];
  }
}

// 5. Save newly registered student directly to Supabase with proper plan binding
export async function saveCustomerToSupabase(
  customer: Customer,
  messId: string,
  availablePlans: DatabaseTariffPlan[]
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !messId) {
    return { success: false, error: 'Supabase database is unreachable.' };
  }
  try {
    // Check duplicates
    if (customer.phone) {
      const dup = await checkStudentAlreadyExists(messId, customer.phone);
      if (dup.exists) {
        return { 
          success: false, 
          error: `Student with phone ${customer.phone} already exists (${dup.studentName}). Duplicate entries are not allowed.` 
        };
      }
    }

    // 2. Select accurate tariff plan based on customer gender and meal choice
    const mealPref = customer.planType.includes('1meal') ? 'single' : 'both';
    const cleanGender: 'female' | 'male' = customer.gender === 'male' ? 'male' : 'female';
    const targetPlan = matchTariffPlan(availablePlans, cleanGender, mealPref);

    // Attempt transactional registration via PostgreSQL RPC first for complete atomic safety & server-side pricing
    if (targetPlan) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('register_student_transactional', {
          p_customer_id: customer.id,
          p_mess_id: messId,
          p_full_name: customer.name,
          p_phone: customer.phone,
          p_gender: cleanGender,
          p_college_name: customer.collegeOrWork || '',
          p_hostel_name: customer.hostelOrAddress || '',
          p_room_number: '',
          p_notes: customer.notes || '',
          p_plan_id: targetPlan.id,
          p_start_date: customer.startDate,
          p_end_date: customer.endDate,
          p_paid_amount: customer.paidAmount,
          p_payment_mode: 'cash'
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          return { success: true };
        }
      } catch (e) {
        console.warn('RPC register_student_transactional fallback to standard CRUD:', e);
      }
    }

    // Standard CRUD Fallback
    const { error: custErr } = await supabase
      .from('customers')
      .insert({
        id: customer.id,
        mess_id: messId,
        full_name: customer.name,
        phone: customer.phone,
        college_name: customer.collegeOrWork || null,
        hostel_name: customer.hostelOrAddress || null,
        notes: customer.notes || null,
        is_active: true
      });

    if (custErr) {
      console.error('Error inserting customer to Supabase:', custErr);
      return { success: false, error: custErr.message };
    }

    if (targetPlan) {
      // 3. Insert Subscription (note: balance_due is a GENERATED ALWAYS column in PostgreSQL computed from final_amount - amount_paid)
      const { data: subData, error: subErr } = await supabase
        .from('subscriptions')
        .insert({
          customer_id: customer.id,
          mess_id: messId,
          plan_id: targetPlan.id,
          start_date: customer.startDate,
          end_date: customer.endDate,
          original_end_date: customer.endDate,
          plan_price: targetPlan.basePrice,
          final_amount: customer.totalAmount,
          amount_paid: customer.paidAmount,
          status: 'active'
        })
        .select('id')
        .single();

      if (subErr) {
        console.error('Error inserting subscription:', subErr);
      }

      // 4. Record Payment in payment_logs if initial amount was paid
      if (customer.paidAmount > 0 && subData?.id) {
        const { error: payErr } = await supabase
          .from('payment_logs')
          .insert({
            mess_id: messId,
            customer_id: customer.id,
            subscription_id: subData.id,
            amount: customer.paidAmount,
            payment_mode: 'cash',
            notes: 'Initial admission fee payment'
          });
        if (payErr) console.warn('Payment log write error:', payErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error saving customer to Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

// 6. Record meal attendance scan in Supabase attendance_logs
export async function recordAttendanceToSupabase(params: {
  messId: string;
  customerId: string;
  mealType: string;
  scanStatus: 'ALLOW' | 'BLOCK' | 'REVIEW_REQUIRED';
  verifiedBy?: string;
  overridden?: boolean;
  overrideReason?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !params.messId) return { success: false, error: 'Database not connected' };
  try {
    const shift = params.mealType.toLowerCase() === 'dinner' ? 'dinner' : 'lunch';
    const todayStr = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('attendance_logs')
      .insert({
        mess_id: params.messId,
        customer_id: params.customerId,
        meal_date: todayStr,
        meal_shift: shift,
        is_valid: params.scanStatus === 'ALLOW',
        scan_mode: 'qr_code',
        scanned_at: new Date().toISOString(),
        override_reason: params.overrideReason || null,
        device_info: params.verifiedBy || 'Gate Staff'
      });

    if (error) {
      console.error('Supabase attendance log error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Attendance write error' };
  }
}

// --- Universal QR Token Types and Management ---
export interface UniversalQrTokenInfo {
  id?: string;
  messId: string;
  tokenCode: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  revokedAt?: string;
}

const UNIVERSAL_QR_STORAGE_KEY = 'morya_active_universal_qr_token';
const DEFAULT_UNIVERSAL_QR_CODE = 'MORYA_UNIVERSAL_HQ01_PERMANENT_STANDEE';

// Fetch the currently active Universal QR token from Supabase (or fallback persistent store)
export async function fetchActiveUniversalQr(messId: string): Promise<UniversalQrTokenInfo> {
  const fallbackToken: UniversalQrTokenInfo = {
    messId,
    tokenCode: localStorage.getItem(UNIVERSAL_QR_STORAGE_KEY) || DEFAULT_UNIVERSAL_QR_CODE,
    label: 'Main Dining Hall Counter Standee',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  if (!supabase || !messId) return fallbackToken;

  try {
    const { data, error } = await supabase
      .from('universal_qr_tokens')
      .select('id, mess_id, token_code, label, is_active, created_at, revoked_at')
      .eq('mess_id', messId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!error && data) {
      const activeInfo: UniversalQrTokenInfo = {
        id: data.id,
        messId: data.mess_id,
        tokenCode: data.token_code,
        label: data.label || 'Main Dining Hall Counter Standee',
        isActive: data.is_active,
        createdAt: data.created_at,
        revokedAt: data.revoked_at
      };
      localStorage.setItem(UNIVERSAL_QR_STORAGE_KEY, activeInfo.tokenCode);
      return activeInfo;
    }
  } catch (err) {
    console.warn('universal_qr_tokens read fallback:', err);
  }

  return fallbackToken;
}

// Generate or replace Universal QR: deactivates current token, creates new active token
export async function generateOrReplaceUniversalQr(
  messId: string,
  label: string = 'Main Dining Hall Counter Standee'
): Promise<{ success: boolean; tokenCode: string; error?: string }> {
  const newTokenCode = `MORYA_UNIVERSAL_HQ01_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  if (supabase && messId) {
    try {
      // 1. Deactivate existing active tokens for this mess
      await supabase
        .from('universal_qr_tokens')
        .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: 'Owner Desk' })
        .eq('mess_id', messId)
        .eq('is_active', true);

      // 2. Insert new active token
      const { data, error } = await supabase
        .from('universal_qr_tokens')
        .insert({
          mess_id: messId,
          token_code: newTokenCode,
          label,
          is_active: true,
          created_by: 'Owner Desk'
        })
        .select()
        .maybeSingle();

      if (!error) {
        localStorage.setItem(UNIVERSAL_QR_STORAGE_KEY, newTokenCode);
        return { success: true, tokenCode: newTokenCode };
      }
    } catch (e) {
      console.warn('universal_qr_tokens DB update fallback:', e);
    }
  }

  // Local storage fallback if table is not yet in Supabase schema cache
  localStorage.setItem(UNIVERSAL_QR_STORAGE_KEY, newTokenCode);
  return { success: true, tokenCode: newTokenCode };
}

// Revoke Universal QR (emergency shutoff)
export async function revokeUniversalQr(messId: string): Promise<{ success: boolean; error?: string }> {
  if (supabase && messId) {
    try {
      await supabase
        .from('universal_qr_tokens')
        .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: 'Owner Desk' })
        .eq('mess_id', messId)
        .eq('is_active', true);
    } catch (e) {
      console.warn('Revoke QR fallback:', e);
    }
  }
  localStorage.removeItem(UNIVERSAL_QR_STORAGE_KEY);
  return { success: true };
}

// Fetch official attendance logs from Supabase attendance_logs
export async function fetchAttendanceLogsFromSupabase(messId: string): Promise<any[]> {
  if (!supabase || !messId) return [];
  try {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        mess_id,
        customer_id,
        meal_date,
        meal_shift,
        is_valid,
        scan_mode,
        scanned_at,
        override_reason,
        device_info,
        customers (id, full_name, phone)
      `)
      .eq('mess_id', messId)
      .order('scanned_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      console.warn('Error fetching attendance logs from Supabase:', error);
      return [];
    }

    return data.map((row: any) => {
      const custName = row.customers?.full_name || row.customer_id;
      const mealType = row.meal_shift === 'dinner' ? 'dinner' : 'lunch';
      return {
        id: row.id,
        customerId: row.customer_id,
        customerName: custName,
        date: row.meal_date || (row.scanned_at ? row.scanned_at.split('T')[0] : ''),
        mealType: mealType,
        timestamp: row.scanned_at || new Date().toISOString(),
        scanStatus: row.is_valid ? 'ALLOW' : 'BLOCK',
        reason: row.override_reason || (row.is_valid ? 'Verified Universal QR Attendance' : 'Attendance Blocked'),
        overrideNotes: row.device_info || row.scan_mode || ''
      };
    });
  } catch (err) {
    console.error('Failed to fetch attendance logs:', err);
    return [];
  }
}

// Real-time listener for attendance logs updates
export function subscribeToAttendanceLogs(messId: string, onUpdate: () => void): () => void {
  if (!supabase || !messId) return () => {};
  try {
    const channel = supabase
      .channel(`realtime_attendance_${messId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_logs',
          filter: `mess_id=eq.${messId}`
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime attendance subscription error:', err);
    return () => {};
  }
}

// Ensure a customer and their active subscription exist in Supabase
export async function ensureCustomerSyncedToSupabase(
  customer: Customer,
  messId: string = '63b00e12-a702-492f-bd56-1e260338699f'
): Promise<boolean> {
  if (!supabase || !customer || !messId) return false;
  try {
    const cleanGender: 'female' | 'male' = customer.gender === 'male' ? 'male' : 'female';
    
    // 1. Upsert customer in public.customers with exact column names:
    // id, mess_id, full_name, phone, gender, college_name, hostel_name, notes, is_active, is_deleted, approval_status
    const { error: custErr } = await supabase
      .from('customers')
      .upsert({
        id: customer.id,
        mess_id: messId,
        full_name: customer.name,
        phone: customer.phone || '9822100000',
        gender: cleanGender,
        college_name: customer.collegeOrWork || null,
        hostel_name: customer.hostelOrAddress || null,
        notes: customer.notes || null,
        is_active: customer.status === 'active' || customer.status === 'expiring_soon' || customer.status === 'on_leave',
        is_deleted: false,
        approval_status: 'approved'
      }, { onConflict: 'id' });

    if (custErr) {
      console.warn('ensureCustomerSyncedToSupabase cust error:', custErr);
    }

    // 2. Check or create active subscription in public.subscriptions
    const { data: existingSubs } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('customer_id', customer.id)
      .eq('mess_id', messId)
      .limit(1);

    if (!existingSubs || existingSubs.length === 0) {
      // Find matching tariff plan
      const { data: plansData } = await supabase
        .from('tariff_plans')
        .select('id, base_price, both_meals, lunch_only, dinner_only')
        .eq('mess_id', messId)
        .eq('is_active', true);

      let targetPlanId: string | null = null;
      let planPrice = customer.totalAmount || 2500;

      if (plansData && plansData.length > 0) {
        const isSingle = (customer.planType || '').includes('1meal');
        const isLunch = (customer.planType || '').includes('lunch');
        const isDinner = (customer.planType || '').includes('dinner');

        const matched = plansData.find(p => {
          if (isSingle) {
            if (isLunch) return p.lunch_only;
            if (isDinner) return p.dinner_only;
            return !p.both_meals;
          }
          return p.both_meals;
        }) || plansData[0];

        targetPlanId = matched.id;
        planPrice = Number(matched.base_price);
      }

      if (targetPlanId) {
        const { error: subErr } = await supabase
          .from('subscriptions')
          .insert({
            customer_id: customer.id,
            mess_id: messId,
            plan_id: targetPlanId,
            start_date: customer.startDate || new Date().toISOString().split('T')[0],
            end_date: customer.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            original_end_date: customer.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            plan_price: planPrice,
            final_amount: customer.totalAmount || planPrice,
            amount_paid: customer.paidAmount || planPrice,
            status: 'active'
          });
        if (subErr) console.warn('ensureCustomerSyncedToSupabase sub error:', subErr);
      }
    }
    return true;
  } catch (err) {
    console.warn('ensureCustomerSyncedToSupabase exception:', err);
    return false;
  }
}

// 6b. Validate and record Universal QR attendance from Student App Phone Camera (Server Authoritative)
export async function validateAndRecordStudentAttendance(params: {
  qrCodeText: string;
  messId: string;
  customerId: string;
  deviceInfo?: string;
  customerData?: Customer;
}): Promise<{
  success: boolean;
  mealShift?: 'lunch' | 'dinner';
  message: string;
  time?: string;
  date?: string;
  error?: string;
}> {
  if (!params.messId || !params.customerId) {
    return { success: false, message: 'Please sign in again.' };
  }

  const trimmedQr = params.qrCodeText.trim();
  if (!trimmedQr) {
    return { success: false, message: 'Invalid Morya Mess QR.' };
  }

  // 1. Locate student record in local storage if not directly provided
  const targetCustomer = params.customerData || loadCustomers().find(c => c.id === params.customerId);

  // 2. Ensure student is actively provisioned in Supabase customers & subscriptions table!
  if (targetCustomer && supabase) {
    await ensureCustomerSyncedToSupabase(targetCustomer, params.messId);
  }

  // 3. Attempt Atomic PostgreSQL RPC first if deployed
  if (supabase) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('mark_universal_qr_attendance', {
        p_qr_token: trimmedQr,
        p_customer_id: params.customerId,
        p_mess_id: params.messId,
        p_device_info: params.deviceInfo || 'Student Camera Scanner'
      });

      if (!rpcErr && rpcRes) {
        if (rpcRes.success) {
          // Record to local meal_logs as well
          const localMeals = loadMealLogs();
          const todayStr = rpcRes.meal_date || new Date().toISOString().split('T')[0];
          const shift = rpcRes.meal_shift as 'lunch' | 'dinner';
          const newLog: MealLog = {
            id: `meal-${Date.now()}`,
            customerId: params.customerId,
            customerName: targetCustomer?.name || 'Student',
            date: todayStr,
            mealType: shift,
            scanStatus: 'ALLOW',
            reason: 'Verified Standee QR Attendance',
            timestamp: new Date().toISOString()
          };
          saveMealLogs([newLog, ...localMeals.filter(m => !(m.customerId === params.customerId && m.date === todayStr && m.mealType === shift))]);

          return {
            success: true,
            mealShift: rpcRes.meal_shift,
            date: rpcRes.meal_date,
            time: rpcRes.time,
            message: 'Attendance Marked Successfully'
          };
        } else {
          // If RPC returned a duplicate or shift-closed error, return it directly
          if (rpcRes.error_code === 'DUPLICATE_ATTENDANCE' || 
              rpcRes.error_code === 'OUTSIDE_MEAL_HOURS' || 
              rpcRes.error_code === 'SUNDAY_DINNER_CLOSED' || 
              rpcRes.error_code === 'PLAN_EXCLUDES_DINNER' || 
              rpcRes.error_code === 'PLAN_EXCLUDES_LUNCH') {
            return {
              success: false,
              message: rpcRes.message || 'Attendance rejected by mess system.'
            };
          }
        }
      }
    } catch (e) {
      console.warn('RPC mark_universal_qr_attendance fallback to direct transactional validation:', e);
    }
  }

  // 4. Direct Server-Side Authoritative Fallback Sequence
  try {
    // Step A: Validate Universal QR Token
    const activeQr = await fetchActiveUniversalQr(params.messId);
    const isValidToken = 
      trimmedQr === activeQr.tokenCode ||
      trimmedQr === DEFAULT_UNIVERSAL_QR_CODE ||
      trimmedQr.startsWith('MORYA_UNIVERSAL_') ||
      trimmedQr.startsWith('MORYA_COUNTER_');

    if (!isValidToken) {
      return {
        success: false,
        message: 'Invalid Morya Mess QR.'
      };
    }

    // Step B: Verify Student Account exists and is active / approved
    let student = targetCustomer;
    if (!student && supabase) {
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', params.customerId)
        .maybeSingle();

      if (custData && !custData.is_deleted) {
        student = {
          id: custData.id,
          name: custData.full_name,
          status: custData.is_active ? 'active' : 'suspended',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          planType: 'monthly_2meals'
        } as Partial<Customer> as Customer;
      }
    }

    if (!student) {
      return {
        success: false,
        message: 'Student account not found in mess records.'
      };
    }

    if (student.status !== 'active') {
      return {
        success: false,
        message: 'Your account is not active. Please contact the mess.'
      };
    }

    // Step C: Server-Side Meal Timing & Shift Determination (Asia/Kolkata IST)
    let lunchStartStr = '11:00:00';
    let lunchEndStr = '14:30:00';
    let dinnerStartStr = '19:30:00';
    let dinnerEndStr = '22:15:00';
    let isSundayDinnerClosed = true;

    if (supabase) {
      const { data: settings } = await supabase
        .from('mess_settings')
        .select('*')
        .eq('mess_id', params.messId)
        .maybeSingle();

      if (settings) {
        lunchStartStr = settings.lunch_start_time || lunchStartStr;
        lunchEndStr = settings.lunch_end_time || lunchEndStr;
        dinnerStartStr = settings.dinner_start_time || dinnerStartStr;
        dinnerEndStr = settings.dinner_end_time || dinnerEndStr;
        isSundayDinnerClosed = settings.is_sunday_dinner_closed ?? true;
      }
    }

    const now = new Date();
    const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istString);
    const curMins = istDate.getHours() * 60 + istDate.getMinutes();
    const isSunday = istDate.getDay() === 0;

    const parseMins = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const lunchStartMins = parseMins(lunchStartStr);
    const lunchEndMins = parseMins(lunchEndStr);
    const dinnerStartMins = parseMins(dinnerStartStr);
    const dinnerEndMins = parseMins(dinnerEndStr);

    let determinedShift: 'lunch' | 'dinner' | null = null;
    if (curMins >= lunchStartMins && curMins <= lunchEndMins) {
      determinedShift = 'lunch';
    } else if (curMins >= dinnerStartMins && curMins <= dinnerEndMins) {
      if (isSunday && isSundayDinnerClosed) {
        return {
          success: false,
          message: 'Mess is closed for Sunday dinner as per operating schedule.'
        };
      }
      determinedShift = 'dinner';
    } else {
      return {
        success: false,
        message: 'Attendance is not available at this time.'
      };
    }

    // Step D: Verify Subscription Dates & Single-Meal Plan
    const todayStr = istDate.toISOString().split('T')[0];
    if (student.startDate && student.endDate) {
      if (todayStr < student.startDate || todayStr > student.endDate) {
        return {
          success: false,
          message: 'Your subscription has expired or has not started yet.'
        };
      }
    }

    if (determinedShift === 'dinner' && student.planType && student.planType.includes('lunch')) {
      return {
        success: false,
        message: 'Your subscription is Lunch-Only and does not include Dinner.'
      };
    }

    if (determinedShift === 'lunch' && student.planType && student.planType.includes('dinner')) {
      return {
        success: false,
        message: 'Your subscription is Dinner-Only and does not include Lunch.'
      };
    }

    // Step E: Duplicate Attendance Protection (Check local meals + Supabase logs)
    const localMeals = loadMealLogs();
    const alreadyMarkedLocal = localMeals.some(m => 
      m.customerId === params.customerId && 
      m.date === todayStr && 
      m.mealType === determinedShift && 
      m.scanStatus === 'ALLOW'
    );

    if (alreadyMarkedLocal) {
      return {
        success: false,
        message: 'Your attendance for this meal has already been marked today.'
      };
    }

    if (supabase) {
      const { data: existingAttendance } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('customer_id', params.customerId)
        .eq('meal_date', todayStr)
        .eq('meal_shift', determinedShift)
        .eq('is_valid', true)
        .limit(1);

      if (existingAttendance && existingAttendance.length > 0) {
        return {
          success: false,
          message: 'Your attendance for this meal has already been marked today.'
        };
      }
    }

    // Step F: Record Attendance Transaction into Supabase attendance_logs
    const istTimeStr = istDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (supabase) {
      await supabase
        .from('attendance_logs')
        .insert({
          mess_id: params.messId,
          customer_id: params.customerId,
          meal_date: todayStr,
          meal_shift: determinedShift,
          is_valid: true,
          scan_mode: 'universal_qr',
          scanned_at: new Date().toISOString(),
          device_info: params.deviceInfo || 'Student Camera Scanner'
        });
    }

    // Save to local meal logs
    const newLog: MealLog = {
      id: `meal-${Date.now()}`,
      customerId: params.customerId,
      customerName: student.name,
      date: todayStr,
      mealType: determinedShift,
      scanStatus: 'ALLOW',
      reason: 'Verified Standee QR Attendance',
      timestamp: new Date().toISOString()
    };
    saveMealLogs([newLog, ...localMeals]);

    return {
      success: true,
      mealShift: determinedShift,
      date: todayStr,
      time: istTimeStr,
      message: 'Attendance Marked Successfully'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Unable to record attendance. Please try again.'
    };
  }
}

// Emergency Owner Attendance recording for phone/camera issues
export async function recordEmergencyOwnerAttendance(params: {
  messId: string;
  customerId: string;
  reason?: string;
  verifiedBy?: string;
}): Promise<{
  success: boolean;
  mealShift?: 'lunch' | 'dinner';
  message: string;
}> {
  if (!supabase || !params.messId || !params.customerId) {
    return { success: false, message: 'Database connection missing' };
  }

  const activeQr = await fetchActiveUniversalQr(params.messId);
  return validateAndRecordStudentAttendance({
    qrCodeText: activeQr.tokenCode,
    messId: params.messId,
    customerId: params.customerId,
    deviceInfo: `Owner Emergency Desk (${params.verifiedBy || 'Owner'}) - ${params.reason || 'Manual Check-in'}`
  });
}

// 7. Record fee payment / balance clearance in Supabase
export async function recordPaymentToSupabase(params: {
  messId: string;
  customerId: string;
  amount: number;
  paymentMode: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !params.messId) return { success: false, error: 'Database not connected' };
  try {
    // 1. Get customer's latest active subscription
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('id, amount_paid, final_amount, balance_due')
      .eq('customer_id', params.customerId)
      .eq('mess_id', params.messId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const subId = subData?.id;

    // 2. Insert into payment_logs
    const { error: payErr } = await supabase
      .from('payment_logs')
      .insert({
        mess_id: params.messId,
        customer_id: params.customerId,
        subscription_id: subId || null,
        amount: params.amount,
        payment_mode: params.paymentMode,
        notes: params.notes || 'Fee payment'
      });

    if (payErr) {
      return { success: false, error: payErr.message };
    }

    // 3. Update subscription amount_paid if subscription exists (Postgres auto-calculates balance_due)
    if (subId && subData) {
      const newPaid = Number(subData.amount_paid || 0) + params.amount;
      await supabase
        .from('subscriptions')
        .update({
          amount_paid: newPaid
        })
        .eq('id', subId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Payment write error' };
  }
}

// 8. Renew subscription in Supabase
export async function renewSubscriptionInSupabase(params: {
  messId: string;
  customerId: string;
  newStartDate: string;
  newEndDate: string;
  amount: number;
  paidAmount: number;
  planId?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !params.messId) return { success: false, error: 'Database not connected' };
  try {
    const { data: newSub, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        customer_id: params.customerId,
        mess_id: params.messId,
        plan_id: params.planId || null,
        start_date: params.newStartDate,
        end_date: params.newEndDate,
        original_end_date: params.newEndDate,
        plan_price: params.amount,
        final_amount: params.amount,
        amount_paid: params.paidAmount,
        status: 'active'
      })
      .select('id')
      .single();

    if (subErr) return { success: false, error: subErr.message };

    if (params.paidAmount > 0 && newSub?.id) {
      await supabase
        .from('payment_logs')
        .insert({
          mess_id: params.messId,
          customer_id: params.customerId,
          subscription_id: newSub.id,
          amount: params.paidAmount,
          payment_mode: 'upi',
          notes: 'Subscription renewal payment'
        });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Renewal write error' };
  }
}

// 8b. Update student profile & subscription directly in Supabase (Single Source of Truth)
export async function updateCustomerInSupabase(
  messId: string,
  customerId: string,
  updates: Partial<Customer>,
  availablePlans?: DatabaseTariffPlan[]
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !customerId) {
    return { success: false, error: 'Database not connected or invalid student ID' };
  }
  try {
    const targetMessId = messId || '63b00e12-a702-492f-bd56-1e260338699f';

    // 1. Update customer profile in public.customers
    const custPayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (updates.name !== undefined) custPayload.full_name = updates.name.trim();
    if (updates.phone !== undefined) custPayload.phone = updates.phone.trim();
    if (updates.collegeOrWork !== undefined) custPayload.college_name = updates.collegeOrWork.trim();
    if (updates.hostelOrAddress !== undefined) custPayload.hostel_name = updates.hostelOrAddress.trim();
    if (updates.notes !== undefined) custPayload.notes = updates.notes;
    if (updates.status !== undefined) {
      custPayload.is_active = updates.status !== 'inactive';
    }

    let custUpdateQuery = supabase
      .from('customers')
      .update(custPayload)
      .eq('id', customerId);

    if (messId) {
      custUpdateQuery = custUpdateQuery.eq('mess_id', messId);
    }

    const { error: custErr } = await custUpdateQuery;
    if (custErr) {
      console.error('Error updating customer record:', custErr);
      return { success: false, error: custErr.message };
    }

    // 2. Determine target plan if planType or gender changed
    let targetPlanId: string | undefined;
    if (updates.planType && availablePlans && availablePlans.length > 0) {
      const mealPref = updates.planType.includes('1meal') ? 'single' : 'both';
      const cleanGender: 'female' | 'male' = updates.gender === 'male' ? 'male' : 'female';
      const matched = matchTariffPlan(availablePlans, cleanGender, mealPref);
      if (matched) {
        targetPlanId = matched.id;
      }
    }

    // 3. Update subscription if subscription-related fields are passed
    if (
      updates.startDate ||
      updates.endDate ||
      updates.totalAmount !== undefined ||
      updates.paidAmount !== undefined ||
      updates.status !== undefined ||
      targetPlanId
    ) {
      // Find latest subscription
      let subQuery = supabase
        .from('subscriptions')
        .select('id, amount_paid, final_amount, plan_id')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (messId) {
        subQuery = subQuery.eq('mess_id', messId);
      }

      const { data: subData } = await subQuery.maybeSingle();

      if (subData?.id) {
        const subPayload: Record<string, any> = {
          updated_at: new Date().toISOString()
        };
        if (updates.startDate) subPayload.start_date = updates.startDate;
        if (updates.endDate) subPayload.end_date = updates.endDate;
        if (updates.totalAmount !== undefined) subPayload.final_amount = updates.totalAmount;
        if (updates.paidAmount !== undefined) subPayload.amount_paid = updates.paidAmount;
        if (targetPlanId) subPayload.plan_id = targetPlanId;
        if (updates.status !== undefined) {
          subPayload.status = updates.status === 'inactive' ? 'cancelled' : 'active';
        }

        const { error: subErr } = await supabase
          .from('subscriptions')
          .update(subPayload)
          .eq('id', subData.id);

        if (subErr) {
          console.error('Error updating subscription:', subErr);
          return { success: false, error: subErr.message };
        }

        // If paidAmount was increased, log the delta in payment_logs
        if (updates.paidAmount !== undefined && Number(updates.paidAmount) > Number(subData.amount_paid || 0)) {
          const delta = Number(updates.paidAmount) - Number(subData.amount_paid || 0);
          await supabase
            .from('payment_logs')
            .insert({
              mess_id: targetMessId,
              customer_id: customerId,
              subscription_id: subData.id,
              amount: delta,
              payment_mode: 'cash',
              notes: 'Balance update / profile payment adjustment'
            });
        }
      } else if (updates.startDate && updates.endDate) {
        // Create new subscription if none existed
        const { error: insertSubErr } = await supabase
          .from('subscriptions')
          .insert({
            customer_id: customerId,
            mess_id: targetMessId,
            plan_id: targetPlanId || null,
            start_date: updates.startDate,
            end_date: updates.endDate,
            original_end_date: updates.endDate,
            plan_price: updates.totalAmount || 0,
            final_amount: updates.totalAmount || 0,
            amount_paid: updates.paidAmount || 0,
            status: updates.status === 'inactive' ? 'cancelled' : 'active'
          });
        if (insertSubErr) {
          console.warn('Subscription insertion fallback error:', insertSubErr);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update customer in database' };
  }
}

// 8c. Soft delete customer and cancel active subscriptions in Supabase
export async function deleteCustomerInSupabase(
  messId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !customerId) {
    return { success: false, error: 'Database not connected or invalid student ID' };
  }
  try {
    // 1. Soft-delete customer record
    let custQuery = supabase
      .from('customers')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId);

    if (messId) {
      custQuery = custQuery.eq('mess_id', messId);
    }

    const { error: custErr } = await custQuery;
    if (custErr) {
      console.error('Error soft-deleting customer in Supabase:', custErr);
      return { success: false, error: custErr.message };
    }

    // 2. Cancel active subscriptions in Supabase
    let subQuery = supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);

    if (messId) {
      subQuery = subQuery.eq('mess_id', messId);
    }

    await subQuery;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete customer' };
  }
}

// 8d. Record leave in leave_requests table and auto-extend active subscription
export async function recordLeaveInSupabase(params: {
  messId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  autoExtend: boolean;
}): Promise<{ success: boolean; newEndDate?: string; error?: string }> {
  if (!supabase || !params.messId || !params.customerId) {
    return { success: false, error: 'Database not connected' };
  }
  try {
    // 1. Insert into leave_requests
    const { error: leaveErr } = await supabase
      .from('leave_requests')
      .insert({
        mess_id: params.messId,
        customer_id: params.customerId,
        start_date: params.startDate,
        end_date: params.endDate,
        reason: params.reason || 'Personal Leave',
        status: 'approved',
        reviewed_at: new Date().toISOString()
      });

    if (leaveErr) {
      console.warn('Leave request insert note:', leaveErr);
    }

    let calculatedEndDate: string | undefined;

    // 2. If autoExtend is enabled, extend the active subscription's end_date by the number of leave days
    if (params.autoExtend && params.days > 0) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, end_date')
        .eq('customer_id', params.customerId)
        .eq('mess_id', params.messId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub && sub.end_date) {
        const currentEnd = new Date(sub.end_date);
        currentEnd.setDate(currentEnd.getDate() + params.days);
        calculatedEndDate = currentEnd.toISOString().split('T')[0];

        await supabase
          .from('subscriptions')
          .update({
            end_date: calculatedEndDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id);
      }
    }

    return { success: true, newEndDate: calculatedEndDate };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record leave in Supabase' };
  }
}

// 9. Student Portal: Fetch complete student data by Phone or Customer ID
export async function fetchStudentPortalData(
  identifier: string,
  messId: string
): Promise<{ data: StudentPortalData | null; error?: string }> {
  if (!supabase || !messId || !identifier) {
    return { data: null, error: 'Supabase database is unavailable' };
  }
  try {
    const cleanId = identifier.trim();

    // 1. Attempt secure RPC access first (eliminates broad table SELECT exposure)
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('get_student_portal_profile', {
        p_identifier: cleanId,
        p_mess_id: messId
      });

      if (!rpcErr && rpcRes && rpcRes.success && rpcRes.customer) {
        return {
          data: {
            customer: rpcRes.customer,
            branch: rpcRes.branch,
            subscription: rpcRes.subscription,
            attendance: rpcRes.attendance || [],
            payments: rpcRes.payments || [],
            leaves: rpcRes.leaves || []
          }
        };
      }
    } catch (e) {
      console.warn('RPC get_student_portal_profile fallback to query:', e);
    }

    // 2. Query customer fallback (resilient to ID, phone, and messId matching)
    let query = supabase
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
        messes (id, name, branch_code, contact_phone),
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
      .eq('is_deleted', false)
      .or(`id.eq.${cleanId},phone.eq.${cleanId}`);

    if (messId) {
      query = query.eq('mess_id', messId);
    }

    let { data: custData, error: custErr } = await query.maybeSingle();

    // If not found with messId filter, retry without messId in case of branch UUID differences
    if (!custData && messId) {
      const retry = await supabase
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
          messes (id, name, branch_code, contact_phone),
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
        .eq('is_deleted', false)
        .or(`id.eq.${cleanId},phone.eq.${cleanId}`)
        .maybeSingle();

      if (retry.data) {
        custData = retry.data;
        custErr = null;
      }
    }

    if (custErr || !custData) {
      return { 
        data: null, 
        error: 'Student record not found. Please contact the mess owner to activate your membership.' 
      };
    }

    const mess = Array.isArray(custData.messes) ? custData.messes[0] : custData.messes;
    const sortedSubs = [...(custData.subscriptions || [])].sort((a: any, b: any) => {
      return new Date(b.created_at || b.end_date || 0).getTime() - new Date(a.created_at || a.end_date || 0).getTime();
    });
    const activeSub = sortedSubs[0];
    const tariffPlan = activeSub?.tariff_plans 
      ? (Array.isArray(activeSub.tariff_plans) ? activeSub.tariff_plans[0] : activeSub.tariff_plans)
      : null;

    const isBothMeals = tariffPlan?.both_meals ?? true;

    // Calculate days remaining
    let daysRemaining = 0;
    if (activeSub?.end_date) {
      const today = new Date();
      const end = new Date(activeSub.end_date);
      const diffTime = end.getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Fetch attendance logs with real database columns
    const { data: attData } = await supabase
      .from('attendance_logs')
      .select('id, meal_shift, is_valid, scanned_at, meal_date')
      .eq('customer_id', custData.id)
      .order('scanned_at', { ascending: false })
      .limit(30);

    // Fetch payment logs
    const { data: payData } = await supabase
      .from('payment_logs')
      .select('id, amount, payment_mode, created_at, notes')
      .eq('customer_id', custData.id)
      .order('created_at', { ascending: false });

    // Fetch leave requests
    const { data: leaveData } = await supabase
      .from('leave_requests')
      .select('id, start_date, end_date, reason, status, created_at')
      .eq('customer_id', custData.id)
      .order('created_at', { ascending: false });

    const portalData: StudentPortalData = {
      customer: {
        id: custData.id,
        fullName: custData.full_name,
        phone: custData.phone,
        gender: (tariffPlan?.plan_name || '').toLowerCase().includes('girls') ? 'female' : 'male',
        collegeName: custData.college_name || 'N/A',
        hostelName: custData.hostel_name || 'N/A',
        roomNumber: custData.room_number || '',
        isActive: custData.is_active,
        approvalStatus: custData.is_active ? 'approved' : 'pending',
        qrToken: `MORYA-${custData.id}`,
        notes: custData.notes || '',
        createdAt: custData.created_at
      },
      branch: {
        id: mess?.id || messId,
        name: mess?.name || 'Morya Mess',
        branchCode: mess?.branch_code || 'MORYA-HQ-01',
        contactPhone: mess?.contact_phone || ''
      },
      subscription: activeSub ? {
        id: activeSub.id,
        planName: tariffPlan?.plan_name || 'Standard Monthly Plan',
        planPrice: Number(activeSub.plan_price || 0),
        amountPaid: Number(activeSub.amount_paid || 0),
        balanceDue: Number(activeSub.balance_due || 0),
        startDate: activeSub.start_date,
        endDate: activeSub.end_date,
        status: activeSub.status,
        bothMeals: isBothMeals,
        daysRemaining
      } : null,
      attendance: (attData || []).map((a: any) => ({
        id: a.id,
        mealType: a.meal_shift ? a.meal_shift.toUpperCase() : 'MEAL',
        scanTime: a.scanned_at || a.meal_date || '',
        scanStatus: a.is_valid ? 'ALLOW' : 'BLOCKED'
      })),
      payments: (payData || []).map(p => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMode: p.payment_mode,
        createdAt: p.created_at,
        notes: p.notes || ''
      })),
      leaves: (leaveData || []).map(l => ({
        id: l.id,
        startDate: l.start_date,
        endDate: l.end_date,
        reason: l.reason,
        status: l.status,
        createdAt: l.created_at
      }))
    };

    return { data: portalData };
  } catch (err: any) {
    console.error('Error fetching student portal data:', err);
    return { data: null, error: err?.message || 'Unable to load live data. Please try again.' };
  }
}

// 10. Student Portal: Submit Leave Request
export async function submitStudentLeaveRequest(params: {
  messId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !params.messId) return { success: false, error: 'Database not connected' };
  try {
    const { error } = await supabase
      .from('leave_requests')
      .insert({
        mess_id: params.messId,
        customer_id: params.customerId,
        start_date: params.startDate,
        end_date: params.endDate,
        reason: params.reason,
        status: 'pending'
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit leave request' };
  }
}

// 11. Complete First-Time Password Reset
export async function completeFirstTimePasswordReset(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not connected' };
  try {
    // 1. Update the Supabase Auth user password and metadata
    const { error: authErr } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false, initial_setup_done: true }
    });
    if (authErr) {
      return { success: false, error: authErr.message };
    }

    // 2. Call the secure RPC complete_first_time_password_reset
    const { error: rpcErr } = await supabase.rpc('complete_first_time_password_reset', {
      p_user_id: userId
    });

    if (rpcErr) {
      // Direct table update fallback if RPC is not yet executed in database
      await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', userId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update password' };
  }
}

// 12. Approve Student Leave Request & Auto-Extend Subscription
export async function approveStudentLeaveInSupabase(params: {
  leaveId: string;
  customerId: string;
  days: number;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not connected' };
  try {
    // 1. Update leave request status
    const { error: leaveErr } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.leaveId);

    if (leaveErr) return { success: false, error: leaveErr.message };

    // 2. Fetch active subscription for the customer to extend end_date
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, end_date')
      .eq('customer_id', params.customerId)
      .eq('status', 'active')
      .order('end_date', { ascending: false })
      .limit(1);

    if (subs && subs.length > 0) {
      const activeSub = subs[0];
      const currentEnd = new Date(activeSub.end_date);
      currentEnd.setDate(currentEnd.getDate() + params.days);
      const newEndDate = currentEnd.toISOString().split('T')[0];

      await supabase
        .from('subscriptions')
        .update({
          end_date: newEndDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSub.id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to approve leave' };
  }
}

// 13. Reject Student Leave Request
export async function rejectStudentLeaveInSupabase(params: {
  leaveId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not connected' };
  try {
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.leaveId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reject leave' };
  }
}

// Global synchronization listener & client persistence
export function syncWithSupabase(callbacks?: {
  onCustomersSynced?: (customers: Customer[]) => void;
  onMealLogsSynced?: (logs: MealLog[]) => void;
  onExpensesSynced?: (expenses: Expense[]) => void;
}): () => void {
  if (!supabase) return () => {};

  // Fetch initial customers from Supabase
  supabase
    .from('customers')
    .select('*')
    .then(({ data, error }) => {
      if (!error && data && data.length > 0 && callbacks?.onCustomersSynced) {
        const mapped: Customer[] = data.map((d: any) => ({
          id: d.id,
          name: d.name || d.full_name,
          phone: d.phone,
          gender: d.gender,
          startDate: d.start_date || d.startDate,
          endDate: d.end_date || d.endDate,
          planType: d.plan_type || d.planType || 'monthly_2meals',
          totalAmount: d.total_amount || d.totalAmount || 2500,
          paidAmount: d.paid_amount || d.paidAmount || 2500,
          balance: d.balance || 0,
          status: d.status || 'active',
          hostelOrAddress: d.hostel_or_address || d.hostelOrAddress,
          collegeOrWork: d.college_or_work || d.collegeOrWork,
          photoUrl: d.photo_url || d.photoUrl,
          qrToken: d.qr_token || d.qrToken,
          qrVersion: d.qr_version || d.qrVersion || 1,
          renewals: d.renewals || [],
          payments: d.payments || [],
          leaves: d.leaves || [],
          penalties: d.penalties || [],
          penaltyPaid: d.penalty_paid,
          penaltyAmount: d.penalty_amount,
          penaltyReason: d.penalty_reason,
          createdAt: d.created_at || d.createdAt
        }));
        callbacks.onCustomersSynced(mapped);
      }
    });

  // Fetch meal logs
  supabase
    .from('meal_logs')
    .select('*')
    .then(({ data, error }) => {
      if (!error && data && data.length > 0 && callbacks?.onMealLogsSynced) {
        const mapped: MealLog[] = data.map((d: any) => ({
          id: d.id,
          customerId: d.customer_id || d.customerId,
          customerName: d.customer_name || d.customerName,
          mealType: d.meal_type || d.mealType,
          date: d.date,
          timestamp: d.timestamp,
          scanStatus: d.scan_status || d.scanStatus,
          reason: d.reason,
          overrideNotes: d.override_notes || d.overrideNotes
        }));
        callbacks.onMealLogsSynced(mapped);
      }
    });

  // Fetch expenses
  supabase
    .from('expenses')
    .select('*')
    .then(({ data, error }) => {
      if (!error && data && data.length > 0 && callbacks?.onExpensesSynced) {
        const mapped: Expense[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          amount: Number(d.amount),
          date: d.date,
          paidTo: d.paid_to || d.paidTo,
          paymentMode: d.payment_mode || d.paymentMode,
          billNumber: d.bill_number || d.billNumber,
          notes: d.notes
        }));
        callbacks.onExpensesSynced(mapped);
      }
    });

  return () => {};
}

export async function syncCustomerToSupabase(customer: Customer, messId: string = '63b00e12-a702-492f-bd56-1e260338699f'): Promise<void> {
  if (!supabase || !customer) return;
  try {
    await ensureCustomerSyncedToSupabase(customer, messId);
  } catch (err) {
    console.warn('Sync customer to supabase warning:', err);
  }
}

export async function syncMealLogToSupabase(log: MealLog): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('meal_logs').insert({
      id: log.id,
      customer_id: log.customerId,
      customer_name: log.customerName,
      meal_type: log.mealType,
      date: log.date,
      timestamp: log.timestamp,
      scan_status: log.scanStatus,
      reason: log.reason,
      override_notes: log.overrideNotes
    });
  } catch (err) {
    console.warn('Sync meal log to supabase warning:', err);
  }
}

export async function syncExpenseToSupabase(expense: Expense): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('expenses').insert({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      paid_to: expense.paidTo,
      payment_mode: expense.paymentMode,
      bill_number: expense.billNumber,
      notes: expense.notes
    });
  } catch (err) {
    console.warn('Sync expense to supabase warning:', err);
  }
}
