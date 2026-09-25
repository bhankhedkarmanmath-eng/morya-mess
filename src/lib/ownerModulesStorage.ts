import { 
  WalkinMealType, 
  WalkinPOSToken, 
  WeeklyMenuSchedule, 
  StudentPoll, 
  MessReminderNotice, 
  MealRatingReview, 
  CustomerComplaint, 
  SupportTicket 
} from '../types/mess';

const PREFIX = 'morya_v3_mod_';

const KEYS = {
  WALKIN_MEAL_TYPES: `${PREFIX}walkin_meal_types`,
  WALKIN_TOKENS: `${PREFIX}walkin_tokens`,
  WEEKLY_MENU: `${PREFIX}weekly_menu`,
  POLLS: `${PREFIX}polls`,
  REMINDERS: `${PREFIX}reminders`,
  MEAL_RATINGS: `${PREFIX}meal_ratings`,
  COMPLAINTS: `${PREFIX}complaints`,
  SUPPORT_TICKETS: `${PREFIX}support_tickets`,
  SECURITY_LOGS: `${PREFIX}security_logs`
};

export interface SecurityAuditEntry {
  id: string;
  actor: string;
  action: string;
  module: string;
  details: string;
  relatedId?: string;
  timestamp: string;
}

// 1. Walk-in Meal Types
export const DEFAULT_WALKIN_MEAL_TYPES: WalkinMealType[] = [
  { id: 'w-lunch', name: 'Lunch Thali (Unlimited Chapati & Rice)', price: 80, description: '2 Sabji, Dal, 4 Chapati, Rice, Salad & Pickle', isActive: true },
  { id: 'w-dinner', name: 'Dinner Thali (Homely Night Meal)', price: 80, description: 'Special Curry, Dal Fry, Roti, Rice & Dessert', isActive: true },
  { id: 'w-breakfast', name: 'Morning Breakfast & Chai', price: 40, description: 'Pohe / Upma / Sheera with Special Tea', isActive: true },
  { id: 'w-special', name: 'Sunday Special Feast Thali', price: 120, description: 'Paneer / Sweet Dish, Puri, Special Rice & Papad', isActive: true }
];

export function loadWalkinMealTypes(): WalkinMealType[] {
  try {
    const raw = localStorage.getItem(KEYS.WALKIN_MEAL_TYPES);
    return raw ? JSON.parse(raw) : DEFAULT_WALKIN_MEAL_TYPES;
  } catch {
    return DEFAULT_WALKIN_MEAL_TYPES;
  }
}

export function saveWalkinMealTypes(types: WalkinMealType[]): void {
  try {
    localStorage.setItem(KEYS.WALKIN_MEAL_TYPES, JSON.stringify(types));
  } catch (e) {
    console.warn('saveWalkinMealTypes err:', e);
  }
}

