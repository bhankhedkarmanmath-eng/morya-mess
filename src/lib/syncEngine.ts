import { 
  Customer, 
  MealLog, 
  Expense, 
  Worker, 
  CleaningInspection, 
  TrialVisitor, 
  BusinessRulesConfig, 
  CustomerComplaint, 
  MealRatingReview, 
  StudentPoll, 
  MessReminderNotice,
  WalkinMealType,
  WalkinPOSToken,
  WeeklyMenuSchedule,
  InventoryItem,
  InventoryMovement,
  InventorySupplier,
  OwnerNotification
} from '../types/mess';
import { 
  loadCustomers, 
  saveCustomers, 
  loadMealLogs, 
  saveMealLogs, 
  loadExpenses, 
  saveExpenses,
  loadWorkers,
  saveWorkers,
  loadCleanings,
  saveCleanings,
  loadTrials,
  saveTrials,
  loadRules,
  saveBusinessRules,
  loadDeletedCustomerIds
} from './storage';
import {
  loadComplaints,
  saveComplaints,
  loadMealRatings,
  saveMealRatings,
  loadPolls,
  savePolls,
  loadReminders,
  saveReminders,
  loadWalkinMealTypes,
  saveWalkinMealTypes,
  loadWalkinTokens,
  saveWalkinTokens,
  loadWeeklyMenu,
  saveWeeklyMenu,
  loadInventoryItems,
  saveInventoryItems,
  loadInventoryMovements,
  saveInventoryMovements,
  loadInventorySuppliers,
  saveInventorySuppliers
} from './ownerModulesStorage';

const SYNC_ENDPOINT = '/api/sync';

export interface FullSyncState {
  customers: Customer[];
  mealLogs: MealLog[];
  expenses: Expense[];
  workers: Worker[];
  cleanings: CleaningInspection[];
  trials: TrialVisitor[];
  rules: BusinessRulesConfig | null;
  walkinMealTypes: WalkinMealType[];
  walkinTokens: WalkinPOSToken[];
  weeklyMenu: WeeklyMenuSchedule[];
  polls: StudentPoll[];
  reminders: MessReminderNotice[];
  mealRatings: MealRatingReview[];
  complaints: CustomerComplaint[];
  inventoryItems: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  inventorySuppliers: InventorySupplier[];
  notifications: OwnerNotification[];
  credentials: Record<string, any>;
  deletedCustomerIds?: string[];
}

type SyncListener = (state: Partial<FullSyncState>) => void;
const listeners = new Set<SyncListener>();

