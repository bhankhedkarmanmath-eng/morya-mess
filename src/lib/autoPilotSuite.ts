import { Customer, MealLog, LeaveRecord, BusinessRulesConfig } from '../types/mess';
import { calculateDaysRemaining, getTodayString, getCurrentTimeString, getCurrentMealType, evaluateStrictMessShift } from './storage';

// ----------------------------------------------------
// 1. AUTO-PILOT WHATSAPP DUES & RECOVERY ENGINE
// ----------------------------------------------------

export interface DuesTarget {
  customer: Customer;
  type: 'overdue_balance' | 'expiring_soon' | 'expired_plan';
  dueAmount: number;
  daysRemaining: number;
  lastReminderSentAt?: string;
  hasUnpaidBalance?: boolean;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  isSentToday?: boolean;
}

export type WhatsAppTemplateId = 'friendly_reminder' | 'urgent_overdue' | 'expiry_warning';

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateId, { label: string; tone: string }> = {
  friendly_reminder: { label: 'Friendly Reminder (Hinglish/Marathi)', tone: 'Polite & Respectful' },
  urgent_overdue: { label: 'Urgent Overdue Notice (Fee Pending)', tone: 'Formal & Direct' },
  expiry_warning: { label: 'Subscription Expiry Notice (Renewal)', tone: 'Informative & Actionable' }
};

const DUES_LOGS_KEY = 'mess_autopilot_dues_logs';

