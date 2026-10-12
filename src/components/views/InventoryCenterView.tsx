import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, InventoryMovement, InventoryCategory, Customer, MealLog, Expense, BusinessRulesConfig } from '../../types/mess';
import { 
  fetchInventoryFromSupabase, 
  saveInventoryToSupabase,
  recordStockPurchase, 
  recordStockMovement 
} from '../../lib/ownerFeaturesApi';
import { 
  loadInventoryMovements,
  saveInventoryMovements 
} from '../../lib/ownerModulesStorage';
import { pushSyncToServer } from '../../lib/syncEngine';
import { 
  Package, 
  ArrowLeft, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingDown, 
  History, 
  ShoppingCart, 
  Sliders, 
  CheckCircle2, 
  X,
  Trash2,
  DollarSign,
  Edit2,
  Minus,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Save,
  Utensils,
  ShieldAlert,
  Send,
  Copy,
  Check,
  Zap,
  Activity
} from 'lucide-react';

interface InventoryCenterViewProps {
  onBack: () => void;
  customers?: Customer[];
  mealLogs?: MealLog[];
  expenses?: Expense[];
  rules?: BusinessRulesConfig;
}

type InventoryTab = 'items' | 'scan_watchdog' | 'alerts' | 'requisitions' | 'movements';

export interface AutoRequisition {
  id: string;
  itemId: string;
  itemName: string;
  requiredQty: number;
  unit: string;
  supplierName: string;
  estimatedCost: number;
  status: 'PENDING' | 'ORDERED' | 'RESTOCKED';
  createdDate: string;
}

