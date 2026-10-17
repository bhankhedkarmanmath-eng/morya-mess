import {
  Customer,
  MealLog,
  Expense,
  Worker,
  CleaningInspection,
  TrialVisitor,
  BusinessRulesConfig,
  ScanEligibility,
  MealType,
  CustomerStatus,
  ScanAuditResult,
  AuditLog,
  PaymentRecord,
  RedFlagItem,
  MoneyReconciliation,
  InventoryItem,
  UserRole,
  Gender
} from '../types/mess';

const STORAGE_PREFIX = 'morya_v3_';

const STORAGE_KEYS = {
  CUSTOMERS: `${STORAGE_PREFIX}customers`,
  MEAL_LOGS: `${STORAGE_PREFIX}meal_logs`,
  EXPENSES: `${STORAGE_PREFIX}expenses`,
  WORKERS: `${STORAGE_PREFIX}workers`,
  CLEANING: `${STORAGE_PREFIX}cleaning`,
  TRIALS: `${STORAGE_PREFIX}trials`,
  PAYMENTS: `${STORAGE_PREFIX}payments`,
  AUDIT_LOGS: `${STORAGE_PREFIX}audit_logs`,
  RED_FLAGS: `${STORAGE_PREFIX}red_flags`,
  INVENTORY: `${STORAGE_PREFIX}inventory`,
  RECONCILIATION: `${STORAGE_PREFIX}reconciliation`,
  BUSINESS_RULES: `${STORAGE_PREFIX}business_rules`,
  CURRENT_USER_ROLE: `${STORAGE_PREFIX}current_user_role`
};