export function getDuesLogs(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DUES_LOGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordDuesReminderSent(customerId: string): void {
  try {
    const logs = getDuesLogs();
    logs[customerId] = new Date().toISOString();
    localStorage.setItem(DUES_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to record dues reminder log:', e);
  }
}

export function computeDuesTargets(customers: Customer[]): DuesTarget[] {
  const logs = getDuesLogs();
  const targets: DuesTarget[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  for (const c of customers) {
    const daysLeft = calculateDaysRemaining(c.endDate);
    const lastSent = logs[c.id];
    
    // Robust balance calculation: check both explicit balance & (total - paid)
    const explicitBalance = Number(c.balance) || 0;
    const computedPending = Math.max(0, (Number(c.totalAmount) || 0) - (Number(c.paidAmount) || 0));
    const numBalance = Math.max(explicitBalance, computedPending);
    const numTotal = Number(c.totalAmount) || 2500;

    const hasUnpaidBalance = numBalance > 0;
    const isExpiringSoon = daysLeft >= 0 && daysLeft <= 3 && c.status === 'active';
    const isExpired = daysLeft < 0 || c.status === 'expired';
    const isSentToday = Boolean(lastSent && lastSent.startsWith(todayStr));

    // Must have unpaid dues, expiring within 3 days, or already expired
    if (hasUnpaidBalance || isExpiringSoon || isExpired) {
      const type: 'overdue_balance' | 'expiring_soon' | 'expired_plan' = hasUnpaidBalance
        ? 'overdue_balance'
        : isExpiringSoon
          ? 'expiring_soon'
          : 'expired_plan';

      const dueAmount = hasUnpaidBalance ? numBalance : numTotal;

      targets.push({
        customer: c,
        type,
        dueAmount,
        daysRemaining: daysLeft,
        lastReminderSentAt: lastSent,
        hasUnpaidBalance,
        isExpiringSoon,
        isExpired,
        isSentToday
      });
    }
  }

  // Sort: Unpaid dues first (highest pending balance to lowest), then overdue days, then expiring
  return targets.sort((a, b) => {
    if (a.hasUnpaidBalance && !b.hasUnpaidBalance) return -1;
    if (!a.hasUnpaidBalance && b.hasUnpaidBalance) return 1;
    if (a.dueAmount !== b.dueAmount) return b.dueAmount - a.dueAmount;
    return a.daysRemaining - b.daysRemaining;
  });
}

export function generateWhatsAppMessage(
  target: DuesTarget,
  templateId: WhatsAppTemplateId,
  rules: BusinessRulesConfig
): string {
  const { customer, dueAmount, daysRemaining, type } = target;
  const messName = rules.messName || 'Morya Mess';
  const upiId = rules.upiId || 'moryamess@upi';
  const upiPayee = rules.upiPayeeName || messName;
  const cleanPhone = customer.phone?.replace(/[^0-9]/g, '') || '';

  if (templateId === 'urgent_overdue') {
    return `🚩 *${messName} - Urgent Fee Payment Notice*

Hello *${customer.name}*,
Your mess account currently has a pending balance of *₹${dueAmount}*.

• *Student ID:* ${customer.id}
• *Pending Amount:* ₹${dueAmount}
• *Mess Name:* ${messName}

Please complete the payment via UPI to avoid interruption in mess services:
📲 *UPI ID:* \`${upiId}\`
🏷️ *Name:* ${upiPayee}

_Once paid, please update in the app or inform at the counter. Thank you!_`;
  }

  if (templateId === 'expiry_warning') {
    const daysText = daysRemaining === 0 ? 'expires today' : `expires in ${daysRemaining} days`;
    return `🚩 *${messName} - Mess Subscription Renewal Notice*

Hello *${customer.name}*,
Your mess membership *${daysText}* (Valid Till: ${customer.endDate}).

• *Student ID:* ${customer.id}
• *Renewal Fee:* ₹${dueAmount}
• *Plan:* ${customer.mealPreference === 'lunch_dinner' ? 'Full Mess (Lunch + Dinner)' : 'One Time Meal'}

For uninterrupted mess service, please send renewal payment to the following UPI ID:
📲 *UPI ID:* \`${upiId}\`
🏷️ *Name:* ${upiPayee}

_Once paid, please upload the receipt in app. Thank you!_`;
  }

  // Friendly default
  return `🚩 *${messName} - Mess Account Update*

Hello *${customer.name}* (ID: ${customer.id}),
${type === 'overdue_balance' 
  ? `Your mess account has a pending balance of ₹${dueAmount}.` 
  : `Your mess subscription is expiring soon (${daysRemaining} days remaining).`}

Please settle/renew at your earliest convenience:
📲 *UPI ID:* \`${upiId}\` (Name: ${upiPayee})

For any queries, please visit the mess counter.
_Team ${messName}_`;
}

export function buildWhatsAppDirectUrl(phone: string, message: string): string {
  const cleanDigits = (phone || '').replace(/[^0-9]/g, '');
  let targetNumber = cleanDigits;
  if (cleanDigits.length === 10) {
    targetNumber = `91${cleanDigits}`;
  } else if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) {
    targetNumber = `91${cleanDigits.slice(1)}`;
  } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
    targetNumber = cleanDigits;
  }
  return targetNumber 
    ? `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}


// ----------------------------------------------------
// 2. SELF-REGULATING STUDENT MEAL SKIP & FOOD-SAVER MICRO-ECONOMY
// ----------------------------------------------------

export interface MealSkipRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  mealType: 'lunch' | 'dinner';
  status: 'active' | 'cancelled';
  createdAt: string;
  creditApplied: boolean;
  creditAmount: number; // e.g. ₹40 or 0.5 day
}

const MEAL_SKIPS_KEY = 'mess_meal_skips';

export function loadMealSkips(): MealSkipRecord[] {
  try {
    const raw = localStorage.getItem(MEAL_SKIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMealSkips(skips: MealSkipRecord[]): void {
  try {
    localStorage.setItem(MEAL_SKIPS_KEY, JSON.stringify(skips));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('morya_skips_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.error('Failed to save meal skips:', e);
  }
}

export interface MealSkipCutoffStatus {
  canSkipLunch: boolean;
  canSkipDinner: boolean;
  lunchCutoffNotice: string;
  dinnerCutoffNotice: string;
  currentIstMinutes: number;
}

export function evaluateMealSkipCutoffs(): MealSkipCutoffStatus {
  try {
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false });
    const [hh, mm] = istTimeStr.split(':').map(Number);
    const currentMins = hh * 60 + mm;

    // Strict 2-hour advance rule for kitchen prep:
    // Lunch shift starts 10:30 AM -> Cutoff is 8:30 AM (510 minutes)
    // Dinner shift starts 7:30 PM (19:30) -> Cutoff is 5:30 PM (17:30 = 1050 minutes)
    const lunchCutoff = 8 * 60 + 30; // 08:30 AM
    const dinnerCutoff = 17 * 60 + 30; // 05:30 PM

    const canSkipLunch = currentMins <= lunchCutoff;
    const canSkipDinner = currentMins <= dinnerCutoff;

    return {
      canSkipLunch,
      canSkipDinner,
      lunchCutoffNotice: canSkipLunch
        ? 'Cutoff 08:30 AM (Cooks start at 08:30 AM)'
        : 'Lunch prep started at 08:30 AM. Skipping Lunch is closed.',
      dinnerCutoffNotice: canSkipDinner
        ? 'Cutoff 05:30 PM (Cooks start at 05:30 PM)'
        : 'Dinner prep started at 05:30 PM. Skipping Dinner is closed.',
      currentIstMinutes: currentMins
    };
  } catch {
    return {
      canSkipLunch: true,
      canSkipDinner: true,
      lunchCutoffNotice: 'Cutoff 08:30 AM',
      dinnerCutoffNotice: 'Cutoff 05:30 PM',
      currentIstMinutes: 0
    };
  }
}

export function toggleStudentMealSkip(
  studentId: string,
  studentName: string,
  mealType: 'lunch' | 'dinner'
): { success: boolean; message: string; record?: MealSkipRecord } {
  const today = getTodayString();
  const cutoffs = evaluateMealSkipCutoffs();

  if (mealType === 'lunch' && !cutoffs.canSkipLunch) {
    return {
      success: false,
      message: 'Lunch prep has already started! Meal skip cutoff is strictly 08:30 AM.'
    };
  }

  if (mealType === 'dinner' && !cutoffs.canSkipDinner) {
    return {
      success: false,
      message: 'Dinner prep has already started! Meal skip cutoff is strictly 05:30 PM.'
    };
  }

  const allSkips = loadMealSkips();
  const existingIndex = allSkips.findIndex(
    s => s.studentId === studentId && s.date === today && s.mealType === mealType && s.status === 'active'
  );

  if (existingIndex >= 0) {
    // Student is cancelling their skip (deciding to eat)
    allSkips[existingIndex].status = 'cancelled';
    saveMealSkips(allSkips);
    return {
      success: true,
      message: `Meal skip for ${mealType.toUpperCase()} cancelled. Your plate is restored!`,
      record: allSkips[existingIndex]
    };
  }

  // Monthly quota check: Max 3 skips per month
  const thisMonthPrefix = today.substring(0, 7); // YYYY-MM
  const studentMonthlySkips = allSkips.filter(
    s => s.studentId === studentId && s.date.startsWith(thisMonthPrefix) && s.status === 'active'
  );

  if (studentMonthlySkips.length >= 3) {
    return {
      success: false,
      message: 'Monthly limit reached (Max 3 auto-skips allowed per month). Please contact mess owner for extended leaves.'
    };
  }

  const newRecord: MealSkipRecord = {
    id: `SKIP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    studentId,
    studentName,
    date: today,
    mealType,
    status: 'active',
    createdAt: getCurrentTimeString(),
    creditApplied: true,
    creditAmount: 40 // ₹40 food value saved
  };

  allSkips.push(newRecord);
  saveMealSkips(allSkips);

  return {
    success: true,
    message: `Meal skip confirmed for ${mealType.toUpperCase()}! Kitchen ration saved. ₹40 auto-credit recorded.`,
    record: newRecord
  };
}

