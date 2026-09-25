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
  | 'not_renewed'
  | 'suspended';

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
  status?: 'pending' | 'approved' | 'rejected';
  requestedAt?: string;
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
  college?: string;
  hostel?: string;
  roomNumber?: string;
  planType: string;
  mealPreference?: MealPreference;
  mealType?: MealType | string;
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
  time?: string;
  isManual?: boolean;
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
  title?: string;
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
  // Official UPI & Mess Payment QR Settings
  upiId?: string;
  upiPayeeName?: string;
  upiQrCodeImage?: string;
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
  hallCapacity?: number;
  strictShiftEnforcement?: boolean;
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

// ==========================================
// FEATURE 1: Professional Notification Center
// ==========================================
export type OwnerNotificationType =
  | 'new_customer'
  | 'new_trial'
  | 'payment_received'
  | 'cash_payment'
  | 'upi_payment'
  | 'payment_verification'
  | 'outstanding_fee'
  | 'sub_expiring_soon'
  | 'sub_expired'
  | 'complaint_received'
  | 'complaint_updated'
  | 'meal_rating'
  | 'poll_response'
  | 'leave_request'
  | 'skip_meal'
  | 'system_security'
  | 'staff_activity';

export interface OwnerNotification {
  id: string;
  messId: string;
  type: OwnerNotificationType;
  title: string;
  message: string;
  customerId?: string;
  customerName?: string;
  relatedRecordId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

// ==========================================
// FEATURE 4: Financial Transactions & Payments
// ==========================================
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'adjustment';
export type PaymentStatus = 'pending' | 'verified' | 'reversed' | 'failed' | 'rejected';

export interface SupabasePaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  messId: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionReference?: string; // UTR or receipt #
  status: PaymentStatus;
  notes?: string;
  recordedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  reversalReason?: string;
  isReversal?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// FEATURE 6: Trial Student Management
// ==========================================
export type TrialStatus = 'ACTIVE' | 'ENDING_SOON' | 'EXPIRED' | 'CONVERTED' | 'CANCELLED';

export interface TrialStudent {
  id: string;
  messId: string;
  fullName: string;
  phone: string;
  email?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  mealType: 'both' | 'lunch_only' | 'dinner_only';
  mealLimit: number; // default e.g. 2 or 4
  mealsUsed: number;
  notes?: string;
  status: TrialStatus;
  convertedCustomerId?: string;
  convertedAt?: string;
  createdAt: string;
}

// ==========================================
// FEATURE 2: Drawer Navigation Target Pages
// ==========================================
export type OwnerNavPage =
  // Dashboard
  | 'dashboard'
  // Customers / Diners
  | 'customers'
  | 'add_customer'
  | 'search_customer'
  | 'trial_students'
  | 'subscriptions'
  | 'skip_meal'
  | 'mark_attendance'
  | 'attendance_scanner'
  // Reports & Analytics
  | 'attendance_reports'
  | 'customer_reports'
  | 'payment_reports'
  | 'expense_reports'
  | 'monthly_statements'
  | 'business_summary'
  | 'excel_export'
  // Billing & Payments
  | 'billing_payments'
  | 'upi_payments'
  | 'cash_payments'
  | 'qr_settings'
  | 'payment_history'
  | 'pending_payments'
  | 'payment_verification'
  | 'customer_ledger'
  | 'statement_calc'
  // Finance & Walk-in POS
  | 'walkin_pos'
  | 'walkin_meal_types'
  | 'walkin_payments'
  | 'expense_tracker'
  // Menu & Engagement
  | 'meal_plans_pricing'
  | 'meal_rate_timing'
  | 'weekly_menu'
  | 'polls'
  | 'reminders'
  | 'meal_ratings'
  | 'complaints_tracker'
  // Mess Administration
  | 'mess_settings'
  | 'staff_management'
  | 'roles_permissions'
  | 'my_mess'
  | 'security_log'
  // My Account & Support
  | 'my_account'
  | 'help_support'
  | 'support_requests';

// ==========================================
// Walk-in POS, Engagement & Menu Types
// ==========================================
export interface WalkinMealType {
  id: string;
  name: string;
  price: number;
  description?: string;
  isActive: boolean;
}

export interface WalkinPOSToken {
  id: string;
  tokenNumber: number;
  guestName: string;
  guestPhone?: string;
  mealTypeId: string;
  mealTypeName: string;
  quantity: number;
  ratePerMeal: number;
  totalAmount: number;
  paymentMode: 'cash' | 'upi';
  utrReference?: string;
  recordedBy: string;
  status: 'paid' | 'cancelled';
  createdAt: string;
}

export interface DayMenuDetail {
  lunchSpecial: string;
  lunchDal: string;
  lunchRoti: string;
  lunchRice: string;
  lunchSweet?: string;
  dinnerSpecial: string;
  dinnerDal: string;
  dinnerRoti: string;
  dinnerRice: string;
  dinnerSweet?: string;
}

export type WeeklyMenuSchedule = Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', DayMenuDetail>;

export interface StudentPoll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  totalVotes: number;
  status: 'active' | 'closed';
  createdAt: string;
  expiresAt?: string;
}

export interface MessReminderNotice {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'urgent';
  isActive: boolean;
  createdAt: string;
}

export interface MealRatingReview {
  id: string;
  customerId: string;
  customerName: string;
  rating: number; // 1-5
  feedback: string;
  mealShift: 'lunch' | 'dinner' | 'breakfast';
  date: string;
  createdAt: string;
}

export interface CustomerComplaint {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  category: 'Food Quality' | 'Cleanliness' | 'Staff Behavior' | 'Quantity' | 'Other';
  description: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  ownerReply?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: 'Technical' | 'Billing' | 'Feature Request' | 'Account';
  message: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  createdAt: string;
  response?: string;
}

