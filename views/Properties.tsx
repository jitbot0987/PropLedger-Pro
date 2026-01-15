
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Property, PropertyType, PaymentType, PaymentMethod, Payment, ExpenseCategory } from '../types';
import { Card, Button, Modal, FormInput, FormSelect, Badge, EmptyState } from '../components/UI';
import { formatPHP, getMonthKey, calculatePropertyFinancials } from '../services/financeEngine';
import { MapPin, Plus, Trash2, Edit2, DollarSign, FileMinus, CreditCard, Upload, Image as ImageIcon, Building2, TrendingUp, PieChart, Home, Briefcase, Factory, User, CheckCircle, TrendingDown, RefreshCcw } from 'lucide-react';

export const Properties = () => {
  const { properties, addProperty, deleteProperty, payments, addPayment } = useApp();
  
  // --- STATE ---
  
  // 1. Property Modal (Create & Edit)
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [propFormData, setPropFormData] = useState<Partial<Property>>({
    name: '',
    address: '',
    type: PropertyType.RESIDENTIAL,
    purchasePrice: 0,
    currentMarketValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    downPayment: 0,
    monthlyAmortization: 0,
    image: ''
  });

  // 2. Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [expenseFormData, setExpenseFormData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: 'Maintenance' as ExpenseCategory,
    method: PaymentMethod.CASH,
    note: ''
  });

  // 3. Equity Payment Modal
  const [isEquityModalOpen, setIsEquityModalOpen] = useState(false);
  const [equityFormData, setEquityFormData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: PaymentMethod.BANK_TRANSFER,
    note: 'Monthly Amortization'
  });

  // --- HANDLERS ---

  const openAddProperty = () => {
    setIsEditing(false);
    setPropFormData({
      name: '',
      address: '',
      type: PropertyType.RESIDENTIAL,
      purchasePrice: 0,
      currentMarketValue: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      downPayment: 0,
      monthlyAmortization: 0,
      image: ''
    });
    setIsPropModalOpen(true);
  };

  const openEditProperty = (prop: Property) => {
    setIsEditing(true);
    setPropFormData({ ...prop });
    setIsPropModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) {
        alert("File is too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPropFormData({ ...propFormData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateRandomImage = () => {
     // Generate a random Unsplash URL based on property type or random seed
     const keywords = propFormData.type ? propFormData.type.toLowerCase() : 'house';
     const randomSeed = Date.now();
     const url = `https://source.unsplash.com/featured/?${keywords},architecture&${randomSeed}`;
     // Note: source.unsplash.com redirects, so we use a stable placeholder service that supports keywords or just placehold.co if preferred for stability.
     // Let's use a reliable placeholder for now since Unsplash Source is deprecated/unreliable without API key.
     // Better alternative: picsum with seed.
     const randomId = Math.floor(Math.random() * 50) + 10;
     const stableUrl = `https://picsum.photos/id/${randomId}/600/400`;
     setPropFormData({ ...propFormData, image: stableUrl });
  };

  const handlePropSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && propFormData.id) {
        deleteProperty(propFormData.id);
    }

    const finalImage = propFormData.image || `https://placehold.co/600x400/e2e8f0/64748b?text=${encodeURIComponent(propFormData.name || 'Property')}`;

    const newProperty: Property = {
      id: isEditing && propFormData.id ? propFormData.id : `prop_${Date.now()}`,
      name: propFormData.name!,
      address: propFormData.address!,
      type: propFormData.type!,
      purchasePrice: Number(propFormData.purchasePrice),
      currentMarketValue: Number(propFormData.currentMarketValue) || Number(propFormData.purchasePrice), // Default to purchase price if empty
      purchaseDate: propFormData.purchaseDate!,
      image: finalImage,
      downPayment: Number(propFormData.downPayment),
      monthlyAmortization: Number(propFormData.monthlyAmortization)
    };
    
    addProperty(newProperty);
    setIsPropModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) {
      deleteProperty(id);
    }
  };

  // --- EXPENSE HANDLERS ---
  const openExpenseModal = (propId: string) => {
    setActivePropertyId(propId);
    setExpenseFormData({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'Maintenance',
      method: PaymentMethod.CASH,
      note: ''
    });
    setIsExpenseModalOpen(true);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePropertyId) return;

    const expense: Payment = {
      id: `exp_${Date.now()}`,
      propertyId: activePropertyId,
      amount: Number(expenseFormData.amount),
      date: expenseFormData.date,
      type: PaymentType.EXPENSE,
      method: expenseFormData.method,
      note: expenseFormData.note, // Note is now just the note
      expenseCategory: expenseFormData.category, // Explicit category saved here
      monthKey: getMonthKey(expenseFormData.date)
    };

    addPayment(expense);
    setIsExpenseModalOpen(false);
  };

  // --- EQUITY HANDLERS ---
  const openEquityModal = (propId: string, defaultAmort: number) => {
    setActivePropertyId(propId);
    setEquityFormData({
      amount: defaultAmort,
      date: new Date().toISOString().split('T')[0],
      method: PaymentMethod.BANK_TRANSFER,
      note: 'Monthly Amortization'
    });
    setIsEquityModalOpen(true);
  };

  const handleEquitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePropertyId) return;

    const payment: Payment = {
      id: `eq_${Date.now()}`,
      propertyId: activePropertyId,
      amount: Number(equityFormData.amount),
      date: equityFormData.date,
      type: PaymentType.EQUITY,
      method: equityFormData.method,
      note: equityFormData.note,
      monthKey: getMonthKey(equityFormData.date)
    };

    addPayment(payment);
    setIsEquityModalOpen(false);
  };

  const getTypeIcon = (type: PropertyType) => {
    switch(type) {
      case PropertyType.RESIDENTIAL: return Home;
      case PropertyType.COMMERCIAL: return Briefcase;
      case PropertyType.INDUSTRIAL: return Factory;
      case PropertyType.PERSONAL: return User;
      default: return Building2;
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Portfolio</h2>
          <p className="text-slate-500">Manage your real estate assets and financing.</p>
        </div>
        <Button onClick={openAddProperty}>
          <Plus size={16} className="inline mr-2" /> Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <EmptyState 
          title="No Properties Yet" 
          description="Your portfolio is empty. Add your first investment property to start tracking financing and rent."
          icon={Building2}
          action={{ label: "Add First Property", onClick: openAddProperty }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map(prop => {
            const TypeIcon = getTypeIcon(prop.type);
            
            // Use Centralized Financial Logic
            const { 
              isPersonal, 
              totalEquityPaid, 
              remainingBalance, 
              percentPaid, 
              isFullyPaid, 
              netIncome, 
              roi, 
              capRate,
              valuationDelta 
            } = calculatePropertyFinancials(prop, payments);

            return (
              <Card key={prop.id} className="group hover:shadow-md transition-all flex flex-col h-full">
                <div className="h-44 overflow-hidden relative shrink-0 bg-slate-100">
                  <img src={prop.image} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 right-4">
                    <Badge type={isPersonal ? 'neutral' : 'neutral'} text={prop.type} />
                  </div>
                  <div className="absolute top-4 left-4 flex gap-2">
                     <button 
                      onClick={(e) => { e.stopPropagation(); openEditProperty(prop); }}
                      className="p-2 bg-white/90 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-colors shadow-sm"
                      title="Edit Property"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(prop.id, prop.name); }}
                      className="p-2 bg-white/90 text-rose-600 rounded-full hover:bg-rose-600 hover:text-white transition-colors shadow-sm"
                      title="Delete Property"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {/* Valuation Delta Badge */}
                  {valuationDelta !== 0 && (
                    <div className={`absolute bottom-2 right-2 px-2 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1 ${valuationDelta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {valuationDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {formatPHP(Math.abs(valuationDelta))}
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1 flex items-center gap-2">
                      <TypeIcon size={18} className="text-slate-400" />
                      {prop.name}
                    </h3>
                    <div className="flex gap-1 shrink-0">
                      {!isFullyPaid && (
                      <button 
                          onClick={() => openEquityModal(prop.id, prop.monthlyAmortization)}
                          className="text-xs flex items-center gap-1 text-slate-600 hover:text-emerald-600 font-bold px-2 py-1 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                          title="Pay Mortgage/Equity"
                      >
                          <CreditCard size={12} /> Pay
                      </button>
                      )}
                      <button 
                          onClick={() => openExpenseModal(prop.id)}
                          className="text-xs flex items-center gap-1 text-slate-600 hover:text-rose-600 font-bold px-2 py-1 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                          title="Record Expense"
                      >
                          <FileMinus size={12} /> Exp
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center text-slate-500 text-sm mb-4">
                    <MapPin size={14} className="mr-1" />
                    <span className="truncate">{prop.address}</span>
                  </div>
                  
                  {/* KPI Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                       <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                         {isPersonal ? 'Net Expense' : 'Net Income'}
                       </div>
                       <div className={`text-xs font-bold ${netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatPHP(netIncome)}
                       </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                       <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                         {isPersonal ? 'Gain ROI' : 'Yield ROI'}
                       </div>
                       <div className={`text-xs font-bold ${roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {roi > 0 && '+'}{roi.toFixed(1)}%
                       </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                       <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                         {isPersonal ? 'Value Delta' : 'Cap Rate'}
                       </div>
                       <div className="text-xs font-bold text-indigo-600">
                         {isPersonal ? (
                            valuationDelta >= 0 ? `+${formatPHP(valuationDelta)}` : formatPHP(valuationDelta)
                         ) : (
                            `${capRate.toFixed(1)}%`
                         )}
                       </div>
                    </div>
                  </div>

                  {/* Equity Section */}
                  <div className={`rounded-xl p-4 mt-auto border relative overflow-hidden transition-colors ${isFullyPaid ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    {isFullyPaid ? (
                       <CheckCircle className="absolute -right-3 -bottom-3 text-emerald-500 opacity-10" size={80} />
                    ) : (
                       <PieChart className="absolute -right-2 -bottom-2 text-slate-200 opacity-20" size={64} />
                    )}

                    <div className="flex justify-between items-end mb-2 relative z-10">
                      <div>
                         <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isFullyPaid ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isFullyPaid ? 'Ownership Status' : 'Equity Progress'}
                         </span>
                         <div className={`text-lg font-bold leading-none mt-0.5 ${isFullyPaid ? 'text-emerald-700' : 'text-slate-800'}`}>
                             {isFullyPaid ? 'Fully Paid' : `${percentPaid.toFixed(1)}%`}
                         </div>
                      </div>
                      {!isFullyPaid && (
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Purchase Price</span>
                            <div className="text-xs font-medium text-slate-600">{formatPHP(prop.purchasePrice)}</div>
                        </div>
                      )}
                    </div>
                    
                    {!isFullyPaid && (
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mb-3 overflow-hidden shadow-inner relative z-10">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out shadow-sm" 
                        style={{ width: `${percentPaid}%` }}
                      ></div>
                    </div>
                    )}

                    <div className={`grid grid-cols-2 gap-4 relative z-10 pt-2 border-t ${isFullyPaid ? 'border-emerald-200' : 'border-slate-200/60'} ${isFullyPaid ? 'mt-2' : ''}`}>
                      <div>
                        <p className={`text-[10px] font-semibold uppercase mb-0.5 ${isFullyPaid ? 'text-emerald-600' : 'text-slate-500'}`}>Total Paid</p>
                        <p className="text-xs font-bold text-emerald-600 font-mono tracking-tight">{formatPHP(totalEquityPaid)}</p>
                      </div>
                      <div className="text-right">
                         <p className={`text-[10px] font-semibold uppercase mb-0.5 ${isFullyPaid ? 'text-emerald-600' : 'text-slate-500'}`}>
                             {isFullyPaid ? 'Asset Value' : 'Remaining Bal.'}
                         </p>
                         <p className={`text-xs font-bold font-mono tracking-tight ${isFullyPaid ? 'text-emerald-700' : 'text-rose-600'}`}>
                             {isFullyPaid ? formatPHP(prop.currentMarketValue || prop.purchasePrice) : formatPHP(remainingBalance)}
                         </p>
                      </div>
                    </div>
                  </div>

                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* --- ADD/EDIT PROPERTY MODAL --- */}
      <Modal isOpen={isPropModalOpen} onClose={() => setIsPropModalOpen(false)} title={isEditing ? "Edit Asset" : "New Property Asset"}>
        <form onSubmit={handlePropSubmit}>
          <div className="space-y-4">
            <FormInput 
              label="Property Name" 
              placeholder="e.g. Sunset Heights" 
              value={propFormData.name}
              onChange={e => setPropFormData({...propFormData, name: e.target.value})}
              required
            />
            <FormInput 
              label="Address" 
              placeholder="Full Address" 
              value={propFormData.address}
              onChange={e => setPropFormData({...propFormData, address: e.target.value})}
              required
            />
            
            {/* Image Upload/Generator Section */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Property Image</label>
              <div className="flex gap-2 items-center">
                 <div className="relative flex-1">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                     <ImageIcon size={16} />
                   </div>
                   <input 
                      type="text" 
                      placeholder="Paste URL or upload file ->" 
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      value={propFormData.image}
                      onChange={e => setPropFormData({...propFormData, image: e.target.value})}
                   />
                 </div>
                 <div className="relative flex gap-1">
                    <Button type="button" variant="secondary" className="px-3" title="Generate Random Image" onClick={generateRandomImage}>
                        <RefreshCcw size={18} />
                    </Button>
                    <div className="relative overflow-hidden w-[42px] h-[38px]">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={handleImageUpload}
                        />
                        <Button type="button" variant="secondary" className="px-3 w-full h-full" title="Upload Image">
                          <Upload size={18} />
                        </Button>
                    </div>
                 </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">Supported: URL or File Upload (Max 2MB)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormSelect 
                label="Type"
                options={[
                  { label: 'Residential', value: PropertyType.RESIDENTIAL },
                  { label: 'Commercial', value: PropertyType.COMMERCIAL },
                  { label: 'Industrial', value: PropertyType.INDUSTRIAL },
                  { label: 'Personal Use', value: PropertyType.PERSONAL },
                ]}
                value={propFormData.type}
                onChange={e => setPropFormData({...propFormData, type: e.target.value as PropertyType})}
              />
              <FormInput 
                label="Acquisition Date" 
                type="date"
                value={propFormData.purchaseDate}
                onChange={e => setPropFormData({...propFormData, purchaseDate: e.target.value})}
                required
              />
            </div>
            
            {/* Financing Section */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-slate-800">
                <div className="p-1.5 bg-white rounded-md shadow-sm text-indigo-600 border border-slate-100">
                  <DollarSign size={18} />
                </div>
                <h4 className="font-bold text-sm">Acquisition & Financing</h4>
              </div>
              
              <div className="mb-4">
                 <FormInput 
                  label="Total Contract Price (PHP)" 
                  type="number"
                  min="0"
                  step="0.01"
                  value={propFormData.purchasePrice}
                  onChange={e => setPropFormData({...propFormData, purchasePrice: Number(e.target.value)})}
                  required
                  placeholder="0.00"
                />
              </div>

              {/* Explicit Market Value Field */}
              <div className="mb-4">
                 <FormInput 
                  label="Current Market Valuation (PHP)" 
                  type="number"
                  min="0"
                  step="0.01"
                  value={propFormData.currentMarketValue}
                  onChange={e => setPropFormData({...propFormData, currentMarketValue: Number(e.target.value)})}
                  placeholder="0.00"
                />
                 <p className="text-[10px] text-slate-400 -mt-2 ml-1">
                    Leave blank to use Purchase Price. Updated valuation is used for ROI & Portfolio stats.
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormInput 
                    label="Down Payment / Equity" 
                    type="number"
                    min="0"
                    step="0.01"
                    value={propFormData.downPayment}
                    onChange={e => setPropFormData({...propFormData, downPayment: Number(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <FormInput 
                    label="Monthly Amortization" 
                    type="number"
                    min="0"
                    step="0.01"
                    value={propFormData.monthlyAmortization}
                    onChange={e => setPropFormData({...propFormData, monthlyAmortization: Number(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsPropModalOpen(false)}>Cancel</Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Create Asset"}</Button>
          </div>
        </form>
      </Modal>

      {/* --- ADD EXPENSE MODAL --- */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Record Property Expense">
        <form onSubmit={handleExpenseSubmit}>
           <div className="mb-4 p-3 bg-rose-50 rounded-lg border border-rose-100 text-rose-800 text-sm flex items-start">
              <FileMinus className="shrink-0 mr-2 mt-0.5" size={16} />
              <p>Expenses are deducted from this property's Net Income. They are not assigned to a specific tenant.</p>
           </div>

           <FormInput 
              label="Amount (PHP)" 
              type="number" 
              value={expenseFormData.amount}
              onChange={e => setExpenseFormData({...expenseFormData, amount: Number(e.target.value)})}
              autoFocus
              required
           />
           
           <div className="grid grid-cols-2 gap-4">
             <FormInput 
                label="Date" 
                type="date" 
                value={expenseFormData.date}
                onChange={e => setExpenseFormData({...expenseFormData, date: e.target.value})}
                required
             />
             <FormSelect
                label="Payment Method"
                options={[
                  { label: 'Cash', value: PaymentMethod.CASH },
                  { label: 'Bank Transfer', value: PaymentMethod.BANK_TRANSFER },
                  { label: 'Credit Card', value: PaymentMethod.OTHER },
                ]}
                value={expenseFormData.method}
                onChange={e => setExpenseFormData({...expenseFormData, method: e.target.value as PaymentMethod})}
             />
           </div>

           <div className="grid grid-cols-2 gap-4">
             <FormSelect
                label="Expense Category"
                options={[
                  { label: 'Maintenance / Repair', value: 'Maintenance' },
                  { label: 'Property Tax', value: 'Tax' },
                  { label: 'Insurance', value: 'Insurance' },
                  { label: 'Utilities', value: 'Utilities' },
                  { label: 'Mortgage Payment', value: 'Mortgage' },
                  { label: 'HOA Dues', value: 'HOA' },
                  { label: 'Marketing/Ads', value: 'Marketing' },
                  { label: 'Legal/Prof. Fees', value: 'Legal' },
                  { label: 'Other', value: 'Other' },
                ]}
                value={expenseFormData.category}
                onChange={e => setExpenseFormData({...expenseFormData, category: e.target.value as ExpenseCategory})}
             />
             <FormInput 
                label="Note (Optional)" 
                placeholder="e.g. Fixed roof leak"
                value={expenseFormData.note}
                onChange={e => setExpenseFormData({...expenseFormData, note: e.target.value})}
             />
           </div>

           <div className="flex justify-end gap-3 mt-6">
             <Button type="button" variant="secondary" onClick={() => setIsExpenseModalOpen(false)}>Cancel</Button>
             <Button type="submit" variant="danger">Record Expense</Button>
           </div>
        </form>
      </Modal>

      {/* --- PAY EQUITY MODAL --- */}
      <Modal isOpen={isEquityModalOpen} onClose={() => setIsEquityModalOpen(false)} title="Record Equity/Mortgage Payment">
        <form onSubmit={handleEquitySubmit}>
           <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-800 text-sm flex items-start">
              <CreditCard className="shrink-0 mr-2 mt-0.5" size={16} />
              <p>This payment will increase your <strong>Equity</strong> and reduce your <strong>Remaining Balance</strong> for this property.</p>
           </div>

           <FormInput 
              label="Amount Paid (PHP)" 
              type="number" 
              value={equityFormData.amount}
              onChange={e => setEquityFormData({...equityFormData, amount: Number(e.target.value)})}
              autoFocus
              required
           />
           
           <div className="grid grid-cols-2 gap-4">
             <FormInput 
                label="Date" 
                type="date" 
                value={equityFormData.date}
                onChange={e => setEquityFormData({...equityFormData, date: e.target.value})}
                required
             />
             <FormSelect
                label="Payment Method"
                options={[
                  { label: 'Bank Transfer', value: PaymentMethod.BANK_TRANSFER },
                  { label: 'Cheque', value: PaymentMethod.CHEQUE },
                  { label: 'Cash', value: PaymentMethod.CASH },
                  { label: 'Other', value: PaymentMethod.OTHER },
                ]}
                value={equityFormData.method}
                onChange={e => setEquityFormData({...equityFormData, method: e.target.value as PaymentMethod})}
             />
           </div>
           
           <FormInput 
              label="Note / Reference" 
              placeholder="e.g. Feb 2024 Amortization"
              value={equityFormData.note}
              onChange={e => setEquityFormData({...equityFormData, note: e.target.value})}
           />

           <div className="flex justify-end gap-3 mt-6">
             <Button type="button" variant="secondary" onClick={() => setIsEquityModalOpen(false)}>Cancel</Button>
             <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirm Payment</Button>
           </div>
        </form>
      </Modal>

    </div>
  );
};
