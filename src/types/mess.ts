export type Gender = 'female' | 'male' | 'other';
export type UserRole = 'owner' | 'manager' | 'staff';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  mustChangePassword?: boolean;
}

export type CustomerStatus = 
  | 'active' 
  | 'expiring_soon' 
  | 'expired' 
  | 'on_leave' 
  | 'blocked' 
  | 'inactive'
  | 'not_renewed';

export type QrStatus = 'active' | 'revoked' | 'replaced' | 'expired' | 'invalid';

export interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  mealTypes: MealType[];
  active: boolean;
  notes?: string;
}

export interface SubscriptionRecord {
  id: string; // e.g. "SUB-2026-001"
  customerId: string;
  planId: string;
  planName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  price: number;
  amountPaid: number;
  pendingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'pending';
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export interface RenewalRecord {
  id: string;
  oldSubscriptionId?: string;
  oldEndDate?: string;
  newStartDate: string;
  newEndDate: string;
  planName: string;
  amount: number;
  paidAmount: number;
  date: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'other';
  renewedBy: string;
  notes?: string;
}

export interface LeaveRecord {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  approved: boolean;
  approvedBy?: string;
  createdAt: string;
  autoExtendApplied?: boolean;
}

export interface PenaltyRecord {
  id: string;
  amount: number;
  reason: string;
  date: string;
  status: 'pending' | 'paid';
  recordedBy?: string;
  paidDate?: string;
}

export interface Customer {
  id: string; // e.g. "MM-2026-001"
  name: string;
  phone: string;
  gender: Gender;
  hostelOrAddress?: string;
  collegeOrWork?: string;
  planType: string;
  mealPreference?: MealPreference;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: CustomerStatus;
  photoUrl?: string;
  
  // QR & Security
  qrToken?: string;
  qrVersion?: number;
  qrStatus?: QrStatus;
  qrCreatedAt?: string;

  // First-time auth & status
  mustChangePassword?: boolean;
  approvalStatus?: 'approved' | 'pending' | 'rejected' | 'suspended';

