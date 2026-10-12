import React, { useState, useEffect } from 'react';
import { Customer, MealLog, Expense, Worker, CleaningInspection, BusinessRulesConfig, TrialVisitor, UserRole, ScanEligibility, MealType, Gender } from './types/mess';
import {
  loadCustomers,
  saveCustomers,
  loadDeletedCustomerIds,
  saveDeletedCustomerId,
  removeDeletedCustomerId,
  saveDeletedCustomerIds,
  loadMealLogs,
  saveMealLogs,
  loadExpenses,
  saveExpenses,
  loadWorkers,
  saveWorkers,
  loadCleanings,
  saveCleanings,
  getStoredBusinessRules,
  saveBusinessRules,
  loadTrials,
  saveTrials,
  getTodayString
} from './lib/storage';
import {
  syncWithSupabase,
  syncCustomerToSupabase,
  deleteCustomerInSupabase,
  syncMealLogToSupabase,
  syncExpenseToSupabase,
  updateCustomerInSupabase,
  fetchAttendanceLogsFromSupabase,
  subscribeToAttendanceLogs
} from './lib/supabaseSync';
import { supabase } from './lib/supabase';
import { getSavedSession, performSignOut, AuthenticatedUser } from './lib/authService';
import { 
  startLiveSyncEngine, 
  subscribeToSync, 
  pushSyncToServer, 
  pullSyncFromServer,
  recordAttendanceToServer, 
  submitLeaveRequestToServer, 
  actionLeaveOnServer 
} from './lib/syncEngine';

import { Navigation } from './components/Navigation';
import { OwnerDrawerMenu } from './components/OwnerDrawerMenu';
import { DashboardView } from './components/DashboardView';
import { CustomersListView } from './components/CustomersListView';
import { MealLogsView } from './components/MealLogsView';
import { ExpensesView } from './components/ExpensesView';
import { WorkersAndKitchenView } from './components/WorkersAndKitchenView';
import { AuditAndReportsView } from './components/AuditAndReportsView';
import { SubscriptionsView } from './components/views/SubscriptionsView';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { PredictCampaignResultsModal } from './components/PredictCampaignResultsModal';
import { CampaignParticipantsHubModal } from './components/CampaignParticipantsHubModal';
import { KitchenEstimatorModal } from './components/KitchenEstimatorModal';
import { WhatsAppDuesBotModal } from './components/WhatsAppDuesBotModal';
import { AttendanceIntegrityModal } from './components/AttendanceIntegrityModal';
import { KitchenCookSheetModal } from './components/KitchenCookSheetModal';
import { MessPnlCostPerPlateModal } from './components/MessPnlCostPerPlateModal';
import { DailyProfitDigestModal } from './components/DailyProfitDigestModal';
import { 
  fetchOwnerNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  subscribeToOwnerNotificationsRealtime,
  deleteOwnerNotification,
  clearAllReadOwnerNotifications,
  sendNotificationToStudent,
  createOwnerNotification,
  getNotifBroadcastChannel,
  fetchTrialVisitorsFromSupabase
} from './lib/ownerFeaturesApi';
import { AttendanceCenterView } from './components/views/AttendanceCenterView';
import { BillingOverviewView } from './components/views/BillingOverviewView';
import { InventoryCenterView } from './components/views/InventoryCenterView';
import { WeeklyMenuEditorView } from './components/views/WeeklyMenuEditorView';
import { ExcelExportHubView } from './components/views/ExcelExportHubView';
import { QrScannerModal } from './components/QrScannerModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { Customer360Modal } from './components/Customer360Modal';
import { CustomerCardPrintModal } from './components/CustomerCardPrintModal';
import { RenewalModal } from './components/RenewalModal';
import { PaymentModal } from './components/PaymentModal';
import { PenaltyModal } from './components/PenaltyModal';
import { SettingsModal } from './components/SettingsModal';
import { PortalSwitcherModal } from './components/PortalSwitcherModal';
import { UniversalQrManagerModal } from './components/UniversalQrManagerModal';
import { GanpatiSplash } from './components/GanpatiSplash';
import { PortalSelectionScreen } from './components/PortalSelectionScreen';
import { LoginScreen } from './components/LoginScreen';
import { SetNewPasswordScreen } from './components/SetNewPasswordScreen';
import { StudentPortalView } from './components/StudentPortalView';
import { SearchCustomerView } from './components/views/SearchCustomerView';
import { LeavesManagerView } from './components/views/LeavesManagerView';
import { WalkinPOSView } from './components/views/WalkinPOSView';
import { WalkinMealTypesView } from './components/views/WalkinMealTypesView';
import { WalkinPaymentsView } from './components/views/WalkinPaymentsView';
import { CashPaymentsView } from './components/views/CashPaymentsView';
import { UPIPaymentsView } from './components/views/UPIPaymentsView';
import { PaymentHistoryView } from './components/views/PaymentHistoryView';
import { PaymentVerificationView } from './components/views/PaymentVerificationView';
import { PendingPaymentsView } from './components/views/PendingPaymentsView';
import { CustomerLedgerView } from './components/views/CustomerLedgerView';
import { MonthlyStatementCalculatorView } from './components/views/MonthlyStatementCalculatorView';
import { PollsManagerView } from './components/views/PollsManagerView';
import { RemindersNoticesView } from './components/views/RemindersNoticesView';
import { MealRatingsView } from './components/views/MealRatingsView';
import { ComplaintsTrackerView } from './components/views/ComplaintsTrackerView';
import { RolesPermissionsView } from './components/views/RolesPermissionsView';
import { StaffManagementView } from './components/views/StaffManagementView';
import { MyMessProfileView } from './components/views/MyMessProfileView';
import { HelpSupportView } from './components/views/HelpSupportView';
import { SupportRequestsView } from './components/views/SupportRequestsView';
import { PaymentsManagerView } from './components/PaymentsManagerView';
import { AttendanceReportsView } from './components/views/AttendanceReportsView';
import { CustomerReportsView } from './components/views/CustomerReportsView';
import { PaymentReportsView } from './components/views/PaymentReportsView';
import { ExpenseReportsView } from './components/views/ExpenseReportsView';
import { BusinessSummaryView } from './components/views/BusinessSummaryView';
import { MessPaymentQrView } from './components/views/MessPaymentQrView';
import { TrialQrModal } from './components/TrialQrModal';
import { TrialStudentPortalView } from './components/TrialStudentPortalView';
import { TrialStudentsManagerView } from './components/TrialStudentsManagerView';
import { MessSettingsView } from './components/views/MessSettingsView';
import { SecurityActivityLogView } from './components/views/SecurityActivityLogView';
import { addTrialStudentInSupabase } from './lib/ownerFeaturesApi';