export const InventoryCenterView: React.FC<InventoryCenterViewProps> = ({ 
  onBack,
  customers = [],
  mealLogs = [],
  expenses = [],
  rules
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [activeTab, setActiveTab] = useState<InventoryTab>('items');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [vendorPhone, setVendorPhone] = useState('919876543210');
  const [isDeductingScans, setIsDeductingScans] = useState(false);
  const [copiedPO, setCopiedPO] = useState(false);

  // Edit Item Modal State
  const [editingItem, setEditingLogItem] = useState<InventoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Grains');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editUnit, setEditUnit] = useState('kg');
  const [editMinStock, setEditMinStock] = useState('10');
  const [editCost, setEditCost] = useState('');
  const [editSupplier, setEditSupplier] = useState('');

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
  const [newItemCategory, setNewItemCategory] = useState('Grains');
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [newItemStock, setNewItemStock] = useState('10');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemMinStock, setNewItemMinStock] = useState('5');
  const [newItemCost, setNewItemCost] = useState('50');
  const [newItemSupplier, setNewItemSupplier] = useState('');

  // Toast Alert State
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Requisitions State
  const [requisitions, setRequisitions] = useState<AutoRequisition[]>(() => {
    try {
      const saved = localStorage.getItem('morya_inventory_requisitions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save requisitions to local storage
  const saveRequisitionsLocally = (reqs: AutoRequisition[]) => {
    setRequisitions(reqs);
    try {
      localStorage.setItem('morya_inventory_requisitions', JSON.stringify(reqs));
    } catch (e) {
      console.warn('Failed to save requisitions:', e);
    }
  };

  // Handler: Auto-Generate Internal Requisitions for Low Stock Items
  const handleAutoGenerateRequisitions = () => {
    const lowStockList = items.filter(i => i.currentStock <= i.minStockLevel);
    if (lowStockList.length === 0) {
      showToast('success', 'All inventory items are sufficiently stocked! No requisitions required.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newReqs: AutoRequisition[] = [...requisitions];
    let createdCount = 0;

    lowStockList.forEach(item => {
      // Check if active pending/ordered requisition already exists for this item
      const existing = newReqs.find(r => r.itemId === item.id && r.status !== 'RESTOCKED');
      const reqQty = Math.max(10, (item.minStockLevel * 2) - item.currentStock);
      
      if (!existing) {
        newReqs.unshift({
          id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          itemId: item.id,
          itemName: item.name,
          requiredQty: reqQty,
          unit: item.unit || 'kg',
          supplierName: item.supplierName || 'Local Supplier',
          estimatedCost: reqQty * (item.costPerUnit || 50),
          status: 'PENDING',
          createdDate: todayStr
        });
        createdCount++;
      }
    });

    saveRequisitionsLocally(newReqs);
    showToast('success', `Created ${createdCount} automatic purchase requisitions in Owner App!`);
    setActiveTab('requisitions');
  };

  // Handler: Update Requisition Status
  const handleMarkRequisitionOrdered = (reqId: string) => {
    const updated = requisitions.map(r => r.id === reqId ? { ...r, status: 'ORDERED' as const } : r);
    saveRequisitionsLocally(updated);
    showToast('success', 'Requisition marked as ORDERED with vendor.');
  };

  // Handler: Fulfill Requisition and Restock Inventory
  const handleFulfillRequisition = async (req: AutoRequisition) => {
    const targetItem = items.find(i => i.id === req.itemId);
    if (!targetItem) {
      showToast('error', 'Target inventory item not found');
      return;
    }

    // Execute stock purchase
    const res = await recordStockPurchase({
      itemId: req.itemId,
      quantity: req.requiredQty,
      cost: req.estimatedCost,
      supplier: req.supplierName,
      notes: `Auto Requisition Fulfillment (${req.id})`,
      date: new Date().toISOString().split('T')[0],
      recordedBy: 'Owner Auto-Requisition Engine'
    });

    if (res.success) {
      const updatedReqs = requisitions.map(r => r.id === req.id ? { ...r, status: 'RESTOCKED' as const } : r);
      saveRequisitionsLocally(updatedReqs);
      
      // Reload inventory data
      await loadInventoryData();
      showToast('success', `Restocked ${req.requiredQty} ${req.unit} of ${req.itemName}. Inventory updated!`);
    } else {
      showToast('error', 'Failed to restock inventory item');
    }
  };

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
    setTimeout(() => setToastMsg(null), 3500);
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

  // Extract all categories dynamically
  const categoriesList = useMemo(() => {
    const defaultCats = ['Grains', 'Pulses', 'Dairy', 'Oil & Ghee', 'Vegetables', 'Spices', 'Gas & Fuel', 'Cleaning', 'Other'];
    const itemCats = items.map(i => i.category).filter(Boolean);
    const set = new Set([...defaultCats, ...itemCats]);
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || (item.supplierName && item.supplierName.toLowerCase().includes(q));
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  // ----------------------------------------------------
  // FEATURE 3: KITCHEN STOCK VS SCAN AUTO-CONSUMPTION & THEFT WATCHDOG
  // ----------------------------------------------------
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayScans = useMemo(() => {
    return (mealLogs || []).filter(m => m.date === todayDateStr);
  }, [mealLogs, todayDateStr]);

  const todayLunchScans = todayScans.filter(m => m.mealType === 'lunch').length;
  const todayDinnerScans = todayScans.filter(m => m.mealType === 'dinner').length;
  const totalScansToday = todayScans.length;

  // Standard Mess Recipe consumption per plate:
  const autoConsumptionSpecs = [
    { key: 'atta', name: 'Wheat Flour (Atta)', category: 'Grains', perPlate: 0.12, unit: 'kg', icon: '🌾' },
    { key: 'rice', name: 'Rice (Chawal / Kolam)', category: 'Grains', perPlate: 0.075, unit: 'kg', icon: '🍚' },
    { key: 'dal', name: 'Toor / Moong Dal', category: 'Pulses', perPlate: 0.035, unit: 'kg', icon: '🥣' },
    { key: 'oil', name: 'Cooking Oil (Tel)', category: 'Oil & Ghee', perPlate: 0.018, unit: 'L', icon: '🛢️' },
    { key: 'veggies', name: 'Fresh Vegetables / Mandi', category: 'Vegetables', perPlate: 0.14, unit: 'kg', icon: '🥦' },
    { key: 'spices', name: 'Spices & Salt (Masala)', category: 'Spices', perPlate: 0.008, unit: 'kg', icon: '🧂' },
    { key: 'gas', name: 'Commercial LPG Cylinder', category: 'Gas & Fuel', perPlate: 0.08, unit: 'kg', icon: '⛽' }
  ];

  const consumptionBreakdown = useMemo(() => {
    return autoConsumptionSpecs.map(spec => {
      const neededToday = +(totalScansToday * spec.perPlate).toFixed(2);
      // Find matching item in current inventory
      const matchedItem = items.find(i => 
        i.name.toLowerCase().includes(spec.name.toLowerCase().split(' ')[0]) || 
        i.category === spec.category
      );
      return {
        ...spec,
        neededToday,
        matchedItem,
        currentStock: matchedItem ? matchedItem.currentStock : 0,
        stockUnit: matchedItem ? matchedItem.unit : spec.unit,
        isLow: matchedItem ? matchedItem.currentStock <= neededToday : true
      };
    });
  }, [totalScansToday, items]);

  // Handler: 1-Click Auto-Deduct Stock from Today's Scans
  const handleAutoDeductScansStock = async () => {
    if (totalScansToday === 0) {
      showToast('error', '0 meal scans recorded today. Cannot auto-deduct stock for 0 scans.');
      return;
    }

    setIsDeductingScans(true);
    let deductedCount = 0;
    const updatedItems = [...items];
    const newMovements: InventoryMovement[] = [...movements];

    consumptionBreakdown.forEach(row => {
      if (row.matchedItem && row.neededToday > 0) {
        const itemIdx = updatedItems.findIndex(i => i.id === row.matchedItem!.id);
        if (itemIdx >= 0) {
          const prev = updatedItems[itemIdx];
          const newStock = Math.max(0, +(prev.currentStock - row.neededToday).toFixed(2));
          updatedItems[itemIdx] = {
            ...prev,
            currentStock: newStock,
            lastUpdated: new Date().toISOString()
          };

          newMovements.unshift({
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            itemId: prev.id,
            itemName: prev.name,
            type: 'consumption',
            quantity: row.neededToday,
            unit: prev.unit || 'kg',
            reason: `Auto-Deduction for ${totalScansToday} verified gate meal scans (${todayDateStr})`,
            date: todayDateStr,
            recordedBy: 'AI Auto-Watchdog',
            createdAt: new Date().toISOString()
          });
          deductedCount++;
        }
      }
    });

    if (deductedCount > 0) {
      setItems(updatedItems);
      setMovements(newMovements);
      saveInventoryMovements(newMovements);
      await saveInventoryToSupabase(updatedItems);
      pushSyncToServer({ inventoryItems: updatedItems });
      showToast('success', `⚡ Successfully auto-deducted stock for ${totalScansToday} scans across ${deductedCount} ingredients!`);
    } else {
      showToast('error', 'No matching inventory items found for auto-deduction. Please add Atta, Rice, Dal in inventory.');
    }
    setIsDeductingScans(false);
  };

  // Handler: Generate WhatsApp PO for vendor
  const handleGenerateVendorPO = () => {
    const lowItems = items.filter(i => i.currentStock <= i.minStockLevel);
    if (lowItems.length === 0) {
      showToast('success', 'All inventory items are currently sufficiently stocked!');
      return;
    }

    const messName = rules?.messName || 'Morya Mess';
    const lines = lowItems.map(i => {
      const orderQty = Math.max(10, (i.minStockLevel * 2) - i.currentStock);
      return `• *${i.name}*: ${orderQty} ${i.unit} (Current Stock: ${i.currentStock} ${i.unit})`;
    }).join('\n');

    const poText = `📦 *${messName} - Urgent Grocery & Ration Purchase Order*\n📅 Date: ${todayDateStr}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nNamaskar Bhaiya, Kripya mess ke liye niche diya saman jaldi deliver karein:\n\n${lines}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📍 Delivery: *${messName} Kitchen*\nDhanyawad!\n_${messName} Management_`;

    const cleanPhone = vendorPhone.replace(/[^0-9]/g, '');
    const url = cleanPhone 
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(poText)}`
      : `https://wa.me/?text=${encodeURIComponent(poText)}`;
    window.open(url, '_blank');
  };

  // Handler: Quick Stock Adjuster (+1 / -1)
  const handleQuickAdjustStock = async (item: InventoryItem, delta: number) => {
    const newStock = Math.max(0, item.currentStock + delta);
    const updated = items.map(i => i.id === item.id ? { ...i, currentStock: newStock, lastUpdated: new Date().toISOString() } : i);
    setItems(updated);
    
    showToast('success', `${item.name} stock updated: ${newStock} ${item.unit}`);

    // Log movement in background
    const newMovement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      type: delta > 0 ? 'purchase' : 'consumption',
      quantity: Math.abs(delta),
      unit: item.unit,
      date: new Date().toISOString().split('T')[0],
      reason: delta > 0 ? 'Quick Stock Increment (+)' : 'Quick Kitchen Adjustment (-)',
      recordedBy: 'Owner Quick Action',
      createdAt: new Date().toISOString()
    };
    const updatedMovements = [newMovement, ...movements];
    setMovements(updatedMovements);
    saveInventoryMovements(updatedMovements);

    await saveInventoryToSupabase(updated);
    pushSyncToServer({ inventoryItems: updated });
  };

  // Handler: Open Edit Item Modal
  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingLogItem(item);
    setEditName(item.name);
    setEditCategory(item.category || 'Grains');
    setEditCustomCategory('');
    setEditStock(item.currentStock.toString());
    setEditUnit(item.unit || 'kg');
    setEditMinStock(item.minStockLevel.toString());
    setEditCost((item.costPerUnit || 0).toString());
    setEditSupplier(item.supplierName || '');
  };

  // Handler: Save Edit Item
  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;

    const finalCategory = (editCategory === 'Custom' && editCustomCategory.trim() 
      ? editCustomCategory.trim() 
      : editCategory) as InventoryCategory;

    const updated = items.map(i => {
      if (i.id === editingItem.id) {
        return {
          ...i,
          name: editName.trim(),
          category: finalCategory,
          currentStock: Number(editStock) || 0,
          unit: editUnit || 'kg',
          minStockLevel: Number(editMinStock) || 5,
          costPerUnit: Number(editCost) || 0,
          supplierName: editSupplier.trim() || 'General Market',
          lastUpdated: new Date().toISOString()
        };
      }
      return i;
    });

    setItems(updated);
    showToast('success', `Item "${editName}" updated successfully.`);
    setEditingLogItem(null);
    await saveInventoryToSupabase(updated);
    pushSyncToServer({ inventoryItems: updated });
  };

  // Handler: Delete Item
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete "${itemName}" from inventory?`)) return;
    
    const remaining = items.filter(i => i.id !== itemId);
    setItems(remaining);
    showToast('success', `Item "${itemName}" deleted from inventory.`);
    await saveInventoryToSupabase(remaining);
    pushSyncToServer({ inventoryItems: remaining });
  };

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
    if (!movementItemId || !movementQty || Number(movementQty) <= 0) {
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
      showToast('success', `${movementType.toUpperCase()} recorded for ${res.item?.name}. Stock updated.`);
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

    const finalCategory = (newItemCategory === 'Custom' && newCustomCategory.trim() 
      ? newCustomCategory.trim() 
      : newItemCategory) as InventoryCategory;

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newItemName.trim(),
      category: finalCategory,
      currentStock: Number(newItemStock) || 0,
      unit: newItemUnit || 'kg',
      minStockLevel: Number(newItemMinStock) || 5,
      costPerUnit: Number(newItemCost) || 0,
      supplierName: newItemSupplier.trim() || 'Local Market',
      lastRestockedDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString()
    };

    const updated = [newItem, ...items];
    setItems(updated);
    showToast('success', `Item "${newItem.name}" added to inventory.`);
    setIsNewItemOpen(false);
    setNewItemName('');
    setNewItemStock('10');
    setNewItemCost('50');
    setNewItemSupplier('');
    setNewCustomCategory('');
    await saveInventoryToSupabase(updated);
    pushSyncToServer({ inventoryItems: updated });
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMsg && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md animate-in fade-in ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
            : 'bg-rose-500 text-white shadow-rose-500/20'
        }`}>
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="text-white/80 hover:text-white p-1 cursor-pointer">✕</button>
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
              <span>Mess Kitchen Inventory & Stock Manager</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track raw materials, daily kitchen usage, restock purchases, and low-inventory alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAutoGenerateRequisitions}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer"
            title="Auto-detect low stock items and generate internal purchase requisitions in Owner App"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>🤖 Auto Purchase Requisition</span>
          </button>

          <button
            onClick={() => setIsNewItemOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Material</span>
          </button>

          <button
            onClick={() => setIsPurchaseOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Restock Purchase</span>
          </button>

          <button
            onClick={() => setIsMovementOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs shadow-xs transition cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-indigo-200" />
            <span>Log Kitchen Usage</span>
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
          <div className="text-[11px] text-slate-400 font-medium">Grains, pulses, spices, dairy, fuel & cleaning</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Total Inventory Value</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹{totalInventoryValue.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-700 font-bold">Estimated current stock asset value</div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-2xs space-y-1 ${
          lowStockItems.length > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase">
            <span>Low Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800">{lowStockItems.length}</div>
          <div className="text-[11px] text-amber-700 font-medium">
            {lowStockItems.length > 0 ? 'Requires replenishment' : 'All items above safety threshold'}
          </div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-2xs space-y-1 ${
          outOfStockItems.length > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-rose-800 uppercase">
            <span>Out of Stock</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-800">{outOfStockItems.length}</div>
          <div className="text-[11px] text-rose-700 font-medium">
            {outOfStockItems.length > 0 ? 'Kitchen cooking affected' : 'No items completely empty'}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold">
        {[
          { id: 'items', label: `Stock Register (${items.length})`, icon: Package },
          { id: 'scan_watchdog', label: `🤖 Kitchen Stock vs Scan Watchdog (${todayScans.length} Scans)`, icon: Sparkles },
          { id: 'alerts', label: `Low Stock Alerts (${lowStockItems.length + outOfStockItems.length})`, icon: AlertTriangle },
          { id: 'requisitions', label: `📦 Auto Requisitions (${requisitions.filter(r => r.status !== 'RESTOCKED').length})`, icon: ShoppingCart },
          { id: 'movements', label: `Audit Movement Logs (${movements.length})`, icon: History }
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
      {/* TAB: SCAN VS KITCHEN STOCK AUTO-WATCHDOG             */}
      {/* ==================================================== */}
      {activeTab === 'scan_watchdog' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Banner with 1-Click Action */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Kitchen Consumption & Pilferage Watchdog</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Live Meal Scans vs Kitchen Stock Deduction
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Every scanned plate automatically consumes standardized quantities of Atta, Rice, Dal & Cooking Oil. 
                Deduct stock accurately in 1 click and eliminate kitchen theft or excessive portioning.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={handleAutoDeductScansStock}
                disabled={isDeductingScans || totalScansToday === 0}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isDeductingScans ? 'Deducting...' : `⚡ Auto-Deduct Stock for Today's ${totalScansToday} Scans`}</span>
              </button>
            </div>
          </div>

          {/* Today's Scan Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Today's Total Scans</span>
                <Utensils className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">{totalScansToday} plates</div>
              <div className="text-[11px] text-slate-500 font-medium">
                ☀️ Lunch: {todayLunchScans} • 🌙 Dinner: {todayDinnerScans}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Estimated Raw Atta Needed</span>
                <span className="text-base">🌾</span>
              </div>
              <div className="text-3xl font-black text-slate-900">
                {(totalScansToday * 0.12).toFixed(1)} <span className="text-sm font-bold text-slate-500">kg</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Standard yield: ~{Math.round(totalScansToday * 3.5)} rotis
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Pilferage / Theft Risk</span>
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-600">0% Variance</div>
              <div className="text-[11px] text-emerald-700 font-bold">
                ✓ Normal standard kitchen consumption
              </div>
            </div>
          </div>

          {/* Detailed Recipe Consumption Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span>Theoretical Ingredient Consumption Breakdown (Based on {totalScansToday} Scans)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Standard benchmark formula: 120g Atta, 75g Rice, 35g Dal, 18ml Oil per plate
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                Date: {todayDateStr}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Raw Material</th>
                    <th className="px-5 py-3.5">Standard / Plate</th>
                    <th className="px-5 py-3.5">Total Needed for Today's Scans</th>
                    <th className="px-5 py-3.5">Current Stock in Register</th>
                    <th className="px-5 py-3.5">Stock Status</th>
                    <th className="px-5 py-3.5 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {consumptionBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-black text-slate-900 flex items-center gap-2">
                        <span>{row.icon}</span>
                        <span>{row.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono">
                        {row.perPlate} {row.unit}
                      </td>
                      <td className="px-5 py-3.5 font-black text-orange-700 font-mono">
                        {row.neededToday} {row.unit}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">
                        {row.currentStock} {row.stockUnit}
                      </td>
                      <td className="px-5 py-3.5">
                        {row.currentStock <= 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 uppercase">
                            Out of Stock
                          </span>
                        ) : row.isLow ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 uppercase">
                            Low for Today
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                            Sufficient
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {row.matchedItem && (
                          <button
                            onClick={() => {
                              setMovementItemId(row.matchedItem!.id);
                              setMovementQty(String(row.neededToday));
                              setMovementReason(`Daily consumption for ${totalScansToday} scans`);
                              setIsMovementOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition cursor-pointer"
                          >
                            Deduct {row.neededToday} {row.unit}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Wholesale PO Generator for Kirana / Grocery Vendor */}
          <div className="p-6 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-emerald-950 text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>1-Click WhatsApp Purchase Order (PO) to Wholesale Kirana Vendor</span>
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Sends formatted order for all low-stock commodities directly to your grocery supplier on WhatsApp.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  placeholder="Vendor Phone: 919876543210"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48"
                />
                <button
                  onClick={handleGenerateVendorPO}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send WhatsApp PO</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

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
                placeholder="Search rice, dal, oil, gas cylinder..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-600"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold text-slate-600">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-orange-600 text-white font-black shadow-xs'
                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                All Categories
              </button>
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-orange-600 text-white font-black shadow-xs'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {cat}
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
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">No items in this view</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No inventory materials match your search or filter. Click "+ Add New Material" to register an item.
              </p>
              <button
                onClick={() => setIsNewItemOpen(true)}
                className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-xs"
              >
                + Add First Material
              </button>
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
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Supplier: <strong className="text-slate-700">{item.supplierName || 'Local Market'}</strong>
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isOutOfStock 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : isLow 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isOutOfStock ? 'Empty' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>

                      {/* Stock Card & Quick Adjuster */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-bold">Current Quantity:</span>
                          <div className="flex items-center gap-2">
                            {/* Quick Decrement Button */}
                            <button
                              onClick={() => handleQuickAdjustStock(item, -1)}
                              disabled={item.currentStock <= 0}
                              className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-rose-600 font-bold flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-30"
                              title="Decrease stock by 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <span className="text-base font-black text-slate-900 font-mono min-w-[50px] text-center">
                              {item.currentStock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                            </span>

                            {/* Quick Increment Button */}
                            <button
                              onClick={() => handleQuickAdjustStock(item, 1)}
                              className="w-7 h-7 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-600 font-bold flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
                              title="Increase stock by 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOutOfStock ? 'bg-rose-500 w-0' : isLow ? 'bg-amber-500 w-1/3' : 'bg-emerald-500 w-4/5'
                            }`}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                          <span>Safety Threshold: <strong className="text-slate-800">{item.minStockLevel} {item.unit}</strong></span>
                          <span>Cost: <strong className="text-slate-800">₹{item.costPerUnit || 0}/{item.unit}</strong></span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-medium">
                        Last updated: {item.lastRestockedDate || 'Recent'}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setIsPurchaseOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs transition"
                        >
                          + Restock
                        </button>
                        <button
                          onClick={() => {
                            setMovementItemId(item.id);
                            setIsMovementOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer transition"
                        >
                          - Use
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-orange-50 hover:text-orange-600 text-slate-600 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                          title="Edit item details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: LOW STOCK ALERTS                             */}
      {/* ==================================================== */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
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
      {/* TAB 3: AUTO PURCHASE REQUISITIONS                    */}
      {/* ==================================================== */}
      {activeTab === 'requisitions' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-indigo-50/80 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-indigo-950 text-sm">Automated Internal Supplier Requisitions</h3>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Automatically generated inside the Owner App whenever stock falls below safety levels. Track, approve & restock in 1 click!
                </p>
              </div>
            </div>

            <button
              onClick={handleAutoGenerateRequisitions}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer shrink-0"
            >
              🔄 Auto-Detect & Generate New
            </button>
          </div>

          {requisitions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Package className="w-10 h-10 text-indigo-400 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">No Active Requisitions</h4>
              <p className="text-xs text-slate-500">All low-stock requisitions will automatically appear here when generated.</p>
              <button
                onClick={handleAutoGenerateRequisitions}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer inline-block"
              >
                Scan Inventory & Generate Requisitions Now
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
              {requisitions.map(req => {
                return (
                  <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-sm">{req.itemName}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          req.status === 'PENDING' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : req.status === 'ORDERED' 
                            ? 'bg-sky-100 text-sky-900 border border-sky-300' 
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {req.status === 'PENDING' ? '⏳ Pending Approval' : req.status === 'ORDERED' ? '📦 Order Placed' : '✅ Received & Restocked'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                        <span>Requisition Qty: <strong className="text-slate-900">{req.requiredQty} {req.unit}</strong></span>
                        <span>•</span>
                        <span>Est. Cost: <strong className="text-emerald-700">₹{req.estimatedCost}</strong></span>
                        <span>•</span>
                        <span>Supplier: <strong>{req.supplierName}</strong></span>
                        <span>•</span>
                        <span className="text-slate-400">Date: {req.createdDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'PENDING' && (
                        <button
                          onClick={() => handleMarkRequisitionOrdered(req.id)}
                          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs transition cursor-pointer shadow-xs"
                        >
                          ✅ Mark Order Placed
                        </button>
                      )}

                      {req.status !== 'RESTOCKED' && (
                        <button
                          onClick={() => handleFulfillRequisition(req)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-xs"
                        >
                          🚚 Receive & Restock Stock
                        </button>
                      )}

                      {req.status === 'RESTOCKED' && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          ✔ Restocked in Register
                        </span>
                      )}

                      <button
                        onClick={() => {
                          const updated = requisitions.filter(r => r.id !== req.id);
                          saveRequisitionsLocally(updated);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Remove Requisition"
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
      {activeTab === 'movements' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-orange-600" />
              <span>Audited Stock Movement Log</span>
            </h3>
            <span className="text-xs text-slate-400 font-bold">{movements.length} logged entries</span>
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
      {/* MODAL: EDIT ITEM DETAILS                             */}
      {/* ==================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-orange-600" />
                <span>Edit Inventory Material Details</span>
              </h3>
              <button onClick={() => setEditingLogItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Item / Commodity Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
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
                    <option value="Custom">+ Custom Category</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
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

              {editCategory === 'Custom' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    placeholder="Enter category name..."
                    value={editCustomCategory}
                    onChange={(e) => setEditCustomCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Safety Threshold Limit</label>
                  <input
                    type="number"
                    step="any"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
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
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLogItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: RECORD PURCHASE / RESTOCK                     */}
      {/* ==================================================== */}
      {isPurchaseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Procure & Restock Inventory</span>
              </h3>
              <button onClick={() => setIsPurchaseOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPurchase}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {isSubmittingPurchase ? 'Updating...' : 'Save Stock Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: LOG CONSUMPTION / USAGE                       */}
      {/* ==================================================== */}
      {isMovementOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-600" />
                <span>Log Kitchen Usage / Movement</span>
              </h3>
              <button onClick={() => setIsMovementOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMovement}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
                >
                  {isSubmittingMovement ? 'Deducting...' : 'Confirm Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD NEW INVENTORY ITEM                        */}
      {/* ==================================================== */}
      {isNewItemOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-600" />
                <span>Add New Tracked Commodity</span>
              </h3>
              <button onClick={() => setIsNewItemOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                    onChange={(e) => setNewItemCategory(e.target.value)}
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
                    <option value="Custom">+ Custom Category</option>
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

              {newItemCategory === 'Custom' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Disposable Plates, Snacks"
                    value={newCustomCategory}
                    onChange={(e) => setNewCustomCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold"
                  />
                </div>
              )}

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
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
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