export function getTodayActiveSkipsCount(mealType?: 'lunch' | 'dinner'): number {
  const today = getTodayString();
  const allSkips = loadMealSkips();
  return allSkips.filter(
    s => s.date === today && s.status === 'active' && (!mealType || s.mealType === mealType)
  ).length;
}


// ----------------------------------------------------
// 3. ANTI-THEFT SCANNER & ATTENDANCE INTEGRITY ENGINE
// ----------------------------------------------------

export interface AttendanceAnomaly {
  id: string;
  type: 'double_dip' | 'expired_scan' | 'leave_breach' | 'scan_burst';
  severity: 'high' | 'medium' | 'low';
  studentId: string;
  studentName: string;
  date: string;
  mealType: string;
  timestamp: string;
  description: string;
  resolved: boolean;
}

export interface IntegrityAuditReport {
  healthScore: number; // e.g. 98%
  totalScansToday: number;
  anomalies: AttendanceAnomaly[];
  scansPerMinute: number;
  duplicateAttemptsCount: number;
  expiredScanAttemptsCount: number;
}

export function runAttendanceIntegrityAudit(
  mealLogs: MealLog[],
  customers: Customer[],
  leaves: LeaveRecord[]
): IntegrityAuditReport {
  const today = getTodayString();
  const todayLogs = mealLogs.filter(l => l.date === today);
  const anomalies: AttendanceAnomaly[] = [];

  // Group today's logs by student + mealType
  const studentMealMap = new Map<string, MealLog[]>();

  for (const log of todayLogs) {
    const key = `${log.customerId}_${log.mealType}`;
    const list = studentMealMap.get(key) || [];
    list.push(log);
    studentMealMap.set(key, list);
  }

  // 1. Detect Double Dipping (More than 1 scan for same meal shift within 45 mins)
  studentMealMap.forEach((logs, key) => {
    if (logs.length > 1) {
      const first = logs[0];
      const second = logs[1];
      anomalies.push({
        id: `ANOM-DBL-${first.id}`,
        type: 'double_dip',
        severity: 'high',
        studentId: first.customerId,
        studentName: first.customerName || 'Unknown Student',
        date: today,
        mealType: first.mealType,
        timestamp: second.time || first.time || getCurrentTimeString(),
        description: `Duplicate scan detected! ${first.customerName} scanned ${logs.length} times during ${first.mealType} shift (Time: ${first.time} and ${second.time}).`,
        resolved: false
      });
    }
  });

  // 2. Detect Expired Customer Scans
  for (const log of todayLogs) {
    const cust = customers.find(c => c.id === log.customerId);
    if (cust) {
      const daysLeft = calculateDaysRemaining(cust.endDate);
      if (daysLeft < 0) {
        anomalies.push({
          id: `ANOM-EXP-${log.id}`,
          type: 'expired_scan',
          severity: 'high',
          studentId: cust.id,
          studentName: cust.name,
          date: today,
          mealType: log.mealType,
          timestamp: log.time || getCurrentTimeString(),
          description: `Meal scanned with expired subscription! Plan expired on ${cust.endDate} (${Math.abs(daysLeft)} days overdue).`,
          resolved: false
        });
      }
    }
  }

  // 3. Detect Leave Breach (Dined while on approved leave)
  for (const log of todayLogs) {
    const activeLeave = leaves.find(
      lv => (lv.status === 'approved' || lv.approved) &&
            today >= lv.startDate &&
            today <= lv.endDate
    );
    if (activeLeave) {
      anomalies.push({
        id: `ANOM-LV-${log.id}`,
        type: 'leave_breach',
        severity: 'medium',
        studentId: log.customerId,
        studentName: log.customerName || 'Student',
        date: today,
        mealType: log.mealType,
        timestamp: log.time || getCurrentTimeString(),
        description: `Student dined at gate while an official approved leave was active (${activeLeave.startDate} to ${activeLeave.endDate}).`,
        resolved: false
      });
    }
  }

  const duplicates = anomalies.filter(a => a.type === 'double_dip').length;
  const expireds = anomalies.filter(a => a.type === 'expired_scan').length;

  const totalToday = todayLogs.length;
  const healthScore = totalToday === 0 ? 100 : Math.max(70, Math.round(100 - (anomalies.length * 5)));

  return {
    healthScore,
    totalScansToday: totalToday,
    anomalies,
    scansPerMinute: totalToday > 0 ? +(totalToday / 60).toFixed(1) : 0,
    duplicateAttemptsCount: duplicates,
    expiredScanAttemptsCount: expireds
  };
}