export function subscribeToSync(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(state: Partial<FullSyncState>) {
  listeners.forEach(fn => {
    try {
      fn(state);
    } catch (e) {
      console.warn('Sync listener error:', e);
    }
  });
}

let isInitialBootstrapDone = false;

/**
 * Fetch fresh data from backend server
 */
export async function pullSyncFromServer(): Promise<FullSyncState | null> {
  try {
    const res = await fetch(SYNC_ENDPOINT, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    if (!json.success || !json.data) return null;

    const data: FullSyncState = json.data;
    const deletedIds = loadDeletedCustomerIds();

    // 1. If server already has customers, update local cache
    if (Array.isArray(data.customers) && data.customers.length > 0) {
      const valid = data.customers.filter(c => c && c.id && !deletedIds.has(c.id));
      saveCustomers(valid);
    } else if (!isInitialBootstrapDone) {
      // Server is empty, push existing local customers to seed server
      const local = loadCustomers();
      if (local.length > 0) {
        pushSyncToServer({ customers: local });
      }
    }

    // 2. Meal logs
    if (Array.isArray(data.mealLogs)) {
      saveMealLogs(data.mealLogs);
    }

    // 3. Expenses
    if (Array.isArray(data.expenses)) {
      saveExpenses(data.expenses);
    }

    // 4. Workers
    if (Array.isArray(data.workers)) {
      saveWorkers(data.workers);
    }

    // 5. Cleanings
    if (Array.isArray(data.cleanings)) {
      saveCleanings(data.cleanings);
    }

    // 6. Trials
    if (Array.isArray(data.trials)) {
      saveTrials(data.trials);
    }

    // 7. Rules
    if (data.rules && typeof data.rules === 'object') {
      saveBusinessRules(data.rules);
    }

    // 8. Complaints & Ratings & Polls
    if (Array.isArray(data.complaints)) {
      saveComplaints(data.complaints);
    }
    if (Array.isArray(data.mealRatings)) {
      saveMealRatings(data.mealRatings);
    }
    if (Array.isArray(data.polls)) {
      savePolls(data.polls);
    }
    if (Array.isArray(data.reminders)) {
      saveReminders(data.reminders);
    }

    // 9. Credentials store in localStorage
    if (data.credentials && typeof data.credentials === 'object') {
      try {
        const key = 'morya_mess_credentials_store_v1';
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        const merged = { ...existing, ...data.credentials };
        localStorage.setItem(key, JSON.stringify(merged));
      } catch {}
    }

    isInitialBootstrapDone = true;
    notifyListeners(data);
    return data;
  } catch (err) {
    // Server might be starting up or offline
    return null;
  }
}

/**
 * Push local updates to backend server
 */
export async function pushSyncToServer(partial: Partial<FullSyncState>): Promise<boolean> {
  try {
    const res = await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial)
    });

    if (!res.ok) return false;
    const json = await res.json();
    if (json.success && json.data) {
      notifyListeners(json.data);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('pushSyncToServer failed:', err);
    return false;
  }
}

/**
 * Record attendance scan to server
 */
export async function recordAttendanceToServer(params: {
  customerId: string;
  customerName?: string;
  mealType: string;
  scanStatus?: string;
  reason?: string;
  overrideNotes?: string;
}): Promise<MealLog | null> {
  try {
    const res = await fetch('/api/sync/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.log) {
      const current = loadMealLogs();
      const updated = [json.log, ...current.filter(l => l.id !== json.log.id)];
      saveMealLogs(updated);
      notifyListeners({ mealLogs: updated });
      return json.log;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Student requests leave
 */
export async function submitLeaveRequestToServer(params: {
  customerId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', ...params })
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.success && json.customer) {
      const customers = loadCustomers();
      const updated = customers.map(c => c.id === json.customer.id ? json.customer : c);
      saveCustomers(updated);
      notifyListeners({ customers: updated });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Owner approves or rejects leave
 */
export async function actionLeaveOnServer(params: {
  action: 'approve' | 'reject';
  customerId: string;
  leaveId: string;
  approvedBy?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.success && json.customer) {
      const customers = loadCustomers();
      const updated = customers.map(c => c.id === json.customer.id ? json.customer : c);
      saveCustomers(updated);
      notifyListeners({ customers: updated });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Student submits complaint / Owner updates resolution
 */
export async function syncComplaintToServer(complaint: CustomerComplaint): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaint })
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.success && json.complaints) {
      saveComplaints(json.complaints);
      notifyListeners({ complaints: json.complaints });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Student submits meal rating
 */
export async function syncRatingToServer(rating: MealRatingReview): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.success && json.ratings) {
      saveMealRatings(json.ratings);
      notifyListeners({ mealRatings: json.ratings });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Save user permanent credentials to server
 */
export async function syncCredentialToServer(key: string, credential: any): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, credential })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Start the live polling loop (every 3.5 seconds)
 */
export function startLiveSyncEngine(): () => void {
  // 1. Initial pull immediately
  pullSyncFromServer();

  // 2. Poll every 3500ms
  const timer = setInterval(() => {
    pullSyncFromServer();
  }, 3500);

  // 3. Pull when user switches back to window/app tab
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      pullSyncFromServer();
    }
  };
  window.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleVisibility);

  return () => {
    clearInterval(timer);
    window.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('focus', handleVisibility);
  };
}