// 2. Walk-in Tokens & POS Sales
export function loadWalkinTokens(): WalkinPOSToken[] {
  try {
    const raw = localStorage.getItem(KEYS.WALKIN_TOKENS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWalkinTokens(tokens: WalkinPOSToken[]): void {
  try {
    localStorage.setItem(KEYS.WALKIN_TOKENS, JSON.stringify(tokens));
  } catch (e) {
    console.warn('saveWalkinTokens err:', e);
  }
}

export function createWalkinToken(data: Omit<WalkinPOSToken, 'id' | 'tokenNumber' | 'createdAt'>): WalkinPOSToken {
  const existing = loadWalkinTokens();
  const nextTokenNum = existing.length > 0 ? (existing[0].tokenNumber || 100) + 1 : 101;
  const newToken: WalkinPOSToken = {
    ...data,
    id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    tokenNumber: nextTokenNum,
    createdAt: new Date().toISOString()
  };
  saveWalkinTokens([newToken, ...existing]);
  addSecurityLog('Staff / Counter', 'Walk-in POS Token Issued', 'Walk-in POS', `Token #${nextTokenNum} issued for ${data.guestName} (₹${data.totalAmount})`);
  return newToken;
}

// 3. Weekly Menu Timetable
export const DEFAULT_WEEKLY_MENU: WeeklyMenuSchedule = {
  monday: {
    lunchSpecial: 'Chole Masala & Aloo Jeera',
    lunchDal: 'Tadka Dal Fry',
    lunchRoti: 'Hot Wheat Chapati',
    lunchRice: 'Steamed Jeera Rice',
    dinnerSpecial: 'Baingan Bharta / Sev Bhaji',
    dinnerDal: 'Moong Dal',
    dinnerRoti: 'Phulka',
    dinnerRice: 'Plain Rice'
  },
  tuesday: {
    lunchSpecial: 'Matar Paneer & Methi Sabji',
    lunchDal: 'Dal Tadka',
    lunchRoti: 'Wheat Chapati',
    lunchRice: 'Basmati Rice',
    dinnerSpecial: 'Kadhi Pakoda & Aloo Sukha',
    dinnerDal: 'Khichdi Special',
    dinnerRoti: 'Bhakri / Chapati',
    dinnerRice: 'Jeera Rice'
  },
  wednesday: {
    lunchSpecial: 'Mix Veg Korma & Rajma',
    lunchDal: 'Toor Dal Fry',
    lunchRoti: 'Butter Chapati',
    lunchRice: 'Steam Rice',
    dinnerSpecial: 'Soyabean Masala & Bhendi Fry',
    dinnerDal: 'Dal Kolhapuri',
    dinnerRoti: 'Wheat Chapati',
    dinnerRice: 'Jeera Rice'
  },
  thursday: {
    lunchSpecial: 'Palak Paneer & Chana Masala',
    lunchDal: 'Yellow Dal Tadka',
    lunchRoti: 'Soft Chapati',
    lunchRice: 'Pulao Rice',
    dinnerSpecial: 'Lauki Kofta & Patodi Rassa',
    dinnerDal: 'Dal Fry',
    dinnerRoti: 'Wheat Chapati',
    dinnerRice: 'Steamed Rice'
  },
  friday: {
    lunchSpecial: 'Aloo Gobi & Dal Makhani',
    lunchDal: 'Masoor Dal',
    lunchRoti: 'Hot Chapati',
    lunchRice: 'Steam Rice',
    dinnerSpecial: 'Kaju Curry / Paneer Bhurji',
    dinnerDal: 'Tadka Dal',
    dinnerRoti: 'Butter Phulka',
    dinnerRice: 'Veg Biryani Rice'
  },
  saturday: {
    lunchSpecial: 'Shevga Bhaji (Drumstick Curry) & Batata',
    lunchDal: 'Toor Dal Fry',
    lunchRoti: 'Fresh Chapati',
    lunchRice: 'Jeera Rice',
    dinnerSpecial: 'Pithla Bhakri & Thecha Special',
    dinnerDal: 'Kadhi',
    dinnerRoti: 'Jowar Bhakri / Chapati',
    dinnerRice: 'Steamed Rice',
    dinnerSweet: 'Sheera / Halwa'
  },
  sunday: {
    lunchSpecial: 'Shahi Paneer / Special Veg Biryani & Puri',
    lunchDal: 'Dal Makhani',
    lunchRoti: 'Garam Puri / Chapati',
    lunchRice: 'Veg Pulao with Raita',
    lunchSweet: 'Gulab Jamun / Kheer',
    dinnerSpecial: 'Mess Closed (Sunday Night Off)',
    dinnerDal: 'N/A',
    dinnerRoti: 'N/A',
    dinnerRice: 'N/A'
  }
};

export function loadWeeklyMenu(): WeeklyMenuSchedule {
  try {
    const raw = localStorage.getItem(KEYS.WEEKLY_MENU);
    return raw ? JSON.parse(raw) : DEFAULT_WEEKLY_MENU;
  } catch {
    return DEFAULT_WEEKLY_MENU;
  }
}

export function saveWeeklyMenu(menu: WeeklyMenuSchedule): void {
  try {
    localStorage.setItem(KEYS.WEEKLY_MENU, JSON.stringify(menu));
  } catch (e) {
    console.warn('saveWeeklyMenu err:', e);
  }
}

// 4. Student Polls
export function loadPolls(): StudentPoll[] {
  try {
    const raw = localStorage.getItem(KEYS.POLLS);
    return raw ? JSON.parse(raw) : [
      {
        id: 'poll-1',
        question: 'Which sweet dish would you prefer this Sunday lunch?',
        options: [
          { id: 'opt-1', text: 'Gulab Jamun', votes: 24 },
          { id: 'opt-2', text: 'Moong Dal Halwa', votes: 18 },
          { id: 'opt-3', text: 'Jalebi & Rabdi', votes: 31 }
        ],
        totalVotes: 73,
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ];
  } catch {
    return [];
  }
}

export function savePolls(polls: StudentPoll[]): void {
  try {
    localStorage.setItem(KEYS.POLLS, JSON.stringify(polls));
  } catch (e) {
    console.warn('savePolls err:', e);
  }
}

// 5. Reminders & Notice Board
export function loadReminders(): MessReminderNotice[] {
  try {
    const raw = localStorage.getItem(KEYS.REMINDERS);
    return raw ? JSON.parse(raw) : [
      {
        id: 'rem-1',
        title: 'Fee Renewal Reminder (25th - 30th)',
        message: 'All monthly diners are kindly requested to renew their meal subscriptions before month end to avoid gate interruption.',
        priority: 'urgent',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'rem-2',
        title: 'Sunday Night Dinner Closed',
        message: 'Reminder: As per standard hostel mess rules, dinner is closed on Sunday nights for kitchen deep-cleaning & maintenance.',
        priority: 'normal',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  } catch {
    return [];
  }
}

export function saveReminders(reminders: MessReminderNotice[]): void {
  try {
    localStorage.setItem(KEYS.REMINDERS, JSON.stringify(reminders));
  } catch (e) {
    console.warn('saveReminders err:', e);
  }
}

// 6. Meal Ratings & Reviews
export function loadMealRatings(): MealRatingReview[] {
  try {
    const raw = localStorage.getItem(KEYS.MEAL_RATINGS);
    return raw ? JSON.parse(raw) : [
      {
        id: 'rate-1',
        customerId: 'demo-1',
        customerName: 'Rahul Sharma',
        rating: 5,
        feedback: 'Paneer sabji today was very delicious! Warm chapatis served on time.',
        mealShift: 'lunch',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      },
      {
        id: 'rate-2',
        customerId: 'demo-2',
        customerName: 'Priya Patil',
        rating: 4,
        feedback: 'Good taste and clean dining tables. Less spicy dal was appreciated.',
        mealShift: 'dinner',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      }
    ];
  } catch {
    return [];
  }
}

export function saveMealRatings(ratings: MealRatingReview[]): void {
  try {
    localStorage.setItem(KEYS.MEAL_RATINGS, JSON.stringify(ratings));
  } catch (e) {
    console.warn('saveMealRatings err:', e);
  }
}

// 7. Complaints Tracker
export function loadComplaints(): CustomerComplaint[] {
  try {
    const raw = localStorage.getItem(KEYS.COMPLAINTS);
    return raw ? JSON.parse(raw) : [
      {
        id: 'comp-1',
        customerId: 'c-1',
        customerName: 'Amit Deshmukh',
        customerPhone: '9822334455',
        category: 'Food Quality',
        description: 'Rice was slightly undercooked in today lunch shift.',
        status: 'IN_PROGRESS',
        ownerReply: 'Acknowledged. Kitchen staff instructed to maintain optimal steam timing.',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      }
    ];
  } catch {
    return [];
  }
}

export function saveComplaints(complaints: CustomerComplaint[]): void {
  try {
    localStorage.setItem(KEYS.COMPLAINTS, JSON.stringify(complaints));
  } catch (e) {
    console.warn('saveComplaints err:', e);
  }
}

// 8. Support Tickets
export function loadSupportTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(KEYS.SUPPORT_TICKETS);
    return raw ? JSON.parse(raw) : [
      {
        id: 'tic-101',
        subject: 'UPI QR Scanner Verification Question',
        category: 'Technical',
        message: 'How can we print additional counter standees with our custom mess UPI ID?',
        priority: 'normal',
        status: 'RESOLVED',
        response: 'You can use Billing -> Mess Payment QR & UPI ID to generate high-resolution print ready QR codes directly.',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
  } catch {
    return [];
  }
}

export function saveSupportTickets(tickets: SupportTicket[]): void {
  try {
    localStorage.setItem(KEYS.SUPPORT_TICKETS, JSON.stringify(tickets));
  } catch (e) {
    console.warn('saveSupportTickets err:', e);
  }
}

// 9. Security & Activity Audit Log
export function loadSecurityLogs(): SecurityAuditEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.SECURITY_LOGS);
    return raw ? JSON.parse(raw) : [
      {
        id: 'sec-1',
        actor: 'Owner Desk',
        action: 'System Initialized',
        module: 'Core System',
        details: 'Morya Mess Operations Management Portal online & operational.',
        timestamp: new Date().toISOString()
      }
    ];
  } catch {
    return [];
  }
}

export function addSecurityLog(actor: string, action: string, module: string, details: string, relatedId?: string): void {
  try {
    const existing = loadSecurityLogs();
    const newEntry: SecurityAuditEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      actor,
      action,
      module,
      details,
      relatedId,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(KEYS.SECURITY_LOGS, JSON.stringify([newEntry, ...existing.slice(0, 200)]));
  } catch (e) {
    console.warn('addSecurityLog err:', e);
  }
}
