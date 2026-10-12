import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Users, 
  RefreshCw, 
  PartyPopper,
  Calendar,
  Clock,
  Phone,
  Search,
  Check,
  Building,
  Filter,
  ShieldCheck,
  Award,
  Trash2,
  Plus,
  RotateCcw,
  Settings,
  UserPlus,
  Play,
  Pause,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { 
  loadAllCampaignParticipants, 
  runCampaignWinnerPrediction, 
  loadCampaignConfig,
  saveCampaignConfig,
  deleteCampaignParticipant,
  resetCampaign,
  updateParticipantStreak,
  addManualParticipant,
  enrollRealCustomers,
  CampaignParticipant,
  CampaignConfig 
} from '../lib/cleanPlateTaskStorage';
import { Customer } from '../types/mess';

interface CampaignParticipantsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers?: Customer[];
}

export const CampaignParticipantsHubModal: React.FC<CampaignParticipantsHubModalProps> = ({ 
  isOpen, 
  onClose,
  customers = []
}) => {
  const [config, setConfig] = useState<CampaignConfig>(loadCampaignConfig);
  const [participants, setParticipants] = useState<CampaignParticipant[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'qualified' | 'in_progress' | 'winners'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Prediction / Lottery State
  const [isPredicting, setIsPredicting] = useState(false);
  const [showWinnersScreen, setShowWinnersScreen] = useState(false);
  const [shuffleCandidateName, setShuffleCandidateName] = useState('Evaluating clean plate attendance & zero-waste records...');
  const [latestWinners, setLatestWinners] = useState<CampaignParticipant[]>([]);

  // Modals for Customization
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'clear_all' | 'reset_streaks'>('clear_all');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customStudentName, setCustomStudentName] = useState('');
  const [customStudentPhone, setCustomStudentPhone] = useState('');
  const [customStudentCollege, setCustomStudentCollege] = useState('');
  const [customInitialStreak, setCustomInitialStreak] = useState(0);

  // Settings Form State
  const [formTitle, setFormTitle] = useState(config.title);
  const [formMonthYear, setFormMonthYear] = useState(config.monthYear);
  const [formTargetDays, setFormTargetDays] = useState(config.targetStreakDays);
  const [formRewardTitle, setFormRewardTitle] = useState(config.rewardTitle);
  const [formRewardAmount, setFormRewardAmount] = useState(config.rewardAmount);
  const [formMaxWinners, setFormMaxWinners] = useState(config.maxWinners);
  const [formStatus, setFormStatus] = useState<CampaignConfig['status']>(config.status);

  const loadData = () => {
    const currentConfig = loadCampaignConfig();
    setConfig(currentConfig);
    const list = loadAllCampaignParticipants();
    setParticipants(list);

    const winners = list.filter(p => p.isWinner);
    if (winners.length > 0) {
      setLatestWinners(winners);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Realtime BroadcastChannel & Event Listener
  useEffect(() => {
    const handleSync = () => {
      loadData();
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('morya_clean_plate_channel');
      bc.onmessage = () => {
        loadData();
      };
    } catch {
      // BroadcastChannel fallback
    }

    window.addEventListener('morya_clean_plate_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('morya_clean_plate_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  if (!isOpen) return null;

  // Filter & Search logic
  const targetDays = config.targetStreakDays || 25;
  const filteredList = participants.filter(p => {
    const matchesSearch = 
      p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.studentPhone.includes(searchTerm) ||
      (p.college && p.college.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === 'qualified') return p.completedDates.length >= targetDays;
    if (filterTab === 'in_progress') return p.completedDates.length < targetDays && !p.isWinner;
    if (filterTab === 'winners') return p.isWinner;
    return true;
  });

  const totalCount = participants.length;
  const qualifiedCount = participants.filter(p => p.completedDates.length >= targetDays).length;
  const inProgressCount = participants.filter(p => p.completedDates.length < targetDays && !p.isWinner).length;
  const winnersCount = participants.filter(p => p.isWinner).length;

  // Handle Predict Winners
  const handleStartWinnerDraw = () => {
    if (participants.length === 0) {
      alert('No students currently enrolled in the campaign. Please enroll students first!');
      return;
    }

    setIsPredicting(true);
    setShowWinnersScreen(true);
    setShuffleCandidateName(`Auditing ${targetDays}-day clean plate challenge records...`);

    const candidatePool = participants.map(p => p.studentName);
    let counter = 0;

    const interval = setInterval(() => {
      counter++;
      if (candidatePool.length > 0) {
        const randName = candidatePool[Math.floor(Math.random() * candidatePool.length)];
        setShuffleCandidateName(`🎲 Auditing student streak: ${randName}...`);
      }

      if (counter >= 10) {
        clearInterval(interval);
        const res = runCampaignWinnerPrediction(config.monthYear, config.maxWinners);
        setLatestWinners(res.winners);
        setIsPredicting(false);
        loadData();
      }
    }, 220);
  };

  // Handle Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CampaignConfig = {
      ...config,
      title: formTitle.trim() || 'Clean Plate Campaign',
      monthYear: formMonthYear.trim() || new Date().toISOString().substring(0, 7),
      targetStreakDays: Number(formTargetDays) || 25,
      rewardTitle: formRewardTitle.trim() || '₹50 Renewal Discount',
      rewardAmount: Number(formRewardAmount) || 50,
      maxWinners: Number(formMaxWinners) || 5,
      status: formStatus
    };
    saveCampaignConfig(updated);
    setConfig(updated);
    setIsSettingsOpen(false);
    loadData();
  };

  // Handle Reset Campaign
  const handleExecuteReset = () => {
    resetCampaign(resetMode);
    setIsResetConfirmOpen(false);
    loadData();
    setShowWinnersScreen(false);
  };

  // Handle Remove Participant
  const handleDeleteParticipant = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the campaign?`)) {
      deleteCampaignParticipant(id);
      loadData();
    }
  };

  // Handle Streak Stepper (+1 / -1)
  const handleAdjustStreak = (participant: CampaignParticipant, delta: number) => {
    const current = participant.completedDates.length;
    const next = Math.max(0, Math.min(31, current + delta));
    updateParticipantStreak(participant.id, next);
    loadData();
  };

  // Handle Quick Enroll Real Customers
  const handleBulkEnrollRealCustomers = () => {
    if (customers.length === 0) {
      alert('No active registered customers found in the mess database to enroll.');
      return;
    }
    const count = enrollRealCustomers(customers, 0);
    loadData();
    alert(`🎉 Successfully enrolled ${count} registered students into the ${config.title}!`);
  };

  // Handle Add Student Manually
  const handleAddManualStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStudentName.trim() || !customStudentPhone.trim()) {
      alert('Please provide student name and phone number.');
      return;
    }
    addManualParticipant({
      studentName: customStudentName.trim(),
      studentPhone: customStudentPhone.trim(),
      studentId: selectedCustomerId || undefined,
      college: customStudentCollege.trim() || 'Hostel / College',
      initialStreak: Number(customInitialStreak) || 0
    });
    setCustomStudentName('');
    setCustomStudentPhone('');
    setCustomStudentCollege('');
    setCustomInitialStreak(0);
    setSelectedCustomerId('');
    setIsAddStudentOpen(false);
    loadData();
  };

  // Handle selecting a customer from dropdown
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find(c => c.id === custId);
    if (found) {
      setCustomStudentName(found.name);
      setCustomStudentPhone(found.phone);
      setCustomStudentCollege(found.college || '');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 border border-slate-200 my-auto max-h-[94vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
              <Trophy className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {config.title}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  config.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : config.status === 'paused'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  ● {config.status.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                  Cycle: {config.monthYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: {config.targetStreakDays} Days Streak • Reward: {config.rewardTitle} ({config.maxWinners} Winners Draw)
              </p>
            </div>
          </div>

          {/* Top Main CTA buttons */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            <button
              onClick={() => {
                setFormTitle(config.title);
                setFormMonthYear(config.monthYear);
                setFormTargetDays(config.targetStreakDays);
                setFormRewardTitle(config.rewardTitle);
                setFormRewardAmount(config.rewardAmount);
                setFormMaxWinners(config.maxWinners);
                setFormStatus(config.status);
                setIsSettingsOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              title="Campaign Settings & New Cycle"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Edit / New Cycle</span>
            </button>

            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              title="Reset Campaign or Streaks"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleStartWinnerDraw}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Draw {config.maxWinners} Winners</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              title="Close Hub"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Winner Announcement Banner */}
        {showWinnersScreen && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/15 to-emerald-500/10 border-2 border-amber-300 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">
                  {isPredicting ? 'AI Lottery in Progress...' : `🏆 Official ${latestWinners.length} Campaign Winners (${config.rewardTitle})`}
                </h3>
              </div>
              {!isPredicting && (
                <button
                  onClick={() => setShowWinnersScreen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Hide Banner ✕
                </button>
              )}
            </div>

            {isPredicting ? (
              <div className="p-5 rounded-2xl bg-white/90 border border-amber-200 text-center space-y-2">
                <RefreshCw className="w-7 h-7 text-amber-600 mx-auto animate-spin" />
                <div className="text-sm font-black text-amber-950 font-mono">{shuffleCandidateName}</div>
                <p className="text-xs text-slate-500">
                  Selecting lucky winners from enrolled students who completed the {targetDays}-day streak...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {latestWinners.map((winner, idx) => (
                  <div 
                    key={winner.id || idx}
                    className="p-3.5 rounded-2xl bg-white border-2 border-amber-300 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] shadow-xs">
                        Winner #{idx + 1}
                      </span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                        {config.rewardTitle}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-slate-900 text-xs truncate">{winner.studentName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">{winner.studentPhone}</p>
                    </div>

                    <div className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex items-center justify-between">
                      <span>Completed Streak:</span>
                      <strong className="font-mono">{winner.completedDates.length} / {targetDays} Days</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4 Stat Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Enrolled</span>
            <strong className="text-lg font-black text-slate-900">{totalCount}</strong>
            <span className="text-[10px] text-slate-400 block">Real Active Participants</span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">{targetDays}-Day Qualified</span>
            <strong className="text-lg font-black text-emerald-700">{qualifiedCount}</strong>
            <span className="text-[10px] text-emerald-600 block">Ready for Winner Draw</span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-0.5">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">In Progress</span>
            <strong className="text-lg font-black text-amber-700">{inProgressCount}</strong>
            <span className="text-[10px] text-amber-600 block">1–{targetDays - 1} Days Ticked</span>
          </div>

          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 space-y-0.5">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">Winners Declared</span>
            <strong className="text-lg font-black text-orange-600">{winnersCount}</strong>
            <span className="text-[10px] text-orange-700 font-bold block">{config.rewardTitle}</span>
          </div>
        </div>

        {/* Filter Tabs & Search & Add Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                filterTab === 'all' ? 'bg-orange-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200'
              }`}
            >
              All ({totalCount})
            </button>

            <button
              onClick={() => setFilterTab('qualified')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                filterTab === 'qualified' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              🏆 Qualified ({qualifiedCount})
            </button>

            <button
              onClick={() => setFilterTab('in_progress')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                filterTab === 'in_progress' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              ⏳ In Progress ({inProgressCount})
            </button>

            <button
              onClick={() => setFilterTab('winners')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                filterTab === 'winners' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-50'
              }`}
            >
              🎉 Winners ({winnersCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-orange-500"
              />
            </div>

            {customers.length > 0 && (
              <button
                onClick={handleBulkEnrollRealCustomers}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                title="Enroll all active registered students in this campaign"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-Enroll Active</span>
              </button>
            )}

            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {/* Participants Table Container */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl bg-white shadow-2xs min-h-[220px]">
          {filteredList.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 mx-auto flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">No Students in Campaign</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  External test data has been removed. You can now enroll your real registered students or students can self-nominate from their app!
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                {customers.length > 0 && (
                  <button
                    onClick={handleBulkEnrollRealCustomers}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                  >
                    Enroll {customers.length} Registered Students Now
                  </button>
                )}
                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition cursor-pointer shadow-xs"
                >
                  + Add Single Student
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-700 border-b border-slate-200 font-bold z-10">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Mobile & College</th>
                  <th className="px-4 py-3">Enrolled / Month</th>
                  <th className="px-4 py-3">{targetDays}-Day Streak Tracker</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredList.map((p) => {
                  const isQualified = p.completedDates.length >= targetDays;
                  const progressPct = Math.min(100, (p.completedDates.length / targetDays) * 100);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {p.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{p.studentName}</span>
                            <span className="font-mono text-[10px] text-slate-400">{p.studentId || p.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Phone & College */}
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-mono text-slate-800 font-semibold">{p.studentPhone}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{p.college || 'Hostel / College'}</div>
                      </td>

                      {/* Registration Date & Time */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-700 font-medium text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>{p.registeredAt || p.monthYear}</span>
                        </div>
                      </td>

                      {/* Completed Streak with Quick Adjust */}
                      <td className="px-4 py-3">
                        <div className="space-y-1 max-w-[160px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800">{p.completedDates.length} / {targetDays} Days</span>
                            <span className="text-[10px] font-mono text-slate-400">{Math.round(progressPct)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isQualified ? 'bg-emerald-500' : 'bg-amber-400'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          {/* Quick Stepper Buttons */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              onClick={() => handleAdjustStreak(p, -1)}
                              disabled={p.completedDates.length === 0}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold disabled:opacity-30 cursor-pointer"
                              title="Decrease 1 Day"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleAdjustStreak(p, 1)}
                              disabled={p.completedDates.length >= 31}
                              className="px-1.5 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-800 text-[10px] font-bold disabled:opacity-30 cursor-pointer"
                              title="Add 1 Verified Day"
                            >
                              +1 Day
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {p.isWinner ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px]">
                            <Trophy className="w-3 h-3 text-amber-600" />
                            <span>WINNER</span>
                          </span>
                        ) : isQualified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Qualified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                            <span>{targetDays - p.completedDates.length} to go</span>
                          </span>
                        )}
                      </td>

                      {/* Delete Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteParticipant(p.id, p.studentName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Remove from campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero External Mock Data • 100% Real Mess Sync Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Close Hub
          </button>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CAMPAIGN CONFIGURATION & NEW CYCLE SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-slate-900 text-base">Campaign Settings & Rules</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Campaign Title / Name</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Clean Plate Campaign (Zero Wastage)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 outline-none text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cycle Month (YYYY-MM)</label>
                  <input
                    type="month"
                    required
                    value={formMonthYear}
                    onChange={e => setFormMonthYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 outline-none text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Streak Days</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formTargetDays}
                    onChange={e => setFormTargetDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 outline-none text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reward / Prize Title</label>
                <input
                  type="text"
                  required
                  value={formRewardTitle}
                  onChange={e => setFormRewardTitle(e.target.value)}
                  placeholder="e.g. ₹50 Renewal Discount / Free Sunday Special"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 outline-none text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reward Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formRewardAmount}
                    onChange={e => setFormRewardAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 outline-none text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Number of Winners</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formMaxWinners}
                    onChange={e => setFormMaxWinners(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 outline-none text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Campaign Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStatus('active')}
                    className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                      formStatus === 'active' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('paused')}
                    className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                      formStatus === 'paused' 
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs' 
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Paused
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('ended')}
                    className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                      formStatus === 'ended' 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Ended
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: RESET CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-900 text-base">Reset Campaign?</h3>
              <p className="text-xs text-slate-500">
                Choose how you would like to reset the campaign:
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setResetMode('clear_all');
                  handleExecuteReset();
                }}
                className="w-full p-3 rounded-2xl border-2 border-rose-200 hover:border-rose-500 hover:bg-rose-50/50 text-left transition cursor-pointer space-y-0.5"
              >
                <div className="font-bold text-rose-700 text-xs">Clear All Participants (Fresh Start)</div>
                <div className="text-[11px] text-slate-500">Removes all enrolled records so you can start completely new.</div>
              </button>

              <button
                onClick={() => {
                  setResetMode('reset_streaks');
                  handleExecuteReset();
                }}
                className="w-full p-3 rounded-2xl border-2 border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 text-left transition cursor-pointer space-y-0.5"
              >
                <div className="font-bold text-amber-800 text-xs">Reset Streaks to Day 0</div>
                <div className="text-[11px] text-slate-500">Keeps enrolled students but resets their ticked days to 0 for a new month.</div>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: ADD STUDENT MANUALLY */}
      {/* ------------------------------------------------------------- */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-slate-900 text-base">Add Student to Campaign</h3>
              </div>
              <button 
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualStudent} className="space-y-3 text-xs">
              {/* Pick from registered customers if available */}
              {customers.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pick From Registered Students:</label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => handleSelectCustomer(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium"
                  >
                    <option value="">-- Choose Existing Member --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - {c.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={customStudentName}
                  onChange={e => setCustomStudentName(e.target.value)}
                  placeholder="e.g. Rohan Patil"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">WhatsApp / Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={customStudentPhone}
                  onChange={e => setCustomStudentPhone(e.target.value)}
                  placeholder="e.g. 9822011223"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">College / Hostel</label>
                <input
                  type="text"
                  value={customStudentCollege}
                  onChange={e => setCustomStudentCollege(e.target.value)}
                  placeholder="e.g. COEP / Boys Hostel"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Initial Starting Streak (Days)</label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={customInitialStreak}
                  onChange={e => setCustomInitialStreak(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
