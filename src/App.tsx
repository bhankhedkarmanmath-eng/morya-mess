import React, { useState, useEffect } from 'react';
import { Customer, MealLog, Expense, Worker, CleaningInspection, BusinessRulesConfig, UserRole, TrialVisitor, ScanEligibility, MealType } from './types/mess';
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
  loadRules, 
  saveRules, 
  loadTrials, 
  saveTrials,
  getTodayString,
  getCurrentMealType
} from './lib/storage';
import { 
  syncWithSupabase, 
  syncCustomerToSupabase, 
  syncMealLogToSupabase, 
  syncExpenseToSupabase,
  subscribeToAttendanceLogs,
  fetchAttendanceLogsFromSupabase,
  ensureCustomerSyncedToSupabase
} from './lib/supabaseSync';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { CustomersListView } from './components/CustomersListView';
import { MealLogsView } from './components/MealLogsView';
import { ExpensesView } from './components/ExpensesView';
import { WorkersAndKitchenView } from './components/WorkersAndKitchenView';
import { AuditAndReportsView } from './components/AuditAndReportsView';
import { QrScannerModal } from './components/QrScannerModal';
import { UniversalQrManagerModal } from './components/UniversalQrManagerModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { Customer360Modal } from './components/Customer360Modal';
import { CustomerCardPrintModal } from './components/CustomerCardPrintModal';
import { RenewalModal } from './components/RenewalModal';
import { PaymentModal } from './components/PaymentModal';
import { PenaltyModal } from './components/PenaltyModal';
import { SettingsModal } from './components/SettingsModal';
import { StudentPortalView } from './components/StudentPortalView';
import { PortalSwitcherModal } from './components/PortalSwitcherModal';
import { GanpatiSplash } from './components/GanpatiSplash';
import { PortalSelectionScreen } from './components/PortalSelectionScreen';
import { LoginScreen } from './components/LoginScreen';
import { SetNewPasswordScreen } from './components/SetNewPasswordScreen';
import { 
  AuthState, 
  AuthPortal, 
  AuthenticatedUser, 
  getSavedSession, 
  performSignOut 
} from './lib/authService';
import { supabase } from './lib/supabase';

