import { loadCleanPlateNominations, saveCleanPlateNominations } from './ownerModulesStorage';
import { CleanPlateNomination, Customer } from '../types/mess';

export interface CampaignParticipant {
  id: string;
  studentId?: string;
  studentName: string;
  studentPhone: string;
  college?: string;
  pledge?: string;
  registeredAt: string; // Formatted date & time, e.g. "02 Oct 2026, 01:15 PM"
  monthYear: string; // "2026-10"
  completedDates: string[]; // ["2026-10-01", "2026-10-02", ...]
  lastTickedAt?: string;
  isParticipating: boolean;
  isEligible: boolean; // completedDates.length >= targetDays
  isWinner: boolean;
  wonAmount?: number;
  winnerAnnouncedAt?: string;
}

export type StudentCampaignProgress = CampaignParticipant;

export interface CampaignConfig {
  id: string;
  title: string;
  description: string;
  monthYear: string; // e.g. "2026-10"
  targetStreakDays: number; // e.g. 25
  rewardAmount: number; // e.g. 50
  rewardTitle: string; // e.g. "₹50 Renewal Discount"
  maxWinners: number; // e.g. 5
  status: 'active' | 'paused' | 'ended';
  allowSelfNomination: boolean;
  createdAt: string;
  lastResetAt?: string;
}

const STORAGE_KEY = 'morya_v3_clean_plate_participants_v3';
const CONFIG_STORAGE_KEY = 'morya_v3_campaign_config';

export const DEFAULT_CAMPAIGN_CONFIG: CampaignConfig = {
  id: 'campaign-clean-plate-v1',
  title: 'Clean Plate Campaign (Zero Food Wastage)',
  description: 'Students who finish meals without food waste for the target days become eligible for lucky draw renewal discounts.',
  monthYear: new Date().toISOString().substring(0, 7),
  targetStreakDays: 25,
  rewardAmount: 50,
  rewardTitle: '₹50 Renewal Discount',
  maxWinners: 5,
  status: 'active',
  allowSelfNomination: true,
  createdAt: new Date().toISOString()
};

// Known external seed participant markers that were injected from outside
const EXTERNAL_MOCK_IDS = new Set([
  'part-01', 'part-02', 'part-03', 'part-04',
  'part-05', 'part-06', 'part-07', 'part-08'
]);

const EXTERNAL_MOCK_NAMES = new Set([
  'Rahul Suresh Sharma',
  'Sneha Sanjay Patil',
  'Rohan Vijay Deshmukh',
  'Priya Anant Joshi',
  'Amit Prakash Kulkarni',
  'Tanvi Mahesh Shinde',
  'Aditya Ramesh Gaikwad',
  'Kunal Ashok More'
]);

// Helper to notify all listening windows / tabs via BroadcastChannel & CustomEvent
function notifySync(data?: any) {
  if (typeof window !== 'undefined') {
    try {
      const bc = new BroadcastChannel('morya_clean_plate_channel');
      bc.postMessage({ type: 'SYNC_CAMPAIGN', data, timestamp: Date.now() });
      bc.close();
    } catch {
      // BroadcastChannel not available or error
    }
    window.dispatchEvent(new CustomEvent('morya_clean_plate_updated', { detail: data }));
    window.dispatchEvent(new Event('storage'));
  }
}

// ---------------------------------------------------------------------
// CAMPAIGN CONFIG GETTER & SETTER
// ---------------------------------------------------------------------
export function loadCampaignConfig(): CampaignConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) {
      saveCampaignConfig(DEFAULT_CAMPAIGN_CONFIG);
      return DEFAULT_CAMPAIGN_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CAMPAIGN_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CAMPAIGN_CONFIG;
  }
}

export function saveCampaignConfig(config: CampaignConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    notifySync({ config });
  } catch (e) {
    console.warn('saveCampaignConfig err:', e);
  }
}

