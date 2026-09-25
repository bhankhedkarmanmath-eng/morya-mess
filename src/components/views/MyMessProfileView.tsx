import React, { useState } from 'react';
import { 
  Building2, 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Save, 
  Wifi, 
  ShieldCheck, 
  Droplets, 
  Flame,
  ExternalLink
} from 'lucide-react';

interface MyMessProfileViewProps {
  messName?: string;
  onBack: () => void;
}

export const MyMessProfileView: React.FC<MyMessProfileViewProps> = ({
  messName = 'MORYA MESS',
  onBack
}) => {
  const [tagline, setTagline] = useState('Homely Dining & Pure Hygienic Meals');
  const [address, setAddress] = useState('Opposite Boys Hostel, Near Government Engineering College, College Road, Latur - 413512');
  const [phone, setPhone] = useState('+91 98220 01122');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('https://maps.google.com/?q=Latur+Maharashtra');
  const [facilities, setFacilities] = useState([
    { id: '1', title: 'RO UV Mineral Drinking Water', active: true },
    { id: '2', title: 'Unlimited Hot Fresh Wheat Chapatis', active: true },
    { id: '3', title: 'Hygienic Stainless Steel Thalis', active: true },
    { id: '4', title: 'High-Speed Wi-Fi for Diners', active: true },
    { id: '5', title: 'Separate Dining Tables for Girls', active: true },
    { id: '6', title: 'Solar Hot Water Dish Sanitization', active: true }
  ]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggleFacility = (id: string) => {
    setFacilities(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              <span>My Mess Digital Brand & Profile</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Public identity, dining hall photos, location map, and highlighted hygiene amenities
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile Updated!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Banner Card */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg space-y-3">
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-200 bg-white/10 px-2.5 py-0.5 rounded-full inline-block">
              Verified Dining Establishment
            </span>
            <h2 className="text-3xl font-black tracking-tight">{messName}</h2>
            <p className="text-sm font-medium text-orange-100">{tagline}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-2 relative z-10 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-200" />
              <span>College Road, Latur</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-orange-200" />
              <span>{phone}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-orange-200" />
              <span>Lunch & Dinner Active</span>
            </span>
          </div>
        </div>

        {/* Edit Profile Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
              Brand & Location Details
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Brand Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Mess Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Helpline Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Google Maps Location Link</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-900"
                  />
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                    title="Open map"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Dining Hall Amenities & Badges */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
              Highlighted Mess Amenities (Shown on Student App)
            </h3>

            <div className="space-y-2.5">
              {facilities.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleToggleFacility(f.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between text-xs ${
                    f.active ? 'bg-orange-50/40 border-orange-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <span className="font-bold text-slate-900">{f.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    f.active ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {f.active ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
};