export function App() {
  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);

  // Authentication & Role-Based Access State
  const [authState, setAuthState] = useState<AuthState>('PORTAL_CHOICE');
  const [selectedPortal, setSelectedPortal] = useState<AuthPortal>('owner');
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [pendingResetUser, setPendingResetUser] = useState<AuthenticatedUser | null>(null);

  // Core domain state
  const [customers, setCustomers] = useState<Customer[]>(() => loadCustomers());
  const [mealLogs, setMealLogs] = useState<MealLog[]>(() => loadMealLogs());
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [workers, setWorkers] = useState<Worker[]>(() => loadWorkers());
  const [cleanings, setCleanings] = useState<CleaningInspection[]>(() => loadCleanings());
  const [rules, setRules] = useState<BusinessRulesConfig>(() => loadRules());
  const [trials, setTrials] = useState<TrialVisitor[]>(() => loadTrials());

  // UI state
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'customers' | 'meals' | 'expenses' | 'workers' | 'reports'>('dashboard');
  const [reportsInitialTab, setReportsInitialTab] = useState<'pnl' | 'expiry_watch' | 'trials' | 'leave_approvals'>('pnl');
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [currentPortal, setCurrentPortal] = useState<'owner' | 'student'>('owner');
  const [studentPortalCustomer, setStudentPortalCustomer] = useState<Customer | null>(null);

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUniversalQrOpen, setIsUniversalQrOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPortalSwitcherOpen, setIsPortalSwitcherOpen] = useState(false);

  // Target Customer modals
  const [selected360Customer, setSelected360Customer] = useState<Customer | null>(null);
  const [selectedPrintCustomer, setSelectedPrintCustomer] = useState<Customer | null>(null);
  const [selectedRenewCustomer, setSelectedRenewCustomer] = useState<Customer | null>(null);
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<Customer | null>(null);
  const [selectedPenaltyCustomer, setSelectedPenaltyCustomer] = useState<Customer | null>(null);

  // Check existing session on mount
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const mustReset = session.user.user_metadata?.must_change_password === true;
          const role = (session.user.user_metadata?.role as UserRole) || 'owner';
          const user: AuthenticatedUser = {
            id: session.user.id,
            identifier: session.user.email || 'owner',
            name: session.user.user_metadata?.full_name || 'Mess Owner',
            role,
            mustChangePassword: mustReset
          };

          if (mustReset) {
            setPendingResetUser(user);
            setAuthState('SET_NEW_PASSWORD');
          } else {
            setAuthenticatedUser(user);
            setCurrentRole(role);
            setCurrentPortal('owner');
            setAuthState('AUTHENTICATED');
          }
          return;
        }

        // Active session check
        const saved = getSavedSession();
        if (saved) {
          if (saved.mustChangePassword) {
            setPendingResetUser(saved);
            setAuthState('SET_NEW_PASSWORD');
          } else {
            setAuthenticatedUser(saved);
            if (saved.role === 'student') {
              setCurrentPortal('student');
              if (saved.studentCustomer) {
                setStudentPortalCustomer(saved.studentCustomer);
              }
            } else {
              setCurrentRole(saved.role as UserRole);
              setCurrentPortal('owner');
            }
            setAuthState('AUTHENTICATED');
          }
        } else {
          setAuthState('PORTAL_CHOICE');
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          setAuthenticatedUser(null);
          setPendingResetUser(null);
          setStudentPortalCustomer(null);
          setCurrentPortal('owner');
          setAuthState('PORTAL_CHOICE');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Secure logout handler
  const handleLogout = async () => {
    await performSignOut();
    setAuthenticatedUser(null);
    setPendingResetUser(null);
    setStudentPortalCustomer(null);
    setCurrentPortal('owner');
    setAuthState('PORTAL_CHOICE');
  };

  // Real-time synchronization with Supabase on mount
  useEffect(() => {
    let isMounted = true;

    // Ensure all locally stored customers exist in Supabase customers & subscriptions
    const existingLocal = loadCustomers();
    existingLocal.forEach(c => {
      ensureCustomerSyncedToSupabase(c, '63b00e12-a702-492f-bd56-1e260338699f');
    });

    syncWithSupabase({
      onCustomersSynced: (remoteCusts) => {
        if (isMounted && remoteCusts && remoteCusts.length > 0) {
          setCustomers(prev => {
            const map = new Map<string, Customer>();
            remoteCusts.forEach(c => map.set(c.id, c));
            prev.forEach(c => {
              if (!map.has(c.id)) {
                map.set(c.id, c);
                ensureCustomerSyncedToSupabase(c, '63b00e12-a702-492f-bd56-1e260338699f');
              }
            });
            const merged = Array.from(map.values());
            saveCustomers(merged);
            return merged;
          });
        }
      },
      onMealLogsSynced: (m) => {
        if (isMounted) {
          setMealLogs(m);
          saveMealLogs(m);
        }
      },
      onExpensesSynced: (e) => {
        if (isMounted) {
          setExpenses(e);
          saveExpenses(e);
        }
      }
    });

    const unsubAttendance = subscribeToAttendanceLogs('63b00e12-a702-492f-bd56-1e260338699f', () => {
      fetchAttendanceLogsFromSupabase('63b00e12-a702-492f-bd56-1e260338699f').then(logs => {
        if (logs && logs.length > 0 && isMounted) {
          setMealLogs(prev => {
            const map = new Map<string, MealLog>();
            logs.forEach(l => map.set(l.id, l));
            prev.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });
            const merged = Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            saveMealLogs(merged);
            return merged;
          });
        }
      });
    });

    return () => {
      isMounted = false;
      unsubAttendance();
    };
  }, []);

  // Save changes to localStorage whenever state updates
  useEffect(() => {
    saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveMealLogs(mealLogs);
  }, [mealLogs]);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveWorkers(workers);
  }, [workers]);

  useEffect(() => {
    saveCleanings(cleanings);
  }, [cleanings]);

  useEffect(() => {
    saveRules(rules);
  }, [rules]);

  useEffect(() => {
    saveTrials(trials);
  }, [trials]);

  // Keep student portal customer in sync
  useEffect(() => {
    if (studentPortalCustomer) {
      const updated = customers.find(c => c.id === studentPortalCustomer.id);
      if (updated) {
        setStudentPortalCustomer(updated);
      }
    }
  }, [customers]);

  // Handler: Add Customer
  const handleAddCustomer = (newCustomer: Customer) => {
    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    saveCustomers(updated);
    ensureCustomerSyncedToSupabase(newCustomer, '63b00e12-a702-492f-bd56-1e260338699f');
  };

  // Handler: Delete Customer
  const handleDeleteCustomer = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    saveCustomers(updated);
  };

  // Handler: Clear All Customers
  const handleClearAllCustomers = () => {
    setCustomers([]);
    saveCustomers([]);
  };

  // Handler: Record Meal Scan
  const handleRecordMeal = (
    customerId: string, 
    scanStatus: ScanEligibility, 
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
      scanStatus,
      reason,
      overrideNotes
    };

    const updatedLogs = [newLog, ...mealLogs];
    setMealLogs(updatedLogs);
    saveMealLogs(updatedLogs);
    syncMealLogToSupabase(newLog);
  };

  // Handler: Renew Customer
  const handleRenewCustomer = (
    customerId: string, 
    newStart: string, 
    newEnd: string, 
    amount: number, 
    paid: number, 
    notes?: string
  ) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const renewalEntry = {
        id: `rn-${Date.now()}`,
        newStartDate: newStart,
        newEndDate: newEnd,
        planName: c.planType,
        amount,
        paidAmount: paid,
        date: getTodayString(),
        paymentMethod: 'cash' as const,
        renewedBy: 'Owner',
        notes: notes || 'Subscription Renewal'
      };

      const newBalance = Math.max(0, (c.balance || 0) + (amount - paid));

      const updatedCustomer: Customer = {
        ...c,
        startDate: newStart,
        endDate: newEnd,
        status: 'active' as const,
        balance: newBalance,
        renewals: [...(c.renewals || []), renewalEntry]
      };

      syncCustomerToSupabase(updatedCustomer);
      return updatedCustomer;
    });

    setCustomers(updated);
    saveCustomers(updated);
  };

  // Handler: Collect Payment
  const handleRecordPayment = (
    customerId: string, 
    amount: number, 
    mode: 'cash' | 'upi' | 'bank_transfer', 
    notes?: string
  ) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const paymentEntry = {
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
        payments: [...(c.payments || []), paymentEntry]
      };

      syncCustomerToSupabase(updatedCustomer);
      return updatedCustomer;
    });

    setCustomers(updated);
    saveCustomers(updated);
  };

  // Handler: Apply Penalty
  const handleApplyPenalty = (customerId: string, amount: number, reason: string) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const penaltyEntry = {
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
        penalties: [...(c.penalties || []), penaltyEntry]
      };

      syncCustomerToSupabase(updatedCustomer);
      return updatedCustomer;
    });

    setCustomers(updated);
    saveCustomers(updated);
  };

  // Handler: Add Expense
  const handleAddExpense = (expense: Expense) => {
    const updated = [expense, ...expenses];
    setExpenses(updated);
    saveExpenses(updated);
    syncExpenseToSupabase(expense);
  };

  // Handler: Delete Expense
  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveExpenses(updated);
  };

  // Handler: Add Worker
  const handleAddWorker = (worker: Worker) => {
    const updated = [worker, ...workers];
    setWorkers(updated);
    saveWorkers(updated);
  };

  // Handler: Update Worker Attendance
  const handleUpdateWorkerAttendance = (workerId: string, date: string, status: 'present' | 'absent' | 'half_day') => {
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

  // Handler: Delete Worker
  const handleDeleteWorker = (id: string) => {
    const updated = workers.filter(w => w.id !== id);
    setWorkers(updated);
    saveWorkers(updated);
  };

  // Handler: Add Cleaning
  const handleAddCleaning = (cleaning: CleaningInspection) => {
    const updated = [cleaning, ...cleanings];
    setCleanings(updated);
    saveCleanings(updated);
  };

  // Handler: Save Rules
  const handleSaveRules = (updatedRules: BusinessRulesConfig) => {
    setRules(updatedRules);
    saveRules(updatedRules);
  };

  // Handler: Add Trial
  const handleAddTrial = (trial: TrialVisitor) => {
    const updated = [trial, ...trials];
    setTrials(updated);
    saveTrials(updated);
  };

  // Handler: Convert Trial to Customer
  const handleConvertTrialToCustomer = (trial: TrialVisitor) => {
    const today = getTodayString();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const standardFee = trial.gender === 'female' 
      ? (rules.femaleFullRate || 2500) 
      : (rules.maleFullRate || 3000);

    const newCustomer: Customer = {
      id: `MM-${new Date().getFullYear()}-${String(customers.length + 1).padStart(3, '0')}`,
      name: trial.name,
      phone: trial.phone,
      gender: trial.gender,
      startDate: today,
      endDate: endDate.toISOString().split('T')[0],
      planType: 'monthly_2meals',
      totalAmount: standardFee,
      paidAmount: trial.amountPaid, // credit trial payment towards monthly fee!
      balance: Math.max(0, standardFee - trial.amountPaid),
      status: 'active',
      collegeOrWork: trial.college,
      qrToken: `MORYA-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      qrVersion: 1,
      createdAt: new Date().toISOString()
    };

    // Mark trial converted
    const updatedTrials = trials.map(t => t.id === trial.id ? { ...t, convertedToMonthly: true } : t);
    setTrials(updatedTrials);
    saveTrials(updatedTrials);

    handleAddCustomer(newCustomer);
    setCurrentTab('customers');
  };

  // Handler: Student requests vacation leave
  const handleRequestLeave = (customerId: string, startDate: string, endDate: string, reason: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const leaveEntry = {
        id: `lv-${Date.now()}`,
        startDate,
        endDate,
        days,
        reason,
        approved: false, // Pending owner approval
        createdAt: new Date().toISOString()
      };

      const updatedCustomer = {
        ...c,
        leaves: [...(c.leaves || []), leaveEntry]
      };

      syncCustomerToSupabase(updatedCustomer);
      return updatedCustomer;
    });

    setCustomers(updated);
    saveCustomers(updated);
  };

  // Handler: Owner Approves Leave
  const handleApproveLeave = (customerId: string, leaveId: string, days: number) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const oldEnd = new Date(c.endDate);
      oldEnd.setDate(oldEnd.getDate() + days);
      const newEndDate = oldEnd.toISOString().split('T')[0];

      const updatedLeaves = (c.leaves || []).map(l => l.id === leaveId ? { ...l, approved: true } : l);

      const updatedCustomer: Customer = {
        ...c,
        endDate: newEndDate,
        leaves: updatedLeaves
      };

      syncCustomerToSupabase(updatedCustomer);
      return updatedCustomer;
    });

    setCustomers(updated);
    saveCustomers(updated);
  };

  // Handler: Owner Rejects Leave
  const handleRejectLeave = (customerId: string, leaveId: string) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const updatedLeaves = (c.leaves || []).filter(l => l.id !== leaveId);
      const updatedCustomer = {
        ...c,
        leaves: updatedLeaves
      };
      syncCustomerToSupabase(updatedCustomer);
      return updatedCustomer;
    });

    setCustomers(updated);
    saveCustomers(updated);
  };

  // Helper: Create a sample leave request for instant testing
  const handleCreateTestLeave = () => {
    if (customers.length === 0) {
      alert('Please register at least one member first to test the leave desk.');
      return;
    }
    const target = customers[0];
    const today = getTodayString();
    const end = new Date();
    end.setDate(end.getDate() + 4);
    const endStr = end.toISOString().split('T')[0];

    handleRequestLeave(target.id, today, endStr, 'Diwali Festival & Semester Vacation Break');
    setCurrentTab('dashboard');
  };

  // Leaves pending count
  const pendingLeavesCount = customers.flatMap(c => c.leaves || []).filter(l => !l.approved).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col selection:bg-orange-100 selection:text-orange-900">
      {/* Ganpati & Brand Splash Screen */}
      {showSplash && (
        <GanpatiSplash
          onFinish={() => setShowSplash(false)}
          onEnter={() => setShowSplash(false)}
          messName={rules.messName}
          messSubtitle={rules.messSubtitle}
        />
      )}

      {/* 1. STARTING SCREEN & AUTHENTICATION FLOW */}
      {!showSplash && authState === 'PORTAL_CHOICE' && (
        <PortalSelectionScreen
          onSelectPortal={(portal) => {
            setSelectedPortal(portal);
            setAuthState('LOGIN');
          }}
          messName={rules.messName}
          messSubtitle={rules.messSubtitle}
        />
      )}

      {/* 2. LOGIN SCREEN */}
      {!showSplash && authState === 'LOGIN' && (
        <LoginScreen
          portal={selectedPortal}
          onBack={() => setAuthState('PORTAL_CHOICE')}
          onRequirePasswordReset={(user) => {
            setPendingResetUser(user);
            setAuthState('SET_NEW_PASSWORD');
          }}
          onAuthenticated={(user) => {
            setAuthenticatedUser(user);
            if (user.role === 'student') {
              if (user.studentCustomer) {
                setStudentPortalCustomer(user.studentCustomer);
              }
              setCurrentPortal('student');
            } else {
              setCurrentPortal('owner');
              setCurrentRole(user.role as UserRole);
            }
            setAuthState('AUTHENTICATED');
          }}
          allCustomers={customers}
          messName={rules.messName}
        />
      )}

      {/* 3. SET NEW PERMANENT PASSWORD SCREEN (BLOCKS DASHBOARD ACCESS) */}
      {!showSplash && authState === 'SET_NEW_PASSWORD' && pendingResetUser && (
        <SetNewPasswordScreen
          user={pendingResetUser}
          onPasswordSetSuccessfully={(updatedUser) => {
            setPendingResetUser(null);
            setAuthenticatedUser(updatedUser);
            if (updatedUser.role === 'student') {
              if (updatedUser.studentCustomer) {
                setStudentPortalCustomer(updatedUser.studentCustomer);
              }
              setCurrentPortal('student');
            } else {
              setCurrentPortal('owner');
              setCurrentRole(updatedUser.role as UserRole);
            }
            setAuthState('AUTHENTICATED');
          }}
          onCancel={handleLogout}
          messName={rules.messName}
        />
      )}

      {/* 4. AUTHENTICATED ACCESS ONLY */}
      {!showSplash && authState === 'AUTHENTICATED' && (
        currentPortal === 'student' && (studentPortalCustomer || authenticatedUser?.studentCustomer) ? (
          <StudentPortalView
            customer={studentPortalCustomer || authenticatedUser!.studentCustomer!}
            allCustomers={[studentPortalCustomer || authenticatedUser!.studentCustomer!]}
            mealLogs={mealLogs.filter(m => m.customerId === (studentPortalCustomer?.id || authenticatedUser?.studentCustomer?.id))}
            onSwitchCustomer={(c) => setStudentPortalCustomer(c)}
            onExitPortal={handleLogout}
            onRequestLeave={handleRequestLeave}
            onMealLogged={(newLog) => {
              setMealLogs(prev => {
                const updated = [newLog, ...prev.filter(m => m.id !== newLog.id)];
                saveMealLogs(updated);
                return updated;
              });
            }}
            messName={rules.messName}
            messSubtitle={rules.messSubtitle}
          />
        ) : (
          <>
            {/* OWNER / MANAGER APP VIEW */}
            <div className="flex-1 flex flex-col">
            {/* Top Sticky Header */}
            <Navigation
              currentTab={currentTab}
              onTabChange={setCurrentTab}
              currentRole={currentRole}
              onRoleChange={setCurrentRole}
              onOpenScanner={() => setIsScannerOpen(true)}
              onOpenUniversalQr={() => setIsUniversalQrOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              messName={rules.messName}
              pendingLeavesCount={pendingLeavesCount}
              onLogout={handleLogout}
              userEmail={authenticatedUser?.identifier}
              onSwitchPortal={() => {
                if (customers.length > 0) {
                  setStudentPortalCustomer(customers[0]);
                  setCurrentPortal('student');
                } else {
                  setIsPortalSwitcherOpen(true);
                }
              }}
            />

          {/* Main Content Body */}
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
                onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
                onOpenAddExpense={() => setCurrentTab('expenses')}
                onOpenCardPrint={(c) => setSelectedPrintCustomer(c)}
                onOpenCustomer360={(c) => setSelected360Customer(c)}
                onOpenRenew={(c) => setSelectedRenewCustomer(c)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onNavigateTab={setCurrentTab}
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
                onOpenCardPrint={(c) => setSelectedPrintCustomer(c)}
                onOpenCustomer360={(c) => setSelected360Customer(c)}
                onOpenRenew={(c) => setSelectedRenewCustomer(c)}
                onOpenLeave={(c) => {
                  setSelected360Customer(c);
                }}
                onOpenPenalty={(c) => setSelectedPenaltyCustomer(c)}
                onDeleteCustomer={handleDeleteCustomer}
                onClearAllCustomers={handleClearAllCustomers}
              />
            )}

            {currentTab === 'meals' && (
              <MealLogsView
                mealLogs={mealLogs}
                onOpenScanner={() => setIsScannerOpen(true)}
              />
            )}

            {currentTab === 'expenses' && (
              <ExpensesView
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {currentTab === 'workers' && (
              <WorkersAndKitchenView
                workers={workers}
                cleanings={cleanings}
                onAddWorker={handleAddWorker}
                onUpdateWorkerAttendance={handleUpdateWorkerAttendance}
                onDeleteWorker={handleDeleteWorker}
                onAddCleaning={handleAddCleaning}
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
                initialTab={reportsInitialTab}
                onTabChange={setReportsInitialTab}
              />
            )}
          </main>

          {/* Minimal Clean Footer */}
          <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="font-semibold text-slate-600">
                {rules.messName} • Digital Dining & Mess Operations Management
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPortalSwitcherOpen(true)}
                  className="text-orange-700 font-bold hover:underline cursor-pointer"
                >
                  Portal Switcher
                </button>
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-400">Near Boys & Girls Hostel, College Road</span>
              </div>
            </div>
          </footer>
        </div>

        {/* MODALS */}
      {/* 1. Gate QR Scanner Modal */}
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

      {/* 2. Register Member Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onAddCustomer={handleAddCustomer}
        onAdd={async (customer) => {
          handleAddCustomer(customer);
          await ensureCustomerSyncedToSupabase(customer, '63b00e12-a702-492f-bd56-1e260338699f');
          return { success: true };
        }}
        existingCount={customers.length}
        messId="63b00e12-a702-492f-bd56-1e260338699f"
        rules={rules}
      />

      {/* 3. Customer 360 Profile Modal */}
      <Customer360Modal
        customer={selected360Customer}
        isOpen={!!selected360Customer}
        onClose={() => setSelected360Customer(null)}
        mealLogs={mealLogs}
        rules={rules}
        onOpenPrintPass={(c: Customer) => {
          setSelected360Customer(null);
          setSelectedPrintCustomer(c);
        }}
        onOpenRenew={(c: Customer) => {
          setSelected360Customer(null);
          setSelectedRenewCustomer(c);
        }}
        onOpenPayment={(c: Customer) => {
          setSelected360Customer(null);
          setSelectedPaymentCustomer(c);
        }}
        onOpenPenalty={(c: Customer) => {
          setSelected360Customer(null);
          setSelectedPenaltyCustomer(c);
        }}
        onUpdateCustomer={(updated) => {
          const newCustomers = customers.map(c => c.id === updated.id ? updated : c);
          setCustomers(newCustomers);
          saveCustomers(newCustomers);
          syncCustomerToSupabase(updated);
          setSelected360Customer(updated);
        }}
      />

      {/* 4. Print & Digital Pass Card Modal */}
      <CustomerCardPrintModal
        customer={selectedPrintCustomer}
        isOpen={!!selectedPrintCustomer}
        onClose={() => setSelectedPrintCustomer(null)}
        messName={rules.messName}
        messSubtitle={rules.messSubtitle}
      />

      {/* 5. Renewal Modal */}
      <RenewalModal
        customer={selectedRenewCustomer}
        isOpen={!!selectedRenewCustomer}
        onClose={() => setSelectedRenewCustomer(null)}
        onRenew={handleRenewCustomer}
      />

      {/* 6. Payment / Collect Dues Modal */}
      <PaymentModal
        customer={selectedPaymentCustomer}
        isOpen={!!selectedPaymentCustomer}
        onClose={() => setSelectedPaymentCustomer(null)}
        onRecordPayment={handleRecordPayment}
      />

      {/* 7. Penalty Modal */}
      <PenaltyModal
        customer={selectedPenaltyCustomer}
        isOpen={!!selectedPenaltyCustomer}
        onClose={() => setSelectedPenaltyCustomer(null)}
        onApplyPenalty={handleApplyPenalty}
      />

      {/* 8. Settings & Rules Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rules={rules}
        onSaveRules={handleSaveRules}
        currentRole={currentRole}
      />

      {/* 9. Portal Switcher Modal */}
      <PortalSwitcherModal
        isOpen={isPortalSwitcherOpen}
        onClose={() => setIsPortalSwitcherOpen(false)}
        onSelectOwner={() => setCurrentPortal('owner')}
        onSelectStudent={(c) => {
          if (c) {
            setStudentPortalCustomer(c);
            setCurrentPortal('student');
          } else if (customers.length > 0) {
            setStudentPortalCustomer(customers[0]);
            setCurrentPortal('student');
          } else {
            alert('Please register at least one student member first.');
          }
        }}
        customers={customers}
        currentPortal={currentPortal}
      />

      {/* 10. Universal Mess Counter Standee QR Modal */}
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
                logs.forEach(l => map.set(l.id, l));
                prev.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });
                const merged = Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                saveMealLogs(merged);
                return merged;
              });
            }
          });
        }}
      />
          </>
        )
      )}
    </div>
  );
}
export default App;