export function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [authStep, setAuthStep] = useState<'PORTAL_CHOICE' | 'LOGIN' | 'SET_NEW_PASSWORD' | 'AUTHENTICATED'>('PORTAL_CHOICE');
  const [portal, setPortal] = useState<'owner' | 'student'>('owner');
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<AuthenticatedUser | null>(null);

  const [customers, setCustomers] = useState<Customer[]>(() => loadCustomers());
  const [mealLogs, setMealLogs] = useState<MealLog[]>(() => loadMealLogs());
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [workers, setWorkers] = useState<Worker[]>(() => loadWorkers());
  const [cleanings, setCleanings] = useState<CleaningInspection[]>(() => loadCleanings());
  const [rules, setRules] = useState<BusinessRulesConfig>(() => getStoredBusinessRules());
  const [trials, setTrials] = useState<TrialVisitor[]>(() => loadTrials());

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [reportsInitialTab, setReportsInitialTab] = useState<'pnl' | 'expiry_watch' | 'trials' | 'leave_approvals'>('pnl');
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [currentPortal, setCurrentPortal] = useState<'owner' | 'student'>('owner');
  const [selectedStudentCustomer, setSelectedStudentCustomer] = useState<Customer | null>(null);

  // Modals & Navigation Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUniversalQrOpen, setIsUniversalQrOpen] = useState(false);
  const [isTrialQrModalOpen, setIsTrialQrModalOpen] = useState(false);
  const [isTrialScanMode, setIsTrialScanMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname.toLowerCase();
    return (
      params.get('portal') === 'trial' || 
      params.get('view') === 'trial' || 
      params.get('mode') === 'trial' || 
      params.get('portal') === 'trial_entry' ||
      pathname === '/trial' ||
      pathname.startsWith('/trial/') ||
      window.location.hash === '#trial' ||
      window.location.hash === '#trial-entry'
    );
  });

  // Listen to popstate / hash change for trial scanner entry
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname.toLowerCase();
      const isTrial = (
        params.get('portal') === 'trial' || 
        params.get('view') === 'trial' || 
        params.get('mode') === 'trial' || 
        params.get('portal') === 'trial_entry' ||
        pathname === '/trial' ||
        pathname.startsWith('/trial/') ||
        window.location.hash === '#trial' ||
        window.location.hash === '#trial-entry'
      );
      setIsTrialScanMode(isTrial);
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPredictCampaignOpen, setIsPredictCampaignOpen] = useState(false);
  const [isCampaignParticipantsOpen, setIsCampaignParticipantsOpen] = useState(false);
  const [isKitchenEstimatorOpen, setIsKitchenEstimatorOpen] = useState(false);
  const [isWhatsAppDuesBotOpen, setIsWhatsAppDuesBotOpen] = useState(false);
  const [isAttendanceIntegrityOpen, setIsAttendanceIntegrityOpen] = useState(false);
  const [isMaharajCookSheetOpen, setIsMaharajCookSheetOpen] = useState(false);
  const [isMessPnlOpen, setIsMessPnlOpen] = useState(false);
  const [isDailyProfitDigestOpen, setIsDailyProfitDigestOpen] = useState(false);
  const [isPortalSwitcherOpen, setIsPortalSwitcherOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);

  const [selected360Customer, setSelected360Customer] = useState<Customer | null>(null);
  const [selectedCardPrintCustomer, setSelectedCardPrintCustomer] = useState<Customer | null>(null);
  const [selectedRenewCustomer, setSelectedRenewCustomer] = useState<Customer | null>(null);
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<Customer | null>(null);
  const [selectedPenaltyCustomer, setSelectedPenaltyCustomer] = useState<Customer | null>(null);

  // Check auth session on mount
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          const mustChange = session.user.user_metadata?.must_change_password === true;
          const role = session.user.user_metadata?.role || 'owner';
          const user: AuthenticatedUser = {
            id: session.user.id,
            identifier: session.user.email || 'owner',
            name: session.user.user_metadata?.full_name || 'Mess Owner',
            role,
            mustChangePassword: mustChange
          };
          if (mustChange) {
            setPasswordResetUser(user);
            setAuthStep('SET_NEW_PASSWORD');
          } else {
            setCurrentUser(user);
            setCurrentRole(role as UserRole);
            setCurrentPortal('owner');
            setAuthStep('AUTHENTICATED');
          }
          return;
        }

        const localUser = getSavedSession();
        if (localUser) {
          if (localUser.mustChangePassword) {
            setPasswordResetUser(localUser);
            setAuthStep('SET_NEW_PASSWORD');
          } else {
            setCurrentUser(localUser);
            if (localUser.role === 'student') {
              setCurrentPortal('student');
              if (localUser.studentCustomer) {
                setSelectedStudentCustomer(localUser.studentCustomer);
              }
            } else {
              setCurrentRole(localUser.role as UserRole);
              setCurrentPortal('owner');
            }
            setAuthStep('AUTHENTICATED');
          }
        } else {
          setAuthStep('PORTAL_CHOICE');
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setPasswordResetUser(null);
          setSelectedStudentCustomer(null);
          setCurrentPortal('owner');
          setAuthStep('PORTAL_CHOICE');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleLogout = async () => {
    await performSignOut();
    setCurrentUser(null);
    setPasswordResetUser(null);
    setSelectedStudentCustomer(null);
    setCurrentPortal('owner');
    setAuthStep('PORTAL_CHOICE');
  };

  // Continuous Full-Stack Live Synchronization between Student & Owner devices
  useEffect(() => {
    let isMounted = true;
    const stopLiveSync = startLiveSyncEngine();

    const unsubSync = subscribeToSync((state) => {
      if (!isMounted) return;
      if (Array.isArray(state.customers)) {
        setCustomers(state.customers);
      }
      if (Array.isArray(state.mealLogs)) {
        setMealLogs(state.mealLogs);
      }
      if (Array.isArray(state.expenses)) {
        setExpenses(state.expenses);
      }
      if (Array.isArray(state.workers)) {
        setWorkers(state.workers);
      }
      if (Array.isArray(state.cleanings)) {
        setCleanings(state.cleanings);
      }
      if (Array.isArray(state.trials)) {
        setTrials(state.trials);
      }
      if (state.rules && typeof state.rules === 'object') {
        setRules(state.rules);
      }
    });

    // Also sync to Supabase where supported
    loadCustomers().forEach(c => {
      syncCustomerToSupabase(c, '63b00e12-a702-492f-bd56-1e260338699f');
    });

    return () => {
      isMounted = false;
      stopLiveSync();
      unsubSync();
    };
  }, []);

  // Save to localStorage when state changes
  useEffect(() => { saveCustomers(customers); }, [customers]);
  useEffect(() => { saveMealLogs(mealLogs); }, [mealLogs]);
  useEffect(() => { saveExpenses(expenses); }, [expenses]);
  useEffect(() => { saveWorkers(workers); }, [workers]);
  useEffect(() => { saveCleanings(cleanings); }, [cleanings]);
  useEffect(() => { saveBusinessRules(rules); }, [rules]);
  useEffect(() => { saveTrials(trials); }, [trials]);

  // Sync real-time trial registration events across components and tabs
  useEffect(() => {
    let isMounted = true;
    const reloadTrialsFromDb = () => {
      fetchTrialVisitorsFromSupabase('63b00e12-a702-492f-bd56-1e260338699f').then(data => {
        if (isMounted && data) {
          setTrials(data);
          saveTrials(data);
        }
      });
      setMealLogs(loadMealLogs());
    };

    // Initial load from Supabase database
    reloadTrialsFromDb();

    window.addEventListener('morya_trial_updated', reloadTrialsFromDb);
    window.addEventListener('storage', reloadTrialsFromDb);

    return () => {
      isMounted = false;
      window.removeEventListener('morya_trial_updated', reloadTrialsFromDb);
      window.removeEventListener('storage', reloadTrialsFromDb);
    };
  }, []);

  // Keep selected student synced
  useEffect(() => {
    if (selectedStudentCustomer) {
      const updated = customers.find(c => c.id === selectedStudentCustomer.id);
      if (updated) setSelectedStudentCustomer(updated);
    }
  }, [customers]);

  // Load notifications on mount & subscribe to changes
  useEffect(() => {
    let isMounted = true;

    const reloadNotifs = () => {
      fetchOwnerNotifications('63b00e12-a702-492f-bd56-1e260338699f').then(data => {
        if (isMounted) {
          setNotifications(data || []);
          setIsNotificationsLoading(false);
        }
      });
    };

    setIsNotificationsLoading(true);
    reloadNotifs();

    const handleLocalNotif = (e: any) => {
      if (e.detail && isMounted) {
        setNotifications(prev => {
          if (prev.some(n => n.id === e.detail.id)) return prev;
          return [e.detail, ...prev];
        });
      }
    };

    // Cross-tab broadcast listener
    const channel = getNotifBroadcastChannel();
    const handleBroadcast = (ev: MessageEvent) => {
      if (ev.data?.type === 'OWNER_NOTIF' && ev.data.data && isMounted) {
        setNotifications(prev => {
          if (prev.some(n => n.id === ev.data.data.id)) return prev;
          return [ev.data.data, ...prev];
        });
      } else if (isMounted) {
        reloadNotifs();
      }
    };
    if (channel) {
      channel.addEventListener('message', handleBroadcast);
    }

    window.addEventListener('morya_notification_created', handleLocalNotif);
    window.addEventListener('morya_payment_created', reloadNotifs);
    window.addEventListener('morya_complaints_updated', reloadNotifs);
    window.addEventListener('morya_leave_updated', reloadNotifs);
    window.addEventListener('storage', reloadNotifs);

    // Periodic 5s polling for background cross-device updates
    const pollInterval = setInterval(() => {
      if (isMounted) {
        reloadNotifs();
      }
    }, 5000);

    const unsubRealtime = subscribeToOwnerNotificationsRealtime((newNotif) => {
      if (isMounted) {
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
      }
    }, '63b00e12-a702-492f-bd56-1e260338699f');

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (channel) {
        channel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('morya_notification_created', handleLocalNotif);
      window.removeEventListener('morya_payment_created', reloadNotifs);
      window.removeEventListener('morya_complaints_updated', reloadNotifs);
      window.removeEventListener('morya_leave_updated', reloadNotifs);
      window.removeEventListener('storage', reloadNotifs);
      unsubRealtime();
    };
  }, []);

  // When notification modal opens, immediately refresh for freshest notifications
  useEffect(() => {
    if (isNotificationsOpen) {
      setIsNotificationsLoading(true);
      fetchOwnerNotifications('63b00e12-a702-492f-bd56-1e260338699f').then(data => {
        setNotifications(data || []);
        setIsNotificationsLoading(false);
      });
    }
  }, [isNotificationsOpen]);

  // Handlers
  const handleAddCustomer = (newCustomer: Customer) => {
    removeDeletedCustomerId(newCustomer.id);
    const updated = [newCustomer, ...customers.filter(c => c.id !== newCustomer.id)];
    setCustomers(updated);
    saveCustomers(updated);
    pushSyncToServer({ customers: updated });
    syncCustomerToSupabase(newCustomer, '63b00e12-a702-492f-bd56-1e260338699f');
  };

  const handleDeleteCustomer = (customerId: string) => {
    saveDeletedCustomerId(customerId);
    const updated = customers.filter(c => c.id !== customerId);
    setCustomers(updated);
    saveCustomers(updated);
    pushSyncToServer({ customers: updated, deletedCustomerIds: [customerId] as any });
    deleteCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', customerId);
  };

  const handleClearAllCustomers = () => {
    const allIds = customers.map(c => c.id);
    saveDeletedCustomerIds(allIds);
    setCustomers([]);
    saveCustomers([]);
    pushSyncToServer({ customers: [], deletedCustomerIds: allIds as any });
    allIds.forEach(id => {
      deleteCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', id);
    });
  };

  const handleRecordMeal = (
    customerId: string,
    status: ScanEligibility,
    reason: string,
    mealType: MealType,
    overrideNotes?: string
  ) => {
    const cust = customers.find(c => c.id === customerId);
    const newLog: MealLog = {
      id: `ml-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      customerId,
      customerName: cust ? cust.name : 'Unknown Member',
      mealType,
      date: getTodayString(),
      timestamp: new Date().toISOString(),
      scanStatus: status,
      reason,
      overrideNotes
    };
    const updated = [newLog, ...mealLogs];
    setMealLogs(updated);
    saveMealLogs(updated);
    recordAttendanceToServer({
      customerId,
      customerName: newLog.customerName,
      mealType,
      scanStatus: status,
      reason,
      overrideNotes
    });
    pushSyncToServer({ mealLogs: updated });
    syncMealLogToSupabase(newLog);
  };

  const handleRecordManualAttendance = (
    customerId: string,
    shift: MealType,
    reason: string
  ): { success: boolean; message: string } => {
    const cust = customers.find(c => c.id === customerId || c.phone === customerId);
    if (!cust) {
      return { success: false, message: `No student found with ID/phone "${customerId}".` };
    }
    handleRecordMeal(cust.id, 'ALLOW', reason || 'Manual Attendance Confirmed by Owner', shift, `[MANUAL_ENTRY] ${reason}`);
    return { success: true, message: `Attendance marked successfully for ${cust.name}.` };
  };

  const handleRenew = (
    customerId: string,
    newStartDate: string,
    newEndDate: string,
    amount: number,
    paidAmount: number,
    notes?: string
  ) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const renewalRecord = {
        id: `rn-${Date.now()}`,
        newStartDate,
        newEndDate,
        planName: c.planType,
        amount,
        paidAmount,
        date: getTodayString(),
        paymentMethod: 'cash' as const,
        renewedBy: 'Owner',
        notes: notes || 'Subscription Renewal'
      };
      const newBalance = Math.max(0, (c.balance || 0) + (amount - paidAmount));
      const updatedCustomer: Customer = {
        ...c,
        startDate: newStartDate,
        endDate: newEndDate,
        status: 'active',
        balance: newBalance,
        renewals: [...(c.renewals || []), renewalRecord]
      };
      updateCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', c.id, updatedCustomer);
      return updatedCustomer;
    });
    setCustomers(updated);
    saveCustomers(updated);
  };

  const handleRecordPayment = (customerId: string, amount: number, mode: 'cash' | 'upi' | 'bank_transfer', notes?: string) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const paymentRecord = {
        id: `pm-${Date.now()}`,
        date: getTodayString(),
        amount,
        mode,
        notes: notes || 'Fee balance cleared'
      };
      const newBalance = Math.max(0, c.balance - amount);
      const newPaid = c.paidAmount + amount;
      const updatedCustomer: Customer = {
        ...c,
        balance: newBalance,
        paidAmount: newPaid,
        payments: [...(c.payments || []), paymentRecord]
      };
      updateCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', c.id, updatedCustomer);
      return updatedCustomer;
    });
    setCustomers(updated);
    saveCustomers(updated);
  };

  const handleApplyPenalty = (customerId: string, amount: number, reason: string) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const pen = {
        id: `pn-${Date.now()}`,
        date: getTodayString(),
        amount,
        reason,
        status: 'pending' as const,
        recordedBy: 'Owner'
      };
      const updatedCustomer: Customer = {
        ...c,
        balance: c.balance + amount,
        penaltyAmount: (c.penaltyAmount || 0) + amount,
        penaltyReason: reason,
        penaltyPaid: false,
        penalties: [...(c.penalties || []), pen]
      };
      updateCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', c.id, updatedCustomer);
      return updatedCustomer;
    });
    setCustomers(updated);
    saveCustomers(updated);
  };

  const handleAddExpense = (newExpense: Expense) => {
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    saveExpenses(updated);
    syncExpenseToSupabase(newExpense);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveExpenses(updated);
  };

  const handleAddWorker = (newWorker: Worker) => {
    const updated = [newWorker, ...workers];
    setWorkers(updated);
    saveWorkers(updated);
  };

  const handleUpdateWorkerAttendance = (workerId: string, date: string, status: 'present' | 'absent' | 'half_day' | 'leave') => {
    const updated = workers.map(w => {
      if (w.id !== workerId) return w;
      return {
        ...w,
        attendance: {
          ...w.attendance,
          [date]: status
        }
      };
    });
    setWorkers(updated);
    saveWorkers(updated);
  };

  const handleDeleteWorker = (id: string) => {
    const updated = workers.filter(w => w.id !== id);
    setWorkers(updated);
    saveWorkers(updated);
  };

  const handleAddCleaning = (newCleaning: CleaningInspection) => {
    const updated = [newCleaning, ...cleanings];
    setCleanings(updated);
    saveCleanings(updated);
  };

  const handleSaveRules = (newRules: BusinessRulesConfig) => {
    setRules(newRules);
    saveBusinessRules(newRules);
  };

  const handleAddTrial = (newTrial: TrialVisitor) => {
    const updated = [newTrial, ...trials];
    setTrials(updated);
    saveTrials(updated);
    pushSyncToServer({ trials: updated });
  };

  const handleConvertTrialToCustomer = (trial: TrialVisitor) => {
    const startDate = getTodayString();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const fee = trial.gender === 'female' ? rules.femaleFullRate || 2500 : rules.maleFullRate || 3000;

    const newCustomer: Customer = {
      id: `MM-${new Date().getFullYear()}-${String(customers.length + 1).padStart(3, '0')}`,
      name: trial.name,
      phone: trial.phone,
      gender: trial.gender,
      startDate,
      endDate: end.toISOString().split('T')[0],
      planType: 'monthly_2meals',
      totalAmount: fee,
      paidAmount: trial.amountPaid,
      balance: Math.max(0, fee - trial.amountPaid),
      status: 'active',
      collegeOrWork: trial.college,
      qrToken: `MORYA-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      qrVersion: 1,
      createdAt: new Date().toISOString()
    };

    const updatedTrials = trials.map(t => t.id === trial.id ? { ...t, convertedToMonthly: true } : t);
    setTrials(updatedTrials);
    saveTrials(updatedTrials);
    pushSyncToServer({ trials: updatedTrials });

    handleAddCustomer(newCustomer);
    setCurrentTab('customers');
  };

  const handleRequestLeave = (customerId: string, startDate: string, endDate: string, reason: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const targetCustomer = customers.find(c => c.id === customerId);
    const newLeaveId = `lv-${Date.now()}`;

    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const newLeave = {
        id: newLeaveId,
        startDate,
        endDate,
        days,
        reason,
        approved: false,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        requestedAt: new Date().toISOString()
      };
      const updatedCust: Customer = {
        ...c,
        leaves: [...(c.leaves || []), newLeave]
      };
      updateCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', c.id, updatedCust);
      return updatedCust;
    });
    setCustomers(updated);
    saveCustomers(updated);
    submitLeaveRequestToServer({
      customerId,
      startDate,
      endDate,
      days,
      reason
    });
    pushSyncToServer({ customers: updated });

    // Ensure owner notification is created
    createOwnerNotification({
      type: 'leave_request',
      title: 'Student Leave Request',
      message: `${targetCustomer?.name || 'Student'} requested leave from ${startDate} to ${endDate} (${days} days). Reason: ${reason}`,
      customerId,
      customerName: targetCustomer?.name,
      relatedRecordId: newLeaveId,
      priority: 'high'
    });
  };

  const handleApproveLeave = (customerId: string, leaveId: string, days: number) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const currentEnd = new Date(c.endDate);
      currentEnd.setDate(currentEnd.getDate() + days);
      const newEndDate = currentEnd.toISOString().split('T')[0];

      const updatedLeaves = (c.leaves || []).map(l => l.id === leaveId ? { ...l, approved: true, status: 'approved' as const } : l);
      const updatedCust: Customer = {
        ...c,
        endDate: newEndDate,
        leaves: updatedLeaves
      };
      updateCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', c.id, updatedCust);
      return updatedCust;
    });
    setCustomers(updated);
    saveCustomers(updated);
    actionLeaveOnServer({ action: 'approve', customerId, leaveId, approvedBy: 'Owner' });
    pushSyncToServer({ customers: updated });

    // Notify student instantly in student app notification box
    sendNotificationToStudent({
      customerId,
      title: 'Leave Approved! 🎉',
      message: `Your leave application for ${days} day(s) has been approved. Your meal pass validity is extended to reflect your absence.`,
      type: 'leave_approved',
      priority: 'normal'
    });
  };

  const handleRejectLeave = (customerId: string, leaveId: string) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const updatedLeaves = (c.leaves || []).map(l => l.id === leaveId ? { ...l, status: 'rejected' as const, approved: false } : l);
      const updatedCust: Customer = {
        ...c,
        leaves: updatedLeaves
      };
      updateCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', c.id, updatedCust);
      return updatedCust;
    });
    setCustomers(updated);
    saveCustomers(updated);
    actionLeaveOnServer({ action: 'reject', customerId, leaveId, approvedBy: 'Owner' });
    pushSyncToServer({ customers: updated });

    // Notify student instantly in student app notification box
    sendNotificationToStudent({
      customerId,
      title: 'Leave Request Update',
      message: `Your leave application was reviewed and could not be approved by the mess management.`,
      type: 'leave_rejected',
      priority: 'urgent'
    });
  };

  const handleCreateTestLeave = () => {
    if (customers.length === 0) {
      alert('Please register at least one member first to test the leave desk.');
      return;
    }
    const sampleCustomer = customers[0];
    const today = getTodayString();
    const d = new Date();
    d.setDate(d.getDate() + 4);
    const endStr = d.toISOString().split('T')[0];

    handleRequestLeave(sampleCustomer.id, today, endStr, 'Diwali Festival & Semester Vacation Break');
    setCurrentTab('dashboard');
  };

  const handleRegisterTrial = (record: {
    id: string;
    fullName: string;
    phone: string;
    gender: Gender;
    college?: string;
    mealType: MealType;
    foodItem: string;
    amountPaid: number;
    paymentMode: 'upi' | 'cash';
    date: string;
    tokenNumber: string;
    notes?: string;
  }) => {
    // 1. Add to TrialVisitor list
    const newTrial: TrialVisitor = {
      id: record.id,
      name: record.fullName,
      phone: record.phone,
      gender: record.gender,
      college: record.college || '',
      mealType: record.mealType,
      foodItem: record.foodItem,
      visitType: '1_day_trial',
      date: record.date,
      amountPaid: record.amountPaid,
      convertedToMonthly: false,
      notes: `Token: #${record.tokenNumber}; Food: ${record.foodItem}; Shift: ${record.mealType.toUpperCase()}; Paid: ₹${record.amountPaid} (${record.paymentMode.toUpperCase()}); ${record.notes || ''}`
    };
    const updatedTrials = [newTrial, ...trials];
    setTrials(updatedTrials);
    saveTrials(updatedTrials);

    // 2. Sync to Supabase trial student table
    addTrialStudentInSupabase({
      fullName: record.fullName,
      phone: record.phone,
      startDate: record.date,
      endDate: record.date,
      mealType: record.mealType === 'lunch' ? 'lunch_only' : 'dinner_only',
      mealLimit: 1,
      amountPaid: record.amountPaid,
      notes: `TOKEN:${record.tokenNumber};ITEM:${record.foodItem};PAID:${record.amountPaid};MODE:${record.paymentMode};${record.notes || ''}`
    }).catch(err => console.warn('Supabase trial student sync note:', err));

    // 3. Create a meal log record so dashboard and meal counts update in real-time
    const newMealLog: MealLog = {
      id: `ml-trial-${Date.now()}`,
      customerId: record.id,
      customerName: `[Trial] ${record.fullName}`,
      gender: record.gender,
      mealType: record.mealType,
      date: record.date,
      timestamp: new Date().toISOString(),
      scanStatus: 'ALLOW',
      reason: `Trial Self-Registration (#${record.tokenNumber}) — ₹${record.amountPaid} (${record.paymentMode.toUpperCase()})`
    };
    const updatedMealLogs = [newMealLog, ...mealLogs];
    setMealLogs(updatedMealLogs);
    saveMealLogs(updatedMealLogs);

    // 4. Create an Owner notification for real-time alert
    const notif = {
      id: `notif-trial-${Date.now()}`,
      type: 'trial_registration',
      title: 'New Trial Student Checked In! 🎫',
      message: `${record.fullName} (${record.phone}) checked in for ${record.mealType.toUpperCase()} trial — ₹${record.amountPaid} (${record.paymentMode.toUpperCase()}) Token: #${record.tokenNumber}`,
      customerId: record.id,
      customerName: record.fullName,
      priority: 'high',
      isRead: false,
      createdAt: new Date().toISOString()
    };
    createOwnerNotification(notif as any);

    // 5. Push to central server so Owner app sees the trial student immediately
    pushSyncToServer({
      trials: updatedTrials,
      mealLogs: updatedMealLogs,
      notifications: [notif as any, ...notifications]
    });
  };

  const pendingLeavesCount = customers.flatMap(c => c.leaves || []).filter(l => !l.approved).length;

  // Direct public self check-in view when QR is scanned with phone camera (?portal=trial)
  if (isTrialScanMode) {
    return (
      <TrialStudentPortalView
        rules={rules}
        onRegisterTrial={handleRegisterTrial}
        onExit={() => {
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('portal');
            url.searchParams.delete('view');
            url.searchParams.delete('mode');
            window.location.hash = '';
            window.history.replaceState({}, '', url.pathname);
          }
          setIsTrialScanMode(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 font-sans antialiased flex flex-col selection:bg-orange-600 selection:text-white">
      {/* Ganpati auspicious start screen */}
      {showSplash && (
        <GanpatiSplash
          onFinish={() => setShowSplash(false)}
          onEnter={() => setShowSplash(false)}
          messName={rules.messName}
          messSubtitle={rules.messSubtitle}
        />
      )}

      {/* Auth Flow 1: Portal Choice */}
      {!showSplash && authStep === 'PORTAL_CHOICE' && (
        <PortalSelectionScreen
          onSelectPortal={(selected) => {
            setPortal(selected);
            setAuthStep('LOGIN');
          }}
          messName={rules.messName}
          messSubtitle={rules.messSubtitle}
        />
      )}

      {/* Auth Flow 2: Login */}
      {!showSplash && authStep === 'LOGIN' && (
        <LoginScreen
          portal={portal}
          onBack={() => setAuthStep('PORTAL_CHOICE')}
          onRequirePasswordReset={(usr) => {
            setPasswordResetUser(usr);
            setAuthStep('SET_NEW_PASSWORD');
          }}
          onAuthenticated={(usr) => {
            setCurrentUser(usr);
            if (usr.role === 'student') {
              if (usr.studentCustomer) {
                setSelectedStudentCustomer(usr.studentCustomer);
              }
              setCurrentPortal('student');
            } else {
              setCurrentPortal('owner');
              setCurrentRole(usr.role as UserRole);
            }
            setAuthStep('AUTHENTICATED');
          }}
          allCustomers={customers}
          messName={rules.messName}
        />
      )}

      {/* Auth Flow 3: Set New Password */}
      {!showSplash && authStep === 'SET_NEW_PASSWORD' && passwordResetUser && (
        <SetNewPasswordScreen
          user={passwordResetUser}
          onPasswordSetSuccessfully={(usr) => {
            setPasswordResetUser(null);
            setCurrentUser(usr);
            if (usr.role === 'student') {
              if (usr.studentCustomer) {
                setSelectedStudentCustomer(usr.studentCustomer);
              }
              setCurrentPortal('student');
            } else {
              setCurrentPortal('owner');
              setCurrentRole(usr.role as UserRole);
            }
            setAuthStep('AUTHENTICATED');
          }}
          onCancel={handleLogout}
          messName={rules.messName}
        />
      )}

      {/* Authenticated State */}
      {!showSplash && authStep === 'AUTHENTICATED' && (
        currentPortal === 'student' && (selectedStudentCustomer || currentUser?.studentCustomer) ? (
          <StudentPortalView
            customer={selectedStudentCustomer || (currentUser?.studentCustomer as Customer)}
            allCustomers={[selectedStudentCustomer || (currentUser?.studentCustomer as Customer)]}
            mealLogs={mealLogs.filter(m => m.customerId === (selectedStudentCustomer?.id || currentUser?.studentCustomer?.id))}
            onSwitchCustomer={(c) => setSelectedStudentCustomer(c)}
            onExitPortal={handleLogout}
            onRequestLeave={handleRequestLeave}
            onMealLogged={(newLog) => {
              setMealLogs(prev => {
                const updated = [newLog, ...prev.filter(l => l.id !== newLog.id)];
                saveMealLogs(updated);
                recordAttendanceToServer({
                  customerId: newLog.customerId,
                  customerName: newLog.customerName,
                  mealType: newLog.mealType,
                  scanStatus: newLog.scanStatus,
                  reason: newLog.reason,
                  overrideNotes: newLog.overrideNotes
                });
                pushSyncToServer({ mealLogs: updated });
                return updated;
              });
            }}
            messName={rules.messName}
            messSubtitle={rules.messSubtitle}
          />
        ) : (
          <>
            <div className="flex-1 flex flex-col">
              <Navigation
                currentTab={currentTab}
                onTabChange={setCurrentTab}
                currentRole={currentRole}
                onRoleChange={setCurrentRole}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenUniversalQr={() => setIsUniversalQrOpen(true)}
                onOpenTrialQr={() => setIsTrialQrModalOpen(true)}
                onOpenPredictCampaignResults={() => setIsPredictCampaignOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                messName={rules.messName}
                pendingLeavesCount={pendingLeavesCount}
                onLogout={handleLogout}
                userEmail={currentUser?.identifier}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                unreadNotificationsCount={notifications.filter(n => !n.isRead).length}
              />

              {/* Owner Drawer Navigation Menu */}
              <OwnerDrawerMenu
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                currentTab={currentTab}
                onSelectTab={(tab) => {
                  if (tab === 'add_customer') {
                    setIsAddCustomerOpen(true);
                  } else if (tab === 'settings') {
                    setCurrentTab('settings');
                  } else if (tab === 'trial_qr') {
                    setIsTrialQrModalOpen(true);
                  } else if (tab === 'trial_students') {
                    setCurrentTab('trial_students');
                  } else if (tab === 'scanner') {
                    setCurrentTab('attendance');
                    setIsScannerOpen(true);
                  } else if (tab === 'kitchen_predictor') {
                    setIsKitchenEstimatorOpen(true);
                  } else if (tab === 'campaign_participants') {
                    setIsCampaignParticipantsOpen(true);
                  } else if (tab === 'predict_campaign_winner') {
                    setIsPredictCampaignOpen(true);
                  } else {
                    setCurrentTab(tab);
                  }
                }}
                messName={rules.messName}
                pendingLeavesCount={pendingLeavesCount}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenUniversalQr={() => setIsUniversalQrOpen(true)}
                onOpenTrialQr={() => setIsTrialQrModalOpen(true)}
                onOpenKitchenEstimator={() => setIsKitchenEstimatorOpen(true)}
                onOpenPredictCampaignResults={() => setIsPredictCampaignOpen(true)}
                onOpenCampaignParticipants={() => setIsCampaignParticipantsOpen(true)}
                onOpenWhatsAppDuesBot={() => setIsWhatsAppDuesBotOpen(true)}
                onOpenAttendanceIntegrity={() => setIsAttendanceIntegrityOpen(true)}
                onOpenMaharajCookSheet={() => setIsMaharajCookSheetOpen(true)}
                onOpenMessPnl={() => setIsMessPnlOpen(true)}
                onOpenDailyProfitDigest={() => setIsDailyProfitDigestOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onLogout={handleLogout}
                userEmail={currentUser?.identifier}
              />

              <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                {currentTab === 'dashboard' && (
                  <DashboardView
                    customers={customers}
                    mealLogs={mealLogs}
                    expenses={expenses}
                    workers={workers}
                    cleanings={cleanings}
                    rules={rules}
                    currentRole={currentRole}
                    onOpenScanner={() => setIsScannerOpen(true)}
                    onOpenUniversalQr={() => setIsUniversalQrOpen(true)}
                    onOpenTrialQr={() => setIsTrialQrModalOpen(true)}
                    onOpenKitchenEstimator={() => setIsKitchenEstimatorOpen(true)}
                    onOpenPredictCampaignResults={() => setIsPredictCampaignOpen(true)}
                    onOpenCampaignParticipants={() => setIsCampaignParticipantsOpen(true)}
                    onOpenWhatsAppDuesBot={() => setIsWhatsAppDuesBotOpen(true)}
                    onOpenAttendanceIntegrity={() => setIsAttendanceIntegrityOpen(true)}
                    onOpenMaharajCookSheet={() => setIsMaharajCookSheetOpen(true)}
                    onOpenMessPnl={() => setIsMessPnlOpen(true)}
                    onOpenDailyProfitDigest={() => setIsDailyProfitDigestOpen(true)}
                    onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
                    onOpenAddExpense={() => setCurrentTab('expenses')}
                    onOpenCardPrint={(c) => setSelectedCardPrintCustomer(c)}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                    onOpenRenew={(c) => setSelectedRenewCustomer(c)}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onNavigateTab={(tab) => {
                      if (tab === 'meals' || tab === 'attendance') {
                        setCurrentTab('attendance');
                      } else if (tab === 'add_customer') {
                        setIsAddCustomerOpen(true);
                      } else {
                        setCurrentTab(tab);
                      }
                    }}
                    onApproveLeave={handleApproveLeave}
                    onRejectLeave={handleRejectLeave}
                    onCreateTestLeave={handleCreateTestLeave}
                    onOpenLeaveApprovalsTab={() => {
                      setReportsInitialTab('leave_approvals');
                      setCurrentTab('reports');
                    }}
                  />
                )}

                {currentTab === 'customers' && (
                  <CustomersListView
                    customers={customers}
                    onOpenAddModal={() => setIsAddCustomerOpen(true)}
                    onOpenCardPrint={(c) => setSelectedCardPrintCustomer(c)}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                    onOpenRenew={(c) => setSelectedRenewCustomer(c)}
                    onOpenLeave={(c) => setSelected360Customer(c)}
                    onOpenPenalty={(c) => setSelectedPenaltyCustomer(c)}
                    onDeleteCustomer={handleDeleteCustomer}
                    onClearAllCustomers={handleClearAllCustomers}
                    onOpenWhatsAppDuesBot={() => setIsWhatsAppDuesBotOpen(true)}
                  />
                )}

                {currentTab === 'search_customer' && (
                  <SearchCustomerView
                    customers={customers}
                    mealLogs={mealLogs}
                    onBack={() => setCurrentTab('dashboard')}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                    onOpenRenew={(c) => setSelectedRenewCustomer(c)}
                    onOpenCardPrint={(c) => setSelectedCardPrintCustomer(c)}
                    onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
                    onRecordMeal={handleRecordManualAttendance}
                  />
                )}

                {currentTab === 'leaves' && (
                  <LeavesManagerView
                    customers={customers}
                    onBack={() => setCurrentTab('dashboard')}
                    onApproveLeave={handleApproveLeave}
                    onRejectLeave={handleRejectLeave}
                    onCreateTestLeave={handleCreateTestLeave}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                  />
                )}

                {currentTab === 'subscriptions' && (
                  <SubscriptionsView
                    customers={customers}
                    onBack={() => setCurrentTab('dashboard')}
                    onOpenRenew={(c) => setSelectedRenewCustomer(c)}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                    onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
                  />
                )}

                {(currentTab === 'attendance' || currentTab === 'meals') && (
                  <AttendanceCenterView
                    mealLogs={mealLogs}
                    customers={customers}
                    onOpenScanner={() => setIsScannerOpen(true)}
                    onOpenUniversalQr={() => setIsUniversalQrOpen(true)}
                    onRecordManualAttendance={handleRecordManualAttendance}
                    onRefreshLogs={() => {
                      fetchAttendanceLogsFromSupabase('63b00e12-a702-492f-bd56-1e260338699f').then(logs => {
                        if (logs && logs.length > 0) {
                          setMealLogs(prev => {
                            const map = new Map<string, MealLog>();
                            logs.forEach((l: any) => map.set(l.id, l));
                            prev.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });
                            const merged = Array.from(map.values()).sort(
                              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                            );
                            saveMealLogs(merged);
                            return merged;
                          });
                        }
                      });
                    }}
                  />
                )}

                {currentTab === 'finance' && (
                  <BillingOverviewView
                    customers={customers}
                    onBack={() => setCurrentTab('dashboard')}
                    onNavigateSubModule={(sub) => {
                      if (sub === 'statement_calc') {
                        setCurrentTab('monthly_statement');
                      } else if (sub === 'qr_settings') {
                        setCurrentTab('mess_qr');
                      } else {
                        setCurrentTab(sub);
                      }
                    }}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                  />
                )}

                {currentTab === 'billing' && (
                  <BillingOverviewView
                    customers={customers}
                    onBack={() => setCurrentTab('dashboard')}
                    onNavigateSubModule={(sub) => {
                      if (sub === 'statement_calc') {
                        setCurrentTab('monthly_statement');
                      } else if (sub === 'qr_settings') {
                        setCurrentTab('mess_qr');
                      } else {
                        setCurrentTab(sub);
                      }
                    }}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                  />
                )}

                {currentTab === 'upi_payments' && (
                  <UPIPaymentsView
                    customers={customers}
                    onBack={() => setCurrentTab('billing')}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                  />
                )}

                {currentTab === 'cash_payments' && (
                  <CashPaymentsView
                    customers={customers}
                    onBack={() => setCurrentTab('billing')}
                    onRefreshCustomers={() => {}}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                  />
                )}

                {currentTab === 'mess_qr' && (
                  <MessPaymentQrView
                    customers={customers}
                    onBack={() => setCurrentTab('billing')}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                  />
                )}

                {currentTab === 'payment_history' && (
                  <PaymentHistoryView
                    customers={customers}
                    onBack={() => setCurrentTab('billing')}
                    onRefreshCustomers={() => {}}
                  />
                )}

                {currentTab === 'pending_payments' && (
                  <PendingPaymentsView
                    customers={customers}
                    onBack={() => setCurrentTab('billing')}
                    onRefreshCustomers={() => {}}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                  />
                )}

                {currentTab === 'payment_verification' && (
                  <PaymentVerificationView
                    customers={customers}
                    onBack={() => setCurrentTab('billing')}
                    onRefreshCustomers={() => {}}
                  />
                )}

                {currentTab === 'customer_ledger' && (
                  <CustomerLedgerView
                    customers={customers}
                    onBack={() => setCurrentTab('billing')}
                  />
                )}

                {(currentTab === 'monthly_statement' || currentTab === 'monthly_statements') && (
                  <MonthlyStatementCalculatorView
                    customers={customers}
                    onBack={() => setCurrentTab('finance')}
                    onRecordPayment={handleRecordPayment}
                  />
                )}

                {currentTab === 'walkin_pos' && (
                  <WalkinPOSView
                    onBack={() => setCurrentTab('dashboard')}
                    onNavigateMealTypes={() => setCurrentTab('walkin_meal_types')}
                    onNavigateHistory={() => setCurrentTab('walkin_payments')}
                  />
                )}

                {currentTab === 'walkin_meal_types' && (
                  <WalkinMealTypesView
                    onBack={() => setCurrentTab('walkin_pos')}
                    onNavigatePOS={() => setCurrentTab('walkin_pos')}
                  />
                )}

                {currentTab === 'walkin_payments' && (
                  <WalkinPaymentsView
                    onBack={() => setCurrentTab('walkin_pos')}
                    onNavigatePOS={() => setCurrentTab('walkin_pos')}
                  />
                )}

                {currentTab === 'expenses' && (
                  <ExpensesView
                    expenses={expenses}
                    onAddExpense={handleAddExpense}
                    onDeleteExpense={handleDeleteExpense}
                  />
                )}

                {currentTab === 'inventory' && (
                  <InventoryCenterView
                    onBack={() => setCurrentTab('dashboard')}
                    customers={customers}
                    mealLogs={mealLogs}
                    expenses={expenses}
                    rules={rules}
                  />
                )}

                {currentTab === 'workers' && (
                  <WorkersAndKitchenView
                    workers={workers}
                    cleanings={cleanings}
                    customers={customers}
                    mealLogs={mealLogs}
                    onAddWorker={handleAddWorker}
                    onUpdateWorkerAttendance={handleUpdateWorkerAttendance}
                    onDeleteWorker={handleDeleteWorker}
                    onAddCleaning={handleAddCleaning}
                    onOpenKitchenEstimator={() => setIsKitchenEstimatorOpen(true)}
                    onOpenMaharajCookSheet={() => setIsMaharajCookSheetOpen(true)}
                  />
                )}

                {currentTab === 'staff_management' && (
                  <StaffManagementView
                    workers={workers}
                    cleanings={cleanings}
                    onBack={() => setCurrentTab('dashboard')}
                    onAddWorker={(workerData) => {
                      const completeWorker: Worker = {
                        ...workerData,
                        id: `wk-${Date.now()}`,
                        attendance: {}
                      };
                      handleAddWorker(completeWorker);
                    }}
                    onDeleteWorker={handleDeleteWorker}
                    onUpdateWorkerAttendance={handleUpdateWorkerAttendance}
                  />
                )}

                {currentTab === 'roles_permissions' && (
                  <RolesPermissionsView
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'weekly_menu' && (
                  <WeeklyMenuEditorView
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'polls' && (
                  <PollsManagerView
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'reminders' && (
                  <RemindersNoticesView
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'meal_ratings' && (
                  <MealRatingsView
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'complaints' && (
                  <ComplaintsTrackerView
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'my_mess' && (
                  <MyMessProfileView
                    messName={rules.messName}
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'my_account' && (
                  <MyMessProfileView
                    messName={rules.messName}
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'settings' && (
                  <MessSettingsView
                    rules={rules}
                    onBack={() => setCurrentTab('dashboard')}
                    onSaveRules={handleSaveRules}
                  />
                )}

                {currentTab === 'activity_log' && (
                  <SecurityActivityLogView
                    mealLogs={mealLogs}
                    onBack={() => setCurrentTab('dashboard')}
                    onOpenScanner={() => setIsScannerOpen(true)}
                  />
                )}

                {currentTab === 'help_support' && (
                  <HelpSupportView
                    onBack={() => setCurrentTab('dashboard')}
                    onNavigateSupportRequests={() => setCurrentTab('support_requests')}
                  />
                )}

                {currentTab === 'support_requests' && (
                  <SupportRequestsView
                    onBack={() => setCurrentTab('dashboard')}
                    onNavigateHelpSupport={() => setCurrentTab('help_support')}
                  />
                )}

                {currentTab === 'excel_export' && (
                  <ExcelExportHubView
                    customers={customers}
                    mealLogs={mealLogs}
                    expenses={expenses}
                    workers={workers}
                    trials={trials}
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'trial_students' && (
                  <TrialStudentsManagerView
                    onRefreshAllData={pullSyncFromServer}
                    onBack={() => setCurrentTab('dashboard')}
                    onOpenTrialQr={() => setIsTrialQrModalOpen(true)}
                  />
                )}

                {currentTab === 'reports' && (
                  <AuditAndReportsView
                    customers={customers}
                    expenses={expenses}
                    workers={workers}
                    trials={trials}
                    onOpenRenew={(c) => setSelectedRenewCustomer(c)}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                    onAddTrial={handleAddTrial}
                    onConvertTrialToCustomer={handleConvertTrialToCustomer}
                    onApproveLeave={handleApproveLeave}
                    onRejectLeave={handleRejectLeave}
                    onOpenTrialQr={() => setIsTrialQrModalOpen(true)}
                    onOpenPredictCampaignResults={() => setIsPredictCampaignOpen(true)}
                    initialTab={reportsInitialTab}
                    onTabChange={setReportsInitialTab}
                  />
                )}

                {currentTab === 'attendance_reports' && (
                  <AttendanceReportsView
                    mealLogs={mealLogs}
                    customers={customers}
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'customer_reports' && (
                  <CustomerReportsView
                    customers={customers}
                    onBack={() => setCurrentTab('dashboard')}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                  />
                )}

                {currentTab === 'payment_reports' && (
                  <PaymentReportsView
                    customers={customers}
                    onBack={() => setCurrentTab('dashboard')}
                    onOpenCustomer360={(c) => setSelected360Customer(c)}
                  />
                )}

                {currentTab === 'expense_reports' && (
                  <ExpenseReportsView
                    expenses={expenses}
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}

                {currentTab === 'business_summary' && (
                  <BusinessSummaryView
                    customers={customers}
                    expenses={expenses}
                    trials={trials}
                    onBack={() => setCurrentTab('dashboard')}
                  />
                )}
              </main>

              <footer className="py-4 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">
                    {rules.messName} • Digital Dining & Mess Operations Management
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      Near Boys & Girls Hostel, College Road
                    </span>
                  </div>
                </div>
              </footer>
            </div>

            {/* Owner Desk Modals */}
            <QrScannerModal
              isOpen={isScannerOpen}
              onClose={() => setIsScannerOpen(false)}
              customers={customers}
              mealLogs={mealLogs}
              rules={rules}
              onRecordMeal={handleRecordMeal}
              onOpenPayment={(c) => setSelectedPaymentCustomer(c)}
              userRole={currentRole}
            />

            <AddCustomerModal
              isOpen={isAddCustomerOpen}
              onClose={() => setIsAddCustomerOpen(false)}
              onAddCustomer={handleAddCustomer}
              onAdd={async (c) => {
                handleAddCustomer(c);
                await syncCustomerToSupabase(c, '63b00e12-a702-492f-bd56-1e260338699f');
                return { success: true };
              }}
              existingCount={customers.length}
              messId="63b00e12-a702-492f-bd56-1e260338699f"
              rules={rules}
            />

            <Customer360Modal
              customer={selected360Customer}
              isOpen={!!selected360Customer}
              onClose={() => setSelected360Customer(null)}
              onOpenPrintPass={(c) => {
                setSelected360Customer(null);
                setSelectedCardPrintCustomer(c);
              }}
              onOpenRenew={(c) => {
                setSelected360Customer(null);
                setSelectedRenewCustomer(c);
              }}
              onOpenPayment={(c) => {
                setSelected360Customer(null);
                setSelectedPaymentCustomer(c);
              }}
              onCustomerUpdated={() => {
                // optionally refresh
              }}
            />

            <CustomerCardPrintModal
              customer={selectedCardPrintCustomer}
              isOpen={!!selectedCardPrintCustomer}
              onClose={() => setSelectedCardPrintCustomer(null)}
              messName={rules.messName}
              messSubtitle={rules.messSubtitle}
            />

            <RenewalModal
              customer={selectedRenewCustomer}
              isOpen={!!selectedRenewCustomer}
              onClose={() => setSelectedRenewCustomer(null)}
              onRenew={handleRenew}
            />

            <PaymentModal
              customer={selectedPaymentCustomer}
              isOpen={!!selectedPaymentCustomer}
              onClose={() => setSelectedPaymentCustomer(null)}
              onRecordPayment={handleRecordPayment}
            />

            <PenaltyModal
              customer={selectedPenaltyCustomer}
              isOpen={!!selectedPenaltyCustomer}
              onClose={() => setSelectedPenaltyCustomer(null)}
              onApplyPenalty={handleApplyPenalty}
            />

            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              rules={rules}
              onSaveRules={handleSaveRules}
              currentRole={currentRole}
            />

            <PredictCampaignResultsModal
              isOpen={isPredictCampaignOpen}
              onClose={() => setIsPredictCampaignOpen(false)}
            />

            <PortalSwitcherModal
              isOpen={isPortalSwitcherOpen}
              onClose={() => setIsPortalSwitcherOpen(false)}
              onSelectOwner={() => setCurrentPortal('owner')}
              onSelectStudent={(c) => {
                if (c) {
                  setSelectedStudentCustomer(c);
                  setCurrentPortal('student');
                } else if (customers.length > 0) {
                  setSelectedStudentCustomer(customers[0]);
                  setCurrentPortal('student');
                } else {
                  alert('Please register at least one student member first.');
                }
              }}
              customers={customers}
              currentPortal={currentPortal}
            />

            <UniversalQrManagerModal
              isOpen={isUniversalQrOpen}
              onClose={() => setIsUniversalQrOpen(false)}
              messId="63b00e12-a702-492f-bd56-1e260338699f"
              customers={customers}
              messName={rules.messName}
              onAttendanceRecorded={() => {
                fetchAttendanceLogsFromSupabase('63b00e12-a702-492f-bd56-1e260338699f').then(logs => {
                  if (logs && logs.length > 0) {
                    setMealLogs(prev => {
                      const map = new Map<string, MealLog>();
                      logs.forEach((l: any) => map.set(l.id, l));
                      prev.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });
                      const merged = Array.from(map.values()).sort(
                        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                      );
                      saveMealLogs(merged);
                      return merged;
                    });
                  }
                });
              }}
            />

            <TrialQrModal
              isOpen={isTrialQrModalOpen}
              onClose={() => setIsTrialQrModalOpen(false)}
              rules={rules}
              onOpenLivePreview={() => {
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('portal', 'trial');
                  window.history.pushState({}, '', url.toString());
                }
                setIsTrialScanMode(true);
              }}
            />

            <NotificationCenterModal
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              notifications={notifications}
              onMarkAsRead={async (id) => {
                await markNotificationAsRead(id);
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
              }}
              onMarkAllAsRead={async () => {
                await markAllNotificationsAsRead('63b00e12-a702-492f-bd56-1e260338699f');
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
              }}
              onDeleteNotification={async (id) => {
                await deleteOwnerNotification(id);
                setNotifications(prev => prev.filter(n => n.id !== id));
              }}
              onClearAllRead={async () => {
                await clearAllReadOwnerNotifications('63b00e12-a702-492f-bd56-1e260338699f');
                setNotifications(prev => prev.filter(n => !n.isRead));
              }}
              onSelectRecord={(type, customerId) => {
                if (customerId) {
                  const matched = customers.find(
                    c => c.id.trim().toLowerCase() === customerId.trim().toLowerCase()
                  );
                  if (matched) {
                    setSelected360Customer(matched);
                  } else {
                    console.warn('Customer not found for notification ID:', customerId);
                  }
                }
              }}
              onRefresh={() => {
                setIsNotificationsLoading(true);
                fetchOwnerNotifications('63b00e12-a702-492f-bd56-1e260338699f').then(data => {
                  setNotifications(data || []);
                  setIsNotificationsLoading(false);
                });
              }}
              isLoading={isNotificationsLoading}
            />

            {/* Campaign Participants Hub Modal */}
            <CampaignParticipantsHubModal
              isOpen={isCampaignParticipantsOpen}
              onClose={() => setIsCampaignParticipantsOpen(false)}
              customers={customers}
            />

            {/* Predict Campaign Results AI Winners Modal */}
            <PredictCampaignResultsModal
              isOpen={isPredictCampaignOpen}
              onClose={() => setIsPredictCampaignOpen(false)}
              customers={customers}
            />

            {/* Kitchen Preparation Estimator Modal */}
            <KitchenEstimatorModal
              isOpen={isKitchenEstimatorOpen}
              onClose={() => setIsKitchenEstimatorOpen(false)}
              customers={customers}
              rules={rules}
              mealLogs={mealLogs}
              onNavigateInventory={() => {
                setIsKitchenEstimatorOpen(false);
                setCurrentTab('inventory');
              }}
            />

            {/* Zero-Cost Auto-Pilot WhatsApp Dues Recovery Bot */}
            <WhatsAppDuesBotModal
              isOpen={isWhatsAppDuesBotOpen}
              onClose={() => setIsWhatsAppDuesBotOpen(false)}
              customers={customers}
              rules={rules}
              onRefreshCustomers={() => {
                setCustomers(loadCustomers());
              }}
            />

            {/* Gate Scanner Attendance Integrity & Anti-Theft AI */}
            <AttendanceIntegrityModal
              isOpen={isAttendanceIntegrityOpen}
              onClose={() => setIsAttendanceIntegrityOpen(false)}
              mealLogs={mealLogs}
              customers={customers}
              leaves={[]}
              rules={rules}
              onApplyPenalty={(customerId, amount, reason) => {
                handleApplyPenalty(customerId, amount, reason);
              }}
            />

            {/* Maharaj Daily Auto Cook Sheet & Ration AI */}
            <KitchenCookSheetModal
              isOpen={isMaharajCookSheetOpen}
              onClose={() => setIsMaharajCookSheetOpen(false)}
              customers={customers}
              leaves={[]}
              rules={rules}
              mealLogs={mealLogs}
            />

            {/* Smart Mess P&L & Cost-Per-Plate AI Dashboard */}
            <MessPnlCostPerPlateModal
              isOpen={isMessPnlOpen}
              onClose={() => setIsMessPnlOpen(false)}
              customers={customers}
              mealLogs={mealLogs}
              expenses={expenses}
              workers={workers}
              rules={rules}
              onOpenAddExpense={() => {
                setIsMessPnlOpen(false);
                setCurrentTab('expenses');
              }}
              onOpenWhatsAppDues={() => {
                setIsMessPnlOpen(false);
                setIsWhatsAppDuesBotOpen(true);
              }}
            />

            {/* Daily 11 PM Owner Profit Digest & Closing EOD Modal */}
            <DailyProfitDigestModal
              isOpen={isDailyProfitDigestOpen}
              onClose={() => setIsDailyProfitDigestOpen(false)}
              customers={customers}
              mealLogs={mealLogs}
              expenses={expenses}
              workers={workers}
              rules={rules}
            />
          </>
        )
      )}
    </div>
  );
}

export default App;
