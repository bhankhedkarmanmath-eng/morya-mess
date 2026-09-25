import React, { useState, useEffect } from 'react';
import { WalkinMealType } from '../../types/mess';
import { 
  loadWalkinMealTypes, 
  saveWalkinMealTypes 
} from '../../lib/ownerModulesStorage';
import { 
  Utensils, 
  ArrowLeft, 
  Plus, 
  Check, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  CheckCircle2
} from 'lucide-react';

interface WalkinMealTypesViewProps {
  onBack: () => void;
  onNavigatePOS?: () => void;
}

export const WalkinMealTypesView: React.FC<WalkinMealTypesViewProps> = ({
  onBack,
  onNavigatePOS
}) => {
  const [mealTypes, setMealTypes] = useState<WalkinMealType[]>([]);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Add New Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    setMealTypes(loadWalkinMealTypes());
  }, []);

  const handleStartEdit = (m: WalkinMealType) => {
    setIsEditingId(m.id);
    setEditName(m.name);
    setEditPrice(m.price.toString());
    setEditDesc(m.description || '');
  };

  const handleSaveEdit = (id: string) => {
    const updated = mealTypes.map(m => {
      if (m.id === id) {
        return {
          ...m,
          name: editName.trim() || m.name,
          price: Number(editPrice) || m.price,
          description: editDesc.trim() || undefined
        };
      }
      return m;
    });
    setMealTypes(updated);
    saveWalkinMealTypes(updated);
    setIsEditingId(null);
  };

  const handleToggleActive = (id: string) => {
    const updated = mealTypes.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m);
    setMealTypes(updated);
    saveWalkinMealTypes(updated);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;

    const newItem: WalkinMealType = {
      id: `w-${Date.now()}`,
      name: newName.trim(),
      price: Number(newPrice),
      description: newDesc.trim() || undefined,
      isActive: true
    };

    const updated = [...mealTypes, newItem];
    setMealTypes(updated);
    saveWalkinMealTypes(updated);
    setNewName('');
    setNewPrice('');
    setNewDesc('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to POS"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-orange-600" />
              <span>Walk-in Meal Types & Pricing Configuration</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize plate charges, descriptions, and active status for walk-in counter sales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onNavigatePOS && (
            <button
              onClick={onNavigatePOS}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Open POS Counter
            </button>
          )}
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Meal Type</span>
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Add New Walk-in Meal Option</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Meal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Sweet Thali / Fasting Sabudana Khichdi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rate per Plate (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 90"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Menu Items Description</label>
                <input
                  type="text"
                  placeholder="e.g. 2 Sabji, Dal, 4 Roti, Rice, Gulab Jamun"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  Save Meal Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meal Types Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mealTypes.map(m => {
          const isEditing = isEditingId === m.id;

          return (
            <div 
              key={m.id} 
              className={`p-5 rounded-2xl border bg-white shadow-2xs space-y-3 transition ${
                m.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              {isEditing ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-500 block text-[10px]">Title</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block text-[10px]">Price (₹)</label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 font-black text-sm"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block text-[10px]">Description</label>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleSaveEdit(m.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                    <button
                      onClick={() => setIsEditingId(null)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <span>{m.name}</span>
                        {!m.isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                            Inactive
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{m.description || 'Standard meal'}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xl font-black text-orange-600 font-mono">₹{m.price}</span>
                      <span className="text-[10px] text-slate-400 block font-medium">per plate</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleToggleActive(m.id)}
                      className={`text-xs font-bold cursor-pointer ${m.isActive ? 'text-slate-400 hover:text-slate-600' : 'text-emerald-600 hover:underline'}`}
                    >
                      {m.isActive ? 'Disable / Deactivate' : 'Enable / Activate'}
                    </button>

                    <button
                      onClick={() => handleStartEdit(m)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Price</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
