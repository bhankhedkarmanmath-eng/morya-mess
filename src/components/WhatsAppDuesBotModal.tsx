import React, { useState, useMemo } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Search, 
  Phone, 
  Copy, 
  Check, 
  Wallet, 
  Languages, 
  RefreshCw,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  UserCheck,
  Building,
  GraduationCap,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Customer, BusinessRulesConfig } from '../types/mess';
import { 
  computeDuesTargets, 
  recordDuesReminderSent, 
  DuesTarget, 
  getDuesLogs,
  buildWhatsAppDirectUrl
} from '../lib/autoPilotSuite';
import { pushSyncToServer } from '../lib/syncEngine';

interface WhatsAppDuesBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  rules: BusinessRulesConfig;
  onRefreshCustomers?: () => void;
}

type LanguageOption = 'mr' | 'hi' | 'en';
type ReminderTone = 'friendly' | 'urgent' | 'gate_block' | 'discount';
type FilterCategory = 'all' | 'overdue_balance' | 'high_risk' | 'expiring_soon' | 'expired_plan' | 'not_sent' | 'sent_today';

export const WhatsAppDuesBotModal: React.FC<WhatsAppDuesBotModalProps> = ({
  isOpen,
  onClose,
  customers,
  rules,
  onRefreshCustomers
}) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [selectedTone, setSelectedTone] = useState<ReminderTone>('friendly');
  const [selectedLang, setSelectedLang] = useState<LanguageOption>('mr');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [duesLogs, setDuesLogs] = useState<Record<string, string>>(() => getDuesLogs());
  const [collectingCustomer, setCollectingCustomer] = useState<Customer | null>(null);
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [collectPaymentMode, setCollectPaymentMode] = useState<'upi' | 'cash'>('cash');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [inlinePhoneMap, setInlinePhoneMap] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Compute all targets
  const allTargets = useMemo(() => {
    return computeDuesTargets(customers);
  }, [customers, duesLogs]);

  // Aggregate stats
  const stats = useMemo(() => {
    const overdue = allTargets.filter(t => t.hasUnpaidBalance || t.type === 'overdue_balance');
    const highRisk = allTargets.filter(t => t.dueAmount >= 1000 || (t.daysRemaining < 0 && Math.abs(t.daysRemaining) >= 5));
    const expiring = allTargets.filter(t => t.isExpiringSoon || t.type === 'expiring_soon');
    const expired = allTargets.filter(t => t.isExpired || t.type === 'expired_plan');
    const totalPendingAmt = allTargets.reduce((acc, curr) => acc + (curr.dueAmount > 0 ? curr.dueAmount : 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const sentTodayCount = allTargets.filter(t => {
      const logTime = duesLogs[t.customer.id];
      return logTime && logTime.startsWith(todayStr);
    }).length;
    const notSentCount = Math.max(0, allTargets.length - sentTodayCount);

    return {
      totalActionable: allTargets.length,
      overdueCount: overdue.length,
      highRiskCount: highRisk.length,
      expiringCount: expiring.length,
      expiredCount: expired.length,
      totalPendingAmt,
      sentTodayCount,
      notSentCount
    };
  }, [allTargets, duesLogs]);

  // Filtered targets
  const filteredTargets = useMemo(() => {
    let list = allTargets;
    const todayStr = new Date().toISOString().split('T')[0];

    if (selectedFilter === 'overdue_balance') {
      list = list.filter(t => t.hasUnpaidBalance || t.type === 'overdue_balance');
    } else if (selectedFilter === 'high_risk') {
      list = list.filter(t => t.dueAmount >= 1000 || (t.daysRemaining < 0 && Math.abs(t.daysRemaining) >= 5));
    } else if (selectedFilter === 'expiring_soon') {
      list = list.filter(t => t.isExpiringSoon || t.type === 'expiring_soon');
    } else if (selectedFilter === 'expired_plan') {
      list = list.filter(t => t.isExpired || t.type === 'expired_plan');
    } else if (selectedFilter === 'not_sent') {
      list = list.filter(t => {
        const logTime = duesLogs[t.customer.id];
        return !logTime || !logTime.startsWith(todayStr);
      });
    } else if (selectedFilter === 'sent_today') {
      list = list.filter(t => {
        const logTime = duesLogs[t.customer.id];
        return logTime && logTime.startsWith(todayStr);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t => t.customer.name.toLowerCase().includes(q) ||
             t.customer.id.toLowerCase().includes(q) ||
             (t.customer.phone && t.customer.phone.includes(q)) ||
             (t.customer.college && t.customer.college.toLowerCase().includes(q)) ||
             (t.customer.hostel && t.customer.hostel.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allTargets, selectedFilter, searchQuery, duesLogs]);

  if (!isOpen) return null;

  // Build localized message
  const createLocalizedMessage = (target: DuesTarget, tone: ReminderTone, lang: LanguageOption): string => {
    const name = target.customer.name;
    const due = target.dueAmount;
    const days = target.daysRemaining < 0 ? Math.abs(target.daysRemaining) : 0;
    const messName = rules.messName || 'Morya Mess';
    const upiId = rules.upiId || 'moryamess@upi';
    const upiPayee = encodeURIComponent(rules.upiPayeeName || messName);
    const upiLink = due > 0 
      ? `upi://pay?pa=${upiId}&pn=${upiPayee}&am=${due}&cu=INR&tn=Mess%20Bill` 
      : `upi://pay?pa=${upiId}&pn=${upiPayee}&cu=INR&tn=Mess%20Bill`;

    // 1. MARATHI (मराठी)
    if (lang === 'mr') {
      if (tone === 'friendly') {
        return `🙏 *सस्नेह नमस्कार ${name} ji!* (*${messName}*)\n\nआपल्या मेस वर्गणीचे *₹${due > 0 ? due : 'नूतनीकरण'}* बाकी आहे.\nकृपया वेळेवर थकबाकी भरून आपली नियमित भोजनाची सोय अखंडित ठेवावी.\n\n📱 *Google Pay / PhonePe UPI:* \`${upiId}\`\n🔗 *थेट पेमेंट लिंक:* ${upiLink}\n\nकाही अडचण असल्यास मेस व्यवस्थापकाशी संपर्क साधावा. धन्यवाद!`;
      }
      if (tone === 'urgent') {
        return `⚠️ *तातडीची सूचना: ${messName}*\n\nप्रिय ${name},\nआपली प्रलंबित थकबाकी रक्कम *₹${due}* ही ${days > 0 ? `${days} दिवसांपासून` : ''} प्रलंबित आहे.\nमेस नियमांनुसार कृपया आज संध्याकाळपर्यंत थकबाकी पूर्ण करावी ही नम्र विनंती.\n\n💳 *UPI आयडी:* \`${upiId}\`\n🔗 *Pay Now:* ${upiLink}\n\nसहकार्याबद्दल धन्यवाद!`;
      }
      if (tone === 'gate_block') {
        return `🛑 *अंतिम सूचना (गेट अटेंडन्स ब्लॉक): ${messName}*\n\nविद्यार्थी: *${name}* (ID: ${target.customer.id})\nप्रलंबित थकबाकी: *₹${due}*\n\nथकबाकी न भरल्यास उद्यापासून मेस गेट QR स्कॅनर तात्पुरता बंद केला जाईल. गैरसोय टाळण्यासाठी कृपया आत्ताच पेमेंट पूर्ण करा.\n\n📱 *UPI:* \`${upiId}\`\n🔗 *Link:* ${upiLink}`;
      }
      if (tone === 'discount') {
        return `🎁 *सवलत ऑफर: ${messName}*\n\nनमस्कार ${name}!\nआपला मेस पास संपत आला आहे. आजच थकबाकी ₹${due} भरून पुढील महिन्यासाठी नूतनीकरण करा आणि मिळवा विशेष लाभ!\n\n📱 *UPI:* \`${upiId}\`\nधन्यवाद!`;
      }
    }

    // 2. HINDI (हिंदी)
    if (lang === 'hi') {
      if (tone === 'friendly') {
        return `🙏 *नमस्ते ${name} जी!* (*${messName}*)\n\nआपके मेस सदस्यता का बकाया *₹${due > 0 ? due : 'नवीनीकरण'}* बाकी है।\nकृपया समय पर भुगतान करके अपनी थाली सेवा जारी रखें।\n\n📱 *UPI ID:* \`${upiId}\`\n🔗 *Pay Link:* ${upiLink}\n\nधन्यवाद!`;
      }
      if (tone === 'urgent') {
        return `⚠️ *जरूरी सूचना: ${messName}*\n\nप्रिय ${name},\nआपकी बकाया राशि *₹${due}* काफी दिनों से लंबित है।\nमेस नियमों के अनुसार कृपया आज ही इसका भुगतान करें।\n\n💳 *UPI ID:* \`${upiId}\`\n🔗 *Pay Now:* ${upiLink}\n\nसहयोग के लिए धन्यवाद!`;
      }
      if (tone === 'gate_block') {
        return `🛑 *चेतावनी सूचना (गेट स्कैनर ब्लॉक): ${messName}*\n\nछात्र: *${name}* (ID: ${target.customer.id})\nबकाया: *₹${due}*\n\nबकाया राशि का भुगतान न होने पर कल से गेट एंट्री स्कैनर ब्लॉक कर दिया जाएगा। असुविधा से बचने के लिए अभी भुगतान करें।\n\n📱 *UPI ID:* \`${upiId}\`\n🔗 *Link:* ${upiLink}`;
      }
      if (tone === 'discount') {
        return `🎁 *स्पेशल ऑफर: ${messName}*\n\nनमस्ते ${name}!\nअपने मेस पास का समय से पहले नवीनीकरण करें और विशेष लाभ पाएं।\n\n📱 *UPI ID:* \`${upiId}\`\nधन्यवाद!`;
      }
    }

    // 3. ENGLISH
    if (tone === 'urgent') {
      return `⚠️ *Urgent Payment Notice - ${messName}*\n\nDear *${name}*,\nYour mess pending balance is *₹${due}*.\nPlease clear the dues today to continue smooth dining service.\n\n💳 *UPI ID:* \`${upiId}\`\n🔗 *Payment Link:* ${upiLink}\n\nThank you!`;
    }
    if (tone === 'gate_block') {
      return `🛑 *Final Notice (Gate Access Alert) - ${messName}*\n\nMember: *${name}* (${target.customer.id})\nPending Due: *₹${due}*\n\nDue to pending payment, your QR scan attendance will be paused starting tomorrow. Please settle now to avoid inconvenience.\n\n📱 *UPI:* \`${upiId}\`\n🔗 *Link:* ${upiLink}`;
    }
    return `🙏 *Friendly Mess Reminder - ${messName}*\n\nHello *${name}*,\nThis is a gentle reminder that your mess dues of *₹${due > 0 ? due : 'Renewal'}* are pending.\nKindly pay at your earliest convenience to continue mess service.\n\n📱 *UPI ID:* \`${upiId}\`\n🔗 *Pay Link:* ${upiLink}\n\nThank you!`;
  };

  const getCleanPhone = (target: DuesTarget): string => {
    const raw = inlinePhoneMap[target.customer.id] || target.customer.phone || '';
    const cleanDigits = raw.replace(/[^0-9]/g, '');
    let finalPhone = cleanDigits;
    if (cleanDigits.length === 10) {
      finalPhone = `91${cleanDigits}`;
    } else if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) {
      finalPhone = `91${cleanDigits.slice(1)}`;
    } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
      finalPhone = cleanDigits;
    }
    return finalPhone;
  };

  const handleSendSingleWhatsApp = (target: DuesTarget) => {
    const message = createLocalizedMessage(target, selectedTone, selectedLang);
    const finalPhone = getCleanPhone(target);

    const waUrl = finalPhone 
      ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    // Record reminder log immediately
    recordDuesReminderSent(target.customer.id);
    const updatedLogs = getDuesLogs();
    setDuesLogs(updatedLogs);

    showToast(`Opening WhatsApp for ${target.customer.name}...`);

    // Safe execution: Anchor element click prevents popup-blocker issues in iframe
    try {
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopySingleMessage = (target: DuesTarget) => {
    const message = createLocalizedMessage(target, selectedTone, selectedLang);
    navigator.clipboard.writeText(message);
    setCopiedId(target.customer.id);
    showToast(`Message copied for ${target.customer.name}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllPhoneNumbers = () => {
    const phones = filteredTargets
      .map(t => getCleanPhone(t))
      .filter(p => p.length >= 10);
    const uniquePhones = Array.from(new Set(phones)).join(', ');
    navigator.clipboard.writeText(uniquePhones);
    setCopiedAll(true);
    showToast(`Copied ${phones.length} phone numbers!`);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleSendNextUnsent = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextTarget = allTargets.find(t => {
      const log = duesLogs[t.customer.id];
      return !log || !log.startsWith(todayStr);
    });

    if (nextTarget) {
      handleSendSingleWhatsApp(nextTarget);
    } else {
      showToast('All defaulters have already been reminded today!');
    }
  };

  const handleQuickCollectPayment = async () => {
    if (!collectingCustomer || collectedAmount <= 0) return;
    setIsSavingPayment(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const newBalance = Math.max(0, (collectingCustomer.balance || 0) - collectedAmount);
      const newPaid = (collectingCustomer.paidAmount || 0) + collectedAmount;

      const newPayment = {
        id: `pay-${Date.now()}`,
        amount: collectedAmount,
        date: todayStr,
        mode: collectPaymentMode,
        notes: `Quick Settlement via WhatsApp Dues Bot (${collectPaymentMode.toUpperCase()})`,
        recordedBy: 'Owner'
      };

      const updatedCust: Customer = {
        ...collectingCustomer,
        balance: newBalance,
        paidAmount: newPaid,
        payments: [newPayment, ...(collectingCustomer.payments || [])]
      };

      const updatedCustomers = customers.map(c => c.id === collectingCustomer.id ? updatedCust : c);
      await pushSyncToServer({ customers: updatedCustomers });

      if (onRefreshCustomers) onRefreshCustomers();
      showToast(`Settled ₹${collectedAmount} for ${collectingCustomer.name}! Balance updated.`);
      setCollectingCustomer(null);
      setCollectedAmount(0);
    } catch (e) {
      alert('Failed to record payment');
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        
        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-70 bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* HEADER */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center shadow-inner shrink-0">
              {/* WhatsApp Icon */}
              <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  WhatsApp Auto-Pilot Dues Recovery
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/30 border border-emerald-200/40 text-[10px] font-black uppercase tracking-wider text-emerald-100">
                  Instant UPI Bot
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Student ko direct WhatsApp par dues reminder bhejo — 1-click me personal bill & UPI link ke sath
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* HOW TO SEND EXPLANATION BANNER */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-600/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">👉</span>
            <span>
              <strong>Kaha pe tap karein?</strong> Har student card par bada hara <span className="bg-[#25D366] text-white px-2 py-0.5 rounded-md font-black shadow-xs">📲 WhatsApp Pe Bhejo</span> button hai. Uspe click karte hi automatic student ka WhatsApp khul jayega!
            </span>
          </div>

          <button
            onClick={handleSendNextUnsent}
            className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 font-black text-xs hover:bg-emerald-50 shadow-sm cursor-pointer shrink-0 flex items-center gap-1.5"
            title="Automatically send WhatsApp to next unreminded student"
          >
            <span>🚀 Send Next Pending Student</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="p-3.5 sm:p-4 bg-emerald-50/40 border-b border-emerald-100 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div 
              onClick={() => setSelectedFilter('overdue_balance')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                selectedFilter === 'overdue_balance' 
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' 
                  : 'bg-white border-rose-200/60 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pending Dues (बकाया)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md">Filter</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-600 mt-0.5">
                ₹{stats.totalPendingAmt.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">{stats.overdueCount} students with dues</span>
            </div>

            <div 
              onClick={() => setSelectedFilter('high_risk')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                selectedFilter === 'high_risk' 
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
                  : 'bg-white border-amber-200/60 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">High Risk (₹1000+)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md">Filter</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-700 mt-0.5">
                {stats.highRiskCount} Students
              </div>
              <span className="text-[10px] text-amber-600 font-semibold">Overdue &gt; ₹1,000 / 5 days</span>
            </div>

            <div 
              onClick={() => setSelectedFilter('not_sent')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                selectedFilter === 'not_sent' 
                  ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400' 
                  : 'bg-white border-sky-200/60 hover:border-sky-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider">Pending Today</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded-md">Filter</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-sky-700 mt-0.5">
                {stats.notSentCount} Students
              </div>
              <span className="text-[10px] text-sky-600 font-semibold">Not reminded today</span>
            </div>

            <div 
              onClick={() => setSelectedFilter('sent_today')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                selectedFilter === 'sent_today' 
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' 
                  : 'bg-white border-emerald-200/60 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Reminded Today</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">Filter</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
                {stats.sentTodayCount} Sent
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">Follow-up recorded</span>
            </div>
          </div>
        </div>

        {/* TONE & LANGUAGE SELECTOR BAR */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tone Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <span className="text-[11px] font-black text-slate-500 pl-2">Tone:</span>
            <button
              onClick={() => setSelectedTone('friendly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedTone === 'friendly' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              😊 Polite Reminder
            </button>
            <button
              onClick={() => setSelectedTone('urgent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedTone === 'urgent' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ Urgent Overdue
            </button>
            <button
              onClick={() => setSelectedTone('gate_block')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedTone === 'gate_block' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛑 Gate Block Warning
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <span className="text-xs font-bold text-slate-500 pl-2 flex items-center gap-1">
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              Bhasha:
            </span>
            <button
              onClick={() => setSelectedLang('mr')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                selectedLang === 'mr' ? 'bg-orange-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              मराठी (MR)
            </button>
            <button
              onClick={() => setSelectedLang('hi')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                selectedLang === 'hi' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिंदी (HI)
            </button>
            <button
              onClick={() => setSelectedLang('en')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                selectedLang === 'en' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ENG
            </button>
          </div>

          {/* Copy All Numbers */}
          <button
            onClick={handleCopyAllPhoneNumbers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            title="Copy all defaulter phone numbers for broadcast group"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAll ? 'Copied All Numbers!' : `Copy All (${filteredTargets.length}) Numbers`}</span>
          </button>
        </div>

        {/* MULTIPLE CATEGORY TABS & SEARCH */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, ID, mobile, hostel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* CATEGORY TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedFilter === 'all' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Defaulters ({allTargets.length})
            </button>

            <button
              onClick={() => setSelectedFilter('overdue_balance')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer ${
                selectedFilter === 'overdue_balance' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              🔴 Pending Balance Dues ({stats.overdueCount})
            </button>

            <button
              onClick={() => setSelectedFilter('high_risk')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedFilter === 'high_risk' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              High Dues ₹1000+ ({stats.highRiskCount})
            </button>

            <button
              onClick={() => setSelectedFilter('not_sent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedFilter === 'not_sent' 
                  ? 'bg-sky-600 text-white shadow-xs' 
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
              }`}
            >
              Pending Today ({stats.notSentCount})
            </button>

            <button
              onClick={() => setSelectedFilter('expiring_soon')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedFilter === 'expiring_soon' 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              Expiring Soon ({stats.expiringCount})
            </button>

            <button
              onClick={() => setSelectedFilter('expired_plan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedFilter === 'expired_plan' 
                  ? 'bg-slate-700 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Expired Plan ({stats.expiredCount})
            </button>

            <button
              onClick={() => setSelectedFilter('sent_today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedFilter === 'sent_today' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Sent Today ({stats.sentTodayCount})
            </button>
          </div>
        </div>

        {/* TARGETS LIST */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-50/50">
          {filteredTargets.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-lg mx-auto">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-800">Is category me koi pending student nahi hai!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Sabhi students ka payment complete hai ya unko aaj reminder bheja ja chuka hai.
              </p>
              <button
                onClick={() => setSelectedFilter('all')}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                View All Defaulters ({allTargets.length})
              </button>
            </div>
          ) : (
            filteredTargets.map((target) => {
              const cust = target.customer;
              const todayStr = new Date().toISOString().split('T')[0];
              const logTime = duesLogs[cust.id];
              const hasSentToday = Boolean(logTime && logTime.startsWith(todayStr));
              const sampleMsg = createLocalizedMessage(target, selectedTone, selectedLang);
              const cleanPhone = getCleanPhone(target);
              const hasPhone = cleanPhone.length >= 10;
              const isPreviewOpen = expandedPreviewId === cust.id;

              return (
                <div 
                  key={cust.id}
                  className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200/80 hover:border-emerald-400 shadow-xs transition flex flex-col gap-4"
                >
                  {/* TOP ROW: Identity + Badges + Due Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    
                    {/* Student Info */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                        {cust.name.substring(0, 2).toUpperCase()}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-base">{cust.name}</span>
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {cust.id}
                          </span>
                          
                          {/* CATEGORY BADGES */}
                          {target.hasUnpaidBalance && (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              🔴 ₹{target.dueAmount.toLocaleString('en-IN')} Unpaid Due
                            </span>
                          )}

                          {target.isExpired && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                              ⚠️ Plan Expired
                            </span>
                          )}

                          {target.isExpiringSoon && !target.isExpired && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              ⏳ Expires in {target.daysRemaining} days
                            </span>
                          )}

                          {hasSentToday ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Sent Today
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              ⏳ Reminder Pending
                            </span>
                          )}
                        </div>

                        {/* Meta Details: Mobile, Plan, Hostel */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-600 font-medium">
                          <span className="flex items-center gap-1 font-bold text-slate-800">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            {hasPhone ? (
                              <span>+{cleanPhone}</span>
                            ) : (
                              <span className="text-rose-600 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> No Phone Number
                              </span>
                            )}
                          </span>

                          <span>•</span>
                          <span>Plan: <strong className="text-slate-800">{cust.planType || 'Regular'}</strong></span>

                          <span>•</span>
                          <span>Expiry: <strong className="text-slate-800">{cust.endDate || 'N/A'}</strong></span>

                          {cust.hostel && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-400" />
                                {cust.hostel}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pending Amount Box */}
                    <div className="bg-rose-50 border border-rose-200/80 rounded-2xl px-4 py-2 sm:text-right shrink-0">
                      <span className="text-[10px] uppercase font-black text-rose-600 block tracking-wider">
                        Pending Fee Balance
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-rose-600">
                        ₹{target.dueAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* INLINE PHONE NUMBER INPUT (IF MISSING) */}
                  {!hasPhone && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="text-xs text-amber-900 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Is student ka mobile number missing hai. Yaha mobile daal kar direct WhatsApp bhejein:</span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="tel"
                          placeholder="10-digit Mobile Number"
                          value={inlinePhoneMap[cust.id] || ''}
                          onChange={(e) => setInlinePhoneMap({ ...inlinePhoneMap, [cust.id]: e.target.value })}
                          className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 w-44 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* MESSAGE PREVIEW (COLLAPSIBLE / ACCORDION) */}
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedPreviewId(isPreviewOpen ? null : cust.id)}
                      className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {/* Green dot */}
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Preview WhatsApp Message ({selectedTone.toUpperCase()} • {selectedLang.toUpperCase()})</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        {isPreviewOpen ? 'Hide Preview' : 'Show Full Message'}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isPreviewOpen ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {isPreviewOpen && (
                      <div className="p-3.5 border-t border-slate-200 bg-emerald-50/20 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {sampleMsg}
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS (HUGE & UNMISSABLE) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <span>UPI Link:</span>
                      <code className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {rules.upiId || 'moryamess@upi'}
                      </code>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 1. QUICK SETTLE (COLLECT CASH/UPI) */}
                      <button
                        type="button"
                        onClick={() => {
                          setCollectingCustomer(cust);
                          setCollectedAmount(target.dueAmount > 0 ? target.dueAmount : 2500);
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                        title="Mark payment settled immediately"
                      >
                        <Wallet className="w-4 h-4 text-amber-700" />
                        <span>Settle ₹{target.dueAmount}</span>
                      </button>

                      {/* 2. COPY MESSAGE BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleCopySingleMessage(target)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Copy formatted message to clipboard"
                      >
                        {copiedId === cust.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedId === cust.id ? 'Copied!' : 'Copy Msg'}</span>
                      </button>

                      {/* 3. MAIN UNMISSABLE WHATSAPP BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleSendSingleWhatsApp(target)}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer shrink-0"
                        title="Tap here to send WhatsApp reminder to this student"
                      >
                        {/* Official WhatsApp SVG Icon */}
                        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        <span>WHATSAPP PE BHEJO (₹{target.dueAmount.toLocaleString('en-IN')})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* QUICK SETTLEMENT MODAL POPUP */}
        {collectingCustomer && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-slate-900 text-base">Quick Settle Fee Due</h3>
                </div>
                <button 
                  onClick={() => setCollectingCustomer(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-xs text-slate-500 font-semibold">Student Name</span>
                  <div className="font-black text-slate-900 text-base">{collectingCustomer.name}</div>
                  <div className="text-xs text-slate-600 font-semibold mt-0.5">
                    Current Balance Due: <strong className="text-rose-600 font-black">₹{collectingCustomer.balance || 0}</strong>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Settlement Amount (₹)</label>
                  <input
                    type="number"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCollectPaymentMode('cash')}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        collectPaymentMode === 'cash' 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectPaymentMode('upi')}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        collectPaymentMode === 'upi' 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      📱 UPI (GPay/PhonePe)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCollectingCustomer(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickCollectPayment}
                    disabled={isSavingPayment || collectedAmount <= 0}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSavingPayment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Confirm & Clear ₹{collectedAmount}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
