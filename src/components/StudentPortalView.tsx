import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { 
  Customer, 
  MealLog, 
  MessShiftAudit, 
  SupabasePaymentRecord,
  StudentPoll, 
  MessReminderNotice, 
  WeeklyMenuSchedule,
  MealRatingReview,
  CustomerComplaint,
  CleanPlateNomination
} from '../types/mess';
import { calculateDaysRemaining, getTodayString, getStandardFee, evaluateStrictMessShift } from '../lib/storage';
import { validateAndRecordStudentAttendance } from '../lib/supabaseSync';
import { 
  fetchMessUpiConfig, 
  recordNewPaymentInSupabase, 
  fetchPaymentsFromSupabase, 
  MessUpiConfig,
  fetchStudentLeaveRequests,
  submitStudentLeaveRequest,
  fetchStudentAttendanceLogs,
  fetchWeeklyMenuFromSupabase,
  fetchStudentNotifications,
  markNotificationRead,
  fetchPollsFromSupabase,
  submitStudentVote,
  fetchMealRatingsFromSupabase,
  submitMealRating,
  fetchAnnouncementsFromSupabase,
  fetchComplaintsFromSupabase,
  submitStudentComplaint,
  updateStudentProfileInSupabase,
  subscribeToStudentNotificationsRealtime,
  getNotifBroadcastChannel
} from '../lib/ownerFeaturesApi';
import { 
  loadPolls, 
  savePolls, 
  loadReminders, 
  DEFAULT_WEEKLY_MENU,
  loadMealRatings,
  loadComplaints,
  loadCleanPlateNominations,
  saveCleanPlateNominations
} from '../lib/ownerModulesStorage';
import {
  CampaignParticipant,
  getParticipantByPhone,
  registerStudentNomination,
  recordStudentDailyTick
} from '../lib/cleanPlateTaskStorage';
import {
  StudentPollsTab,
  StudentRatingsTab,
  StudentNotificationsTab,
  StudentAnnouncementsTab,
  StudentComplaintsTab,
  StudentTimingsTab,
  StudentRulesFaqTab,
  StudentSupportTab,
  AttendanceDisputeModal,
  SmartAlertBanners
} from './views/student';
import { AutoMealSkipCard } from './views/student/AutoMealSkipCard';
import { ShiftLastCallBuzzerBanner } from './ShiftLastCallBuzzerBanner';
import { 
  Menu,
  X,
  User,
  Calendar, 
  Clock, 
  Utensils, 
  ShieldCheck, 
  AlertCircle, 
  Download, 
  Phone, 
  MapPin, 
  LogOut, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  CreditCard, 
  Building, 
  Coffee, 
  Sun, 
  Moon, 
  Info,
  Camera,
  Upload,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Check,
  Copy,
  Receipt,
  FileText,
  Printer,
  Vote,
  Bell,
  ArrowRight,
  Filter,
  Star,
  MessageSquare,
  HelpCircle,
  BookOpen,
  Edit3,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Users,
  ExternalLink,
  Lock,
  Trophy,
  Fingerprint,
  Shield
} from 'lucide-react';

interface StudentPortalViewProps {
  customer: Customer;
  allCustomers: Customer[];
  mealLogs: MealLog[];
  onSwitchCustomer: (c: Customer) => void;
  onExitPortal: () => void;
  onRequestLeave: (customerId: string, startDate: string, endDate: string, reason: string) => void;
  onMealLogged?: (newLog: MealLog) => void;
  onPlayIntroAnimation?: () => void;
  messName?: string;
  messSubtitle?: string;
}