// ---------------------------------------------------------------------
// PARTICIPANTS STORAGE (Purges all external mock data, keeps real records)
// ---------------------------------------------------------------------
export function loadAllCampaignParticipants(): CampaignParticipant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Clean slate - zero external mock data
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter out any external mock entries that were injected from outside
    const filtered = parsed.filter(p => {
      if (!p) return false;
      const isMockId = EXTERNAL_MOCK_IDS.has(p.id);
      const isMockName = EXTERNAL_MOCK_NAMES.has(p.studentName);
      return !isMockId && !isMockName;
    });

    // If external mock data was present and filtered out, persist the cleaned list
    if (filtered.length !== parsed.length) {
      saveAllCampaignParticipants(filtered);
    }

    return filtered;
  } catch {
    return [];
  }
}

export const loadAllTaskTrackers = loadAllCampaignParticipants;

export function saveAllCampaignParticipants(participants: CampaignParticipant[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
    notifySync(participants);
  } catch (e) {
    console.warn('saveAllCampaignParticipants err:', e);
  }
}

// Find participant by phone
export function getParticipantByPhone(phone: string): CampaignParticipant | undefined {
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
  const all = loadAllCampaignParticipants();
  return all.find(p => p.studentPhone.replace(/[^0-9]/g, '') === cleanPhone);
}

// Get student campaign progress with fallback
export function getStudentCampaignProgress(phone: string, name?: string): CampaignParticipant {
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
  const found = getParticipantByPhone(cleanPhone);
  if (found) return found;

  const config = loadCampaignConfig();
  return {
    id: `temp-${Date.now()}`,
    studentName: name || 'Student',
    studentPhone: cleanPhone,
    registeredAt: '',
    monthYear: config.monthYear || new Date().toISOString().substring(0, 7),
    completedDates: [],
    isParticipating: false,
    isEligible: false,
    isWinner: false
  };
}

// Register or Nominate student in campaign
export function registerStudentNomination(data: {
  studentName: string;
  studentPhone: string;
  college?: string;
  pledge?: string;
  studentId?: string;
}): { success: boolean; message: string; participant: CampaignParticipant } {
  const config = loadCampaignConfig();
  if (config.status === 'paused') {
    return {
      success: false,
      message: `The ${config.title} is currently paused by management. Please check back soon!`,
      participant: getStudentCampaignProgress(data.studentPhone, data.studentName)
    };
  }

  const all = loadAllCampaignParticipants();
  const cleanPhone = data.studentPhone.trim().replace(/[^0-9]/g, '');
  const monthYear = config.monthYear || new Date().toISOString().substring(0, 7);

  const existingIndex = all.findIndex(p => p.studentPhone.replace(/[^0-9]/g, '') === cleanPhone && p.monthYear === monthYear);

  const nowFormatted = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  if (existingIndex >= 0) {
    const existing = all[existingIndex];
    existing.studentName = data.studentName.trim() || existing.studentName;
    existing.college = data.college?.trim() || existing.college;
    existing.pledge = data.pledge?.trim() || existing.pledge;
    existing.isParticipating = true;
    all[existingIndex] = existing;
    saveAllCampaignParticipants(all);
    syncToOwnerAuditNomination(existing);
    return {
      success: true,
      message: `🎉 Nomination details updated! You are actively enrolled in the ${config.title}.`,
      participant: existing
    };
  }

  const newParticipant: CampaignParticipant = {
    id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    studentId: data.studentId || `STU-${Math.floor(100 + Math.random() * 900)}`,
    studentName: data.studentName.trim(),
    studentPhone: cleanPhone,
    college: data.college?.trim() || 'College / Hostel',
    pledge: data.pledge?.trim() || 'Finishing every meal with zero wastage!',
    registeredAt: nowFormatted,
    monthYear,
    completedDates: [],
    isParticipating: true,
    isEligible: false,
    isWinner: false
  };

  const updatedList = [newParticipant, ...all];
  saveAllCampaignParticipants(updatedList);
  syncToOwnerAuditNomination(newParticipant);

  return {
    success: true,
    message: `🎉 Congratulations ${newParticipant.studentName}! You have officially enrolled in the ${config.title}!`,
    participant: newParticipant
  };
}

