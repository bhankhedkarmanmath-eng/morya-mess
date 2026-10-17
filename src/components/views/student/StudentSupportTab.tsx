import React from 'react';
import { Customer } from '../../../types/mess';
import { HelpCircle, Phone, MessageSquare, MapPin, Clock, ExternalLink, ShieldCheck, Mail, AlertTriangle } from 'lucide-react';

interface StudentSupportTabProps {
  customer: Customer;
  onNavigateToComplaints: () => void;
  messName?: string;
}

export const StudentSupportTab: React.FC<StudentSupportTabProps> = ({
  customer,
  onNavigateToComplaints,
  messName = 'Morya Mess'
}) => {
  const messPhone = '+91 98223 34455';
  const messCleanPhone = '919822334455';
  const messAddress = 'Near COEP Main Gate, Shivaji Nagar, Pune, Maharashtra 411005';
  const whatsappUrl = `https://wa.me/${messCleanPhone}?text=${encodeURIComponent(
    `Hello Morya Mess Management, I am ${customer.name} (Student ID: ${customer.id}). I need help regarding my mess subscription.`
  )}`;

  return (
    <div className="w-full max-w-full sm:max-w-2xl space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">
              Direct Assistance
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Help & Mess Support
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Need help with your subscription, payment verification, diet preferences, or lost items? Connect directly with the mess management.
        </p>
      </div>

      {/* Quick Action Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Call Manager */}
        <a
          href={`tel:${messCleanPhone}`}
          className="p-5 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">
              Call Mess Manager
            </span>
            <div className="font-black text-sm group-hover:underline">
              {messPhone}
            </div>
            <span className="text-[11px] text-emerald-100">Tap to call directly</span>
          </div>
        </a>

        {/* WhatsApp Chat */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 rounded-3xl bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md transition cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100 block">
              WhatsApp Support
            </span>
            <div className="font-black text-sm group-hover:underline flex items-center gap-1">
              <span>Chat on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] text-white/90">Instant response</span>
          </div>
        </a>
      </div>

      {/* Mess Location & Office Info */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 border-b border-orange-100 pb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-600" />
          <span>Mess Location & Office Desk</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-orange-50/25 border border-orange-100">
            <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold">Physical Address:</strong>
              <span className="text-slate-600 leading-relaxed">{messAddress}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-orange-50/25 border border-orange-100">
            <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block font-bold">Office Inquiry Hours:</strong>
              <span className="text-slate-600 leading-relaxed">
                Morning: 10:00 AM – 01:00 PM &bull; Evening: 05:00 PM – 08:30 PM (Daily)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Grievance Shortcut Card */}
      <div className="p-5 rounded-3xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <h4 className="font-extrabold text-orange-950 text-sm">
            Have a specific complaint or feedback?
          </h4>
          <p className="text-orange-800 text-[11px]">
            You can register a formal ticket in the Complaints section. The owner will review and reply directly.
          </p>
        </div>

        <button
          onClick={onNavigateToComplaints}
          className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition cursor-pointer shrink-0 text-center"
        >
          Open Complaints Desk
        </button>
      </div>
    </div>
  );
};
