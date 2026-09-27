import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, InventoryMovement } from '../../types/mess';
import { 
  fetchInventoryFromSupabase, 
  saveInventoryToSupabase,
  recordStockPurchase, 
  recordStockMovement 
} from '../../lib/ownerFeaturesApi';
import { 
  loadInventoryMovements 
} from '../../lib/ownerModulesStorage';
import { 
  Package, 
  ArrowLeft, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingDown, 
  RefreshCw, 
  History, 
  ShoppingCart, 
  Sliders, 
  CheckCircle2, 
  X,
  Trash2,
  DollarSign,
  Layers,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';

interface InventoryCenterViewProps {
  onBack: () => void;
}

type InventoryTab = 'items' | 'movements' | 'purchase' | 'alerts';

export const InventoryCenterView: React.FC<InventoryCenterViewProps> = ({ onBack }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [activeTab, setActiveTab] = useState<InventoryTab>('items');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Purchase Modal State
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseInvoice, setPurchaseInvoice] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  // Movement / Consumption Modal State
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementItemId, setMovementItemId] = useState<string>('');
  const [movementType, setMovementType] = useState<'consumption' | 'wastage' | 'adjustment'>('consumption');
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('Daily Kitchen Cooking Consumption');
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  // Add New Item Modal State
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Grains' | 'Pulses' | 'Dairy' | 'Oil & Ghee' | 'Vegetables' | 'Spices' | 'Gas & Fuel' | 'Cleaning' | 'Other'>('Grains');
  const [newItemStock, setNewItemStock] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemMinStock, setNewItemMinStock] = useState('10');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemSupplier, setNewItemSupplier] = useState('');

  // Status Banners
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    setIsLoading(true);
    try {
      const invData = await fetchInventoryFromSupabase();
      setItems(invData || []);
      const movData = loadInventoryMovements();
      setMovements(movData || []);
    } catch (err) {
      console.warn('Failed to load inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Stock calculation metrics
  const lowStockItems = useMemo(() => {
    return items.filter(i => i.currentStock > 0 && i.currentStock <= i.minStockLevel);
  }, [items]);

  const outOfStockItems = useMemo(() => {
    return items.filter(i => i.currentStock <= 0);
  }, [items]);

  const totalInventoryValue = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.currentStock * (item.costPerUnit || 0)), 0);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || (item.supplierName && item.supplierName.toLowerCase().includes(q));
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  // Handler: Purchase Restock
  const handleExecutePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !purchaseQty || Number(purchaseQty) <= 0) {
      showToast('error', 'Please select item and enter valid restock quantity');
      return;
    }

    setIsSubmittingPurchase(true);
    const today = new Date().toISOString().split('T')[0];
    const res = await recordStockPurchase({
      itemId: selectedItemId,
      quantity: Number(purchaseQty),
      cost: Number(purchaseCost) || 0,
      supplier: purchaseSupplier || 'Local Vendor',
      invoiceNumber: purchaseInvoice || undefined,
      notes: purchaseNotes || 'Stock Restock / Purchase',
      date: today,
      recordedBy: 'Owner Desk'
    });

    if (res.success) {
      showToast('success', `Restocked ${purchaseQty} units of ${res.item?.name}. Stock updated.`);
      setIsPurchaseOpen(false);
      setPurchaseQty('');
      setPurchaseCost('');
      setPurchaseSupplier('');
      setPurchaseInvoice('');
      setPurchaseNotes('');
      await loadInventoryData();
    } else {
      showToast('error', res.error || 'Failed to record purchase');
    }
    setIsSubmittingPurchase(false);
  };

  // Handler: Movement / Consumption
  const handleExecuteMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementItemId || !movementQty || Number(movementQty) < 0) {
      showToast('error', 'Please select item and enter valid quantity');
      return;
    }

    setIsSubmittingMovement(true);
    const today = new Date().toISOString().split('T')[0];
    const res = await recordStockMovement({
      itemId: movementItemId,
      type: movementType,
      quantity: Number(movementQty),
      reason: movementReason || 'Kitchen Consumption',
      date: today,
      recordedBy: 'Kitchen Staff / Owner'
    });

    if (res.success) {
      showToast('success', `${movementType.toUpperCase()} recorded for ${res.item?.name}. Stock balance updated.`);
      setIsMovementOpen(false);
      setMovementQty('');
      setMovementReason('Daily Kitchen Cooking Consumption');
      await loadInventoryData();
    } else {
      showToast('error', res.error || 'Failed to record stock movement');
    }
    setIsSubmittingMovement(false);
  };

  // Handler: Create New Item
  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showToast('error', 'Item name is required');
      return;
    }

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newItemName.trim(),
      category: newItemCategory,
      currentStock: Number(newItemStock) || 0,
      unit: newItemUnit || 'kg',
      minStockLevel: Number(newItemMinStock) || 5,
      costPerUnit: Number(newItemCost) || 0,
      supplierName: newItemSupplier.trim() || 'General Market',
      lastRestockedDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString()
    };

    const updated = [newItem, ...items];
    await saveInventoryToSupabase(updated);
    showToast('success', `Item "${newItem.name}" added to inventory.`);
    setIsNewItemOpen(false);
    setNewItemName('');
    setNewItemStock('');
    setNewItemCost('');
    setNewItemSupplier('');
    await loadInventoryData();
  };

  // Handler: Delete Item
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${itemName} from inventory?`)) return;
    const remaining = items.filter(i => i.id !== itemId);
    await saveInventoryToSupabase(remaining);
    showToast('success', `Item "${itemName}" removed from inventory.`);
    await loadInventoryData();
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md animate-in fade-in ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="text-slate-500 hover:text-slate-800">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              <span>Mess Inventory & Stock Control</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live stock counts, kitchen consumption logs, restock procurement, and low-inventory alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPurchaseOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Record Restock</span>
          </button>

          <button
            onClick={() => setIsMovementOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-xs transition cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-orange-400" />
            <span>Log Consumption</span>
          </button>

          <button
            onClick={() => setIsNewItemOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Inventory Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Total Tracked Items</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{items.length}</div>
          <div className="text-[11px] text-slate-400 font-medium">Grains, spices, dairy, fuel & cleaning</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Total Inventory Value</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹{totalInventoryValue.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-700 font-bold">Estimated current asset value</div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-2xs space-y-1 ${
          lowStockItems.length > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase">
            <span>Low Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800">{lowStockItems.length}</div>
          <div className="text-[11px] text-amber-700 font-medium">
            {lowStockItems.length > 0 ? 'Requires immediate replenishment' : 'All items above safety threshold'}
          </div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-2xs space-y-1 ${
          outOfStockItems.length > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-rose-800 uppercase">
            <span>Out of Stock</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-800">{outOfStockItems.length}</div>
          <div className="text-[11px] text-rose-700 font-medium">
            {outOfStockItems.length > 0 ? 'Cooking operations affected' : 'No items depleted'}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold">
        {[
          { id: 'items', label: `Stock Register (${items.length})`, icon: Package },
          { id: 'alerts', label: `Restock Alerts (${lowStockItems.length + outOfStockItems.length})`, icon: AlertTriangle },
          { id: 'movements', label: `Stock Movements (${movements.length})`, icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as InventoryTab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: STOCK REGISTER                                */}
      {/* ==================================================== */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search raw material, grain, supplier..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-600"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-bold text-slate-600">
              {['all', 'Grains', 'Pulses', 'Dairy', 'Oil & Ghee', 'Vegetables', 'Spices', 'Gas & Fuel'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-orange-600 text-white font-black shadow-xs'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          {isLoading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
              Loading inventory stock...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">No items in this view</h4>
              <p className="text-xs text-slate-500">Add materials using the button above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const isOutOfStock = item.currentStock <= 0;
                const isLow = item.currentStock > 0 && item.currentStock <= item.minStockLevel;

                return (
                  <div 
                    key={item.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:border-orange-300 transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-black text-slate-900 text-sm">{item.name}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {item.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Supplier: {item.supplierName || 'Local Market'}
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isOutOfStock 
                            ? 'bg-rose-100 text-rose-800' 
                            : isLow 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isOutOfStock ? 'Empty' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>

                      {/* Stock Card */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                        <div className="flex justify-between items-baseline">
                          <span className="text-slate-500 font-bold">Current Quantity:</span>
                          <span className="text-base font-black text-slate-900">
                            {item.currentStock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              isOutOfStock ? 'bg-rose-500 w-0' : isLow ? 'bg-amber-500 w-1/3' : 'bg-emerald-500 w-4/5'
                            }`}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                          <span>Min Threshold: <strong className="text-slate-800">{item.minStockLevel} {item.unit}</strong></span>
                          <span>Unit Cost: <strong className="text-slate-800">₹{item.costPerUnit || 0}</strong></span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-medium">
                        Last restocked: {item.lastRestockedDate || 'Recent'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setIsPurchaseOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-xs"
                        >
                          + Restock
                        </button>
                        <button
                          onClick={() => {
                            setMovementItemId(item.id);
                            setIsMovementOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                        >
                          - Use
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: RESTOCK ALERTS                                */}
      {/* ==================================================== */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-amber-900 text-sm">Critical Stock Replenishment Warnings</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                The items below have fallen below safety threshold limits or have been completely depleted. Restock immediately to prevent kitchen delays.
              </p>
            </div>
          </div>

          {[...outOfStockItems, ...lowStockItems].length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">All Stock Healthy</h4>
              <p className="text-xs text-slate-500">Every inventory commodity is currently above safety threshold.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="divide-y divide-slate-100">
                {[...outOfStockItems, ...lowStockItems].map(item => {
                  const isZero = item.currentStock <= 0;
                  return (
                    <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-sm">{item.name}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isZero ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isZero ? 'Completely Out of Stock' : 'Low Safety Level'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          <span>Current: <strong className="text-slate-900">{item.currentStock} {item.unit}</strong></span>
                          <span>•</span>
                          <span>Required Minimum: <strong className="text-slate-900">{item.minStockLevel} {item.unit}</strong></span>
                          <span>•</span>
                          <span>Supplier: {item.supplierName || 'Local Supplier'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setPurchaseSupplier(item.supplierName || '');
                          setIsPurchaseOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs cursor-pointer self-start sm:self-auto"
                      >
                        Procure / Restock Now
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: STOCK MOVEMENTS                               */}
      {/* ==================================================== */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-orange-600" />
              <span>Audited Stock Movement Log</span>
            </h3>
            <span className="text-xs text-slate-400">{movements.length} logged entries</span>
          </div>

          {movements.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Item Name</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Quantity</th>
                    <th className="px-5 py-3.5">Cost / Supplier</th>
                    <th className="px-5 py-3.5">Reason / Note</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-right">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-black text-slate-900">{m.itemName}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          m.type === 'purchase'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.type === 'consumption'
                            ? 'bg-blue-100 text-blue-800'
                            : m.type === 'wastage'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {m.type === 'purchase' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{m.type}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {m.quantity} {m.unit}
                      </td>
                      <td className="px-5 py-3.5">
                        {m.cost ? <strong className="text-slate-900">₹{m.cost}</strong> : '—'}
                        {m.supplier && <span className="text-[11px] text-slate-400 block">{m.supplier}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">{m.reason || '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">{m.date}</td>
                      <td className="px-5 py-3.5 text-right text-slate-700 font-medium">{m.recordedBy || 'Owner Desk'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: RECORD PURCHASE / RESTOCK                   */}
      {/* ==================================================== */}
      {isPurchaseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Procure & Restock Inventory</span>
              </h3>
              <button onClick={() => setIsPurchaseOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePurchase} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Raw Material / Commodity *</label>
                <select
                  required
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const it = items.find(i => i.id === e.target.value);
                    if (it?.supplierName) setPurchaseSupplier(it.supplierName);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Current: {i.currentStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Purchased Quantity *</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 50"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 3500"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier / Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Omkar Traders"
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bill / Invoice Number</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-904"
                    value={purchaseInvoice}
                    onChange={(e) => setPurchaseInvoice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Purchase Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly bulk ration supply"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPurchaseOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPurchase}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmittingPurchase ? 'Updating...' : 'Save Stock Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: LOG CONSUMPTION / USAGE                     */}
      {/* ==================================================== */}
      {isMovementOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-600" />
                <span>Log Kitchen Usage / Movement</span>
              </h3>
              <button onClick={() => setIsMovementOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteMovement} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Item *</label>
                <select
                  required
                  value={movementItemId}
                  onChange={(e) => setMovementItemId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.currentStock} {i.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Movement Type</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  >
                    <option value="consumption">Daily Consumption</option>
                    <option value="wastage">Kitchen Wastage / Spoilage</option>
                    <option value="adjustment">Stock Count Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 10"
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason / Purpose</label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="e.g. Dinner preparation for 120 students"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMovementOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMovement}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  {isSubmittingMovement ? 'Deducting...' : 'Confirm Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: ADD NEW INVENTORY ITEM                     */}
      {/* ==================================================== */}
      {isNewItemOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-600" />
                <span>Add New Tracked Commodity</span>
              </h3>
              <button onClick={() => setIsNewItemOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Item / Commodity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kolam Rice, Toor Dal, Gas Cylinder"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  >
                    <option value="Grains">Grains</option>
                    <option value="Pulses">Pulses</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Oil & Ghee">Oil & Ghee</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Spices">Spices</option>
                    <option value="Gas & Fuel">Gas & Fuel</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit of Measurement</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="liter">liter (Liters)</option>
                    <option value="cylinder">cylinder (Cylinders)</option>
                    <option value="packet">packet (Packets)</option>
                    <option value="pcs">pcs (Pieces)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 50"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Threshold Alert</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 10"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cost Per Unit (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 60"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shinde Mart"
                    value={newItemSupplier}
                    onChange={(e) => setNewItemSupplier(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewItemOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