// Record daily tick for student
export function recordStudentDailyTick(
  phone: string,
  name: string,
  dateStr: string
): { success: boolean; message: string; participant: CampaignParticipant; updatedProgress: CampaignParticipant } {
  const config = loadCampaignConfig();
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
  const monthYear = dateStr.substring(0, 7);
  const all = loadAllCampaignParticipants();

  let index = all.findIndex(p => p.studentPhone.replace(/[^0-9]/g, '') === cleanPhone && p.monthYear === monthYear);
  let participant: CampaignParticipant;

  if (index >= 0) {
    participant = { ...all[index] };
  } else {
    // Auto-enroll if ticking
    const nowFormatted = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    participant = {
      id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: `STU-${Math.floor(100 + Math.random() * 900)}`,
      studentName: name.trim() || 'Mess Student',
      studentPhone: cleanPhone,
      college: 'Hostel / College',
      pledge: 'Zero waste clean plate habit',
      registeredAt: nowFormatted,
      monthYear,
      completedDates: [],
      isParticipating: true,
      isEligible: false,
      isWinner: false
    };
  }

  // Check if already ticked today
  if (participant.completedDates.includes(dateStr)) {
    return {
      success: false,
      message: `You have already ticked your Clean Plate task for today (${dateStr})! Streak count: ${participant.completedDates.length}/${config.targetStreakDays} Days.`,
      participant,
      updatedProgress: participant
    };
  }

  const updatedDates = [...participant.completedDates, dateStr].sort();
  participant.completedDates = updatedDates;
  participant.lastTickedAt = new Date().toISOString();
  participant.isEligible = updatedDates.length >= config.targetStreakDays;

  if (index >= 0) {
    all[index] = participant;
  } else {
    all.unshift(participant);
  }

  saveAllCampaignParticipants(all);
  syncToOwnerAuditNomination(participant);

  const target = config.targetStreakDays;
  return {
    success: true,
    message: `🎉 Great job! Clean Plate Day #${updatedDates.length} ticked! ${
      updatedDates.length >= target 
        ? `🏆 You have reached the ${target}-day milestone and are eligible for the ${config.rewardTitle} Draw!` 
        : `Only ${target - updatedDates.length} days remaining for ${config.rewardTitle} eligibility!`
    }`,
    participant,
    updatedProgress: participant
  };
}

// ---------------------------------------------------------------------
// OWNER CUSTOM CAMPAIGN CONTROLS & MANAGEMENT
// ---------------------------------------------------------------------

/**
 * Remove an individual participant from the campaign
 */
export function deleteCampaignParticipant(participantId: string): boolean {
  try {
    const all = loadAllCampaignParticipants();
    const target = all.find(p => p.id === participantId);
    const updated = all.filter(p => p.id !== participantId);
    saveAllCampaignParticipants(updated);

    // Also remove from CleanPlateNomination audit list
    if (target) {
      const noms = loadCleanPlateNominations();
      const cleanTargetPhone = target.studentPhone.replace(/[^0-9]/g, '');
      const filteredNoms = noms.filter(n => (n.phone || '').replace(/[^0-9]/g, '') !== cleanTargetPhone);
      saveCleanPlateNominations(filteredNoms);
    }

    notifySync(updated);
    return true;
  } catch (e) {
    console.error('Failed to delete campaign participant:', e);
    return false;
  }
}

/**
 * Reset campaign:
 * - 'clear_all': completely empties all participants
 * - 'reset_streaks': keeps enrolled students, but resets completed days to 0 and clears winners
 */
