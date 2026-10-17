import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Award, 
  Users, 
  RefreshCw, 
  PartyPopper,
  ShieldCheck,
  Calendar,
  Gift
} from 'lucide-react';
import { 
  loadAllTaskTrackers, 
  runCampaignWinnerPrediction, 
  loadCampaignConfig,
  StudentCampaignProgress,
  CampaignConfig 
} from '../lib/cleanPlateTaskStorage';
import { Customer } from '../types/mess';

interface PredictCampaignResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers?: Customer[];
}

export const PredictCampaignResultsModal: React.FC<PredictCampaignResultsModalProps> = ({ 
  isOpen, 
  onClose,
  customers = []
}) => {
  const [config, setConfig] = useState<CampaignConfig>(() => loadCampaignConfig());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const cfg = loadCampaignConfig();
    return cfg.monthYear || new Date().toISOString().substring(0, 7);
  });
  const [trackers, setTrackers] = useState<StudentCampaignProgress[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictedWinners, setPredictedWinners] = useState<StudentCampaignProgress[]>([]);
  const [shuffleText, setShuffleText] = useState('Evaluating Zero-Waste Records...');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedMonth]);

  const loadData = () => {
    const currentConfig = loadCampaignConfig();
    setConfig(currentConfig);
    const all = loadAllTaskTrackers();
    const filtered = all.filter(t => t.monthYear === selectedMonth && t.isParticipating);
    setTrackers(filtered);
    
    // Check if winners already selected
    const existingWinners = filtered.filter(t => t.isWinner);
    if (existingWinners.length > 0) {
      setPredictedWinners(existingWinners);
    } else {
      setPredictedWinners([]);
    }
  };

  if (!isOpen) return null;

  const targetDays = config.targetStreakDays || 25;
  const qualifiedCount = trackers.filter(t => t.completedDates.length >= targetDays).length;
  const activeCount = trackers.length;
  const maxWinners = config.maxWinners || 5;

  const handlePredictWinners = () => {
    if (trackers.length === 0) {
      alert('No enrolled students found for this campaign cycle. Please enroll students first in the Campaign Hub!');
      return;
    }

    setIsPredicting(true);
    setShuffleText(`Analyzing ${targetDays}-Day Zero Wastage Ticks...`);

    const sampleNames = trackers.map(t => t.studentName);
    let tickerCount = 0;

    const interval = setInterval(() => {
      tickerCount++;
      if (sampleNames.length > 0) {
        const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
        setShuffleText(`🎲 Checking candidate: ${randomName}...`);
      }
      if (tickerCount >= 10) {
        clearInterval(interval);
        const res = runCampaignWinnerPrediction(selectedMonth, maxWinners);
        setPredictedWinners(res.winners);
        setIsPredicting(false);
        loadData();
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 border border-slate-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {config.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider border border-amber-300">
                  AI Predictor
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated winner selection for students completing the {targetDays}-day zero food waste challenge
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Campaign Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Enrolled Students</span>
            <strong className="text-lg font-black text-slate-900">{activeCount}</strong>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">{targetDays}-Day Qualified</span>
            <strong className="text-lg font-black text-emerald-700">{qualifiedCount}</strong>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-0.5">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">Winners Slot</span>
            <strong className="text-lg font-black text-amber-600">{maxWinners} Students</strong>
          </div>
        </div>

        {/* Action Predict CTA */}
        {!isPredicting && predictedWinners.length === 0 && (
          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-50 border-2 border-dashed border-amber-300 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-amber-600 mx-auto animate-bounce" />
            <div>
              <h3 className="font-extrabold text-amber-950 text-sm">
                Ready to Predict & Select Campaign Winners?
              </h3>
              <p className="text-xs text-amber-800 max-w-md mx-auto mt-0.5">
                Clicking the button below will run a fair, algorithmic draw among participants who met the {targetDays}-day criteria and assign {config.rewardTitle}!
              </p>
            </div>

            <button
              onClick={handlePredictWinners}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-lg shadow-orange-500/30 transition cursor-pointer inline-flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-amber-200" />
              <span>🎲 Predict {maxWinners} Campaign Winners Now ➔</span>
            </button>
          </div>
        )}

        {/* Prediction Loading State */}
        {isPredicting && (
          <div className="p-8 rounded-3xl bg-amber-50 border border-amber-200 text-center space-y-4 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto shadow-md animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-amber-950 text-base">{shuffleText}</h3>
              <p className="text-xs text-amber-700 mt-1">
                AI is auditing daily QR meal check-ins & zero food waste ticks...
              </p>
            </div>
          </div>
        )}

        {/* Winners Results Display */}
        {!isPredicting && predictedWinners.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-slate-900 text-sm">
                  Official Campaign Winners ({selectedMonth})
                </h3>
              </div>
              <button
                onClick={handlePredictWinners}
                className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-draw / Re-predict</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {predictedWinners.map((w, idx) => (
                <div 
                  key={w.id || idx}
                  className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white border-2 border-amber-300 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-sm">{w.studentName}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300">
                          🏆 Winner
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{w.studentPhone}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-700">{w.completedDates.length} / {targetDays} Days Ticked</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300 inline-block">
                      {config.rewardTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Auto-applied on Renewal</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Winner results are saved and synced across Student & Owner App!</span>
              </div>
              <button
                onClick={() => {
                  alert(`🎉 Campaign Winners Announced! Winners will receive ${config.rewardTitle} on their next monthly subscription renewal.`);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-700 transition cursor-pointer shrink-0"
              >
                Announce Winners ➔
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