// ----------------------------------------------------
// 4. AUTOMATED MAHARAJ COOK SHEET & RATION AI PREDICTOR
// ----------------------------------------------------

export interface CookSheetIngredient {
  nameMarathi: string;
  nameEnglish: string;
  quantity: number;
  unit: 'KG' | 'Ltr' | 'Pcs' | 'Gm';
  portionPerHead: string;
  category: 'grain' | 'flour' | 'pulse' | 'vegetable' | 'oil' | 'spice';
  icon: string;
}

export interface MaharajCookSheet {
  date: string;
  mealType: 'lunch' | 'dinner';
  activeSubscribers: number;
  scannedCount: number;
  scannedBoys: number;
  scannedGirls: number;
  leavesToday: number;
  skipsToday: number;
  walkinBuffer: number;
  netDiners: number;
  boysCount: number;
  girlsCount: number;
  rotisBoys: number;
  rotisGirls: number;
  totalRotis: number;
  menuDish: string;
  ingredients: CookSheetIngredient[];
  whatsappShareText: string;
}

export function generateMaharajCookSheet(
  mealType: 'lunch' | 'dinner' = 'lunch',
  customers: Customer[] = [],
  leaves: LeaveRecord[] = [],
  customBuffer: number = 0,
  dishNameOverride?: string,
  messName: string = 'Morya Mess Pune',
  mealLogs: MealLog[] = []
): MaharajCookSheet {
  const today = getTodayString();

  // Filter actual scans/attendance recorded strictly for this meal today
  const todayShiftScans = mealLogs.filter(
    m => m.date === today && m.mealType === mealType && m.scanStatus === 'ALLOW'
  );

  let scannedBoys = 0;
  let scannedGirls = 0;

  todayShiftScans.forEach(log => {
    const cust = customers.find(c => c.id === log.customerId);
    const g = log.gender || cust?.gender || 'male';
    if (g === 'female') {
      scannedGirls++;
    } else {
      scannedBoys++;
    }
  });

  const scannedCount = todayShiftScans.length;

  // Active enrolled members for reference
  const activeMembers = customers.filter(
    c => c.status === 'active' && calculateDaysRemaining(c.endDate) >= 0
  );
  const activeSubs = activeMembers.length;

  // Leaves today
  const leavesTodayRecords = leaves.filter(
    l => l.status === 'approved' && today >= l.startDate && today <= l.endDate
  );
  const leavesToday = leavesTodayRecords.length;

  // Skips today
  const skipsToday = getTodayActiveSkipsCount(mealType);

  // Buffer distribution: 60% boys, 40% girls
  const boysBuffer = customBuffer > 0 ? Math.ceil(customBuffer * 0.6) : 0;
  const girlsBuffer = customBuffer > 0 ? Math.floor(customBuffer * 0.4) : 0;

  // Net baseline diners calculated strictly from actual scans + buffer
  const netBoys = scannedBoys + boysBuffer;
  const netGirls = scannedGirls + girlsBuffer;
  const netDiners = scannedCount + customBuffer;

  // ROTI CONSUMPTION FORMULA:
  // Boys eat 4 chapatis (high calorie student appetite)
  // Girls eat 3 chapatis (standard student appetite)
  const rotisBoys = netDiners > 0 ? netBoys * 4 : 0;
  const rotisGirls = netDiners > 0 ? netGirls * 3 : 0;
  const totalRotis = rotisBoys + rotisGirls;

  // Authenticated real standard Indian hostel thali measurements:
  // ~35g dry wheat flour per chapati
  const flourKg = netDiners > 0 ? +((totalRotis * 0.035).toFixed(1)) : 0;
  const riceKg = netDiners > 0 ? +((netDiners * 0.065).toFixed(1)) : 0;
  const dalKg = netDiners > 0 ? +((netDiners * 0.035).toFixed(1)) : 0;
  const veggieKg = netDiners > 0 ? +((netDiners * 0.150).toFixed(1)) : 0;
  const oilLtr = netDiners > 0 ? +((netDiners * 0.018).toFixed(1)) : 0;
  const spicesKg = netDiners > 0 ? +((netDiners * 0.012).toFixed(1)) : 0;

  // Determine dish name based on day if not overridden
  const dayIndex = new Date().getDay(); // 0 is Sun
  const defaultDishes = [
    'Paneer Masala & Gulab Jamun (Sunday Special)',
    'Shev Bhaji & Dal Rice (Monday)',
    'Chole Masala & Jeera Rice (Tuesday)',
    'Matki Usal & Tadka Dal (Wednesday)',
    'Aloo Gobi Masala & Sambar (Thursday)',
    'Soyabean Sukka & Dal Fry (Friday)',
    'Misal / Mix Veg Curry (Saturday)'
  ];
  const dish = dishNameOverride || defaultDishes[dayIndex] || 'Dal Tadka, Veggie, Chapati';

  const avgRotis = netDiners > 0 ? (totalRotis / netDiners).toFixed(1) : '0';

  const ingredients: CookSheetIngredient[] = [
    {
      nameMarathi: 'Wheat Flour (Atta)',
      nameEnglish: `Wheat Flour (${totalRotis} Rotis: Boys 4, Girls 3)`,
      quantity: flourKg,
      unit: 'KG',
      portionPerHead: `${avgRotis} Rotis Avg (Boys: 4, Girls: 3)`,
      category: 'flour',
      icon: '🌾'
    },
    {
      nameMarathi: 'Raw Rice (Kolam / Wada)',
      nameEnglish: 'Raw Rice (Kolam / Wada)',
      quantity: riceKg,
      unit: 'KG',
      portionPerHead: '65g Raw (~180g Cooked)',
      category: 'grain',
      icon: '🍚'
    },
    {
      nameMarathi: 'Toor / Moong Dal',
      nameEnglish: 'Toor / Moong Dal',
      quantity: dalKg,
      unit: 'KG',
      portionPerHead: '35g Raw (~180ml Dal)',
      category: 'pulse',
      icon: '🍲'
    },
    {
      nameMarathi: 'Raw Fresh Vegetables',
      nameEnglish: 'Raw Fresh Vegetables',
      quantity: veggieKg,
      unit: 'KG',
      portionPerHead: '150g Raw Cut Veggies',
      category: 'vegetable',
      icon: '🥔'
    },
    {
      nameMarathi: 'Refined Cooking Oil',
      nameEnglish: 'Refined Cooking Oil',
      quantity: oilLtr,
      unit: 'Ltr',
      portionPerHead: '18ml Per Student',
      category: 'oil',
      icon: '🛢️'
    },
    {
      nameMarathi: 'Spices, Salt, Garlic & Herbs',
      nameEnglish: 'Spices, Salt, Garlic & Herbs',
      quantity: spicesKg,
      unit: 'KG',
      portionPerHead: '12g Blend',
      category: 'spice',
      icon: '🧂'
    }
  ];

  const mealLabel = mealType === 'lunch' ? 'Lunch Shift' : 'Dinner Shift';

  const whatsappShareText = netDiners === 0 
    ? `🚩 *${messName} - Auto Cook Quantity Sheet (Live Scan Mode)*
📅 *Date:* ${today}
🕒 *Meal:* ${mealLabel}
🍲 *Today's Menu:* ${dish}

📊 *Current Live Scans:* *0 Diners Scanned*
⏳ *Status:* Counter scan records ke sath ingredients calculation live update hoga.`
    : `🚩 *${messName} - Auto Cook Quantity Sheet (Live Scan Mode)*
📅 *Date:* ${today}
🕒 *Meal:* ${mealLabel}
🍲 *Today's Menu:* ${dish}

👥 *Scanned Diners:* *${netDiners} Students* (Live Scans: ${scannedCount}${customBuffer > 0 ? ` + ${customBuffer} Buffer` : ''})
• 👦 Boys Scanned: *${scannedBoys}* (${rotisBoys} Rotis @ 4/student)
• 👧 Girls Scanned: *${scannedGirls}* (${rotisGirls} Rotis @ 3/student)
────────────────────
🥖 *Chapatis / Rotis Calculation (Boys: 4, Girls: 3):*
• 👦 Boys (${netBoys} × 4 rotis): *${rotisBoys} Rotis*
• 👧 Girls (${netGirls} × 3 rotis): *${rotisGirls} Rotis*
👉 *Total Rotis to Make:* *${totalRotis} Chapatis*
🌾 *Wheat Flour (Atta):* *${flourKg} KG*
────────────────────
📋 *Exact Cooking Ration Required:*
🌾 *Wheat Flour:* ${flourKg} KG (${totalRotis} rotis)
🍚 *Rice:* ${riceKg} KG
🍲 *Dal:* ${dalKg} KG
🥔 *Vegetables:* ${veggieKg} KG
🛢️ *Cooking Oil:* ${oilLtr} Ltr
🧂 *Spices & Salt:* ${spicesKg} KG
────────────────────
⚠️ *Head Cook Note:* Prepared strictly as per live scanned counter count.`;

  return {
    date: today,
    mealType,
    activeSubscribers: activeSubs,
    scannedCount,
    scannedBoys,
    scannedGirls,
    leavesToday,
    skipsToday,
    walkinBuffer: customBuffer,
    netDiners,
    boysCount: netBoys,
    girlsCount: netGirls,
    rotisBoys,
    rotisGirls,
    totalRotis,
    menuDish: dish,
    ingredients,
    whatsappShareText
  };
}