export function resetCampaign(mode: 'clear_all' | 'reset_streaks' = 'clear_all'): void {
  const config = loadCampaignConfig();
  config.lastResetAt = new Date().toISOString();
  saveCampaignConfig(config);

  if (mode === 'clear_all') {
    saveAllCampaignParticipants([]);
    saveCleanPlateNominations([]);
    notifySync([]);
  } else {
    const all = loadAllCampaignParticipants();
    const resetList = all.map(p => ({
      ...p,
      completedDates: [],
      isEligible: false,
      isWinner: false,
      wonAmount: undefined,
      winnerAnnouncedAt: undefined,
      lastTickedAt: undefined
    }));
    saveAllCampaignParticipants(resetList);
    // Also reset nominations in audit
    const noms = loadCleanPlateNominations();
    const resetNoms = noms.map(n => ({
      ...n,
      cleanDaysCount: 0,
      status: 'PENDING_DECISION' as const,
      awardedDiscountAmount: 0
    }));
    saveCleanPlateNominations(resetNoms);
    notifySync(resetList);
  }
}

/**
 * Update streak count manually for any participant
 */
export function updateParticipantStreak(participantId: string, streakCount: number): CampaignParticipant | undefined {
  const all = loadAllCampaignParticipants();
  const config = loadCampaignConfig();
  const index = all.findIndex(p => p.id === participantId);
  if (index < 0) return undefined;

  const p = all[index];
  const count = Math.max(0, Math.min(31, streakCount));
  
  // Synthesize realistic dates for the month
  const [yearStr, monthStr] = (p.monthYear || config.monthYear).split('-');
  const y = parseInt(yearStr) || new Date().getFullYear();
  const m = parseInt(monthStr) || (new Date().getMonth() + 1);

  const dates: string[] = [];
  for (let i = 1; i <= count; i++) {
    const dStr = String(i).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    dates.push(`${y}-${mStr}-${dStr}`);
  }

  p.completedDates = dates;
  p.isEligible = count >= config.targetStreakDays;
  p.lastTickedAt = new Date().toISOString();

  all[index] = p;
  saveAllCampaignParticipants(all);
  syncToOwnerAuditNomination(p);
  return p;
}

/**
 * Manually add a participant (e.g. from existing real customers)
 */
export function addManualParticipant(data: {
  studentName: string;
  studentPhone: string;
  studentId?: string;
  college?: string;
  pledge?: string;
  initialStreak?: number;
}): CampaignParticipant {
  const config = loadCampaignConfig();
  const all = loadAllCampaignParticipants();
  const cleanPhone = data.studentPhone.trim().replace(/[^0-9]/g, '');

  const existingIndex = all.findIndex(p => p.studentPhone.replace(/[^0-9]/g, '') === cleanPhone);

  const nowFormatted = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const count = Math.max(0, data.initialStreak || 0);
  const [yearStr, monthStr] = config.monthYear.split('-');
  const y = parseInt(yearStr) || new Date().getFullYear();
  const m = parseInt(monthStr) || (new Date().getMonth() + 1);

  const dates: string[] = [];
  for (let i = 1; i <= count; i++) {
    const dStr = String(i).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    dates.push(`${y}-${mStr}-${dStr}`);
  }

  if (existingIndex >= 0) {
    const p = all[existingIndex];
    p.studentName = data.studentName || p.studentName;
    p.college = data.college || p.college;
    if (data.initialStreak !== undefined) {
      p.completedDates = dates;
      p.isEligible = count >= config.targetStreakDays;
    }
    all[existingIndex] = p;
    saveAllCampaignParticipants(all);
    syncToOwnerAuditNomination(p);
    return p;
  }

  const newP: CampaignParticipant = {
    id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    studentId: data.studentId || `STU-${Math.floor(100 + Math.random() * 900)}`,
    studentName: data.studentName.trim(),
    studentPhone: cleanPhone,
    college: data.college || 'Hostel / College',
    pledge: data.pledge || 'Committed to Zero Food Waste thali!',
    registeredAt: nowFormatted,
    monthYear: config.monthYear,
    completedDates: dates,
    isParticipating: true,
    isEligible: count >= config.targetStreakDays,
    isWinner: false
  };

  const updated = [newP, ...all];
  saveAllCampaignParticipants(updated);
  syncToOwnerAuditNomination(newP);
  return newP;
}

/**
 * Bulk enroll real active customers from the mess database
 */