  // Penalties & History
  penaltyAmount?: number;
  penaltyReason?: string;
  penaltyPaid?: boolean;
  penalties?: PenaltyRecord[];
  renewals?: RenewalRecord[];
  payments?: any[];
  leaves?: LeaveRecord[];
  notes?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  avatarSeed?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'custom';
export type MealPreference = 'lunch_dinner' | 'lunch_only' | 'dinner_only' | 'breakfast_lunch_dinner' | 'custom';

export type ScanEligibility = 'ALLOW' | 'BLOCK' | 'REVIEW_REQUIRED';

export interface ScanAuditResult {
  eligibility: ScanEligibility;
  customer?: Customer;
  reason: string;
  alreadyAteToday: boolean;
  daysRemaining: number;
  unpaidPenalty: number;
  hasUnpaidBalance: boolean;
  mealType: MealType;
}

export interface MealLog {
  id: string;
  customerId: string;
  customerName: string;
  gender?: Gender;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  scanStatus: ScanEligibility;
  reason: string;
  staffName?: string;
  verifiedBy?: string;
  overridden?: boolean;
  overrideReason?: string;
  overrideNotes?: string;
}

export type ExpenseCategory = 
  | 'ration_saman' 
  | 'vegetables' 
  | 'gas_cylinder' 
  | 'rent' 
  | 'electricity' 
  | 'water_tanker' 
  | 'cleaning_supplies' 
  | 'worker_salary' 
  | 'repairs_maintenance' 
  | 'other';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  paidTo: string;
  paymentMode: 'cash' | 'upi' | 'bank_transfer' | 'other';
  billNumber?: string;
  notes?: string;
  recordedBy?: string;
}

export type WorkerRole = 
  | 'Head Cook' 
  | 'Assistant Cook' 
  | 'Roti Maker' 
  | 'Cleaner & Dishwasher' 
  | 'Helper & Delivery'
  | 'head_cook'
  | 'helper_cook'
  | 'chapati_maker'
  | 'cleaning_dishwashing'
  | 'server';

export interface WorkerSalaryPayment {
  id: string;
  amount: number;
  date: string;
  type: 'salary' | 'advance';
  paymentMode?: 'cash' | 'upi' | 'bank_transfer';
  notes?: string;
  recordedBy?: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  role: WorkerRole;
  monthlySalary: number;
  joiningDate: string;
  lastSalaryPaidDate?: string;
  nextSalaryDueDate?: string;
  advancePaid?: number;
  advanceTaken?: number;
  status?: 'active' | 'inactive';
  attendance: Record<string, 'present' | 'absent' | 'half_day' | 'leave'>;
  salaryPayments?: WorkerSalaryPayment[];
}

export interface CleaningInspection {
  id: string;
  date?: string; // YYYY-MM-DD
  session?: 'morning' | 'afternoon_post_lunch' | 'night_post_dinner';
  area: string;
  status?: 'completed' | 'pending' | 'needs_attention';
  inspectedBy?: string;
  inspectorName?: string;
  isSanitized?: boolean;
  rating?: number;
  notes: string;
  timestamp: string;
}

export interface TrialVisitor {
  id: string;
  name: string;
  phone: string;
  gender: Gender;
  college: string;
  visitType: '1_day_trial' | '2_day_trial' | 'custom';
  date: string;
  amountPaid: number;
  convertedToMonthly: boolean;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'other';
  transactionReference?: string;
  subscriptionId?: string;
  status: 'paid' | 'partial' | 'pending' | 'unverified' | 'void';
  recordedBy: string;
  timestamp: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  date: string;
  time: string;
  module: 'customer' | 'subscription' | 'payment' | 'meal' | 'qr' | 'leave' | 'worker' | 'expense' | 'inventory' | 'cleaning' | 'rules' | 'closing';
  action: string;
  recordId?: string;
  targetName?: string;
  performedBy: string;
  role: UserRole;
  details: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface RedFlagItem {
  id: string;
  date: string;
  time: string;
  module: string;
  relatedId?: string;
  targetName?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface MoneyReconciliation {
  date: string;
  cashRecorded: number;
  cashActual: number;
  upiRecorded: number;
  upiActual: number;
  bankRecorded: number;
  bankActual: number;
  notes?: string;
  status: 'draft' | 'closed' | 'reopened';
  closedBy?: string;
  closedAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'ration' | 'vegetable' | 'gas' | 'dairy' | 'oil_masala' | 'cleaning' | 'other';
  currentQuantity: number;
  unit: 'kg' | 'liter' | 'bag' | 'cylinder' | 'units';
  minimumStock: number;
  lastPurchaseDate?: string;
  lastCost?: number;
}

export interface BusinessRulesConfig {
  messName: string;
  messSubtitle: string;
  ganpatiImage: string;
  ownerName: string;
  contactPhone: string;
  address: string;
  currency: string;
  // Business status
  messStatus: 'open' | 'closed' | 'holiday';
  messClosureReason: string;
  // Rates
  femaleFullRate?: number;
  maleFullRate?: number;
  oneMealRate?: number;
  trial1DayFee?: number;
  lostCardFee?: number;
  // Toggles
  sundayDinnerClosed?: boolean;
  enforceStrictMealTimings?: boolean;
  preventDoubleMealSameShift?: boolean;
  // Subscription rules
  durationMethod: 'calendar' | 'fixed_days';
  defaultDurationDays: number;
  allowAdvanceRenewal: boolean;
  defaultMonthlyFee: number;
  // Card & QR rules
  lostCardPenalty: number;
  allowDuplicateMeal: boolean;
  duplicateOverrideAllowed: boolean;
  // Leave & Expiry rules
  leaveExtendsSubscription: boolean;
  maxLeaveDaysPerMonth: number;
  expiringSoonAlertDays: number;
  shortTermThresholdDays: number;
  requirePaymentBeforeMeal: boolean;
  // Meal types configured
  mealTypes: {
    type: MealType;
    name: string;
    startTime: string;
    endTime: string;
    enabled: boolean;
  }[];
}

export interface MessShiftAudit {
  isShiftActive: boolean;
  mealType: MealType;
  shiftTitle: string;
  shiftTimingLabel: string;
  reason: string;
  isSundayNightClosed: boolean;
}
