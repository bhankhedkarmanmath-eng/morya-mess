import { Customer, MealLog, LeaveRecord } from '../types/mess';
import { getTodayString, evaluateStrictMessShift } from './storage';
import { getTodayActiveSkipsCount } from './autoPilotSuite';

// Storage Keys
const EMERGENCY_BROADCAST_KEY = 'morya_kitchen_emergency_broadcast';
const UNFED_CREDITS_KEY = 'morya_unfed_meal_credits';

export interface KitchenEmergencyAlert {
  id: string;
  active: boolean;
  type: 'roti_shortage' | 'curry_shortage' | 'delayed_service' | 'general';
  title: string;
  message: string;
  shortageItem: string;
  alternativeOffered: string;
  announcedAt: string;
  shift: 'lunch' | 'dinner';
  date: string;
}

export interface UnfedMealCredit {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  shift: 'lunch' | 'dinner';
  reason: string;
  creditAmount: number; // e.g. ₹50 or ₹60
  status: 'credited_to_balance' | 'cash_refunded' | 'extra_token_issued';
  createdAt: string;
  notes?: string;
}

export interface LiveRotiPrediction {
  shift: 'lunch' | 'dinner';
  date: string;
  // Diners count
  totalExpectedBoys: number;
  totalExpectedGirls: number;
  totalExpectedDiners: number;
  
  // Scanned so far
  scannedBoys: number;
  scannedGirls: number;
  totalScannedDiners: number;

  // Remaining expected
  remainingBoys: number;
  remainingGirls: number;
  remainingDiners: number;

  // Roti Calculation (Boys eat 4 chapatis, Girls eat 3 chapatis)
  rotisConsumedBoys: number;
  rotisConsumedGirls: number;
  totalRotisConsumed: number;

  rotisNeededBoys: number;
  rotisNeededGirls: number;
  totalRotisStillNeeded: number;

  totalShiftRotisProjected: number;
  attaFlourKgNeeded: number; // ~35g per roti
  
  // Alert status
  rushPaceLabel: 'Comfortable' | 'Active Pace' | 'Heavy Demand' | 'Shortage Warning';
}

// ------------------------------------------------------------------
// 1. EMERGENCY SHORTAGE BROADCAST ENGINE
// ------------------------------------------------------------------
export function getActiveEmergencyAlert(): KitchenEmergencyAlert | null {
  try {
    const raw = localStorage.getItem(EMERGENCY_BROADCAST_KEY);
    if (!raw) return null;
    const alert: KitchenEmergencyAlert = JSON.parse(raw);
    const today = getTodayString();
    // Alert only valid for today's active shift
    if (alert.active && alert.date === today) {
      return alert;
    }
    return null;
  } catch {
    return null;
  }
}

export function publishEmergencyAlert(alertData: Omit<KitchenEmergencyAlert, 'id' | 'announcedAt' | 'date'>): KitchenEmergencyAlert {
  const alert: KitchenEmergencyAlert = {
    ...alertData,
    id: `ALERT-${Date.now()}`,
    announcedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: getTodayString()
  };
  localStorage.setItem(EMERGENCY_BROADCAST_KEY, JSON.stringify(alert));
  window.dispatchEvent(new CustomEvent('morya_emergency_alert_updated', { detail: alert }));
  return alert;
}

