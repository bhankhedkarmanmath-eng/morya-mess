import React from 'react';
import { Customer } from '../../../types/mess';
import { HelpCircle, Phone, MessageSquare, MapPin, Clock, ExternalLink, ShieldCheck, Mail, AlertTriangle, Navigation as NavIcon } from 'lucide-react';

interface StudentSupportTabProps {
  customer: Customer;
  onNavigateToComplaints: () => void;
  messName?: string;
}

export const StudentSupportTab: React.FC<StudentSupportTabProps> = ({
  customer,
  onNavigateToComplaints,
  messName = 'Morya Mess New'
}) => {
  const managers = [
    {
      name: 'AMIT MUNDRUPAKAR',
      role: 'Mess Manager',
      phone: '8766917809',
      displayPhone: '+91 87669 17809',
      cleanPhone: '918766917809'
    },
    {
      name: 'GANESH BHANKHEDKAR',
      role: 'Mess Operations Manager',
      phone: '7447524804',
      displayPhone: '+91 74475 24804',
      cleanPhone: '917447524804'
    }
  ];

  const fullAddress = 'GR5W+9XR, Gopal Gayan Samaj Road, Ramashram Society, Lokamanya Nagar, Perugate, Sadashiv Peth, Pune';
  const mapsUrl = 'https://maps.app.goo.gl/6BmYVyXKoaSsy7656?g_st=ac';

  const getWhatsAppUrl = (cleanPhone: string, managerName: string) => {
    const text = encodeURIComponent(
      `Hello ${managerName} (Morya Mess), I am ${customer.name} (Student ID: ${customer.id}, Phone: ${customer.phone}). I need assistance regarding my mess subscription.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

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
              Direct Student Help Desk
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Help & Mess Support
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Need help with your subscription, payment confirmation, meal timings, or daily mess operations? Connect directly with the mess management team.
        </p>
      </div>

      {/* Direct Call Managers Section */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-orange-100 pb-2.5">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Call Mess Managers</span>
          </h3>
          <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Direct Helpline
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {managers.map((mgr) => (
            <a
              key={mgr.phone}
              href={`tel:${mgr.cleanPhone}`}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md transition cursor-pointer flex items-center gap-3.5 group"
            >
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block truncate">
                  {mgr.role}
                </span>
                <div className="font-black text-xs text-white leading-tight truncate">
                  {mgr.name}
                </div>
                <div className="font-mono text-xs font-bold text-emerald-100 mt-0.5 group-hover:underline">
                  {mgr.displayPhone}
                </div>
                <span className="text-[10px] text-emerald-200/90 block mt-0.5">Tap to call directly</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* WhatsApp Support Section */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-orange-100 pb-2.5">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#25D366]" />
            <span>WhatsApp Chat Support</span>
          </h3>
          <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Instant Chat
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {managers.map((mgr) => (
            <a
              key={mgr.phone}
              href={getWhatsAppUrl(mgr.cleanPhone, mgr.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md transition cursor-pointer flex items-center gap-3.5 group"
            >
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block truncate">
                  WhatsApp Helpline
                </span>
                <div className="font-black text-xs text-white leading-tight truncate">
                  {mgr.name}
                </div>
                <div className="font-mono text-xs font-bold text-white/95 mt-0.5">
                  {mgr.displayPhone}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-100 mt-0.5 group-hover:underline">
                  <span>Chat on WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Mess Physical Address & Google Maps */}
      <div className="bg-white rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-orange-100 pb-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-600" />
            <span>Mess Physical Location & Address</span>
          </h3>
          <span className="text-[10px] font-bold uppercase text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
            Morya Mess New
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-2xl bg-orange-50/30 border border-orange-200 space-y-2">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <strong className="text-slate-900 block font-bold text-sm">Morya Mess New</strong>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {fullAddress}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <NavIcon className="w-3.5 h-3.5" />
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </div>
          </div>

          {/* Office Inquiry Timing */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
            <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <strong className="text-slate-900 block font-bold text-xs uppercase tracking-wider text-amber-900">
                Office Inquiry Timings
              </strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200/80">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Morning Shift</span>
                  <span className="font-mono font-black text-slate-900 text-sm">11:30 AM – 02:30 PM</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200/80">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Night Shift</span>
                  <span className="font-mono font-black text-slate-900 text-sm">08:00 PM – 10:00 PM</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Office desk is open daily during these hours for new admissions, pass renewals, and receipt inquiries.
              </p>
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
            You can register a formal ticket in the Complaints section. The management team will review and reply directly.
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