export function enrollRealCustomers(customers: Customer[], initialStreak: number = 0): number {
  if (!customers || customers.length === 0) return 0;
  let enrolledCount = 0;

  customers.forEach(c => {
    if (c.status === 'active' || c.status === 'expiring_soon') {
      addManualParticipant({
        studentName: c.name,
        studentPhone: c.phone,
        studentId: c.id,
        college: c.college,
        pledge: 'Active student commitment to zero wastage',
        initialStreak
      });
      enrolledCount++;
    }
  });

  return enrolledCount;
}

// ---------------------------------------------------------------------
// SYNC TO OWNER AUDIT NOMINATIONS TABLE
// ---------------------------------------------------------------------
function syncToOwnerAuditNomination(participant: CampaignParticipant) {
  try {
    const noms = loadCleanPlateNominations();
    const cleanPhone = participant.studentPhone.replace(/[^0-9]/g, '');
    const existingIndex = noms.findIndex(n => (n.phone || '').replace(/[^0-9]/g, '') === cleanPhone);

    const nomObj: CleanPlateNomination = {
      id: existingIndex >= 0 ? noms[existingIndex].id : `cp-${participant.id}`,
      customerId: participant.studentId || participant.studentPhone,
      customerName: participant.studentName,
      studentName: participant.studentName,
      phone: participant.studentPhone,
      customerPhone: participant.studentPhone,
      cleanDaysCount: participant.completedDates.length,
      status: participant.isWinner ? 'APPROVED_WINNER' : 'PENDING_DECISION',
      monthYear: participant.monthYear,
      createdMonth: participant.monthYear,
      submittedAt: participant.registeredAt,
      date: participant.completedDates[participant.completedDates.length - 1] || new Date().toISOString().split('T')[0],
      awardedDiscountAmount: participant.isWinner ? (participant.wonAmount || 50) : 0,
      ownerNotes: participant.pledge
    };

    if (existingIndex >= 0) {
      noms[existingIndex] = nomObj;
    } else {
      noms.unshift(nomObj);
    }
    saveCleanPlateNominations(noms);
  } catch (e) {
    console.warn('syncToOwnerAuditNomination err:', e);
  }
}

// ---------------------------------------------------------------------
// AI WINNER PREDICTION DRAW ENGINE
// ---------------------------------------------------------------------
export function runCampaignWinnerPrediction(
  monthYear: string,
  overrideMaxWinners?: number
): { winners: CampaignParticipant[]; totalEligible: number } {
  const config = loadCampaignConfig();
  const all = loadAllCampaignParticipants();
  const monthList = all.filter(p => p.monthYear === monthYear && p.isParticipating);

  const targetStreak = config.targetStreakDays || 25;
  const maxWinners = overrideMaxWinners || config.maxWinners || 5;
  const rewardAmount = config.rewardAmount || 50;

  // Eligible students: completed >= target days (or highest streaks if fewer)
  const qualifiedStudents = monthList.filter(p => p.completedDates.length >= targetStreak);
  const pool = qualifiedStudents.length >= maxWinners 
    ? qualifiedStudents 
    : [...monthList].sort((a, b) => b.completedDates.length - a.completedDates.length);

  // Fair algorithmic shuffle
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selectedWinners = shuffled.slice(0, Math.min(maxWinners, shuffled.length));

  const nowFormatted = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const winnerIds = new Set(selectedWinners.map(w => w.id));

  const updatedAll = all.map(p => {
    if (winnerIds.has(p.id)) {
      return {
        ...p,
        isWinner: true,
        wonAmount: rewardAmount,
        winnerAnnouncedAt: nowFormatted
      };
    }
    return p;
  });

  saveAllCampaignParticipants(updatedAll);

  // Sync to owner nominations table
  selectedWinners.forEach(w => {
    syncToOwnerAuditNomination({
      ...w,
      isWinner: true,
      wonAmount: rewardAmount,
      winnerAnnouncedAt: nowFormatted
    });
  });

  return {
    winners: selectedWinners.map(w => ({
      ...w,
      isWinner: true,
      wonAmount: rewardAmount,
      winnerAnnouncedAt: nowFormatted
    })),
    totalEligible: pool.length
  };
}