type StudentTab = 
  | 'dashboard'
  | 'attendance'
  | 'pass'
  | 'leave'
  | 'payments'
  | 'statement'
  | 'menu'
  | 'profile'
  | 'scan_counter'
  // BATCH 2 TABS:
  | 'polls'
  | 'ratings'
  | 'notifications'
  | 'announcements'
  | 'complaints'
  | 'timings'
  | 'rules'
  | 'support';

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  customer: propCustomer,
  allCustomers,
  mealLogs: initialMealLogs,
  onSwitchCustomer,
  onExitPortal,
  onRequestLeave,
  onMealLogged,
  onPlayIntroAnimation,
  messName = 'MORYA MESS',
  messSubtitle = 'Student Digital Dining Pass & Self-Service Portal'
}) => {
  // Local customer state to reflect permitted profile updates immediately
  const [customer, setCustomer] = useState<Customer>(propCustomer);
  useEffect(() => {
    setCustomer(propCustomer);
  }, [propCustomer]);

  const today = getTodayString();
  const daysRemaining = calculateDaysRemaining(customer.endDate);
  const isExpired = daysRemaining < 0 || customer.status === 'expired' || customer.status === 'inactive';
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 3;
  const standardFee = getStandardFee(customer.gender, customer.planType);

  // Active Navigation Tab — Feature 1 Dashboard is Default!
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modals (Feature 20)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isAccountSwitchOpen, setIsAccountSwitchOpen] = useState(false);

  // Automated Clean Plate Campaign Nomination State
  const currentMonthYear = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [campaignParticipant, setCampaignParticipant] = useState<CampaignParticipant | undefined>(() => 
    getParticipantByPhone(customer.phone)
  );
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [nominateCollege, setNominateCollege] = useState(customer.college || '');
  const [nominatePledge, setNominatePledge] = useState('Finishing every meal with zero wastage!');
  const [showPostScanModal, setShowPostScanModal] = useState(false);

  useEffect(() => {
    const syncParticipant = () => {
      setCampaignParticipant(getParticipantByPhone(customer.phone));
    };
    syncParticipant();

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('morya_clean_plate_channel');
      bc.onmessage = () => syncParticipant();
    } catch {
      // fallback
    }

    window.addEventListener('morya_clean_plate_updated', syncParticipant);
    window.addEventListener('storage', syncParticipant);
    return () => {
      if (bc) bc.close();
      window.removeEventListener('morya_clean_plate_updated', syncParticipant);
      window.removeEventListener('storage', syncParticipant);
    };
  }, [customer.phone]);

  const handleConfirmNomination = (e: React.FormEvent) => {
    e.preventDefault();
    const res = registerStudentNomination({
      studentName: customer.name,
      studentPhone: customer.phone,
      college: nominateCollege.trim() || customer.college || 'Hostel / College',
      pledge: nominatePledge.trim() || 'Finishing every meal with zero food waste!',
      studentId: customer.id
    });
    setCampaignParticipant(res.participant);
    setIsNominateModalOpen(false);
    alert(res.message);
  };

  const handleStudentDailyTick = () => {
    const res = recordStudentDailyTick(customer.phone, customer.name, today);
    setCampaignParticipant(res.participant);
    alert(res.message);
    setShowPostScanModal(false);
  };

  // Profile Edit State (Feature 18)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState(customer.phone || '');
  const [editCollege, setEditCollege] = useState(customer.collegeOrWork || '');
  const [editHostel, setEditHostel] = useState(customer.hostelOrAddress || '');
  const [profileSaveMsg, setProfileSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Shift & Timing Info
  const [shiftAudit, setShiftAudit] = useState<MessShiftAudit>(() => evaluateStrictMessShift());

  // Supabase Data State
  const [attendanceRecords, setAttendanceRecords] = useState<MealLog[]>(initialMealLogs);
  const [leaveRequests, setLeaveRequests] = useState<any[]>(customer.leaves || []);
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenuSchedule>(DEFAULT_WEEKLY_MENU);
  const [polls, setPolls] = useState<StudentPoll[]>([]);
  const [pollVotes, setPollVotes] = useState<Record<string, Record<string, string>>>({});
  const [reminders, setReminders] = useState<MessReminderNotice[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mealRatings, setMealRatings] = useState<MealRatingReview[]>([]);
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);

  // Selected receipt modal
  const [selectedReceipt, setSelectedReceipt] = useState<SupabasePaymentRecord | null>(null);

  // Attendance Dispute & Issue Reporting State (Feature 25)
  const [selectedDisputeLog, setSelectedDisputeLog] = useState<MealLog | null>(null);
  const [disputedLogIds, setDisputedLogIds] = useState<string[]>([]);
  const [attendanceDisputeSuccessMsg, setAttendanceDisputeSuccessMsg] = useState<string | null>(null);

  // Initial loading indicator (Feature 26)
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Statement Month Selector
  const currentMonthStr = today.slice(0, 7); // e.g. "2026-09"
  const [statementMonth, setStatementMonth] = useState<string>(currentMonthStr);

  // Attendance Filter
  const [attFilter, setAttFilter] = useState<'all' | 'this_month' | 'prev_month' | 'lunch' | 'dinner'>('all');

  // Menu Active Day
  const currentDayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' = useMemo(() => {
    const days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    return days[new Date().getDay()];
  }, []);
  const [menuActiveDay, setMenuActiveDay] = useState<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>(currentDayOfWeek);

  // Leave Form State
  const [leaveStart, setLeaveStart] = useState(today);
  const [leaveEnd, setLeaveEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [leaveReason, setLeaveReason] = useState('Going to Hometown / Family Function');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveSuccessMessage, setLeaveSuccessMessage] = useState<string | null>(null);
  const [leaveErrorMessage, setLeaveErrorMessage] = useState<string | null>(null);

  // UPI Payment Submission State
  const [upiConfig, setUpiConfig] = useState<MessUpiConfig>({
    upiId: 'moryamess@upi',
    upiPayeeName: 'Morya Mess Pune',
    upiQrCodeImage: ''
  });
  const [generatedUpiQrUrl, setGeneratedUpiQrUrl] = useState('');
  const [payAmount, setPayAmount] = useState(customer.balance > 0 ? String(customer.balance) : String(customer.totalAmount || 2500));
  const [payUtr, setPayUtr] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Poll Vote State
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);

  // Optional Standee Scanner Utility State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    mealShift?: string;
    time?: string;
    date?: string;
  } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanInputMode, setScanInputMode] = useState<'camera' | 'upload' | 'manual'>('camera');

  // Dynamic Anti-Fraud Live Security State (Anti-Screenshot Protection)
  const [liveSecuritySeconds, setLiveSecuritySeconds] = useState(() => 
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [scanTimestamp, setScanTimestamp] = useState<number | null>(null);
  const [isTouchVerified, setIsTouchVerified] = useState(false);
  const [syncSecurityToken, setSyncSecurityToken] = useState(() => 
    Math.floor(((Date.now() / 15000) * 17) % 9000 + 1000).toString()
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSecuritySeconds(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSyncSecurityToken(Math.floor(((Date.now() / 15000) * 17) % 9000 + 1000).toString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const systemCameraInputRef = useRef<HTMLInputElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // =========================================================================
  // DATA LOADING & SYNCHRONIZATION (SUPABASE IS SOURCE OF TRUTH)
  // =========================================================================

  const refreshAllStudentData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Attendance Logs
      const attLogs = await fetchStudentAttendanceLogs(customer.id);
      if (attLogs && attLogs.length > 0) {
        setAttendanceRecords(attLogs);
      } else {
        const filteredInitial = initialMealLogs.filter(m => m.customerId === customer.id);
        setAttendanceRecords(filteredInitial);
      }

      // 2. Payments
      const allPayments = await fetchPaymentsFromSupabase();
      const myPayments = allPayments.filter(p => 
        p.customerId === customer.id || (customer.phone && p.customerPhone === customer.phone)
      );
      setPayments(myPayments);

      // 3. Leaves
      const leaves = await fetchStudentLeaveRequests(customer.id);
      if (leaves && leaves.length > 0) {
        setLeaveRequests(leaves);
      } else if (customer.leaves && customer.leaves.length > 0) {
        setLeaveRequests(customer.leaves);
      }

      // 4. Weekly Menu
      const menu = await fetchWeeklyMenuFromSupabase();
      if (menu) {
        setWeeklyMenu(menu);
      }

      // 5. Polls & Votes (Feature 11)
      const { polls: cloudPolls, pollVotes: cloudVotes } = await fetchPollsFromSupabase();
      setPolls(cloudPolls);
      setPollVotes(cloudVotes);

      // 6. Announcements & Reminders (Feature 14)
      const notices = await fetchAnnouncementsFromSupabase();
      setReminders(notices);

      // 7. Notifications (Feature 13)
      const notifs = await fetchStudentNotifications(customer.id);
      setNotifications(notifs);

      // 8. Meal Ratings & Reviews (Feature 12)
      const ratingsData = await fetchMealRatingsFromSupabase();
      setMealRatings(ratingsData);

      // 9. Complaints & Grievances (Feature 15)
      const complaintsData = await fetchComplaintsFromSupabase();
      setComplaints(complaintsData);

      // Extract existing attendance dispute log IDs (Feature 25)
      const existingDisputes = (complaintsData || [])
        .filter(c => c.customerId === customer.id && (c.category === 'Attendance Dispute' || c.subject?.includes('Attendance Dispute')))
        .map(c => {
          const match = c.description?.match(/Authoritative Record ID:\s*([^\s\n]+)/);
          return match ? match[1] : '';
        })
        .filter(Boolean);
      setDisputedLogIds(prev => Array.from(new Set([...prev, ...existingDisputes])));

      // 10. UPI Config
      const upiCfg = await fetchMessUpiConfig();
      setUpiConfig(upiCfg);
      if (upiCfg.upiId) {
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiCfg.upiId)}&pn=${encodeURIComponent(upiCfg.upiPayeeName)}&cu=INR`;
        QRCode.toDataURL(upiUrl, {
          width: 280,
          margin: 1,
          color: { dark: '#0F172A', light: '#FFFFFF' }
        }).then(url => setGeneratedUpiQrUrl(url)).catch(() => {});
      }
    } catch (e) {
      console.warn('Error refreshing student data:', e);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }, [customer.id, customer.phone, customer.leaves, initialMealLogs]);

  useEffect(() => {
    refreshAllStudentData();

    // Listen for custom events across all features
    const handleUpdate = () => refreshAllStudentData();

    // Cross-tab broadcast listener for instant notification sync
    const channel = getNotifBroadcastChannel();
    const handleBroadcast = (ev: MessageEvent) => {
      if (ev.data?.type === 'STUDENT_NOTIF') {
        fetchStudentNotifications(customer.id).then(notifs => {
          setNotifications(notifs);
        });
      } else {
        refreshAllStudentData();
      }
    };
    if (channel) {
      channel.addEventListener('message', handleBroadcast);
    }

    window.addEventListener('morya_student_notification_created', handleUpdate);
    window.addEventListener('morya_payment_updated', handleUpdate);
    window.addEventListener('morya_payment_created', handleUpdate);
    window.addEventListener('morya_leave_updated', handleUpdate);
    window.addEventListener('morya_menu_updated', handleUpdate);
    window.addEventListener('morya_polls_updated', handleUpdate);
    window.addEventListener('morya_ratings_updated', handleUpdate);
    window.addEventListener('morya_complaints_updated', handleUpdate);
    window.addEventListener('morya_reminders_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Periodic 5s polling for background notifications from owner
    const pollInterval = setInterval(() => {
      fetchStudentNotifications(customer.id).then(notifs => {
        setNotifications(notifs);
      });
    }, 5000);

    // Feature 28: Supabase Realtime notifications subscription
    const unsubRealtime = subscribeToStudentNotificationsRealtime(customer.id, () => {
      refreshAllStudentData();
    });

    return () => {
      clearInterval(pollInterval);
      unsubRealtime();
      if (channel) {
        channel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('morya_student_notification_created', handleUpdate);
      window.removeEventListener('morya_payment_updated', handleUpdate);
      window.removeEventListener('morya_payment_created', handleUpdate);
      window.removeEventListener('morya_leave_updated', handleUpdate);
      window.removeEventListener('morya_menu_updated', handleUpdate);
      window.removeEventListener('morya_polls_updated', handleUpdate);
      window.removeEventListener('morya_ratings_updated', handleUpdate);
      window.removeEventListener('morya_complaints_updated', handleUpdate);
      window.removeEventListener('morya_reminders_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshAllStudentData, customer.id]);

  // Periodic Shift & Crowd Meter Ticker (Every 10 seconds for real-time 25-min rolling turnaround)
  const [liveCrowdTick, setLiveCrowdTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setShiftAudit(evaluateStrictMessShift());
      setLiveCrowdTick(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // =========================================================================
  // ATTENDANCE STATS CALCULATION (Real Supabase Records)
  // =========================================================================
  const validAttendance = useMemo(() => {
    return attendanceRecords.filter(a => a.scanStatus === 'ALLOW' || (a.scanStatus as string) === 'VERIFIED');
  }, [attendanceRecords]);

  const prevMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }, []);

  const attendanceMetrics = useMemo(() => {
    const todayLogs = validAttendance.filter(a => a.date === today);
    const hasLunchToday = todayLogs.some(a => a.mealType === 'lunch');
    const hasDinnerToday = todayLogs.some(a => a.mealType === 'dinner');
    const thisMonthLogs = validAttendance.filter(a => a.date.startsWith(currentMonthStr));
    const prevMonthLogs = validAttendance.filter(a => a.date.startsWith(prevMonthStr));
    const lunchCount = validAttendance.filter(a => a.mealType === 'lunch').length;
    const dinnerCount = validAttendance.filter(a => a.mealType === 'dinner').length;

    return {
      total: validAttendance.length,
      thisMonthCount: thisMonthLogs.length,
      prevMonthCount: prevMonthLogs.length,
      lunchCount,
      dinnerCount,
      hasLunchToday,
      hasDinnerToday,
      todayCount: todayLogs.length
    };
  }, [validAttendance, today, currentMonthStr, prevMonthStr]);

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter(a => {
      if (attFilter === 'this_month') return a.date.startsWith(currentMonthStr);
      if (attFilter === 'prev_month') return a.date.startsWith(prevMonthStr);
      if (attFilter === 'lunch') return a.mealType === 'lunch';
      if (attFilter === 'dinner') return a.mealType === 'dinner';
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [attendanceRecords, attFilter, currentMonthStr, prevMonthStr]);

  // =========================================================================
  // FINANCIALS & PAYMENTS CALCULATION (Real Supabase Records)
  // =========================================================================
  const verifiedPayments = useMemo(() => {
    return payments.filter(p => p.status === 'verified');
  }, [payments]);

  const pendingPayments = useMemo(() => {
    return payments.filter(p => p.status === 'pending');
  }, [payments]);

  const totalVerifiedPaid = useMemo(() => {
    return verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [verifiedPayments]);

  const latestPayment = useMemo(() => {
    if (payments.length === 0) return null;
    return [...payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [payments]);

  const authoritativeBalance = useMemo(() => {
    const planFee = customer.totalAmount || standardFee;
    return Math.max(0, planFee - totalVerifiedPaid);
  }, [customer.totalAmount, standardFee, totalVerifiedPaid]);

  const combinedNotifications = useMemo(() => {
    const list = [...notifications];

    // 1. Subscription Expiring soon (Virtual Notification)
    if (!isExpired && isExpiringSoon) {
      if (!list.some(n => n.id === 'local_sub_expiring')) {
        list.unshift({
          id: 'local_sub_expiring',
          title: daysRemaining === 0 ? 'Subscription Expires Today!' : 'Subscription Expiring Soon!',
          message: `Your meal plan is valid till ${customer.endDate}. Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left. Renew early to avoid gate scanner interruption.`,
          type: 'subscription_expiry',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }

    // 2. Validity Extended by leaves
    const approvedLeaves = (customer.leaves || []).filter(l => l.approved || l.status === 'approved');
    const totalApprovedLeaveDays = approvedLeaves.reduce((acc, l) => acc + (l.days || 0), 0);
    if (!isExpired && !isExpiringSoon && totalApprovedLeaveDays > 0) {
      if (!list.some(n => n.id === 'local_leave_extended')) {
        list.unshift({
          id: 'local_leave_extended',
          title: `Validity Extended by ${totalApprovedLeaveDays} Day(s)`,
          message: `Your approved leave was credited. Pass valid until ${customer.endDate} (${daysRemaining} days remaining).`,
          type: 'leave_extended',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }

    // 3. Pending leave request
    const pendingLeave = leaveRequests.find(l => l.status === 'pending' || (!l.approved && l.status !== 'rejected'));
    if (pendingLeave) {
      if (!list.some(n => n.id === `local_leave_pending_${pendingLeave.id}`)) {
        list.unshift({
          id: `local_leave_pending_${pendingLeave.id}`,
          title: 'Leave Request Pending',
          message: `Application for ${pendingLeave.startDate} to ${pendingLeave.endDate} (${pendingLeave.days} days) is under Owner review.`,
          type: 'leave_pending',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }

    // 4. Recent payment verified
    const latestVerifiedPayment = payments.find(p => p.status === 'verified');
    const isRecentVerified = latestVerifiedPayment && (
      (Date.now() - new Date(latestVerifiedPayment.date || latestVerifiedPayment.createdAt || 0).getTime()) < 5 * 24 * 60 * 60 * 1000
    );
    if (isRecentVerified && latestVerifiedPayment) {
      if (!list.some(n => n.id === `local_pay_verified_${latestVerifiedPayment.id}`)) {
        list.unshift({
          id: `local_pay_verified_${latestVerifiedPayment.id}`,
          title: 'Recent Payment Verified',
          message: `Payment of ₹${latestVerifiedPayment.amount} on ${latestVerifiedPayment.date} has been verified and credited by Mess Owner.`,
          type: 'payment_verified',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }

    return list;
  }, [notifications, isExpired, isExpiringSoon, daysRemaining, customer.endDate, customer.leaves, leaveRequests, payments]);

  // =========================================================================
  // DYNAMIC MEAL TIME WINDOW & LIVE 20-SEAT 25-MIN ROLLING CROWD METER
  // =========================================================================
  const liveCrowdMeter = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const totalMinutes = currentHour * 60 + currentMinute;

    // Shift intervals in minutes
    // Lunch: 10:30 AM to 2:30 PM (630 to 870 mins)
    const lunchStart = 10 * 60 + 30;
    const lunchEnd = 14 * 60 + 30;
    // Dinner: 7:30 PM to 9:45 PM (1170 to 1305 mins)
    const dinnerStart = 19 * 60 + 30;
    const dinnerEnd = 21 * 60 + 45;

    let activeShift: 'lunch' | 'dinner' | null = null;
    if (totalMinutes >= lunchStart && totalMinutes <= lunchEnd) {
      activeShift = 'lunch';
    } else if (totalMinutes >= dinnerStart && totalMinutes <= dinnerEnd) {
      activeShift = 'dinner';
    }

    const TOTAL_SEATS = 20;

    if (!activeShift) {
      return {
        statusTitle: '⚪ MESS OFFLINE — Shift Closed',
        detail: 'Dining Hall is currently closed. Shift hours: Lunch (10:30 AM - 2:30 PM), Dinner (7:30 PM - 9:45 PM).',
        occupancy: 0,
        activeShift: null,
        totalSeats: TOTAL_SEATS,
        occupiedSeats: 0,
        availableSeats: TOTAL_SEATS,
        colorScheme: 'slate' as 'emerald' | 'amber' | 'rose' | 'slate',
        estimatedWaitTime: '0 min'
      };
    }

    // Filter real scanned students from attendance records in the last 25 minutes of active shift today
    // Every student scan holds 1 seat for 25 minutes, then automatically frees up.
    const twentyFiveMinutesAgo = Date.now() - 25 * 60 * 1000;
    const activeDinersList = attendanceRecords.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      const isToday = log.date === today;
      const isCurrentMeal = log.mealType === activeShift || (log.scanStatus === 'ALLOW' || (log.scanStatus as string) === 'VERIFIED');
      return isToday && isCurrentMeal && logTime >= twentyFiveMinutesAgo;
    });

    const occupiedSeats = Math.min(TOTAL_SEATS, activeDinersList.length);
    const availableSeats = Math.max(0, TOTAL_SEATS - occupiedSeats);
    const occupancyPercent = Math.round((occupiedSeats / TOTAL_SEATS) * 100);

    let statusTitle = '';
    let detail = '';
    let colorScheme: 'emerald' | 'amber' | 'rose' | 'slate' = 'emerald';
    let estimatedWaitTime = '0 min (Instant Seating)';

    if (occupiedSeats <= 5) {
      statusTitle = '🟢 PLENTY OF SEATS AVAILABLE';
      detail = `${availableSeats} of ${TOTAL_SEATS} seats open. Zero waiting time — best time to dine right now!`;
      colorScheme = 'emerald';
      estimatedWaitTime = '0 min (Instant)';
    } else if (occupiedSeats <= 13) {
      statusTitle = '🟡 MODERATE RUSH — SEATS FREE';
      detail = `${availableSeats} seats free (${occupiedSeats} dining). Quick turnaround with comfortable seating.`;
      colorScheme = 'amber';
      estimatedWaitTime = '1-2 mins';
    } else if (occupiedSeats <= 18) {
      statusTitle = '🟠 PEAK DINING RUSH';
      detail = `High occupancy: only ${availableSeats} seats left. Fast individual 25-min turnover in progress.`;
      colorScheme = 'amber';
      estimatedWaitTime = '3-5 mins';
    } else {
      statusTitle = '🔴 HALL FULL — 5-10 MIN WAIT';
      detail = `All ${TOTAL_SEATS} seats occupied. New seats will automatically free up as diners finish their 25-min meals.`;
      colorScheme = 'rose';
      estimatedWaitTime = '5-10 mins';
    }

    return {
      statusTitle,
      detail,
      occupancy: occupancyPercent,
      activeShift,
      totalSeats: TOTAL_SEATS,
      occupiedSeats,
      availableSeats,
      colorScheme,
      estimatedWaitTime
    };
  }, [attendanceRecords, today, liveCrowdTick]);

  // =========================================================================
  // DYNAMIC FITNESS NUTRITION MACROS BASED ON ACTUAL ACTIVE WEEKLY MENU (EXACT 1 PLATE)
  // =========================================================================
  const fitnessNutritionMacros = useMemo(() => {
    // Find the active meal type
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const totalMinutes = currentHour * 60 + currentMinute;
    const lunchStart = 10 * 60 + 30;
    const lunchEnd = 14 * 60 + 30;
    const dinnerStart = 19 * 60 + 30;
    const dinnerEnd = 21 * 60 + 45;

    let targetMeal: 'lunch' | 'dinner' = 'lunch';
    if (totalMinutes >= dinnerStart && totalMinutes <= dinnerEnd) {
      targetMeal = 'dinner';
    } else if (totalMinutes >= lunchStart && totalMinutes <= lunchEnd) {
      targetMeal = 'lunch';
    }

    // Gender-aware portion: Boys eat 4 rotis, Girls eat 3 rotis
    const isFemale = customer.gender === 'female';
    const rotiCount = isFemale ? 3 : 4;

    // Component 1: Fresh Wheat Rotis (per chapati: ~70 kcal, ~2.4g protein, ~13.5g carbs, ~0.7g fats)
    const rotiKcal = rotiCount * 70;
    const rotiProtein = +(rotiCount * 2.4).toFixed(1);
    const rotiCarbs = +(rotiCount * 13.5).toFixed(1);
    const rotiFats = +(rotiCount * 0.7).toFixed(1);

    // Component 2: Warm Dal Katori (140ml cooked toor/moong dal with cumin-mustard tadka)
    const dalKcal = 95;
    const dalProtein = 4.2;
    const dalCarbs = 13.5;
    const dalFats = 2.8;

    // Component 3: Steamed Rice Katori (110g cooked Kolam rice)
    const riceKcal = targetMeal === 'dinner' ? 100 : 118;
    const riceProtein = targetMeal === 'dinner' ? 2.0 : 2.4;
    const riceCarbs = targetMeal === 'dinner' ? 22.0 : 26.0;
    const riceFats = 0.4;

    // Component 4: Fresh Salad (Cucumber, Tomato, Onion slice)
    const saladKcal = 12;
    const saladProtein = 0.5;
    const saladCarbs = 2.0;
    const saladFats = 0.1;

    // Get specific specials from saved weeklyMenu or DEFAULT_WEEKLY_MENU
    const activeDayMenu = weeklyMenu[menuActiveDay] || DEFAULT_WEEKLY_MENU[menuActiveDay];
    const specialDish = targetMeal === 'lunch' 
      ? activeDayMenu?.lunchSpecial || ''
      : activeDayMenu?.dinnerSpecial || '';

    const sweetDish = targetMeal === 'lunch'
      ? activeDayMenu?.lunchSweet || ''
      : activeDayMenu?.dinnerSweet || '';

    // Component 5: Daily Sabzi / Curry (1 katori ~120g portion)
    let sabziKcal = 85;
    let sabziProtein = 2.0;
    let sabziCarbs = 8.5;
    let sabziFats = 4.5;

    const dishLower = specialDish.toLowerCase();
    
    if (dishLower.includes('paneer') || dishLower.includes('bhurji')) {
      // High protein rich paneer curry (~35-40g paneer in gravy)
      sabziKcal = 140;
      sabziProtein = 7.0;
      sabziCarbs = 6.0;
      sabziFats = 9.5;
    } else if (dishLower.includes('chole') || dishLower.includes('rajma') || dishLower.includes('chana') || dishLower.includes('soyabean') || dishLower.includes('soya')) {
      // Legume protein curry
      sabziKcal = 115;
      sabziProtein = 5.5;
      sabziCarbs = 14.5;
      sabziFats = 3.5;
    } else if (dishLower.includes('pithla') || dishLower.includes('besan')) {
      // Gram flour besan pithla
      sabziKcal = 100;
      sabziProtein = 4.5;
      sabziCarbs = 10.5;
      sabziFats = 4.0;
    } else if (dishLower.includes('shev') || dishLower.includes('usal') || dishLower.includes('matki') || dishLower.includes('sprouts')) {
      // Sprouted legumes or shev bhaji
      sabziKcal = 110;
      sabziProtein = 4.0;
      sabziCarbs = 11.0;
      sabziFats = 5.2;
    } else if (dishLower.includes('kaju') || dishLower.includes('korma')) {
      // Rich cashew curry
      sabziKcal = 160;
      sabziProtein = 3.5;
      sabziCarbs = 9.0;
      sabziFats = 12.0;
    } else if (dishLower.includes('baingan') || dishLower.includes('bhendi') || dishLower.includes('aloo') || dishLower.includes('jeera') || dishLower.includes('gobi') || dishLower.includes('veg') || dishLower.includes('shevga') || dishLower.includes('drumstick')) {
      // Typical light vegetable curry / potato dish
      sabziKcal = 85;
      sabziProtein = 2.0;
      sabziCarbs = 8.5;
      sabziFats = 4.5;
    } else if (dishLower.includes('closed') || dishLower.includes('off')) {
      // Mess closed
      return { kcal: 0, protein: 0, carbs: 0, fats: 0, dishName: 'Mess Closed', targetMeal, rotiCount };
    } else {
      // Default general veg curry
      sabziKcal = 85;
      sabziProtein = 2.2;
      sabziCarbs = 9.0;
      sabziFats = 4.5;
    }

    // Component 6: Sweet dish if any (1 small Gulab Jamun / small scoop)
    let sweetKcal = 0;
    let sweetProtein = 0;
    let sweetCarbs = 0;
    let sweetFats = 0;
    const sweetLower = sweetDish.toLowerCase();
    if (sweetLower && !sweetLower.includes('n/a') && !sweetLower.includes('no')) {
      if (sweetLower.includes('jamun') || sweetLower.includes('sheera') || sweetLower.includes('halwa') || sweetLower.includes('kheer')) {
        sweetKcal = 110;
        sweetProtein = 1.2;
        sweetCarbs = 20.0;
        sweetFats = 3.0;
      }
    }

    const totalKcal = Math.round(rotiKcal + dalKcal + riceKcal + saladKcal + sabziKcal + sweetKcal);
    const totalProtein = Math.round((rotiProtein + dalProtein + riceProtein + saladProtein + sabziProtein + sweetProtein) * 10) / 10;
    const totalCarbs = Math.round(rotiCarbs + dalCarbs + riceCarbs + saladCarbs + sabziCarbs + sweetCarbs);
    const totalFats = Math.round((rotiFats + dalFats + riceFats + saladFats + sabziFats + sweetFats) * 10) / 10;

    return {
      kcal: totalKcal,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
      dishName: specialDish || 'Daily Vegetable Curry',
      targetMeal,
      rotiCount
    };
  }, [weeklyMenu, menuActiveDay, customer.gender]);

  // =========================================================================
  // SUBMIT PAYMENT HANDLER (FEATURE 7)
  // =========================================================================
  const handleRecordStudentPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      setPaymentErrorMessage('Please enter a valid amount.');
      return;
    }
    if (!payUtr.trim()) {
      setPaymentErrorMessage('12-digit UPI Reference / UTR Number is required for verification.');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentSuccessMessage(null);
    setPaymentErrorMessage(null);

    const res = await recordNewPaymentInSupabase({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      amount: Number(payAmount),
      paymentMode: 'upi',
      transactionReference: payUtr.trim(),
      notes: payNotes.trim() ? `Student App: ${payNotes.trim()}` : 'Payment submitted via Student Portal',
      status: 'pending' // Student payments await owner verification
    });

    if (res.success) {
      setPaymentSuccessMessage(`Payment of ₹${payAmount} submitted successfully! Reference (UTR: ${payUtr}) has been recorded. Status is PENDING verification by Mess Owner.`);
      setPayUtr('');
      setPayNotes('');
      await refreshAllStudentData();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } else {
      setPaymentErrorMessage(res.error || 'Failed to submit payment verification. Please check connection and try again.');
    }
    setIsSubmittingPayment(false);
  };

  // =========================================================================
  // SUBMIT LEAVE HANDLER (FEATURE 5)
  // =========================================================================
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      setLeaveErrorMessage(`Cannot apply for leave: Mess subscription expired on ${customer.endDate || 'N/A'}. Please renew your pass with the mess owner first.`);
      return;
    }
    if (!leaveStart || !leaveEnd) {
      setLeaveErrorMessage('Please select both start and end dates.');
      return;
    }
    if (new Date(leaveEnd).getTime() < new Date(leaveStart).getTime()) {
      setLeaveErrorMessage('End date cannot be earlier than start date.');
      return;
    }

    setIsSubmittingLeave(true);
    setLeaveSuccessMessage(null);
    setLeaveErrorMessage(null);

    const res = await submitStudentLeaveRequest({
      customerId: customer.id,
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: leaveReason
    });

    if (res.success) {
      setLeaveSuccessMessage('Leave application submitted successfully! Mess Owner has been notified for approval.');
      onRequestLeave(customer.id, leaveStart, leaveEnd, leaveReason);
      await refreshAllStudentData();
    } else {
      setLeaveErrorMessage(res.error || 'Failed to submit leave request. Please try again.');
    }
    setIsSubmittingLeave(false);
  };

  // =========================================================================
  // POLL VOTE HANDLER (FEATURE 11)
  // =========================================================================
  const handleVotePoll = async (pollId: string, optionId: string) => {
    setVotedOptionId(optionId);
    const res = await submitStudentVote(pollId, optionId, customer.id);
    if (res.success) {
      await refreshAllStudentData();
    }
  };

  // =========================================================================
  // PROFILE UPDATE HANDLER (FEATURE 18)
  // =========================================================================
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveMsg(null);
    const res = await updateStudentProfileInSupabase(customer.id, {
      phone: editPhone.trim(),
      collegeOrWork: editCollege.trim(),
      hostelOrAddress: editHostel.trim()
    });
    setIsSavingProfile(false);
    if (res.success) {
      setCustomer(prev => ({
        ...prev,
        phone: editPhone.trim(),
        collegeOrWork: editCollege.trim(),
        hostelOrAddress: editHostel.trim()
      }));
      setProfileSaveMsg({ type: 'success', text: 'Profile contact details updated successfully in Supabase!' });
      setIsEditingProfile(false);
      await refreshAllStudentData();
    } else {
      setProfileSaveMsg({ type: 'error', text: res.error || 'Failed to update profile.' });
    }
  };

  // =========================================================================
  // CAMERA STANDEE SCANNER LOGIC (LIVE CAMERA ONLY)
  // =========================================================================
  const stopCameraStream = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCameraStream = async () => {
    stopCameraStream();
    setCameraError(null);
    setIsCameraActive(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported on this browser/device. Please open in Google Chrome on your mobile phone.');
        return;
      }

      // Constraints optimized for Android Chrome back camera:
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback to any available video stream
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        animationFrameId.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser address bar / site settings and tap "Retry Camera".');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please check your camera hardware.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is already in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError(err.message || 'Unable to start camera.');
      }
    }
  };

  // Start camera when entering scan_counter tab, stop when exiting
  useEffect(() => {
    if (activeTab === 'scan_counter') {
      setScanResult(null);
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [activeTab]);

  const scanVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animationFrameId.current = requestAnimationFrame(scanVideoFrame);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data && code.data.trim()) {
          handleProcessScannedCode(code.data.trim());
          return;
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleProcessScannedCode = async (rawCode: string) => {
    stopCameraStream();
    setIsVerifying(true);
    const res = await validateAndRecordStudentAttendance({
      qrCodeText: rawCode,
      messId: '63b00e12-a702-492f-bd56-1e260338699f',
      customerId: customer.id,
      customerData: customer
    });
    setIsVerifying(false);

    if (res.success) {
      setScanTimestamp(Date.now());
      setScanResult({
        success: true,
        message: res.message || 'Attendance Approved!',
        mealShift: res.mealShift,
        time: res.time,
        date: res.date
      });
      // Celebration Confetti (Morya flying colorful paper effect)
      confetti({
        particleCount: 65,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f97316', '#10b981', '#2563eb', '#f59e0b', '#ec4899', '#8b5cf6']
      });
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: ['#f97316', '#10b981', '#f59e0b']
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: ['#f97316', '#10b981', '#f59e0b']
        });
      }, 200);
      await refreshAllStudentData();
      if (onMealLogged) {
        onMealLogged({
          id: `meal-${Date.now()}`,
          customerId: customer.id,
          customerName: customer.name,
          date: res.date || today,
          mealType: (res.mealShift as any) || 'lunch',
          scanStatus: 'ALLOW',
          reason: 'Universal Standee QR Attendance',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      setScanResult({
        success: false,
        message: res.message || 'Scan verification failed.'
      });
    }
  };

  // =========================================================================
  // MONTHLY STATEMENT DATA PREPARATION (FEATURE 9)
  // =========================================================================
  const statementData = useMemo(() => {
    const monthMeals = validAttendance.filter(a => a.date.startsWith(statementMonth));
    const monthLunch = monthMeals.filter(a => a.mealType === 'lunch').length;
    const monthDinner = monthMeals.filter(a => a.mealType === 'dinner').length;
    
    const monthPayments = payments.filter(p => p.createdAt && p.createdAt.startsWith(statementMonth));
    const verifiedMonthPayments = monthPayments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
    const pendingMonthPayments = monthPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

    const monthLeaves = leaveRequests.filter(l => 
      l.startDate?.startsWith(statementMonth) || l.endDate?.startsWith(statementMonth)
    );
    const approvedLeaveDays = monthLeaves
      .filter(l => l.status === 'approved' || l.approved)
      .reduce((sum, l) => sum + (l.days || 1), 0);

    const monthlyPlanRate = customer.totalAmount || standardFee;
    const netBalance = Math.max(0, monthlyPlanRate - verifiedMonthPayments);

    return {
      monthStr: statementMonth,
      monthlyPlanRate,
      verifiedMonthPayments,
      pendingMonthPayments,
      netBalance,
      totalMeals: monthMeals.length,
      monthLunch,
      monthDinner,
      approvedLeaveDays,
      leaveCount: monthLeaves.length
    };
  }, [statementMonth, validAttendance, payments, leaveRequests, customer.totalAmount, standardFee]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 flex flex-col items-center p-2.5 sm:p-5 select-none font-sans">
      {/* 1. TOP HEADER: LEFT = ☰ MENU, CENTER = MORYA MESS, RIGHT = PROFILE AVATAR */}
      <header className="w-full max-w-full sm:max-w-2xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs p-3 sm:p-4 mb-3 flex items-center justify-between sticky top-2 z-30">
        {/* LEFT: ☰ Hamburger Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 sm:p-2.5 rounded-xl border border-slate-200 hover:bg-orange-50 hover:border-orange-200 text-slate-800 hover:text-orange-700 transition cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Open Navigation Menu"
          title="Open Menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* CENTER: Morya Mess */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              M
            </div>
            <h1 className="font-black text-slate-900 text-sm sm:text-base tracking-tight uppercase">
              {messName}
            </h1>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Dining Hall & Student Portal
          </span>
        </div>

        {/* RIGHT: Notifications (Feature 13) + Student Profile Avatar (Feature 18) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notification Bell Button (Feature 13) */}
          <button
            onClick={() => setActiveTab('notifications')}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700 hover:text-orange-700 transition cursor-pointer relative"
            aria-label="View Notifications"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {combinedNotifications.filter(n => !n.is_read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center border-2 border-white animate-pulse">
                {combinedNotifications.filter(n => !n.is_read).length > 9 ? '9+' : combinedNotifications.filter(n => !n.is_read).length}
              </span>
            )}
          </button>

          {/* Student Profile Avatar Button (Tapping opens Profile directly!) */}
          <button
            onClick={() => setActiveTab('profile')}
            className="p-1 sm:p-1.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition cursor-pointer flex items-center gap-1.5 shrink-0"
            aria-label="Open Student Profile"
            title="View My Profile"
          >
            <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-xs shadow-xs relative">
              {customer.name ? customer.name.charAt(0).toUpperCase() : 'S'}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            </div>
          </button>
        </div>
      </header>

      {/* NAVIGATION DRAWER & BACKDROP */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between border-r border-slate-200 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-br from-orange-600 to-amber-600 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-white/20 text-white flex items-center justify-center font-black text-xs">
                      M
                    </div>
                    <span className="font-black text-sm tracking-tight">{messName}</span>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 rounded-lg bg-black/20 hover:bg-black/30 text-white transition cursor-pointer"
                    title="Close Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div 
                  onClick={() => { setActiveTab('profile'); setIsDrawerOpen(false); }}
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-95 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-white text-orange-700 flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                    {customer.name ? customer.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm truncate">{customer.name}</div>
                    <div className="text-[11px] text-white/80 font-mono">ID: {customer.id} &bull; Profile &rarr;</div>
                  </div>
                </div>
              </div>

              {/* Drawer Nav Items */}
              <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)] scrollbar-none">
                {/* SECTION 1: CORE SERVICES */}
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 pt-1 pb-1">
                  Core Services
                </div>

                <button
                  onClick={() => { setActiveTab('dashboard'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => { setActiveTab('scan_counter'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'scan_counter' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-orange-50 text-orange-700 font-extrabold bg-orange-50/50'
                  }`}
                >
                  <Camera className="w-4 h-4 text-orange-600" />
                  <span>Scan Gate QR</span>
                </button>

                <button
                  onClick={() => { setActiveTab('attendance'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'attendance' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>Meal Attendance</span>
                </button>

                <button
                  onClick={() => { setActiveTab('pass'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'pass' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Digital Student Pass</span>
                </button>

                <button
                  onClick={() => { setActiveTab('leave'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'leave' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Vacation / Leave</span>
                </button>

                <button
                  onClick={() => { setActiveTab('payments'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'payments' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Fee Payments & UPI</span>
                </button>

                <button
                  onClick={() => { setActiveTab('statement'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'statement' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Monthly Statement</span>
                </button>

                <button
                  onClick={() => { setActiveTab('menu'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'menu' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Coffee className="w-4 h-4" />
                  <span>Weekly Menu</span>
                </button>

                {/* SECTION 2: COMMUNITY & ENGAGEMENT (BATCH 2) */}
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1 border-t border-slate-100">
                  Community & Engagement
                </div>

                <button
                  onClick={() => { setActiveTab('polls'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center justify-between transition cursor-pointer ${
                    activeTab === 'polls' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Vote className="w-4 h-4" />
                    <span>Student Polls</span>
                  </div>
                  {polls.filter(p => p.status === 'active').length > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      activeTab === 'polls' ? 'bg-white text-orange-700' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {polls.filter(p => p.status === 'active').length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('ratings'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'ratings' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span>Meal Ratings & Reviews</span>
                </button>

                <button
                  onClick={() => { setActiveTab('notifications'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center justify-between transition cursor-pointer ${
                    activeTab === 'notifications' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </div>
                  {combinedNotifications.filter(n => !n.is_read).length > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      activeTab === 'notifications' ? 'bg-white text-orange-700' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {combinedNotifications.filter(n => !n.is_read).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('announcements'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'announcements' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  <span>Notices & Announcements</span>
                </button>

                <button
                  onClick={() => { setActiveTab('complaints'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'complaints' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Complaints & Grievances</span>
                </button>

                {/* SECTION 3: MESS INFO & ACCOUNT (BATCH 2) */}
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1 border-t border-slate-100">
                  Mess Details & Account
                </div>

                <button
                  onClick={() => { setActiveTab('timings'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'timings' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Mess Timings & Schedule</span>
                </button>

                <button
                  onClick={() => { setActiveTab('rules'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'rules' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Rules, Guidelines & FAQ</span>
                </button>

                <button
                  onClick={() => { setActiveTab('profile'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'profile' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>My Profile & Contact Details</span>
                </button>

                <button
                  onClick={() => { setActiveTab('support'); setIsDrawerOpen(false); }}
                  className={`w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                    activeTab === 'support' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Help & Mess Support</span>
                </button>

                {allCustomers.length > 1 && (
                  <button
                    onClick={() => { setIsAccountSwitchOpen(true); setIsDrawerOpen(false); }}
                    className="w-full p-2.5 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition cursor-pointer hover:bg-slate-100 text-slate-700"
                  >
                    <Users className="w-4 h-4 text-orange-600" />
                    <span>Switch Student Account</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer: Intro & Log Out */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">

              <button
                onClick={() => { setIsDrawerOpen(false); setIsLogoutConfirmOpen(true); }}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out / Log Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 2. STUDENT IDENTITY STRIP */}
      <div className="w-full max-w-full sm:max-w-2xl mb-3 bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
        <div className="flex items-center gap-2 truncate">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-slate-400 font-medium">Logged in:</span>
          <span className="font-extrabold text-slate-900 truncate">{customer.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
            customer.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
            customer.status === 'expiring_soon' ? 'bg-amber-100 text-amber-800' :
            'bg-rose-100 text-rose-800'
          }`}>
            {customer.status === 'active' ? 'Active Member' : customer.status.replace(/_/g, ' ')}
          </span>
          <span className="font-mono font-bold text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {customer.id}
          </span>
        </div>
      </div>

      {/* 3. NAVIGATION PILLS BAR (Quick Swipe on Mobile) */}
      <nav className="w-full max-w-full sm:max-w-2xl bg-white rounded-2xl border border-slate-200 p-1 mb-4 flex items-center justify-between text-xs font-bold text-slate-600 shadow-2xs overflow-x-auto gap-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('scan_counter')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'scan_counter' 
              ? 'bg-orange-600 text-white shadow-xs font-black' 
              : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 font-black'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-orange-600" />
          <span>Scan Gate QR</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'attendance' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Attendance ({attendanceMetrics.total})</span>
        </button>

        <button
          onClick={() => setActiveTab('pass')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'pass' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span>Pass</span>
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'leave' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Leaves</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'payments' ? 'bg-orange-600 text-white shadow-xs' : 
            authoritativeBalance > 0 ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payments {authoritativeBalance > 0 ? `(₹${authoritativeBalance})` : ''}</span>
        </button>

        <button
          onClick={() => setActiveTab('statement')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'statement' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Statement</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'menu' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Menu</span>
        </button>

        <button
          onClick={() => setActiveTab('polls')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'polls' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          <span>Polls</span>
        </button>

        <button
          onClick={() => setActiveTab('ratings')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'ratings' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Reviews</span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs ${
            activeTab === 'complaints' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Helpdesk</span>
        </button>
      </nav>

      {/* Database Sync Loading Indicator (Feature 26) */}
      {isInitialLoading && (
        <div className="w-full max-w-full sm:max-w-2xl p-3.5 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between text-xs text-orange-950 mb-3 animate-pulse shadow-2xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />
            <span className="font-bold">Syncing authoritative records from Supabase...</span>
          </div>
          <span className="text-[10px] text-orange-800 uppercase font-black tracking-wider">Live Sync</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 1 — STUDENT DASHBOARD (REAL SUPABASE DATA) */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="w-full max-w-full sm:max-w-2xl space-y-4">
          {/* PRIMARY SCAN CAMERA HERO ON MAIN DASHBOARD */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 rounded-3xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                <Camera className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/25 px-2 py-0.5 rounded-full text-white">
                    Shift: {shiftAudit.mealType.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-white/80 font-medium">Universal Gate Standee</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                  Scan Gate QR for Attendance
                </h3>
                <p className="text-xs text-white/90">
                  Tap button to open live camera and mark your meal instantly
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('scan_counter')}
              className="py-3 px-5 rounded-2xl bg-white hover:bg-orange-50 text-orange-700 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg shrink-0 transform active:scale-95"
            >
              <Camera className="w-4 h-4 text-orange-600" />
              <span>Open Live Camera</span>
              <ChevronRight className="w-4 h-4 text-orange-500" />
            </button>
          </div>

          {/* Smart Alerts: Subscription, Payments, and Leaves (Features 22, 23, 24) */}
          <SmartAlertBanners
            customer={customer}
            payments={payments}
            leaveRequests={leaveRequests}
            authoritativeBalance={authoritativeBalance}
            daysRemaining={daysRemaining}
            isExpired={isExpired}
            isExpiringSoon={isExpiringSoon}
            onNavigateTab={(tab) => setActiveTab(tab as StudentTab)}
          />

          {/* 0. LIVE SHIFT STATUS & 15-MIN LAST CALL AUTO BUZZER */}
          <ShiftLastCallBuzzerBanner />

          {/* 1. LIVE MESS OCCUPANCY & 20-SEAT CROWD METER (25-MIN ROLLING AUTO-UPDATE) */}
          <div className={`p-4 sm:p-6 rounded-3xl border-2 shadow-sm transition-all space-y-4 ${
            liveCrowdMeter.colorScheme === 'emerald'
              ? 'bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border-emerald-300/80 shadow-emerald-500/5'
              : liveCrowdMeter.colorScheme === 'amber'
              ? 'bg-gradient-to-br from-amber-50 via-orange-50/40 to-white border-amber-300/80 shadow-amber-500/5'
              : liveCrowdMeter.colorScheme === 'rose'
              ? 'bg-gradient-to-br from-rose-50 via-orange-50/40 to-white border-rose-300/80 shadow-rose-500/5'
              : 'bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-stone-50 border-amber-300/80 shadow-amber-500/5'
          }`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/70">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-md shrink-0 ${
                  liveCrowdMeter.colorScheme === 'emerald'
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-emerald-500/25'
                    : liveCrowdMeter.colorScheme === 'amber'
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-orange-500/25'
                    : liveCrowdMeter.colorScheme === 'rose'
                    ? 'bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-rose-500/25'
                    : 'bg-gradient-to-tr from-amber-800 via-orange-700 to-amber-600 text-white shadow-orange-900/20'
                }`}>
                  {liveCrowdMeter.colorScheme === 'emerald' ? '🟢' : liveCrowdMeter.colorScheme === 'rose' ? '🔴' : liveCrowdMeter.colorScheme === 'amber' ? '🟡' : '🍽️'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      Live 20-Seat Dining Hall Meter
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                      liveCrowdMeter.colorScheme === 'emerald' ? 'bg-emerald-600' :
                      liveCrowdMeter.colorScheme === 'amber' ? 'bg-amber-600' :
                      liveCrowdMeter.colorScheme === 'rose' ? 'bg-rose-600' : 'bg-gradient-to-r from-amber-800 to-orange-700'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
                      {liveCrowdMeter.activeShift ? `${liveCrowdMeter.activeShift} Shift` : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {liveCrowdMeter.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white/90 border border-slate-200 text-[11px] font-bold text-slate-600 shadow-2xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>25-Min Auto Refresh</span>
                </span>
              </div>
            </div>

            {/* 3 Metric Cards Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Free Seats */}
              <div className="p-3 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide block">Seats Free</span>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 leading-none">
                  {liveCrowdMeter.availableSeats}
                </div>
                <span className="text-[10px] font-semibold text-emerald-800/80 block">🟢 Walk-in Ready</span>
              </div>

              {/* Occupied */}
              <div className="p-3 rounded-2xl bg-white border border-amber-200/90 shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide block">Occupied</span>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-800 leading-none">
                  {liveCrowdMeter.occupiedSeats} <span className="text-xs font-normal text-slate-400 font-sans">/ 20</span>
                </div>
                <span className="text-[10px] font-semibold text-amber-800/80 block">🪑 In Dining</span>
              </div>

              {/* Wait Time */}
              <div className="p-3 rounded-2xl bg-white border border-sky-200/90 shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wide block">Est. Wait</span>
                <div className="text-base sm:text-lg font-black font-mono text-sky-800 leading-none truncate mt-0.5">
                  {liveCrowdMeter.estimatedWaitTime.split(' ')[0]} {liveCrowdMeter.estimatedWaitTime.split(' ')[1] || 'min'}
                </div>
                <span className="text-[10px] font-semibold text-sky-800/80 block">⏱️ No Delay</span>
              </div>
            </div>

            {/* Live Occupancy Gauge Bar */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <span>⚡ Dining Hall Capacity:</span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-black ${
                    liveCrowdMeter.occupancy <= 40 ? 'bg-emerald-100 text-emerald-800' :
                    liveCrowdMeter.occupancy <= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {liveCrowdMeter.occupancy}% Busy
                  </span>
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {liveCrowdMeter.availableSeats > 0 ? `${liveCrowdMeter.availableSeats} chairs waiting for you` : 'All seats in use'}
                </span>
              </div>

              {/* Visual Multi-step Bar */}
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80 p-0.5 flex">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    liveCrowdMeter.occupancy <= 35
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : liveCrowdMeter.occupancy <= 75
                      ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500'
                      : 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600'
                  }`}
                  style={{ width: `${Math.max(5, liveCrowdMeter.occupancy)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-0.5">
                <span className="text-emerald-700">🟢 0% Smooth</span>
                <span className="text-amber-700">🟡 50% Steady</span>
                <span className="text-rose-700">🔴 100% Full</span>
              </div>
            </div>

            {/* 20-Seat Visual Grid (Chairs Floor Plan) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                  <span>🪑 Hall Layout (20 Dining Chairs)</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">• 25-Min Rolling Cycle</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="inline-flex items-center gap-1 text-emerald-800">
                    <span className="w-2.5 h-2.5 rounded-md bg-emerald-100 border border-emerald-400 inline-block" /> Free ({liveCrowdMeter.availableSeats})
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-800">
                    <span className="w-2.5 h-2.5 rounded-md bg-amber-500 inline-block" /> Dining ({liveCrowdMeter.occupiedSeats})
                  </span>
                </div>
              </div>

              {/* 20 Chair Cards Grid */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                {Array.from({ length: 20 }).map((_, index) => {
                  const isOccupied = index < liveCrowdMeter.occupiedSeats;
                  return (
                    <div
                      key={index}
                      title={isOccupied ? `Seat ${index + 1}: Occupied (In dining session)` : `Seat ${index + 1}: Available (Ready to sit)`}
                      className={`rounded-xl p-1 sm:p-1.5 flex flex-col items-center justify-center transition-all cursor-default select-none ${
                        isOccupied
                          ? 'bg-gradient-to-b from-amber-500 to-orange-500 text-white border-2 border-orange-600 shadow-xs'
                          : 'bg-gradient-to-b from-white to-emerald-50/80 border-2 border-emerald-300 text-emerald-800 shadow-2xs hover:border-emerald-500'
                      }`}
                    >
                      <span className="text-xs sm:text-sm leading-none">{isOccupied ? '🍲' : '🪑'}</span>
                      <span className={`text-[10px] font-mono font-black mt-0.5 leading-none ${isOccupied ? 'text-white' : 'text-slate-800'}`}>
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                      <span className={`text-[8px] font-bold uppercase tracking-tight leading-none mt-0.5 ${
                        isOccupied ? 'text-amber-100' : 'text-emerald-700'
                      }`}>
                        {isOccupied ? 'Busy' : 'Open'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Pro-Tip Note */}
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                liveCrowdMeter.colorScheme === 'emerald'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : liveCrowdMeter.colorScheme === 'amber'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
                <span className="text-[11px] leading-snug">
                  {liveCrowdMeter.colorScheme === 'emerald'
                    ? '✨ Perfect timing! Dining hall has zero rush. Fresh rotis straight off the tawa with immediate seating.'
                    : liveCrowdMeter.colorScheme === 'amber'
                    ? '⏱️ Steady flow. Each student dines for ~25 minutes, meaning seats free up every 2 minutes.'
                    : '🔥 Peak rush window. Grab a seat quickly or visit in 10-15 mins when the batch clears.'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. DAILY FITNESS & CALORIE MACRO BREAKDOWN (EXACT 1-PLATE THALI PORTION) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-emerald-50/80 text-slate-800 shadow-sm space-y-3 border-2 border-amber-200/90">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                  <Utensils className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-normal">
                      1-Plate Thali Nutrition ({fitnessNutritionMacros.targetMeal === 'dinner' ? 'Dinner' : 'Lunch'})
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                      Exact 1 Plate
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Standard meal portion: <strong className="text-amber-950">{fitnessNutritionMacros.dishName}</strong>, {fitnessNutritionMacros.rotiCount} Rotis, Dal & Rice
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-orange-600 text-white text-xs font-bold shadow-xs">
                {fitnessNutritionMacros.kcal > 0 ? `${fitnessNutritionMacros.kcal} kcal` : 'Closed'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-amber-200/90 shadow-2xs space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-600 block">Protein</span>
                <div className="text-base sm:text-lg font-bold text-orange-600">
                  {fitnessNutritionMacros.protein} g
                </div>
                <span className="text-[10px] text-slate-500 block">1 Plate Serving</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-600 block">Carbs</span>
                <div className="text-base sm:text-lg font-bold text-emerald-700">
                  {fitnessNutritionMacros.carbs} g
                </div>
                <span className="text-[10px] text-slate-500 block">Rotis & Rice</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-sky-200/90 shadow-2xs space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-600 block">Healthy Fats</span>
                <div className="text-base sm:text-lg font-bold text-sky-700">
                  {fitnessNutritionMacros.fats} g
                </div>
                <span className="text-[10px] text-slate-500 block">Tadka & Gravy</span>
              </div>
            </div>

            {/* 1-Plate Component Breakdown Pill (Clean, Official, No Emojis) */}
            <div className="p-2.5 rounded-xl bg-white/90 border border-amber-200/80 text-xs text-slate-700 flex items-center justify-between flex-wrap gap-2 font-medium">
              <span>{fitnessNutritionMacros.rotiCount} Rotis ({fitnessNutritionMacros.rotiCount === 4 ? '9.6g' : '7.2g'} protein)</span>
              <span className="text-slate-300">•</span>
              <span>Dal (4.2g protein)</span>
              <span className="text-slate-300">•</span>
              <span>Rice (2.4g protein)</span>
              <span className="text-slate-300">•</span>
              <span>Sabzi (2–7g protein)</span>
            </div>
          </div>

          {/* 2.5. AUTO-PILOT STUDENT MEAL SKIP & FOOD SAVER */}
          <AutoMealSkipCard 
            studentId={customer.id} 
            studentName={customer.name} 
          />

          {/* 3. 25-DAY CLEAN PLATE TASK CAMPAIGN CARD */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white shadow-md space-y-3.5 border-2 border-emerald-400/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌿</span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-100">
                    25-Day Clean Plate Campaign
                  </h4>
                  <p className="text-[10px] text-emerald-200">Zero Food Waste Monthly Challenge</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-amber-200 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-400/40">
                🏆 5 Winners ₹50 OFF
              </span>
            </div>

            {campaignParticipant ? (
              <>
                {/* Winner Banner if selected */}
                {campaignParticipant.isWinner && (
                  <div className="p-3 rounded-2xl bg-amber-400 text-emerald-950 font-black text-xs flex items-center justify-between shadow-md animate-bounce">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-emerald-900" />
                      <span>🎉 CONGRATULATIONS! You won ₹50 Renewal Discount!</span>
                    </div>
                    <span className="bg-emerald-950 text-amber-300 text-[10px] px-2 py-0.5 rounded-full">
                      Auto-Applied
                    </span>
                  </div>
                )}

                {/* Nomination details badge */}
                <div className="flex items-center justify-between text-[11px] text-emerald-100 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-400/20">
                  <span>Enrolled: <strong>{campaignParticipant.registeredAt}</strong></span>
                  <span className="text-amber-300 font-bold">
                    {campaignParticipant.completedDates.length >= 25 ? '✅ Qualified for Draw' : `${25 - campaignParticipant.completedDates.length} Days Left`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-400/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-white">Your 25-Day Streak Progress</span>
                    <strong className="font-mono text-amber-300 font-black">
                      {campaignParticipant.completedDates.length} / 25 Days Ticked
                    </strong>
                  </div>

                  <div className="w-full bg-emerald-950/60 h-2.5 rounded-full overflow-hidden p-0.5 border border-emerald-400/30">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (campaignParticipant.completedDates.length / 25) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 25 Badges Grid (Days 1 to 25) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">
                    Daily Task Calendar Grid (Days 1–25):
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
                    {Array.from({ length: 25 }, (_, i) => {
                      const dayNum = i + 1;
                      const isTicked = i < campaignParticipant.completedDates.length;
                      return (
                        <div
                          key={dayNum}
                          className={`py-1.5 px-1 rounded-xl font-bold transition ${
                            isTicked
                              ? 'bg-amber-400 text-emerald-950 font-black shadow-xs border border-amber-300'
                              : 'bg-emerald-900/40 text-emerald-200/60 border border-emerald-500/20'
                          }`}
                        >
                          {isTicked ? `✓ D${dayNum}` : `D${dayNum}`}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Tick Action Button */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  {campaignParticipant.completedDates.includes(today) ? (
                    <div className="w-full py-2.5 px-3 rounded-xl bg-amber-400 text-emerald-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                      <span>Today's Clean Plate Ticked! ({campaignParticipant.completedDates.length}/25 Days)</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleStudentDailyTick}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Tick Today's Clean Plate (+1 Day Streak) ➔</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* If not nominated yet: Prompt to Nominate */
              <div className="space-y-3">
                <p className="text-xs text-emerald-100">
                  Finish your meal completely for 25+ days without food waste. Nominate below to enter the monthly challenge and compete for ₹50 subscription discount!
                </p>

                <button
                  onClick={() => setIsNominateModalOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Nominate Me for 25-Day Challenge (Join Now) ➔</span>
                </button>
              </div>
            )}
          </div>

          {/* Member Profile Overview Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">
                  Student Member
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {customer.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span>ID: <strong className="font-mono text-slate-700">{customer.id}</strong></span>
                  <span>•</span>
                  <span>Plan: <strong className="text-slate-800 uppercase">{customer.planType ? customer.planType.replace(/_/g, ' ') : 'Monthly Plan'}</strong></span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${
                  isExpired ? 'bg-rose-100 text-rose-800' :
                  isExpiringSoon ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-rose-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                  <span>{isExpired ? 'Expired' : `${daysRemaining} Days Remaining`}</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Valid: {customer.startDate || 'N/A'} ➔ {customer.endDate || 'N/A'}
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* Metric 1: Today's Status */}
              <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-100">
                <span className="text-[10px] uppercase font-bold text-orange-700 block">Today's Meals</span>
                <div className="font-black text-slate-900 text-base mt-1">
                  {attendanceMetrics.todayCount > 0 ? `${attendanceMetrics.todayCount} Scanned` : 'None Yet'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Lunch: {attendanceMetrics.hasLunchToday ? '✓' : '—'} | Dinner: {attendanceMetrics.hasDinnerToday ? '✓' : '—'}
                </div>
              </div>

              {/* Metric 2: Month Meals */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">This Month</span>
                <div className="font-black text-slate-900 text-base mt-1">
                  {attendanceMetrics.thisMonthCount} Meals
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  L: {validAttendance.filter(a => a.date.startsWith(currentMonthStr) && a.mealType === 'lunch').length} • D: {validAttendance.filter(a => a.date.startsWith(currentMonthStr) && a.mealType === 'dinner').length}
                </div>
              </div>

              {/* Metric 3: Balance Outstanding */}
              <div className={`p-3.5 rounded-2xl border ${
                authoritativeBalance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'
              }`}>
                <span className={`text-[10px] uppercase font-bold block ${
                  authoritativeBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  Balance Due
                </span>
                <div className={`font-black text-base mt-1 ${
                  authoritativeBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  ₹{authoritativeBalance}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {authoritativeBalance > 0 ? 'Payment Pending' : 'Fully Cleared'}
                </div>
              </div>

              {/* Metric 4: Latest Payment */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Latest Payment</span>
                <div className="font-black text-slate-900 text-base mt-1">
                  {latestPayment ? `₹${latestPayment.amount}` : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {latestPayment ? (latestPayment.status === 'verified' ? '✓ Verified' : '⏳ Pending') : 'No records'}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2 pt-2 flex-wrap">
              <button
                onClick={() => setActiveTab('scan_counter')}
                className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
                <span>Scan Gate QR</span>
              </button>
              <button
                onClick={() => setActiveTab('pass')}
                className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <span>Digital Pass</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {authoritativeBalance > 0 && (
                <button
                  onClick={() => setActiveTab('payments')}
                  className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay Due (₹{authoritativeBalance})</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('menu')}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5 text-orange-600" />
                <span>Menu</span>
              </button>
            </div>
          </div>

          {/* Today's Shift Live Status */}
          <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            shiftAudit.isShiftActive 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                shiftAudit.isShiftActive ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm block">{shiftAudit.shiftTitle}</span>
                <span className="text-[11px] opacity-80">{shiftAudit.reason}</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
              shiftAudit.isShiftActive ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
            }`}>
              {shiftAudit.isShiftActive ? 'OPEN NOW' : 'CLOSED'}
            </span>
          </div>

          {/* Active Polls Preview (Feature 11 Preview in Dashboard) */}
          {polls.filter(p => p.status === 'active').length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-orange-600" />
                  <h3 className="font-black text-sm text-slate-900">Student Mess Poll</h3>
                </div>
                <button
                  onClick={() => setActiveTab('polls')}
                  className="text-[10px] uppercase font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded border border-orange-200 transition cursor-pointer"
                >
                  View All Polls &rarr;
                </button>
              </div>

              {polls.filter(p => p.status === 'active').slice(0, 1).map(poll => {
                const studentVotedOptionId = pollVotes[poll.id]?.[customer.id];
                const hasVoted = Boolean(studentVotedOptionId);

                return (
                  <div key={poll.id} className="space-y-2.5">
                    <p className="text-xs font-bold text-slate-800">{poll.question}</p>
                    <div className="space-y-1.5">
                      {poll.options.map((opt: any) => {
                        const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                        const isStudentVote = studentVotedOptionId === opt.id;

                        return (
                          <button
                            key={opt.id}
                            disabled={hasVoted}
                            onClick={() => handleVotePoll(poll.id, opt.id)}
                            className={`w-full p-2.5 rounded-xl border text-left text-xs transition cursor-pointer relative overflow-hidden flex items-center justify-between ${
                              isStudentVote
                                ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-950' 
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div 
                              className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-300 ${
                                isStudentVote ? 'bg-emerald-100/60' : 'bg-orange-100/50'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                            <span className="relative z-10 font-medium flex items-center gap-1.5">
                              {isStudentVote && <span className="text-emerald-700 font-black">✓</span>}
                              <span>{opt.text}</span>
                            </span>
                            <span className="relative z-10 font-bold text-[11px] text-slate-500">{pct}% ({opt.votes})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Announcements & Notices Board (Feature 14 Preview in Dashboard) */}
          {reminders.filter(r => r.isActive).length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-orange-600" />
                  <h3 className="font-black text-sm text-slate-900">Mess Notices & Alerts</h3>
                </div>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className="text-[10px] uppercase font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded border border-orange-200 transition cursor-pointer"
                >
                  View All &rarr;
                </button>
              </div>

              <div className="space-y-2">
                {reminders.filter(r => r.isActive).slice(0, 2).map(r => (
                  <div key={r.id} className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    r.priority === 'urgent' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{r.title}</span>
                      {r.priority === 'urgent' && (
                        <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">{r.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Meal Rating Banner (Feature 12 Dashboard Shortcut) */}
          {!isExpired && (
            <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Star className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    Rate Today's {shiftAudit.mealType.toUpperCase()}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    How was the food today? Share quick feedback with the chef
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('ratings')}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                Rate Meal
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 3 — ATTENDANCE HISTORY (REAL SUPABASE RECORDS) */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="w-full max-w-full sm:max-w-2xl space-y-4">
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-orange-600" />
                  <span>Meal Attendance History</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authoritative attendance records verified at Morya Mess counter gate
                </p>
              </div>
              <span className="text-xs font-black bg-orange-100 text-orange-800 px-3 py-1 rounded-full self-start sm:self-auto">
                {attendanceMetrics.total} Total Meals
              </span>
            </div>

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Meals</span>
                <span className="text-base font-black text-slate-900">{attendanceMetrics.total}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Lunch</span>
                <span className="text-base font-black text-amber-900">{attendanceMetrics.lunchCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                <span className="text-[10px] uppercase font-bold text-indigo-800 block">Dinner</span>
                <span className="text-base font-black text-indigo-900">{attendanceMetrics.dinnerCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">This Month</span>
                <span className="text-base font-black text-emerald-900">{attendanceMetrics.thisMonthCount}</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold text-slate-600">
              <button
                onClick={() => setAttFilter('all')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition ${
                  attFilter === 'all' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                All Meals ({attendanceMetrics.total})
              </button>
              <button
                onClick={() => setAttFilter('this_month')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition ${
                  attFilter === 'this_month' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                This Month ({attendanceMetrics.thisMonthCount})
              </button>
              <button
                onClick={() => setAttFilter('prev_month')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition ${
                  attFilter === 'prev_month' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Last Month ({attendanceMetrics.prevMonthCount})
              </button>
              <button
                onClick={() => setAttFilter('lunch')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition ${
                  attFilter === 'lunch' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Lunch Only
              </button>
              <button
                onClick={() => setAttFilter('dinner')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition ${
                  attFilter === 'dinner' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Dinner Only
              </button>
            </div>

            {attendanceDisputeSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{attendanceDisputeSuccessMsg}</span>
              </div>
            )}

            {/* Attendance Record List */}
            {filteredAttendance.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <Utensils className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700 text-sm">No attendance records found for this period.</div>
                <p className="text-xs text-slate-400">Meals scanned at the counter will appear here immediately.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {filteredAttendance.map(log => {
                  const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isAllow = log.scanStatus === 'ALLOW' || (log.scanStatus as string) === 'VERIFIED';
                  const methodStr = log.overrideNotes || (log.reason?.includes('Counter') ? 'Counter Verification' : 'Gate QR Scanner');
                  const isDisputed = disputedLogIds.includes(log.id);

                  return (
                    <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          log.mealType === 'lunch' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {log.mealType === 'lunch' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 capitalize text-sm">{log.mealType} Meal</span>
                            <span className="font-mono text-[11px] text-slate-500 font-bold">{log.date} at {timeStr}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span>Method: <strong className="text-slate-700">{methodStr}</strong></span>
                            <span>•</span>
                            <span className="text-slate-600">{log.reason || 'Verified Entry'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isDisputed ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Issue Reported
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedDisputeLog(log)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-orange-700 hover:bg-orange-50 transition cursor-pointer border border-slate-200"
                            title="Report incorrect meal, timing, or presence"
                          >
                            Report Issue
                          </button>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isAllow ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isAllow ? 'Verified' : 'Blocked'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attendance Dispute Modal (Feature 25) */}
          <AttendanceDisputeModal
            isOpen={Boolean(selectedDisputeLog)}
            log={selectedDisputeLog}
            customer={customer}
            onClose={() => setSelectedDisputeLog(null)}
            onDisputeSubmitted={(logId) => {
              setDisputedLogIds(prev => Array.from(new Set([...prev, logId])));
              setAttendanceDisputeSuccessMsg('Attendance dispute reported to Mess Owner. Your original record remains intact while under review.');
              setTimeout(() => setAttendanceDisputeSuccessMsg(null), 5000);
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 4 — DIGITAL STUDENT PASS (INFORMATIONAL, NO STUDENT QR) */}
      {/* ========================================================================= */}
      {activeTab === 'pass' && (
        <div className="w-full max-w-full sm:max-w-xl space-y-4">
          <div className="bg-white rounded-3xl border-2 sm:border-4 border-slate-900 shadow-xl overflow-hidden p-2 text-slate-900">
            <div className="border border-amber-500 rounded-2xl p-4 sm:p-5 bg-white relative overflow-hidden">
              {/* Tricolour Ribbon */}
              <div className="h-1.5 w-full -mt-4 sm:-mt-5 mb-4 flex rounded-t overflow-hidden">
                <div className="h-full w-1/3 bg-[#FF9933]"></div>
                <div className="h-full w-1/3 bg-white"></div>
                <div className="h-full w-1/3 bg-[#138808]"></div>
              </div>

              {/* Pass Header */}
              <div className="flex flex-col items-center pb-3 border-b-2 border-slate-200 mb-3 text-center">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 tracking-wider mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>MORYA MESS MANAGEMENT</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                  {messName}
                </h2>
                <p className="text-[10px] font-bold text-slate-500">
                  OFFICIAL STUDENT DIGITAL DINING PASS
                </p>

                <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    PASS ID: {customer.id}
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    customer.gender === 'female' 
                      ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {customer.gender === 'female' ? '★ HOSTEL GIRL' : '★ STUDENT / BOY'}
                  </span>
                </div>
              </div>

              {/* Student Identity Block */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 mb-3.5 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Student Member Name
                  </span>
                  <div className="font-black text-slate-900 text-lg tracking-wide uppercase">
                    {customer.name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block">Mobile:</span>
                    <span className="font-bold text-slate-800">{customer.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Plan Type:</span>
                    <span className="font-black text-orange-700 uppercase">
                      {customer.planType ? customer.planType.replace(/_/g, ' ') : 'Monthly Plan'}
                    </span>
                  </div>
                </div>

                {customer.hostelOrAddress && (
                  <div className="text-[11px] text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{customer.hostelOrAddress}</span>
                  </div>
                )}
              </div>

              {/* 30-Day Validity Period Block */}
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 mb-3.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block mb-0.5">
                  OFFICIAL SUBSCRIPTION VALIDITY
                </span>
                <div className="font-mono font-black text-sm sm:text-base text-slate-900 flex items-center justify-center gap-2">
                  <span>{customer.startDate || 'N/A'}</span>
                  <span className="text-amber-600 font-sans">➔</span>
                  <span className={isExpired ? 'text-rose-600' : 'text-orange-700'}>{customer.endDate || 'N/A'}</span>
                </div>
                <div className="text-[11px] font-bold text-amber-900 mt-1">
                  {isExpired ? '⚠️ Subscription Expired' : `${daysRemaining} Days Validity Remaining`}
                </div>
              </div>

              {/* Shift Hours Guide */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-[11px] text-slate-700">
                <strong>Shift Hours:</strong> Lunch: 10:30 AM – 02:30 PM | Dinner: 08:30 PM – 10:30 PM
                <div className="text-[10px] text-rose-700 font-bold mt-0.5">
                  Sunday Dinner Shift is Closed for Kitchen Maintenance
                </div>
              </div>

              {/* Security Seal & Authorized Stamp */}
              <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <div>
                  <span className="font-bold text-slate-800 block">SECURITY CERTIFIED</span>
                  <span>Non-transferable digital pass</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800 block">MORYA MESS</span>
                  <span className="italic">Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 5 — LEAVES / SKIP MEAL */}
      {/* ========================================================================= */}
      {activeTab === 'leave' && (
        <div className="w-full max-w-full sm:max-w-2xl space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Request Vacation Leave / Skip Meal</h2>
                <p className="text-xs text-slate-500">
                  Approved leaves extend your 30-day subscription automatically!
                </p>
              </div>
            </div>

            {leaveSuccessMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{leaveSuccessMessage}</span>
              </div>
            )}

            {leaveErrorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{leaveErrorMessage}</span>
              </div>
            )}

            {isExpired ? (
              <div className="p-5 sm:p-6 rounded-2xl bg-rose-50 border-2 border-rose-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-rose-950 text-sm sm:text-base">
                    Subscription Expired — Leave Applications Blocked
                  </h4>
                  <p className="text-xs text-rose-800 leading-relaxed max-w-md mx-auto">
                    Your pass ended on <strong>{customer.endDate || 'N/A'}</strong>. Vacation leave requests, diet skips, and validity extension benefits can strictly only be used while your mess subscription is actively running.
                  </p>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-200/80 text-rose-900 text-[11px] font-black">
                    🔒 Please renew your mess pass with owner to apply for leaves
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLeaveSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Leave Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={today}
                      value={leaveStart}
                      onChange={e => setLeaveStart(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none focus:border-orange-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Leave End Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={leaveStart}
                      value={leaveEnd}
                      onChange={e => setLeaveEnd(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none focus:border-orange-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Reason for Leave *
                  </label>
                  <select
                    value={leaveReason}
                    onChange={e => setLeaveReason(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none focus:border-orange-600"
                  >
                    <option value="Going to Hometown / Family Function">Going to Hometown / Family Function</option>
                    <option value="College Semester Exam Break">College Semester Exam Break</option>
                    <option value="Medical / Health Leave">Medical / Health Leave</option>
                    <option value="Industrial Training / Internship">Industrial Training / Internship</option>
                    <option value="Other Personal Reason">Other Personal Reason</option>
                  </select>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                  💡 <strong>Mess Leave Policy:</strong> Please submit leave requests at least 1 day in advance. Once approved by the mess owner, your validity end date is automatically extended.
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLeave ? (
                    <span>Submitting to Database...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Leave Request to Mess Manager</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Live Leave History */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Your Leave Application History ({leaveRequests.length})
              </h3>
              {leaveRequests.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No previous leave applications recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {leaveRequests.map(l => (
                    <div key={l.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{l.startDate} to {l.endDate}</span>
                        <span className="text-[11px] text-slate-500 ml-2">({l.days || 1} days)</span>
                        <p className="text-[10px] text-slate-400">{l.reason}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 'approved' || l.approved ? 'bg-emerald-100 text-emerald-800' :
                        l.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status || (l.approved ? 'approved' : 'pending')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 6, 7 & 8 — PAYMENTS, PAYMENT SUBMISSION & RECEIPTS */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="w-full max-w-full sm:max-w-2xl space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base">UPI Payments & Ledger</h2>
                  <p className="text-xs text-slate-500">Pay mess fees via UPI, submit UTR & view verified receipts</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                VERIFIED VPA
              </span>
            </div>

            {/* Dues Banner */}
            <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
              authoritativeBalance > 0 ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              <div>
                <span className="font-bold block text-[11px] opacity-80">Subscription Dues Status</span>
                <span className="font-black text-lg sm:text-xl">
                  {authoritativeBalance > 0 ? `₹${authoritativeBalance} Outstanding` : 'All Fees Paid (₹0 Due)'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold block">Verified Paid:</span>
                <span className="font-black text-emerald-700 text-sm">₹{totalVerifiedPaid}</span>
              </div>
            </div>

            {/* Official Mess UPI Standee Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 text-center space-y-3 relative overflow-hidden shadow-md">
              <span className="bg-orange-600 text-white text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded-full inline-block">
                Scan & Pay via PhonePe / GPay / Paytm
              </span>

              <div>
                <h3 className="font-black text-base uppercase text-white tracking-tight">
                  {upiConfig.upiPayeeName || messName}
                </h3>
                <p className="text-[11px] text-slate-300 font-medium">Official Mess Payment QR</p>
              </div>

              {/* QR Image */}
              <div className="flex justify-center p-2 bg-white rounded-2xl mx-auto w-fit shadow-lg">
                {upiConfig.upiQrCodeImage ? (
                  <img
                    src={upiConfig.upiQrCodeImage}
                    alt="Official Mess UPI QR"
                    className="w-44 h-44 object-contain rounded-xl"
                  />
                ) : generatedUpiQrUrl ? (
                  <img
                    src={generatedUpiQrUrl}
                    alt="Official Mess UPI QR"
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                    Loading QR...
                  </div>
                )}
              </div>

              {/* UPI ID / VPA with Copy Button */}
              <div className="bg-slate-800/90 rounded-xl p-2.5 border border-slate-700 flex items-center justify-between text-xs max-w-sm mx-auto">
                <div className="text-left truncate mr-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Official UPI ID</span>
                  <span className="font-mono font-bold text-orange-400 text-xs sm:text-sm select-all">
                    {upiConfig.upiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (upiConfig.upiId) {
                      navigator.clipboard.writeText(upiConfig.upiId);
                      setCopiedUpi(true);
                      setTimeout(() => setCopiedUpi(false), 2000);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Error / Success Messages */}
            {paymentErrorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{paymentErrorMessage}</span>
              </div>
            )}
            {paymentSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{paymentSuccessMessage}</span>
              </div>
            )}

            {/* Payment Record / UTR Entry Form */}
            <form onSubmit={handleRecordStudentPayment} className="space-y-4 pt-2">
              <div className="border-t border-slate-100 pt-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1">
                  Record Your Payment for Owner Verification
                </h3>
                <p className="text-[11px] text-slate-500 mb-3">
                  After paying via your UPI App, enter the amount and 12-digit UTR/Reference number from your bank app.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900 focus:outline-none focus:border-orange-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    12-Digit UPI Ref / UTR No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={payUtr}
                    onChange={e => setPayUtr(e.target.value)}
                    placeholder="e.g. 425619382019"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">
                  Optional Note / Remarks
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid for next month / Google Pay"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-orange-600 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSubmittingPayment ? (
                  <span>Submitting to Database...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Payment Verification Request</span>
                  </>
                )}
              </button>
            </form>

            {/* Payment Transactions & Receipts List */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                  Payment History & Receipts ({payments.length})
                </h4>
                <span className="text-[10px] text-slate-400">Live Supabase ledger</span>
              </div>

              {payments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No payment transactions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {payments.map(p => (
                    <div 
                      key={p.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-sm">₹{p.amount}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-200 text-slate-700 font-mono">
                            {p.paymentMode}
                          </span>
                          {p.transactionReference && (
                            <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              UTR: {p.transactionReference}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{p.notes || 'Mess Fee Payment'}</p>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Date: {new Date(p.createdAt).toLocaleDateString()} at {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {p.status === 'verified' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Verified</span>
                            </span>
                            <button
                              onClick={() => setSelectedReceipt(p)}
                              className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                              title="View Official Payment Receipt"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                          </div>
                        ) : p.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>Pending Review</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Reversed</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 8 — PAYMENT RECEIPT MODAL */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            {/* Receipt Header */}
            <div className="text-center border-b border-slate-200 pb-3">
              <span className="text-[10px] uppercase font-bold text-orange-600 tracking-widest block">
                Official Digital Receipt
              </span>
              <h3 className="text-lg font-black text-slate-900 uppercase mt-0.5">{messName}</h3>
              <p className="text-[10px] text-slate-500">Boys & Girls Dining Hall, FC Road, Pune</p>
            </div>

            {/* Receipt Meta */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-400 font-bold">Receipt ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReceipt.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-400 font-bold">Student Name:</span>
                <span className="font-bold text-slate-900">{customer.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-400 font-bold">Customer ID:</span>
                <span className="font-mono font-bold text-slate-800">{customer.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-400 font-bold">Payment Mode:</span>
                <span className="font-bold uppercase text-slate-800">{selectedReceipt.paymentMode}</span>
              </div>
              {selectedReceipt.transactionReference && (
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400 font-bold">UTR / Ref No:</span>
                  <span className="font-mono font-bold text-orange-700">{selectedReceipt.transactionReference}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-400 font-bold">Date of Payment:</span>
                <span className="font-mono text-slate-700">{new Date(selectedReceipt.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-900 font-bold text-sm">Amount Paid:</span>
                <span className="font-black text-emerald-700 text-base">₹{selectedReceipt.amount}</span>
              </div>
            </div>

            {/* Verification Stamp */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-900 font-bold flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>OFFICIALLY AUDITED & VERIFIED BY MESS OWNER</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 9 — MONTHLY STATEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'statement' && (
        <div className="w-full max-w-full sm:max-w-2xl space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span>Student Monthly Statement</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete billing cycle ledger matching official owner records
                </p>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Month:</span>
                <input
                  type="month"
                  value={statementMonth}
                  onChange={e => setStatementMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50"
                />
              </div>
            </div>

            {/* Statement Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Diner Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{customer.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Member ID</span>
                  <span className="font-mono font-bold text-slate-800">{customer.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block">Monthly Plan Rate</span>
                  <span className="font-bold text-slate-900">₹{statementData.monthlyPlanRate}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-emerald-600 font-bold block">Verified Paid</span>
                  <span className="font-bold text-emerald-700">₹{statementData.verifiedMonthPayments}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-amber-600 font-bold block">Pending Paid</span>
                  <span className="font-bold text-amber-700">₹{statementData.pendingMonthPayments}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-rose-600 font-bold block">Balance Due</span>
                  <span className="font-bold text-rose-700">₹{statementData.netBalance}</span>
                </div>
              </div>

              {/* Attendance Breakdown in Statement */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Meals Eaten this Month:</span>
                  <span className="text-[11px] text-slate-500">
                    Lunch: {statementData.monthLunch} | Dinner: {statementData.monthDinner}
                  </span>
                </div>
                <span className="font-black text-slate-900 text-base">
                  {statementData.totalMeals} Meals
                </span>
              </div>

              {/* Leave Breakdown in Statement */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Approved Leave Days:</span>
                  <span className="text-[11px] text-slate-500">
                    Subscription validity extended automatically
                  </span>
                </div>
                <span className="font-black text-amber-800 text-sm">
                  {statementData.approvedLeaveDays} Days
                </span>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download Monthly Statement</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 10 — WEEKLY MENU (SYNCED WITH OWNER CONFIG) */}
      {/* ========================================================================= */}
      {activeTab === 'menu' && (
        <div className="w-full max-w-full sm:max-w-2xl space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-orange-600" />
                  <span>Weekly Mess Dining Schedule</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Published and updated directly by Morya Mess Head Chef
                </p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-orange-100 text-orange-800 uppercase self-start sm:self-auto">
                Today: {String(currentDayOfWeek)}
              </span>
            </div>

            {/* Day Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold text-slate-600">
              {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(day => (
                <button
                  key={day}
                  onClick={() => setMenuActiveDay(day)}
                  className={`px-3 py-2 rounded-xl transition cursor-pointer capitalize whitespace-nowrap text-xs ${
                    menuActiveDay === day 
                      ? 'bg-orange-600 text-white shadow-xs' 
                      : day === currentDayOfWeek
                      ? 'bg-orange-100 text-orange-900 border border-orange-300 font-extrabold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {day} {day === currentDayOfWeek && '★'}
                </button>
              ))}
            </div>

            {/* Day Menu Card */}
            {(() => {
              const dayDetail = weeklyMenu[menuActiveDay];
              if (!dayDetail) {
                return (
                  <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-400">
                    No menu available for this period.
                  </div>
                );
              }

              return (
                <div className="space-y-3.5">
                  {/* Lunch Shift Box */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-600" />
                        <h4 className="font-extrabold text-amber-900 text-sm capitalize">
                          {String(menuActiveDay)} Lunch (10:30 AM – 02:30 PM)
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-200">
                        Shift 1
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Special Sabzi / Dish</span>
                        <span className="font-bold text-slate-900">{dayDetail.lunchSpecial || 'Paneer Masala / Seasonal Bhaji'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Dal / Curry</span>
                        <span className="font-bold text-slate-900">{dayDetail.lunchDal || 'Dal Tadka / Amti'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Roti / Bread</span>
                        <span className="font-bold text-slate-900">{dayDetail.lunchRoti || 'Garam Chapati / Phulka'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Rice & Sweet</span>
                        <span className="font-bold text-slate-900">
                          {dayDetail.lunchRice || 'Steamed Rice'} {dayDetail.lunchSweet ? `• ${dayDetail.lunchSweet}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dinner Shift Box */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-extrabold text-indigo-900 text-sm capitalize">
                          {String(menuActiveDay)} Dinner (08:30 PM – 10:30 PM)
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-indigo-800 border border-indigo-200">
                        Shift 2
                      </span>
                    </div>

                    {menuActiveDay === 'sunday' ? (
                      <div className="p-4 bg-white rounded-xl border border-rose-200 text-center text-xs text-rose-900 space-y-1">
                        <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
                        <strong className="block font-bold">SUNDAY NIGHT DINNER CLOSED</strong>
                        <p className="text-[11px] text-slate-500">
                          Mess is closed on Sunday nights for kitchen sanitization and staff rest. Enjoy Sunday Lunch Feast!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Evening Special</span>
                          <span className="font-bold text-slate-900">{dayDetail.dinnerSpecial || 'Sev Bhaji / Sukhi Sabzi'}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Dal / Kadhi</span>
                          <span className="font-bold text-slate-900">{dayDetail.dinnerDal || 'Varan / Kadhi'}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Roti / Bhakri</span>
                          <span className="font-bold text-slate-900">{dayDetail.dinnerRoti || 'Jowar Bhakri / Chapati'}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Rice</span>
                          <span className="font-bold text-slate-900">{dayDetail.dinnerRice || 'Jeera Rice'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. STUDENT PROFILE PAGE (Directly accessed by tapping Profile Avatar) */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="w-full max-w-full sm:max-w-2xl space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
            {/* Profile Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Back to Dashboard"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Student Profile & Account</h2>
                  <p className="text-xs text-slate-500">Official Morya Mess membership details</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                customer.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                customer.status === 'expiring_soon' ? 'bg-amber-100 text-amber-800' :
                'bg-rose-100 text-rose-800'
              }`}>
                {customer.status === 'active' ? 'Active Member' : customer.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Profile Card Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
                  {customer.name ? customer.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 uppercase">
                    {customer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-mono mt-0.5">
                    <span>ID: <strong>{customer.id}</strong></span>
                    <span>•</span>
                    <span className="capitalize">{customer.gender || 'student'}</span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col sm:items-end justify-between items-center text-xs">
                <span className="text-[11px] text-slate-500">Validity:</span>
                <span className="font-extrabold text-orange-700">
                  {isExpired ? 'Expired' : `${daysRemaining} Days Remaining`}
                </span>
              </div>
            </div>

            {/* Subscription & Validity Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                Subscription & Plan Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Plan Type</span>
                  <span className="font-bold text-slate-900 capitalize text-sm">
                    {customer.planType ? customer.planType.replace(/_/g, ' ') : 'Standard Monthly Plan'}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Monthly Fee Rate</span>
                  <span className="font-bold text-emerald-700 text-sm">₹{customer.totalAmount || standardFee} / 30 Days</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Start Date</span>
                  <span className="font-mono font-bold text-slate-900">{customer.startDate || 'N/A'}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Expiry Date</span>
                  <span className="font-mono font-bold text-orange-700">{customer.endDate || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Student Contact & College Information (FEATURE 18: Permitted Profile Edits) */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
                  Contact & College Information
                </h4>
                {!isEditingProfile ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditPhone(customer.phone || '');
                      setEditCollege(customer.collegeOrWork || '');
                      setEditHostel(customer.hostelOrAddress || '');
                      setProfileSaveMsg(null);
                      setIsEditingProfile(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-orange-300 text-orange-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-orange-600" />
                    <span>Edit Contact Info</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-orange-600 uppercase">
                    Editing Permitted Fields
                  </span>
                )}
              </div>

              {profileSaveMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  profileSaveMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}>
                  {profileSaveMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-medium">{profileSaveMsg.text}</span>
                </div>
              )}

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Mobile Phone Number:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      College / Work Institution:
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={editCollege}
                        onChange={e => setEditCollege(e.target.value)}
                        placeholder="E.g., COEP / Fergusson College Pune"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Hostel / Room Address:
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={editHostel}
                        onChange={e => setEditHostel(e.target.value)}
                        placeholder="E.g., Sai Hostel, Room 204, Pune"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isSavingProfile ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving to Supabase...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      disabled={isSavingProfile}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium">Registered Phone:</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{customer.phone || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium">College / Institution:</span>
                    <span className="font-bold text-slate-900">{customer.collegeOrWork || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium">Hostel / Address:</span>
                    <span className="font-bold text-slate-900 text-right">{customer.hostelOrAddress || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Read-Only Protected Fields Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-[11px] flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Protected Fields:</strong> Student Name, Membership ID, Plan Type, Fee Rate, Validity Dates, and Outstanding Balance are maintained exclusively by Morya Mess Management for data security.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActiveTab('pass')}
                className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>View Digital Pass</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CAMERA QR SCANNER (LIVE CAMERA ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'scan_counter' && (
        <div className="w-full max-w-full sm:max-w-xl space-y-4">
          {/* Header Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider block">
                  Universal Standee Scanner
                </span>
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  Point Camera at Gate Standee
                </h3>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-800 text-orange-300 px-2.5 py-1 rounded-xl border border-slate-700 uppercase">
              {shiftAudit.mealType}
            </span>
          </div>

          {/* Hidden Canvas for Frame Processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Verification in Progress */}
          {isVerifying && (
            <div className="p-8 rounded-3xl bg-white border-2 border-orange-500 shadow-xl text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-orange-600 animate-spin mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Verifying with Morya Mess Server...</h3>
              <p className="text-xs text-slate-500">Checking subscription validity, active shift hours & duplicate scan prevention.</p>
            </div>
          )}

          {/* Camera Error Alert */}
          {!isVerifying && cameraError && !scanResult && (
            <div className="bg-white rounded-3xl border-2 border-rose-300 p-5 shadow-sm space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Camera Permission Needed</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
                  {cameraError}
                </p>
              </div>
              <button
                onClick={startCameraStream}
                className="py-2.5 px-5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Camera Permission</span>
              </button>
            </div>
          )}

          {/* Verified Result Card */}
          {!isVerifying && scanResult && (
            scanResult.success ? (
              /* DYNAMIC ANTI-FRAUD LIVE SECURITY DINING PASS (ANTI-SCREENSHOT ENFORCED) */
              <div 
                onClick={() => {
                  if (!isTouchVerified) {
                    setIsTouchVerified(true);
                    setTimeout(() => setIsTouchVerified(false), 2500);
                  }
                }}
                className="relative z-20 w-full max-w-sm sm:max-w-md mx-auto bg-white rounded-3xl border-2 border-emerald-400 shadow-2xl overflow-hidden p-6 sm:p-7 text-center animate-in fade-in zoom-in-95 duration-300 select-none"
              >
                {/* DYNAMIC SHIFTING WATERMARK IN CARD BACKGROUND */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04] flex flex-col justify-around rotate-[-12deg] select-none overflow-hidden font-black text-slate-900 text-xs tracking-widest uppercase">
                  <div className="whitespace-nowrap animate-pulse">
                    MORYA OFFICIAL LIVE PASS • AUTHENTICATED SCAN • DO NOT SCREENSHOT • {liveSecuritySeconds} • 
                  </div>
                  <div className="whitespace-nowrap">
                    SEC-TOKEN: #MM-{syncSecurityToken} • LIVE GATE VERIFIED • STRICTLY NON-TRANSFERABLE • 
                  </div>
                  <div className="whitespace-nowrap animate-pulse">
                    MORYA MESS DINING COUNTER • LIVE TICKS {liveSecuritySeconds} • VALID FOR CURRENT SHIFT ONLY • 
                  </div>
                </div>

                {/* 1. MORYA MESS OFFICIAL HEADER WITH LIVE TICKING CLOCK */}
                <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      M
                    </div>
                    <span className="font-black text-xs sm:text-sm text-slate-900 tracking-wider uppercase">
                      {messName || 'MORYA MESS'}
                    </span>
                  </div>

                  {/* LIVE REAL-TIME SECONDS TICKER (PREVENTS SCREENSHOT FRAUD) */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-mono font-black shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>{liveSecuritySeconds}</span>
                  </div>
                </div>

                {/* 2. GLOWING HOLOGRAPHIC SUCCESS BADGE */}
                <div className="relative z-10 pt-4 pb-2">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    {/* Concentric Pulsing Rings */}
                    <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                    <div className="absolute -inset-1.5 rounded-full border-2 border-emerald-400/40 animate-pulse" />
                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Check className="w-9 h-9 stroke-[3.5] animate-in zoom-in-50 duration-300" />
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black tracking-widest uppercase border border-emerald-300 mt-3.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ATTENDANCE VERIFIED</span>
                  </div>
                </div>

                {/* 3. HERO: STUDENT NAME */}
                <div className="relative z-10 py-1.5">
                  <h1 className="text-2xl min-[360px]:text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-[1.15] uppercase break-words">
                    {customer.name}
                  </h1>
                  <div className="flex items-center justify-center gap-2 pt-1 text-xs">
                    <span className="text-emerald-700 font-bold bg-emerald-50/90 px-2.5 py-0.5 rounded-md border border-emerald-200/70 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Active Member
                    </span>
                    <span className="font-mono font-bold text-slate-400">{customer.id}</span>
                  </div>
                </div>

                {/* 4. DYNAMIC ROLLING SECURITY CODE & ELAPSED COUNTER */}
                <div className="relative z-10 my-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>SYNC TOKEN:</span>
                    <span className="text-emerald-700 font-black">#MM-{syncSecurityToken}</span>
                  </div>
                  <div className="text-slate-500 font-semibold">
                    {scanTimestamp ? `Scanned ${Math.max(0, Math.floor((Date.now() - scanTimestamp) / 1000))}s ago` : 'Live Gate Verified'}
                  </div>
                </div>

                {/* 5. INTERACTIVE TOUCH-TO-VERIFY LIVE APP (COUNTER STAFF TAMPER PROOF) */}
                <div className="relative z-10 mb-2">
                  <div
                    className={`py-2 px-3 rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                      isTouchVerified 
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[0.99]' 
                        : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                    }`}
                  >
                    <Fingerprint className={`w-4 h-4 ${isTouchVerified ? 'text-white animate-spin' : 'text-emerald-600'}`} />
                    <span className="text-[11px] font-black tracking-wide">
                      {isTouchVerified 
                        ? '✓ AUTHENTIC LIVE APP VERIFIED (NOT A SCREENSHOT!)' 
                        : '👆 Touch Card to Verify Live App (Anti-Fraud)'}
                    </span>
                  </div>
                </div>

                {/* 6. SLEEK HIGH-CONTRAST MEAL & TIME STRIP */}
                <div className="relative z-10 bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center font-black text-white shadow-xs shrink-0">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block">Meal Verified</span>
                      <span className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                        {scanResult.mealShift || shiftAudit.mealType}
                      </span>
                    </div>
                  </div>
                  <div className="text-right border-l border-slate-800 pl-4 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Marked Time</span>
                    <span className="text-base sm:text-lg font-mono font-black text-emerald-400">
                      {scanResult.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* 7. LIVE ANTI-SCREENSHOT DISCLAIMER */}
                <div className="relative z-10 mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
                  <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Screenshots & forwarded images are strictly prohibited at dining counter</span>
                </div>

                {/* 8. ACTION BUTTONS */}
                <div className="relative z-10 flex flex-col sm:flex-row gap-2.5 mt-4 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setScanResult(null);
                      startCameraStream();
                    }}
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm tracking-wide shadow-md shadow-orange-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>SCAN AGAIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('attendance')}
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 font-black text-xs sm:text-sm border border-slate-200 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Utensils className="w-4 h-4 text-orange-600" />
                    <span>VIEW MY MEALS ({attendanceMetrics.todayCount > 0 ? attendanceMetrics.todayCount : (validAttendance.length > 0 ? validAttendance.length : 1)})</span>
                  </button>
                </div>
              </div>
            ) : (
              /* DENIED / ERROR CARD */
              <div className="relative z-20 w-full max-w-sm sm:max-w-md mx-auto bg-white rounded-3xl border-2 border-rose-300 shadow-2xl p-6 sm:p-7 text-center space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-600 shadow-sm">
                  <XCircle className="w-9 h-9 stroke-[2.5]" />
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700 block">
                    ATTENDANCE NOT ALLOWED
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                    {scanResult.message}
                  </h3>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs space-y-1.5 text-left text-slate-700">
                  <div className="flex justify-between border-b border-rose-100 pb-1">
                    <span className="text-slate-500">Student Name:</span>
                    <span className="font-bold text-slate-900">{customer.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-rose-100 pb-1">
                    <span className="text-slate-500">Customer ID:</span>
                    <span className="font-mono font-bold text-slate-800">{customer.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Meal Shift:</span>
                    <span className="font-bold uppercase text-orange-600">{scanResult.mealShift || shiftAudit.mealType}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScanResult(null);
                      startCameraStream();
                    }}
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Scan Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Back to Dashboard</span>
                  </button>
                </div>
              </div>
            )
          )}

          {/* Live Camera Viewport */}
          {!isVerifying && !scanResult && (
            <div className="space-y-4">
              <div className="relative w-full aspect-square max-w-sm mx-auto bg-black rounded-3xl overflow-hidden border-4 border-slate-900 shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Reticle / Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                  <div className="w-56 h-56 border-2 border-orange-500/80 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-orange-500 -mt-1 -ml-1 rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-orange-500 -mt-1 -mr-1 rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-orange-500 -mb-1 -ml-1 rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-orange-500 -mb-1 -mr-1 rounded-br"></div>
                    
                    {/* Laser Scanning Animation */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_10px_#f97316] animate-bounce mt-24"></div>
                  </div>
                  <span className="bg-black/60 text-white text-[11px] font-bold px-3 py-1 rounded-full mt-4 backdrop-blur-xs">
                    Align Standee QR inside box
                  </span>
                </div>
              </div>

              {/* Manual Code Fallback (For Damaged Lens) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                <span className="font-bold text-slate-700 block">Manual Token Code Entry (Fallback):</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    placeholder="Enter Standee Token"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                  />
                  <button
                    onClick={() => {
                      if (manualCode.trim()) {
                        handleProcessScannedCode(manualCode.trim());
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 11 — STUDENT COMMUNITY POLLS */}
      {/* ========================================================================= */}
      {activeTab === 'polls' && (
        <StudentPollsTab
          customer={customer}
          polls={polls}
          pollVotes={pollVotes}
          onPollVoted={refreshAllStudentData}
          onRefresh={refreshAllStudentData}
          isRefreshing={isRefreshing}
        />
      )}

      {/* ========================================================================= */}
      {/* FEATURE 12 — MEAL RATINGS & REVIEWS */}
      {/* ========================================================================= */}
      {activeTab === 'ratings' && (
        <StudentRatingsTab
          customer={customer}
          ratings={mealRatings}
          currentShift={shiftAudit}
          isExpired={isExpired}
          onRatingSubmitted={refreshAllStudentData}
          onRefresh={refreshAllStudentData}
          isRefreshing={isRefreshing}
        />
      )}

      {/* ========================================================================= */}
      {/* FEATURE 13 — NOTIFICATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <StudentNotificationsTab
          customer={customer}
          notifications={combinedNotifications}
          onRefresh={refreshAllStudentData}
          isRefreshing={isRefreshing}
        />
      )}

      {/* ========================================================================= */}
      {/* FEATURE 14 — ANNOUNCEMENTS & NOTICES */}
      {/* ========================================================================= */}
      {activeTab === 'announcements' && (
        <StudentAnnouncementsTab
          reminders={reminders}
          onRefresh={refreshAllStudentData}
          isRefreshing={isRefreshing}
        />
      )}

      {/* ========================================================================= */}
      {/* FEATURE 15 — COMPLAINTS & GRIEVANCES */}
      {/* ========================================================================= */}
      {activeTab === 'complaints' && (
        <StudentComplaintsTab
          customer={customer}
          complaints={complaints}
          isExpired={isExpired}
          onComplaintSubmitted={refreshAllStudentData}
          onRefresh={refreshAllStudentData}
          isRefreshing={isRefreshing}
        />
      )}

      {/* ========================================================================= */}
      {/* FEATURE 16 — MESS TIMINGS & SHIFTS */}
      {/* ========================================================================= */}
      {activeTab === 'timings' && (
        <StudentTimingsTab shiftAudit={shiftAudit} />
      )}

      {/* ========================================================================= */}
      {/* FEATURE 17 — MESS RULES & FAQ */}
      {/* ========================================================================= */}
      {activeTab === 'rules' && (
        <StudentRulesFaqTab />
      )}

      {/* ========================================================================= */}
      {/* FEATURE 19 — HELP & SUPPORT */}
      {/* ========================================================================= */}
      {activeTab === 'support' && (
        <StudentSupportTab
          customer={customer}
          onNavigateToComplaints={() => setActiveTab('complaints')}
          messName={messName}
        />
      )}

      {/* ========================================================================= */}
      {/* FEATURE 20 — LOGOUT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Sign Out of Student Portal?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                You will need your Student PIN or phone number to sign in again.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  onExitPortal();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-xs"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 20 — ACCOUNT SWITCHER MODAL */}
      {/* ========================================================================= */}
      {isAccountSwitchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                <h3 className="font-black text-slate-900 text-sm">Switch Student Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountSwitchOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {allCustomers.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSwitchCustomer(c);
                    setIsAccountSwitchOpen(false);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                    c.id === customer.id
                      ? 'border-orange-500 bg-orange-50 font-bold text-orange-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-extrabold text-xs">{c.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">ID: {c.id} &bull; {c.phone || 'No phone'}</div>
                  </div>
                  {c.id === customer.id ? (
                    <span className="text-[10px] font-black uppercase text-orange-700 bg-white px-2 py-0.5 rounded border border-orange-200">
                      Active Now
                    </span>
                  ) : (
                    <span className="text-xs text-orange-600 font-bold">Switch &rarr;</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 25-DAY CAMPAIGN NOMINATION FORM MODAL ("NOMINATE ME") */}
      {/* ========================================================================= */}
      {isNominateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-emerald-400">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <Trophy className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Nominate for 25-Day Challenge</h3>
                  <p className="text-[11px] text-slate-500">Zero Food Waste Monthly Competition</p>
                </div>
              </div>
              <button
                onClick={() => setIsNominateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmNomination} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 space-y-1">
                <span className="font-extrabold text-[11px] text-emerald-800 uppercase tracking-wider block">🏆 Challenge Prize:</span>
                <p className="text-xs">
                  Finish 100% of your meal for <strong>25 days</strong> this month with 0 food waste. Top 5 winners chosen via AI algorithmic draw win <strong>₹50 OFF</strong> on monthly renewal!
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Full Name</label>
                <input
                  type="text"
                  disabled
                  value={customer.name}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    disabled
                    value={customer.phone}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Month-Year</label>
                  <input
                    type="text"
                    disabled
                    value={currentMonthYear}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">College / Hostel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Govt Polytechnic Hostel / Bidve College"
                  value={nominateCollege}
                  onChange={(e) => setNominateCollege(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Zero-Waste Pledge *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. I pledge to take only what I can finish and maintain 0 food waste for 25 days!"
                  value={nominatePledge}
                  onChange={(e) => setNominatePledge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 outline-none focus:border-emerald-500 resize-none text-xs"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Confirm Nomination & Submit to Owner App ➔</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST-MEAL SCAN CLEAN PLATE TASK TICK MODAL */}
      {/* ========================================================================= */}
      {showPostScanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-emerald-400">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🍽️</span>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Post-Meal Clean Plate Check</h3>
                  <p className="text-[11px] text-slate-500">25-Day Zero Food Waste Campaign</p>
                </div>
              </div>
              <button
                onClick={() => setShowPostScanModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 border border-emerald-200 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-emerald-600 mx-auto animate-bounce" />
              <h4 className="font-black text-emerald-950 text-base">
                Did you finish 100% of your thali today?
              </h4>
              <p className="text-xs text-emerald-800">
                You checked in for your meal! Mark today's Clean Plate task to increment your streak toward the 25-day milestone and ₹50 winner draw!
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleStudentDailyTick}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>✅ Yes, 100% Clean Plate! (+1 Day Streak)</span>
              </button>

              <button
                onClick={() => setShowPostScanModal(false)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Ask Me Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

