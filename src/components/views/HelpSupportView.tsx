import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  QrCode, 
  Users, 
  CreditCard, 
  Receipt, 
  Calendar, 
  FileSpreadsheet, 
  Clock, 
  Phone, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface HelpSupportViewProps {
  onBack: () => void;
  onNavigateSupportRequests?: () => void;
}

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  steps?: string[];
  tips?: string;
}

export const HelpSupportView: React.FC<HelpSupportViewProps> = ({
  onBack,
  onNavigateSupportRequests
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({
    'faq-qr': true, // Open first by default
    'faq-customer': false
  });

  const toggleFaq = (id: string) => {
    setExpandedFaqs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    faqs.forEach(f => { all[f.id] = true; });
    setExpandedFaqs(all);
  };

  const collapseAll = () => {
    setExpandedFaqs({});
  };

  const categories = [
    { id: 'all', label: 'All Topics', icon: HelpCircle },
    { id: 'attendance_qr', label: 'Attendance & QR', icon: QrCode },
    { id: 'customers', label: 'Customer Management', icon: Users },
    { id: 'billing', label: 'Billing & Payments', icon: CreditCard },
    { id: 'subscriptions', label: 'Subscriptions', icon: Calendar },
    { id: 'expenses', label: 'Expenses & Saman', icon: Receipt },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { id: 'general', label: 'Using the App', icon: BookOpen },
    { id: 'contact', label: 'Contact Support', icon: Phone }
  ];

  const faqs: FaqItem[] = [
    {
      id: 'faq-qr',
      category: 'attendance_qr',
      question: 'How does Morya Mess QR attendance work?',
      answer: 'Each student receives a tamper-proof digital ID card featuring a personalized QR code. When the student presents their QR code to the gate tablet or counter smartphone:',
      steps: [
        'Open Attendance Scanner from the top bar or side menu.',
        'Align the student\'s QR code within the camera frame.',
        'The system automatically validates active subscription dates, meal eligibility (Lunch/Dinner), and ensures duplicate scans are blocked for that shift.',
        'A green "ALLOW" banner confirms entry and logs attendance instantly to Supabase.'
      ],
      tips: 'If a student already had lunch today, the system triggers an audible alert preventing double meals.'
    },
    {
      id: 'faq-customer',
      category: 'customers',
      question: 'How do I add a customer?',
      answer: 'Adding a student or diner is quick and takes less than 30 seconds:',
      steps: [
        'Click "+ Add Customer" on the dashboard or open Customers > Add Customer.',
        'Fill in the student Name, Mobile Number, Gender, and College/Hostel address.',
        'Select the Subscription Plan (e.g. Monthly 2 Meals, 1 Meal, or 15 Days).',
        'Enter total fee and initial payment amount (Cash or UPI).',
        'Click "Create Member & Generate Pass". The digital QR pass is created immediately.'
      ]
    },
    {
      id: 'faq-upi',
      category: 'billing',
      question: 'How do I verify a UPI payment?',
      answer: 'When a student transfers fees via GPay, PhonePe, or Paytm and submits a verification request from their student app:',
      steps: [
        'Click on "Pending Payments" or "Payment Verification" in the Billing menu.',
        'Review the student name, amount, UTR / transaction ID, and timestamp.',
        'Verify the credit in your mess bank account or UPI soundbox.',
        'Click "Verify & Approve". The student balance is credited in real time, and an instant receipt is generated.'
      ],
      tips: 'You can also set up your official Mess UPI ID and QR Standee under Billing > Mess Payment QR & UPI ID.'
    },
    {
      id: 'faq-cash',
      category: 'billing',
      question: 'How do I record a cash payment?',
      answer: 'To record physical cash handed over at the mess counter:',
      steps: [
        'Navigate to Billing & Payments > Cash Payments from the menu.',
        'Click "+ Record Cash Payment".',
        'Search or select the student from the list.',
        'Enter the cash amount, receipt notes, and the staff member recording it.',
        'Click "Save Cash Payment". The customer ledger and today\'s cash collection balance update instantly.'
      ]
    },
    {
      id: 'faq-sub',
      category: 'subscriptions',
      question: 'How do I create a subscription?',
      answer: 'Subscriptions define the diner\'s active dates and allowed shifts:',
      steps: [
        'Open the Subscriptions module from the sidebar menu.',
        'Choose a student and click "Renew / New Subscription".',
        'Select plan duration: Fixed 30 Days or Calendar Month (1st to 30th/31st).',
        'Choose meal preference: Lunch + Dinner, Lunch Only, or Dinner Only.',
        'Submit to automatically set the new expiry date and refresh the QR access token.'
      ]
    },
    {
      id: 'faq-manual-att',
      category: 'attendance_qr',
      question: 'How do I mark attendance manually?',
      answer: 'If a student forgets their mobile phone or their device has no battery:',
      steps: [
        'Open Customers / Diners > Mark Attendance from the side menu.',
        'Search for the student by Name, Mobile, or Customer ID (e.g. MM-2026-001).',
        'Select current shift (Lunch or Dinner) and click "Mark Attendance".',
        'The manual entry is marked with a "Counter Desk" audit stamp so you have full tracking.'
      ]
    },
    {
      id: 'faq-leaves',
      category: 'subscriptions',
      question: 'How do I manage leaves?',
      answer: 'Students can request leaves during college semester exams or visits home without losing money:',
      steps: [
        'Go to Customers / Diners > Skip Meal & Leaves.',
        'Review pending leave requests submitted by students with start and end dates.',
        'Click "Approve Leave". If enabled in your Mess Settings, the student\'s subscription end date is automatically extended by the approved leave days.',
        'Rejected requests notify the student immediately with your remarks.'
      ]
    },
    {
      id: 'faq-export',
      category: 'reports',
      question: 'How do I export reports?',
      answer: 'You can download clean, spreadsheet-compatible Excel (.xlsx) and CSV files anytime:',
      steps: [
        'Open Reports & Analytics > Excel Export from the menu, or click the "Export Excel" button on any table (Customer list, Attendance log, Payment ledger, or Expenses).',
        'Select your date range and active filters (e.g., active students, this month\'s UPI payments).',
        'Click "Export Excel (.xlsx)" or "Export CSV".',
        'The browser will instantly download the file to your Android downloads folder or desktop.'
      ],
      tips: 'Real numbers and dates are preserved so you can calculate sums and averages in Microsoft Excel or Google Sheets.'
    },
    {
      id: 'faq-qr-fail',
      category: 'attendance_qr',
      question: 'What should I do if a QR scan fails?',
      answer: 'Follow these quick troubleshooting steps if a student pass scan returns an error:',
      steps: [
        'Subscription Expired: Check if their month cycle ended. Offer quick renewal via the scanner modal.',
        'Wrong Shift / Time Window: Check if strict shift timings are enabled and student is scanning outside scheduled mess hours.',
        'Duplicate Entry: The student has already eaten in the current shift. You can click "Manager Override" if owner authorization is granted.',
        'Camera Blur or Dirt: Ensure clean phone camera lens and adequate counter lighting.'
      ]
    },
    {
      id: 'faq-contact',
      category: 'contact',
      question: 'How do I contact support?',
      answer: 'Our dedicated support team is available daily for technical assistance, hardware setup, and billing queries:',
      steps: [
        'Phone / WhatsApp: Call or WhatsApp our priority line at +91 98220 01122.',
        'In-App Support Ticket: Click "Support Requests" in the side menu to submit a ticket with priority flag.',
        'Email: Send query details to support@moryamess.com.'
      ]
    }
  ];

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        faq.question.toLowerCase().includes(q) || 
        faq.answer.toLowerCase().includes(q) ||
        (faq.steps && faq.steps.some(s => s.toLowerCase().includes(q)));
      return matchesCategory && matchesSearch;
    });
  }, [faqs, activeCategory, searchTerm]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <HelpCircle className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer backdrop-blur-xs"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Owner Knowledge Base & Help Center</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Morya Mess Help & Support
            </h1>
            <p className="text-sm text-orange-100 max-w-2xl mt-1">
              Complete operational guides, step-by-step FAQs, and best practices for managing diners, QR attendance, UPI & cash billing, and financial reports.
            </p>
          </div>

          {/* Quick Search */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search help topics (e.g. QR scanner, UPI verification, cash, leaves)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Topic Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                isActive
                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Operational Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-orange-200 transition">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="font-black text-sm text-slate-900">QR Gate Attendance</h3>
          <p className="text-xs text-slate-500 mt-1">
            Instantly verify active subscriptions and prevent double meals with single camera scan.
          </p>
          <button
            onClick={() => setActiveCategory('attendance_qr')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 mt-3 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View QR Guide</span>
            <span>&rarr;</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-200 transition">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="font-black text-sm text-slate-900">UPI & Cash Reconciliation</h3>
          <p className="text-xs text-slate-500 mt-1">
            Accept direct student UPI receipts, match UTR numbers, and record counter cash handoffs.
          </p>
          <button
            onClick={() => setActiveCategory('billing')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 mt-3 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View Billing Help</span>
            <span>&rarr;</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-200 transition">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="font-black text-sm text-slate-900">Excel / Spreadsheet Reports</h3>
          <p className="text-xs text-slate-500 mt-1">
            1-click export of customer databases, monthly statements, attendance logs, and expenses.
          </p>
          <button
            onClick={() => setActiveCategory('reports')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 mt-3 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View Export Guides</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* 4. Frequently Asked Questions Accordion List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-orange-600" />
              <span>Frequently Asked Questions ({filteredFaqs.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on any topic below to expand step-by-step instructions.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <div className="font-bold text-slate-800 text-sm">No matching help articles found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try searching with different keywords like "QR", "cash", "leave", or choose "All Topics" above.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map(faq => {
              const isExpanded = !!expandedFaqs[faq.id];
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition overflow-hidden ${
                    isExpanded 
                      ? 'border-orange-300 bg-orange-50/20' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-black text-sm text-slate-900 flex-1">
                      {faq.question}
                    </span>
                    <div className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-orange-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 space-y-3 text-xs text-slate-700 border-t border-orange-100">
                      <p className="leading-relaxed font-medium">
                        {faq.answer}
                      </p>

                      {faq.steps && faq.steps.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-white border border-orange-100 space-y-2">
                          <span className="font-bold text-[11px] text-orange-800 uppercase tracking-wider block">
                            Step-by-Step Instructions:
                          </span>
                          <ol className="list-decimal pl-5 space-y-1.5 font-medium text-slate-700">
                            {faq.steps.map((st, sidx) => (
                              <li key={sidx}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {faq.tips && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Pro-Tip:</strong> {faq.tips}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Contact Support & Submit Ticket Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-600" />
              <span>Need Direct Assistance? Contact Support</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Our technical helpdesk is standing by for Morya Mess owners & operators.
            </p>
          </div>

          {onNavigateSupportRequests && (
            <button
              onClick={onNavigateSupportRequests}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer self-start sm:self-auto shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open Support Requests Ticket Queue</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone & WhatsApp</span>
              <span className="text-xs font-black text-slate-900">+91 98220 01122</span>
              <span className="text-[10px] text-slate-500 block">Daily 7:00 AM – 11:00 PM</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Email</span>
              <span className="text-xs font-black text-slate-900">support@moryamess.com</span>
              <span className="text-[10px] text-slate-500 block">Response within 2 hours</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Operating Hours</span>
              <span className="text-xs font-black text-slate-900">Monday – Sunday</span>
              <span className="text-[10px] text-slate-500 block">365 Days Operations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
