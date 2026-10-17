import React, { useState } from 'react';
import { BookOpen, HelpCircle, ChevronDown, ChevronUp, ShieldCheck, Heart, Sparkles, AlertTriangle } from 'lucide-react';

export const StudentRulesFaqTab: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const rules = [
    {
      title: 'Zero Food Wastage (अन्न हे पूर्णब्रह्म)',
      desc: 'Take only the portion of rice, sabzi, and dal that you can comfortably finish. Second servings are always available. Respect food and hard work.',
      badge: 'Golden Rule'
    },
    {
      title: 'Mandatory QR Scan Before Plate Collection',
      desc: 'Every member must scan the Universal Gate Standee QR before collecting their thali. Unscanned meals cause inventory mismatch.',
      badge: 'Attendance'
    },
    {
      title: '24-Hour Advance Notice for Leave / Skip Meal',
      desc: 'Submit vacation or leave requests via the portal at least 24 hours prior so kitchen staff do not cook excess food.',
      badge: 'Leave Policy'
    },
    {
      title: 'Personal & Non-Transferable Subscription',
      desc: 'Your Morya Mess digital dining pass and customer ID are strictly personal. Sharing passes with non-members is prohibited.',
      badge: 'Account'
    },
    {
      title: 'Dining Hall Hygiene & Table Cleanliness',
      desc: 'Wash hands thoroughly at the washstation before eating. After finishing, deposit plates, bowls, and spoons in the designated dish bin.',
      badge: 'Hygiene'
    },
    {
      title: 'Strict Punctuality to Shift Hours',
      desc: 'Lunch closes at 02:30 PM and Dinner at 10:30 PM. Staff need time to clean and sanitize for the next shift.',
      badge: 'Timings'
    }
  ];

  const faqs = [
    {
      q: 'How does the Gate QR attendance scanner work?',
      a: 'When you arrive at Morya Mess, open the "Scan Gate QR" tab in your Student Portal and point your phone camera at the universal laminated standee at the mess entrance. The system verifies your subscription and active shift in real-time.'
    },
    {
      q: 'How long does payment verification take after UPI transfer?',
      a: 'When you submit your UPI reference/UTR number in the Payments tab, a "Pending" record is created in Supabase immediately. The mess owner cross-checks with bank SMS/UPI ledger and verifies your subscription within 1-2 business hours.'
    },
    {
      q: 'What should I do if my phone camera lens is damaged?',
      a: 'The Gate QR scanner includes a "Manual Token Code Entry" fallback box at the bottom. The mess counter display shows the current token, which you can enter manually.'
    },
    {
      q: 'How do I download my monthly payment receipt?',
      a: 'Navigate to the "Payments" tab. In the "Verified Receipts" section, tap "View Receipt" next to any verified payment. You can print or download the official Morya Mess tax invoice receipt.'
    },
    {
      q: 'Can I bring a guest or friend who does not have a subscription?',
      a: 'Yes! Morya Mess welcomes walk-in guests. Guests can pay the per-meal token rate directly at the counter via cash or UPI to receive an instant guest meal token.'
    },
    {
      q: 'Why is Sunday night dinner closed?',
      a: 'Every Sunday night, the mess is closed for intensive kitchen sanitization, pest prevention, deep utensil cleaning, and staff rest. Sunday lunch operates with a special feast!'
    }
  ];

  return (
    <div className="w-full max-w-full sm:max-w-2xl space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">
              Dining Hall Etiquette
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Rules & Frequently Asked Questions
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Please review the mess code of conduct to ensure a clean, respectful, and hygienic dining experience for all student members.
        </p>
      </div>

      {/* 6 Golden Rules */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-600" />
          <span>Core Mess Rules & Code of Conduct</span>
        </h3>

        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-orange-200/70 bg-orange-50/20 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    {idx + 1}
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-900">
                    {rule.title}
                  </h4>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white text-orange-700 border border-orange-200 shrink-0">
                  {rule.badge}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-7">
                {rule.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-orange-600" />
          <span>Frequently Asked Questions (FAQ)</span>
        </h3>

        <div className="space-y-2">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="border border-orange-200/70 rounded-2xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-3.5 bg-orange-50/20 hover:bg-orange-50/50 text-left font-bold text-xs text-slate-800 flex items-center justify-between gap-3 transition cursor-pointer"
                >
                  <span className="leading-snug">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-orange-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="p-3.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-orange-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