export function purgeAllDemoData(): void {
  try {
    // 1. Wipe all legacy v1 and v2 keys from earlier sessions
    const legacyKeys = [
      'morya_mess_customers',
      'morya_mess_meal_logs',
      'morya_mess_expenses',
      'morya_mess_workers',
      'morya_mess_cleaning',
      'morya_mess_trials',
      'morya_mess_payments',
      'morya_mess_audit_logs',
      'morya_mess_red_flags',
      'morya_mess_inventory',
      'morya_mess_reconciliation',
      'morya_mess_business_rules',
      'morya_mess_current_user_role',
      'morya_v2_customers',
      'morya_v2_meal_logs',
      'morya_v2_expenses'
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// Automatically run on load
purgeAllDemoData();

export const DEFAULT_BUSINESS_RULES: BusinessRulesConfig = {
  messName: 'Morya Mess',
  messSubtitle: 'Digital Operations & Tiffin Service Management',
  ganpatiImage: '',
  ownerName: 'Bhai & Management',
  contactPhone: '+91 98765 43210',
  address: 'Near Girls Hostel Complex, College Road',
  currency: '₹',
  upiId: 'moryamess@upi',
  upiPayeeName: 'Morya Mess Pune',
  upiQrCodeImage: '',
  messStatus: 'open',
  messClosureReason: '',
  durationMethod: 'calendar',
  defaultDurationDays: 30,
  allowAdvanceRenewal: true,
  defaultMonthlyFee: 2500,
  lostCardPenalty: 60,
  allowDuplicateMeal: false,
  duplicateOverrideAllowed: true,
  leaveExtendsSubscription: true,
  maxLeaveDaysPerMonth: 7,
  expiringSoonAlertDays: 3,
  shortTermThresholdDays: 3,
  requirePaymentBeforeMeal: false,
  mealTypes: [
    { type: 'lunch', name: 'Lunch Shift', startTime: '10:30', endTime: '14:30', enabled: true },
    { type: 'dinner', name: 'Dinner Shift', startTime: '19:30', endTime: '21:45', enabled: true }
  ]
};

// Standard Official Pricing Matrix (30 Days / 1 Month)
export const STANDARD_PRICING = {
  male: {
    both_meals: 3000,    // Boys — 2 meals per day: ₹3,000
    one_meal: 1600       // Boys — 1 meal per day: ₹1,600
  },
  female: {
    both_meals: 2500,    // Girls — 2 meals per day: ₹2,500
    one_meal: 1300       // Girls — 1 meal per day: ₹1,300
  }
} as const;

export function getStandardFee(
  gender: Gender, 
  plan: 'both_meals' | 'one_meal' | 'monthly_2meals' | 'monthly_1meal' | string
): number {
  const isFemale = gender === 'female';
  const planLower = (plan || '').toLowerCase();
  const isOneMeal = planLower === 'one_meal' || 
    planLower === 'monthly_1meal' || 
    planLower.includes('1meal') || 
    planLower.includes('lunch_only') || 
    planLower.includes('dinner_only') ||
    planLower === 'single';

  if (isFemale) {
    return isOneMeal ? STANDARD_PRICING.female.one_meal : STANDARD_PRICING.female.both_meals;
  }
  return isOneMeal ? STANDARD_PRICING.male.one_meal : STANDARD_PRICING.male.both_meals;
}

export interface MessShiftAudit {
  isShiftActive: boolean;
  mealType: MealType;
  shiftTitle: string;
  shiftTimingLabel: string;
  reason: string;
  isSundayNightClosed: boolean;
  minutesRemainingInShift?: number;
  isLast15MinutesCall?: boolean;
  nextShiftLabel?: string;
}

// Strict Mess Timings Engine matching Supabase Morya Mess settings:
// Lunch: 10:30 AM to 03:00 PM (Daily, including Sunday)
// Dinner: 08:00 PM to 11:00 PM (Mon-Sat, Sunday Night Strictly Closed)
export function evaluateStrictMessShift(now: Date = new Date()): MessShiftAudit {
  let day = now.getDay(); // 0 = Sunday
  let hours = now.getHours();
  let minutes = now.getMinutes();

  try {
    const formatterStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(formatterStr);
    if (!isNaN(istDate.getTime())) {
      day = istDate.getDay();
      hours = istDate.getHours();
      minutes = istDate.getMinutes();
    }
  } catch (e) {
    console.error('Error shifting time to IST:', e);
  }

  const isSunday = day === 0;
  const currentMinutes = hours * 60 + minutes;

  // 10:30 AM (630) to 02:30 PM (870)
  const lunchStart = 10 * 60 + 30;      // 630
  const lunchEnd = 14 * 60 + 30;        // 870

  // 07:30 PM (1170) to 09:45 PM (1305)
  const dinnerStart = 19 * 60 + 30;     // 1170
  const dinnerEnd = 21 * 60 + 45;       // 1305

  // 1. Lunch Shift Window (Active Mon-Sun)
  if (currentMinutes >= lunchStart && currentMinutes <= lunchEnd) {
    const minsLeft = lunchEnd - currentMinutes;
    const isLast15 = minsLeft <= 15 && minsLeft > 0;
    return {
      isShiftActive: true,
      mealType: 'lunch',
      shiftTitle: isLast15 ? '⚠️ Lunch Shift Last Call (15m Left)' : 'Lunch Shift Active',
      shiftTimingLabel: '10:30 AM – 02:30 PM',
      reason: isLast15 ? 'Last 15 minutes call! Final batch of rotis before 02:30 PM closing.' : 'Gate is open for Lunch scan.',
      isSundayNightClosed: false,
      minutesRemainingInShift: minsLeft,
      isLast15MinutesCall: isLast15,
      nextShiftLabel: isSunday ? 'Monday Lunch 10:30 AM' : 'Dinner Shift 07:30 PM'
    };
  }

  // 2. Dinner Shift Window (07:30 PM - 09:45 PM)
  if (currentMinutes >= dinnerStart && currentMinutes <= dinnerEnd) {
    if (isSunday) {
      return {
        isShiftActive: false,
        mealType: 'dinner',
        shiftTitle: 'Sunday Night Mess Closed',
        shiftTimingLabel: 'Sunday Dinner: CLOSED',
        reason: 'Sunday Night Mess is strictly closed. No dinner scans permitted.',
        isSundayNightClosed: true,
        minutesRemainingInShift: 0,
        isLast15MinutesCall: false,
        nextShiftLabel: 'Monday Lunch 10:30 AM'
      };
    }
    const minsLeft = dinnerEnd - currentMinutes;
    const isLast15 = minsLeft <= 15 && minsLeft > 0;
    return {
      isShiftActive: true,
      mealType: 'dinner',
      shiftTitle: isLast15 ? '⚠️ Dinner Shift Last Call (15m Left)' : 'Dinner Shift Active',
      shiftTimingLabel: '07:30 PM – 09:45 PM',
      reason: isLast15 ? 'Last 15 minutes call! Final service before 09:45 PM closing.' : 'Gate is open for Dinner scan.',
      isSundayNightClosed: false,
      minutesRemainingInShift: minsLeft,
      isLast15MinutesCall: isLast15,
      nextShiftLabel: 'Tomorrow Lunch 10:30 AM'
    };
  }

  // 3. Outside Active Shift Windows
  if (currentMinutes < lunchStart) {
    return {
      isShiftActive: false,
      mealType: 'lunch',
      shiftTitle: 'Mess Closed (Opens at 10:30 AM)',
      shiftTimingLabel: 'Lunch Shift: 10:30 AM – 02:30 PM',
      reason: 'Lunch shift starts at 10:30 AM. Shift timing strictly enforced.',
      isSundayNightClosed: false,
      minutesRemainingInShift: 0,
      isLast15MinutesCall: false,
      nextShiftLabel: 'Today Lunch 10:30 AM'
    };
  } else if (currentMinutes > lunchEnd && currentMinutes < dinnerStart) {
    if (isSunday) {
      return {
        isShiftActive: false,
        mealType: 'lunch',
        shiftTitle: 'Sunday Lunch Ended (Night Closed)',
        shiftTimingLabel: 'Sunday Dinner: CLOSED',
        reason: 'Sunday lunch ended at 02:30 PM. Mess is closed on Sunday dinner. Next meal on Monday 10:30 AM.',
        isSundayNightClosed: true,
        minutesRemainingInShift: 0,
        isLast15MinutesCall: false,
        nextShiftLabel: 'Monday Lunch 10:30 AM'
      };
    }
    return {
      isShiftActive: false,
      mealType: 'dinner',
      shiftTitle: 'Mess Closed (Afternoon Gap)',
      shiftTimingLabel: 'Next Shift: Dinner 07:30 PM – 09:45 PM',
      reason: 'Lunch ended at 02:30 PM. Dinner shift begins at 07:30 PM. Timing strictly enforced.',
      isSundayNightClosed: false,
      minutesRemainingInShift: 0,
      isLast15MinutesCall: false,
      nextShiftLabel: 'Dinner Shift 07:30 PM'
    };
  } else {
    // Past 09:45 PM
    return {
      isShiftActive: false,
      mealType: 'dinner',
      shiftTitle: 'Mess Closed for the Night',
      shiftTimingLabel: 'Next Shift: Tomorrow Lunch 10:30 AM',
      reason: 'Dinner closed at 09:45 PM. Gate closed. No more meal scans permitted tonight.',
      isSundayNightClosed: false,
      minutesRemainingInShift: 0,
      isLast15MinutesCall: false,
      nextShiftLabel: 'Tomorrow Lunch 10:30 AM'
    };
  }
}

// Safe date helpers
export function getTodayString(): string {
  try {
    const formatterStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(formatterStr);
    if (!isNaN(istDate.getTime())) {
      const year = istDate.getFullYear();
      const month = String(istDate.getMonth() + 1).padStart(2, '0');
      const day = String(istDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Error shifting today string to IST:', e);
  }
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

export function calculateDaysRemaining(endDateStr: string): number {
  if (!endDateStr) return 0;
  const today = new Date(getTodayString()).getTime();
  const end = new Date(endDateStr).getTime();
  const diffTime = end - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function computeCustomerStatus(customer: Partial<Customer>, rules: BusinessRulesConfig = DEFAULT_BUSINESS_RULES): CustomerStatus {
  if (!customer.endDate) return 'active';
  const todayStr = getTodayString();
  
  // Check if currently on approved leave
  if (customer.leaves && customer.leaves.some(l => l.approved && todayStr >= l.startDate && todayStr <= l.endDate)) {
    return 'on_leave';
  }

  const days = calculateDaysRemaining(customer.endDate);
  if (days < 0) {
    return 'expired';
  } else if (days <= (rules.expiringSoonAlertDays || 3)) {
    return 'expiring_soon';
  }
  return 'active';
}

export function getCurrentMealType(): MealType {
  const audit = evaluateStrictMessShift();
  return audit.mealType;
}

// Generate secure random QR token
export function generateQrToken(): string {
  return 'QRT-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
}

// Generic LocalStorage helper functions
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
    return defaultValue;
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

const DELETED_CUSTOMERS_KEY = `${STORAGE_PREFIX}deleted_customer_ids`;

export function loadDeletedCustomerIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CUSTOMERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set<string>(arr);
      }
    }
  } catch {
    // ignore
  }
  return new Set<string>();
}

export function saveDeletedCustomerId(id: string): void {
  if (!id) return;
  try {
    const set = loadDeletedCustomerIds();
    set.add(id);
    localStorage.setItem(DELETED_CUSTOMERS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function removeDeletedCustomerId(id: string): void {
  if (!id) return;
  try {
    const set = loadDeletedCustomerIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(DELETED_CUSTOMERS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {
    // ignore
  }
}

export function saveDeletedCustomerIds(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  try {
    const set = loadDeletedCustomerIds();
    ids.forEach(id => {
      if (id) set.add(id);
    });
    localStorage.setItem(DELETED_CUSTOMERS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

// Convenience typed storage accessors
export function loadCustomers(): Customer[] {
  const list = loadFromStorage<Customer[]>('customers', []);
  const deletedIds = loadDeletedCustomerIds();
  if (deletedIds.size === 0) return list;
  return list.filter(c => !deletedIds.has(c.id));
}

export function saveCustomers(customers: Customer[]): void {
  saveToStorage('customers', customers);
}

export function loadMealLogs(): MealLog[] {
  return loadFromStorage<MealLog[]>('meal_logs', []);
}

export function saveMealLogs(logs: MealLog[]): void {
  saveToStorage('meal_logs', logs);
}

export function loadExpenses(): Expense[] {
  return loadFromStorage<Expense[]>('expenses', []);
}

export function saveExpenses(expenses: Expense[]): void {
  saveToStorage('expenses', expenses);
}

export function loadWorkers(): Worker[] {
  return loadFromStorage<Worker[]>('workers', []);
}

export function saveWorkers(workers: Worker[]): void {
  saveToStorage('workers', workers);
}

export function loadCleanings(): CleaningInspection[] {
  return loadFromStorage<CleaningInspection[]>('cleaning', []);
}

export function saveCleanings(cleanings: CleaningInspection[]): void {
  saveToStorage('cleaning', cleanings);
}

export function loadRules(): BusinessRulesConfig {
  return getStoredBusinessRules();
}

export function saveRules(rules: BusinessRulesConfig): void {
  saveBusinessRules(rules);
}

export function loadTrials(): TrialVisitor[] {
  return loadFromStorage<TrialVisitor[]>('trials', []);
}

export function saveTrials(trials: TrialVisitor[]): void {
  saveToStorage('trials', trials);
}

// Business Rules Storage
export function getStoredBusinessRules(): BusinessRulesConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUSINESS_RULES);
    const parsed = raw ? { ...DEFAULT_BUSINESS_RULES, ...JSON.parse(raw) } : DEFAULT_BUSINESS_RULES;
    if (parsed.upiPayeeName && parsed.upiPayeeName.toLowerCase().includes('latur')) {
      parsed.upiPayeeName = 'Morya Mess Pune';
    }
    if (parsed.address && parsed.address.toLowerCase().includes('latur')) {
      parsed.address = parsed.address.replace(/latur/gi, 'Pune');
    }
    return parsed;
  } catch {
    return DEFAULT_BUSINESS_RULES;
  }
}

export function saveBusinessRules(rules: BusinessRulesConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BUSINESS_RULES, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save business rules:', e);
  }
}

// Audit logger
export function createAuditRecord(
  module: AuditLog['module'],
  action: string,
  details: string,
  performedBy: string = 'Owner',
  role: UserRole = 'owner',
  targetName?: string,
  recordId?: string,
  severity: AuditLog['severity'] = 'info'
): AuditLog {
  const record: AuditLog = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    date: getTodayString(),
    time: getCurrentTimeString(),
    module,
    action,
    details,
    performedBy,
    role,
    targetName,
    recordId,
    severity
  };
  try {
    const existing: AuditLog[] = loadFromStorage<AuditLog[]>('audit_logs', []);
    saveToStorage('audit_logs', [record, ...existing]);
  } catch (e) {
    console.error('Failed to log audit event:', e);
  }
  return record;
}

// Audit scanning function: validates QR against authoritative database
export function auditCustomerMealScan(
  customerIdOrPayload: string,
  mealType: MealType = getCurrentMealType(),
  customers: Customer[] = [],
  mealLogs: MealLog[] = [],
  rules: BusinessRulesConfig = DEFAULT_BUSINESS_RULES
): ScanAuditResult {
  const todayStr = getTodayString();
  
  // Extract ID & Token from payload
  let targetId = customerIdOrPayload.trim();
  let submittedToken: string | null = null;
  let submittedVersion: number | null = null;

  if (targetId.startsWith('{')) {
    try {
      const parsed = JSON.parse(targetId);
      if (parsed.id || parsed.cid) targetId = parsed.id || parsed.cid;
      if (parsed.token) submittedToken = parsed.token;
      if (parsed.v) submittedVersion = Number(parsed.v);
    } catch {
      // Not valid JSON, continue with raw string
    }
  } else if (targetId.includes(':')) {
    const parts = targetId.split(':');
    targetId = parts[parts.length - 1];
  }

  // 1. Customer Exists?
  const customer = customers.find(c => c.id.toLowerCase() === targetId.toLowerCase() || (c.phone && c.phone === targetId));
  if (!customer) {
    return {
      eligibility: 'BLOCK',
      reason: `Customer "${targetId}" not found in database. Unregistered QR or unverified card.`,
      alreadyAteToday: false,
      daysRemaining: -999,
      unpaidPenalty: 0,
      hasUnpaidBalance: false,
      mealType
    };
  }

  // 2. Check Mess Status (Holiday / Closed)
  if (rules.messStatus === 'closed' || rules.messStatus === 'holiday') {
    return {
      eligibility: 'BLOCK',
      customer,
      reason: `Mess is currently CLOSED (${rules.messClosureReason || 'Scheduled Mess Holiday'}). No meal service allowed.`,
      alreadyAteToday: false,
      daysRemaining: calculateDaysRemaining(customer.endDate),
      unpaidPenalty: 0,
      hasUnpaidBalance: customer.balance > 0,
      mealType
    };
  }

  // 2.5 STRICT MESS SHIFT TIMING CHECK (Lunch: 10:30 AM - 3:00 PM, Dinner: 8:00 PM - 11:00 PM, Sunday night closed)
  const shiftAudit = evaluateStrictMessShift();
  if (!shiftAudit.isShiftActive) {
    return {
      eligibility: 'BLOCK',
      customer,
      reason: `MESS CLOSED / OUTSIDE TIMING: ${shiftAudit.reason} [Strict Hours: Lunch 10:30 AM – 3:00 PM | Dinner 8:00 PM – 11:00 PM. Sunday Night Closed].`,
      alreadyAteToday: false,
      daysRemaining: calculateDaysRemaining(customer.endDate),
      unpaidPenalty: 0,
      hasUnpaidBalance: customer.balance > 0,
      mealType: shiftAudit.mealType
    };
  }

  // Enforce shift meal type match
  const activeShiftMealType = shiftAudit.mealType;

  // 3. QR Status / Token Validation
  if (customer.qrStatus && customer.qrStatus !== 'active') {
    return {
      eligibility: 'BLOCK',
      customer,
      reason: `QR code status is "${customer.qrStatus.toUpperCase()}". It was replaced or revoked. Please use the newly issued QR code.`,
      alreadyAteToday: false,
      daysRemaining: calculateDaysRemaining(customer.endDate),
      unpaidPenalty: 0,
      hasUnpaidBalance: customer.balance > 0,
      mealType
    };
  }

  if (submittedToken && customer.qrToken && submittedToken !== customer.qrToken) {
    return {
      eligibility: 'BLOCK',
      customer,
      reason: `Invalid or outdated QR security token. This QR has been re-generated.`,
      alreadyAteToday: false,
      daysRemaining: calculateDaysRemaining(customer.endDate),
      unpaidPenalty: 0,
      hasUnpaidBalance: customer.balance > 0,
      mealType
    };
  }

  const daysRemaining = calculateDaysRemaining(customer.endDate);
  const unpaidPenalty = customer.penalties
    ?.filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0) || (customer.penaltyPaid ? 0 : customer.penaltyAmount || 0);
  const hasUnpaidBalance = customer.balance > 0;

  // 4. Duplicate Meal Check
  const existingMeal = mealLogs.find(
    log => log.customerId === customer.id && log.date === todayStr && log.mealType === mealType && log.scanStatus === 'ALLOW'
  );

  if (existingMeal && !rules.allowDuplicateMeal) {
    const timeStr = new Date(existingMeal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      eligibility: 'BLOCK',
      customer,
      reason: `MEAL ALREADY RECORDED. ${mealType.toUpperCase()} already marked today at ${timeStr}. Duplicate meal blocked!`,
      alreadyAteToday: true,
      daysRemaining,
      unpaidPenalty,
      hasUnpaidBalance,
      mealType
    };
  }

  // 4.5 1-Time Meal Pass Strict Shift & Integrity Check (Male ₹1600 / Female ₹1300)
  const planLower = (customer.planType || '').toLowerCase();
  const prefLower = (customer.mealPreference || '').toLowerCase();

  const isLunchOnly = prefLower === 'lunch_only' || 
    planLower === 'monthly_lunch_only' || 
    planLower === 'lunch_only' || 
    (planLower.includes('lunch') && !planLower.includes('dinner') && !planLower.includes('2meal'));

  const isDinnerOnly = prefLower === 'dinner_only' || 
    planLower === 'monthly_dinner_only' || 
    planLower === 'dinner_only' || 
    (planLower.includes('dinner') && !planLower.includes('lunch') && !planLower.includes('2meal'));

  const isOneMealPlan = isLunchOnly || isDinnerOnly || planLower === 'monthly_1meal' || planLower === 'one_meal' || prefLower === 'single';

  if (isOneMealPlan) {
    // 4.5.1 STRICT SHIFT RESTRICTION: Lunch-Only cannot scan for Dinner
    if (isLunchOnly && mealType === 'dinner') {
      return {
        eligibility: 'BLOCK',
        customer,
        reason: `⚠️ STRICT SHIFT RESTRICTION (फक्त दुपारचा पास): Student has a 1-Time LUNCH-ONLY Pass. DINNER scan is strictly prohibited under this subscription!`,
        alreadyAteToday: false,
        daysRemaining,
        unpaidPenalty,
        hasUnpaidBalance,
        mealType
      };
    }

    // 4.5.2 STRICT SHIFT RESTRICTION: Dinner-Only cannot scan for Lunch
    if (isDinnerOnly && mealType === 'lunch') {
      return {
        eligibility: 'BLOCK',
        customer,
        reason: `⚠️ STRICT SHIFT RESTRICTION (फक्त रात्रीचा पास): Student has a 1-Time DINNER-ONLY Pass. LUNCH scan is strictly prohibited under this subscription!`,
        alreadyAteToday: false,
        daysRemaining,
        unpaidPenalty,
        hasUnpaidBalance,
        mealType
      };
    }

    // 4.5.3 1-Time Daily Consumption Limit Check (Prevent second meal of any kind)
    const anyMealToday = mealLogs.find(
      log => log.customerId === customer.id && log.date === todayStr && log.scanStatus === 'ALLOW'
    );
    if (anyMealToday) {
      const recordedTime = new Date(anyMealToday.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        eligibility: 'BLOCK',
        customer,
        reason: `1-TIME PASS LIMIT: Member is enrolled in 1-Time Daily Pass (₹${customer.gender === 'female' ? 1300 : 1600}/month). Already consumed ${anyMealToday.mealType.toUpperCase()} today at ${recordedTime}. Second meal blocked!`,
        alreadyAteToday: true,
        daysRemaining,
        unpaidPenalty,
        hasUnpaidBalance,
        mealType
      };
    }
  }

  // 5. Customer On Leave Check
  if (customer.status === 'on_leave' || (customer.leaves && customer.leaves.some(l => l.approved && todayStr >= l.startDate && todayStr <= l.endDate))) {
    return {
      eligibility: 'BLOCK',
      customer,
      reason: `Customer is on approved leave today (${todayStr}). Meal service paused.`,
      alreadyAteToday: false,
      daysRemaining,
      unpaidPenalty,
      hasUnpaidBalance,
      mealType
    };
  }

  // 6. Subscription Expiry Check (Authority is database, NOT card)
  if (daysRemaining < 0) {
    return {
      eligibility: 'BLOCK',
      customer,
      reason: `SUBSCRIPTION EXPIRED on ${customer.endDate} (${Math.abs(daysRemaining)} days ago). Please renew subscription.`,
      alreadyAteToday: false,
      daysRemaining,
      unpaidPenalty,
      hasUnpaidBalance,
      mealType
    };
  }

  // 7. Payment Restriction Check (if rule is enabled)
  if (rules.requirePaymentBeforeMeal && customer.balance > 0) {
    return {
      eligibility: 'REVIEW_REQUIRED',
      customer,
      reason: `Pending fee balance of ₹${customer.balance}. Payment required before meal marking per business rules.`,
      alreadyAteToday: false,
      daysRemaining,
      unpaidPenalty,
      hasUnpaidBalance,
      mealType
    };
  }

  // 8. Unpaid Penalty Warning
  if (unpaidPenalty > 0) {
    return {
      eligibility: 'REVIEW_REQUIRED',
      customer,
      reason: `Pending card penalty of ₹${unpaidPenalty} (${customer.penaltyReason || 'Lost card replacement'}). Kindly collect fee.`,
      alreadyAteToday: false,
      daysRemaining,
      unpaidPenalty,
      hasUnpaidBalance,
      mealType
    };
  }

  // 9. Expiring Soon Warning
  if (daysRemaining <= (rules.expiringSoonAlertDays || 3)) {
    return {
      eligibility: 'ALLOW',
      customer,
      reason: `VERIFIED ALLOWED. Note: Subscription expires in ${daysRemaining === 0 ? 'TODAY' : `${daysRemaining} days`} (${customer.endDate}).`,
      alreadyAteToday: false,
      daysRemaining,
      unpaidPenalty,
      hasUnpaidBalance,
      mealType
    };
  }

  // All checks passed
  return {
    eligibility: 'ALLOW',
    customer,
    reason: `VERIFIED ALLOWED. Active valid pass until ${customer.endDate}.`,
    alreadyAteToday: false,
    daysRemaining,
    unpaidPenalty,
    hasUnpaidBalance,
    mealType
  };
}

// Reset/Clear All Storage (Completely clean slate)
export function clearAllStorageData(): void {
  // Wipe all v3 keys
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  // Wipe any legacy keys
  const legacyKeys = [
    'morya_mess_customers',
    'morya_mess_meal_logs',
    'morya_mess_expenses',
    'morya_mess_workers',
    'morya_mess_cleaning',
    'morya_mess_trials',
    'morya_mess_payments',
    'morya_mess_audit_logs',
    'morya_mess_red_flags',
    'morya_mess_inventory',
    'morya_mess_reconciliation',
    'morya_mess_business_rules',
    'morya_mess_current_user_role'
  ];
  legacyKeys.forEach(k => localStorage.removeItem(k));
}

// Full Export / Portability
export function exportFullDataJson(): string {
  const payload = {
    customers: loadFromStorage<Customer[]>('customers', []),
    mealLogs: loadFromStorage<MealLog[]>('mealLogs', []),
    expenses: loadFromStorage<Expense[]>('expenses', []),
    workers: loadFromStorage<Worker[]>('workers', []),
    cleaning: loadFromStorage<CleaningInspection[]>('cleanings', []),
    trials: loadFromStorage<TrialVisitor[]>('trials', []),
    payments: loadFromStorage<PaymentRecord[]>('payments', []),
    auditLogs: loadFromStorage<AuditLog[]>('audit_logs', []),
    redFlags: loadFromStorage<RedFlagItem[]>('red_flags', []),
    inventory: loadFromStorage<InventoryItem[]>('inventory', []),
    businessRules: getStoredBusinessRules(),
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(payload, null, 2);
}

// Export CSV for customers
export function exportCustomersCsv(customers: Customer[]): string {
  const headers = ['Customer ID', 'Name', 'Phone', 'Gender', 'Hostel/Address', 'College/Work', 'Plan', 'Start Date', 'End Date', 'Status', 'Total Fee', 'Paid', 'Balance'];
  const rows = customers.map(c => [
    c.id,
    `"${c.name.replace(/"/g, '""')}"`,
    c.phone,
    c.gender,
    `"${(c.hostelOrAddress || '').replace(/"/g, '""')}"`,
    `"${(c.collegeOrWork || '').replace(/"/g, '""')}"`,
    c.planType,
    c.startDate,
    c.endDate,
    c.status,
    c.totalAmount,
    c.paidAmount,
    c.balance
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// ----------------------------------------------------
// STRICT MONTHLY LEAVE LIMIT CONFIGURATION (MAX 5 DAYS)
// ----------------------------------------------------
export const MAX_MONTHLY_LEAVE_DAYS = 5;

/**
 * Calculates how many days of leave a student has already consumed/requested
 * in a given calendar month ('YYYY-MM').
 * Only counts approved and pending leaves (rejected leaves are excluded).
 */
export function calculateMonthLeaveDaysUsed(
  leaves: Array<{ startDate: string; endDate: string; status?: string; approved?: boolean }>,
  targetMonthStr: string // e.g. '2026-10'
): number {
  if (!Array.isArray(leaves) || leaves.length === 0 || !targetMonthStr) return 0;
  
  let count = 0;
  for (const l of leaves) {
    if (l.status === 'rejected') continue;
    if (!l.startDate || !l.endDate) continue;

    const s = new Date(l.startDate + 'T00:00:00');
    const e = new Date(l.endDate + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) continue;

    const cur = new Date(s);
    while (cur <= e) {
      const curMonth = cur.toISOString().split('T')[0].substring(0, 7);
      if (curMonth === targetMonthStr) {
        count += 1;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return count;
}

/**
 * Calculates how many days of a proposed leave range fall into a specific calendar month.
 */
export function calculateDaysInRangeForMonth(
  startDateStr: string,
  endDateStr: string,
  targetMonthStr: string
): number {
  if (!startDateStr || !endDateStr || !targetMonthStr) return 0;
  const s = new Date(startDateStr + 'T00:00:00');
  const e = new Date(endDateStr + 'T00:00:00');
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0;

  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const curMonth = cur.toISOString().split('T')[0].substring(0, 7);
    if (curMonth === targetMonthStr) {
      count += 1;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