export function clearEmergencyAlert(): void {
  try {
    const current = getActiveEmergencyAlert();
    if (current) {
      const cleared = { ...current, active: false };
      localStorage.setItem(EMERGENCY_BROADCAST_KEY, JSON.stringify(cleared));
    } else {
      localStorage.removeItem(EMERGENCY_BROADCAST_KEY);
    }
    window.dispatchEvent(new CustomEvent('morya_emergency_alert_updated', { detail: null }));
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------------
// 2. LIVE ROTI COUNTER & PREDICTION ENGINE (Boys: 4, Girls: 3)
// ------------------------------------------------------------------
export function computeLiveRotiPrediction(
  customers: Customer[] = [],
  mealLogs: MealLog[] = [],
  leaves: LeaveRecord[] = [],
  customBuffer: number = 5
): LiveRotiPrediction {
  const today = getTodayString();
  const shiftAudit = evaluateStrictMessShift();
  const shift = shiftAudit.mealType === 'dinner' ? 'dinner' : 'lunch';

  // 1. Active enrolled members categorized by gender
  const activeBoys = customers.filter(
    c => c.status === 'active' && c.gender === 'male'
  );
  const activeGirls = customers.filter(
    c => c.status === 'active' && c.gender === 'female'
  );

  // 2. Leaves today
  const leavesToday = leaves.filter(
    l => (l.status === 'approved' || l.approved) && today >= l.startDate && today <= l.endDate
  );
  const boysOnLeave = leavesToday.filter(l => {
    const cust = customers.find(c => c.id === (l as any).customerId);
    return cust?.gender === 'male';
  }).length;
  const girlsOnLeave = leavesToday.filter(l => {
    const cust = customers.find(c => c.id === (l as any).customerId);
    return cust?.gender === 'female';
  }).length;

  // 3. Skips today
  const skipsCount = getTodayActiveSkipsCount(shift);
  // Estimate skip distribution: 60% boys, 40% girls
  const boysSkips = Math.round(skipsCount * 0.6);
  const girlsSkips = Math.max(0, skipsCount - boysSkips);

  // Net Expected Diners (Boys & Girls)
  const expectedBoys = Math.max(0, activeBoys.length - boysOnLeave - boysSkips) + Math.ceil(customBuffer * 0.6);
  const expectedGirls = Math.max(0, activeGirls.length - girlsOnLeave - girlsSkips) + Math.floor(customBuffer * 0.4);
  const totalExpectedDiners = expectedBoys + expectedGirls;

  // 4. Scanned Today for current shift
  const todayShiftLogs = mealLogs.filter(
    m => m.date === today && m.mealType === shift && (m.scanStatus === 'ALLOW' || (m.scanStatus as string) === 'VERIFIED')
  );

  // Match each log with customer gender
  let scannedBoys = 0;
  let scannedGirls = 0;

  todayShiftLogs.forEach(log => {
    const cust = customers.find(c => c.id === log.customerId);
    if (cust?.gender === 'female' || log.gender === 'female') {
      scannedGirls++;
    } else {
      scannedBoys++;
    }
  });

  const totalScanned = scannedBoys + scannedGirls;
  const remainingBoys = Math.max(0, expectedBoys - scannedBoys);
  const remainingGirls = Math.max(0, expectedGirls - scannedGirls);
  const remainingDiners = remainingBoys + remainingGirls;

  // 5. ROTI FORMULA:
  // Boys eat 4 chapatis
  // Girls eat 3 chapatis
  const rotisConsumedBoys = scannedBoys * 4;
  const rotisConsumedGirls = scannedGirls * 3;
  const totalRotisConsumed = rotisConsumedBoys + rotisConsumedGirls;

  const rotisNeededBoys = remainingBoys * 4;
  const rotisNeededGirls = remainingGirls * 3;
  const totalRotisStillNeeded = rotisNeededBoys + rotisNeededGirls;

  const totalShiftRotisProjected = totalRotisConsumed + totalRotisStillNeeded;
  // ~35 grams dry flour per chapati
  const attaFlourKgNeeded = +((totalShiftRotisProjected * 0.035).toFixed(1));

  // Determine rush pace label
  let rushPaceLabel: 'Comfortable' | 'Active Pace' | 'Heavy Demand' | 'Shortage Warning' = 'Comfortable';
  if (remainingDiners > 25) {
    rushPaceLabel = 'Heavy Demand';
  } else if (remainingDiners > 10) {
    rushPaceLabel = 'Active Pace';
  } else {
    rushPaceLabel = 'Comfortable';
  }

  return {
    shift,
    date: today,
    totalExpectedBoys: expectedBoys,
    totalExpectedGirls: expectedGirls,
    totalExpectedDiners,
    scannedBoys,
    scannedGirls,
    totalScannedDiners: totalScanned,
    remainingBoys,
    remainingGirls,
    remainingDiners,
    rotisConsumedBoys,
    rotisConsumedGirls,
    totalRotisConsumed,
    rotisNeededBoys,
    rotisNeededGirls,
    totalRotisStillNeeded,
    totalShiftRotisProjected,
    attaFlourKgNeeded,
    rushPaceLabel
  };
}

// ------------------------------------------------------------------
// 3. MISSED / UNFED MEAL QUICK CREDIT ENGINE
// ------------------------------------------------------------------
export function loadUnfedMealCredits(): UnfedMealCredit[] {
  try {
    const raw = localStorage.getItem(UNFED_CREDITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function issueUnfedMealCredit(
  customer: Customer,
  creditAmount: number = 50,
  reason: string = 'Kitchen Shortage - Roti Unavailable',
  refundType: 'credited_to_balance' | 'cash_refunded' | 'extra_token_issued' = 'credited_to_balance'
): UnfedMealCredit {
  const shiftAudit = evaluateStrictMessShift();
  const record: UnfedMealCredit = {
    id: `CREDIT-${Date.now()}`,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    date: getTodayString(),
    shift: shiftAudit.mealType === 'dinner' ? 'dinner' : 'lunch',
    reason,
    creditAmount,
    status: refundType,
    createdAt: new Date().toISOString(),
    notes: `Issued compensation of ₹${creditAmount} for meal inconvenience.`
  };

  const existing = loadUnfedMealCredits();
  localStorage.setItem(UNFED_CREDITS_KEY, JSON.stringify([record, ...existing]));
  window.dispatchEvent(new CustomEvent('morya_unfed_credits_updated', { detail: record }));
  return record;
}
