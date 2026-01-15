
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Tenant, Payment, PaymentType, RentInstallment, PaymentMethod } from '../types';
import { Card, Button, Modal, FormInput, FormSelect, Badge } from '../components/UI';
import { generateLedger, formatPHP, getMonthKey, calculateMoveOutFinancials } from '../services/financeEngine';
import { Plus, Wallet, FileText, Smartphone, CreditCard, Banknote, ScrollText, ArrowLeft, MoreHorizontal, User, Trash2, Clock, AlertTriangle, Edit2, Landmark, LogOut, CheckCircle, Calculator } from 'lucide-react';

export const Tenants = () => {
  const { tenants, properties, payments, addTenant, updateTenant, deleteTenant, addPayment, updatePayment, deletePayment } = useApp();
  
  // Navigation State: 'list' or 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  // Modal State
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isEditingTenant, setIsEditingTenant] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  
  // --- MOVE OUT WIZARD STATE ---
  const [isMoveOutModalOpen, setIsMoveOutModalOpen] = useState(false);
  const [moveOutData, setMoveOutData] = useState({
      terminationDate: new Date().toISOString().split('T')[0],
      deductions: 0,
      deductionReason: 'Cleaning / Repairs',
      processRefund: true
  });

  // Forms
  const [tenantFormData, setTenantFormData] = useState<Partial<Tenant>>({ 
    rentDueDay: 1, 
    rentAmount: 0,
    status: 'active'
  });
  
  // Payment Form State (Dual purpose: Add or Edit)
  const [paymentForm, setPaymentForm] = useState<Partial<Payment>>({ 
    amount: 0, 
    date: new Date().toISOString().split('T')[0],
    method: PaymentMethod.CASH
  });
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  // --- DERIVED DATA ---
  const activeTenant = useMemo(() => tenants.find(t => t.id === activeTenantId), [tenants, activeTenantId]);
  
  const ledger = useMemo(() => {
    if (!activeTenant) return [];
    return generateLedger(activeTenant, payments);
  }, [activeTenant, payments]);

  const moveOutFinancials = useMemo(() => {
    if (!activeTenant) return { depositHeld: 0, unpaidRent: 0, netRefundable: 0 };
    return calculateMoveOutFinancials(activeTenant, payments);
  }, [activeTenant, payments]);

  // --- ACTIONS ---
  const handleOpenLedger = (tenantId: string) => {
    setActiveTenantId(tenantId);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setActiveTenantId(null);
  };

  // --- TENANT CRUD HANDLERS ---
  const openRegisterTenant = () => {
    setIsEditingTenant(false);
    setTenantFormData({
      propertyId: properties[0]?.id || '',
      rentDueDay: 1,
      rentAmount: 0,
      status: 'active',
      leaseStart: new Date().toISOString().split('T')[0]
    });
    setIsTenantModalOpen(true);
  };

  const openEditTenant = (tenant: Tenant) => {
    setIsEditingTenant(true);
    setTenantFormData({ ...tenant });
    setIsTenantModalOpen(true);
  };

  const handleTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantFormData.propertyId || !tenantFormData.name) return;
    
    const tenantData = {
      ...tenantFormData,
      rentAmount: Number(tenantFormData.rentAmount),
      rentDueDay: Number(tenantFormData.rentDueDay),
    } as Tenant;

    if (isEditingTenant && tenantData.id) {
      updateTenant(tenantData);
    } else {
      addTenant({
        ...tenantData,
        id: `ten_${Date.now()}`,
      });
    }
    setIsTenantModalOpen(false);
  };

  const handleDeleteTenant = (id: string, name: string) => {
    if (window.confirm(`PERMANENT DELETE: Are you sure you want to delete "${name}"? \n\nThis will orphan their payment records. Only do this if the entry was a mistake. \n\nTo end a lease normally, use the "Move Out" button in the Ledger view.`)) {
      deleteTenant(id);
      if (activeTenantId === id) handleBackToList();
    }
  };

  // --- MOVE OUT HANDLERS ---
  const openMoveOutModal = () => {
      setMoveOutData({
          terminationDate: new Date().toISOString().split('T')[0],
          deductions: 0,
          deductionReason: 'Cleaning / Repairs',
          processRefund: true
      });
      setIsMoveOutModalOpen(true);
  };

  const handleMoveOutSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeTenant) return;

      const { netRefundable } = moveOutFinancials;
      const finalRefundAmount = netRefundable - Number(moveOutData.deductions);

      // 1. Process Deduction/Refund as Transactions
      if (moveOutData.processRefund) {
          if (finalRefundAmount > 0) {
              // Tenant gets money back -> Record as Expense (Refund)
              addPayment({
                  id: `ref_${Date.now()}`,
                  tenantId: activeTenant.id,
                  propertyId: activeTenant.propertyId,
                  amount: finalRefundAmount,
                  date: moveOutData.terminationDate,
                  type: PaymentType.EXPENSE,
                  method: PaymentMethod.CASH,
                  note: `Security Deposit Refund (Lease End)`
              });
          } else if (finalRefundAmount < 0) {
              // Tenant owes money -> Record as Income (Settlement)
              addPayment({
                  id: `set_${Date.now()}`,
                  tenantId: activeTenant.id,
                  propertyId: activeTenant.propertyId,
                  amount: Math.abs(finalRefundAmount),
                  date: moveOutData.terminationDate,
                  type: PaymentType.RENT,
                  method: PaymentMethod.CASH,
                  note: `Final Settlement Payment (Lease End)`
              });
          }
      }

      // 2. Record Deductions as Income (if any) to balance the Deposit
      if (Number(moveOutData.deductions) > 0) {
         // The deposit was money held. If we keep it for repairs, it effectively becomes income to cover the repair expense.
         addPayment({
            id: `ded_${Date.now()}`,
            tenantId: activeTenant.id,
            propertyId: activeTenant.propertyId,
            amount: Number(moveOutData.deductions),
            date: moveOutData.terminationDate,
            type: PaymentType.EXPENSE, // Actually, usually we spend this money on repairs, so let's log the deduction note.
            method: PaymentMethod.OTHER,
            note: `Deposit Deduction: ${moveOutData.deductionReason}`
         });
      }

      // 3. Archive Tenant
      updateTenant({
          ...activeTenant,
          status: 'past',
          leaseEnd: moveOutData.terminationDate
      });

      setIsMoveOutModalOpen(false);
  };

  // --- PAYMENT HANDLER (ADD & UPDATE) ---
  const openAddPayment = () => {
    setEditingPaymentId(null);
    setPaymentForm({
        amount: activeTenant?.rentAmount || 0,
        date: new Date().toISOString().split('T')[0],
        method: PaymentMethod.CASH
    });
    setIsPaymentOpen(true);
  };

  const openEditPayment = (payment: Payment) => {
    setEditingPaymentId(payment.id);
    setPaymentForm({ ...payment });
    setIsPaymentOpen(true);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (window.confirm("Are you sure you want to remove this payment record?")) {
        deletePayment(paymentId);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;

    const monthKey = getMonthKey(paymentForm.date!);

    if (editingPaymentId) {
        // UPDATE MODE
        updatePayment({
            ...paymentForm,
            id: editingPaymentId,
            propertyId: activeTenant.propertyId,
            tenantId: activeTenant.id,
            type: PaymentType.RENT, // Ensure type stays correct
            monthKey
        } as Payment);
    } else {
        // ADD MODE
        addPayment({
            id: `pay_${Date.now()}`,
            tenantId: activeTenant.id,
            propertyId: activeTenant.propertyId,
            amount: Number(paymentForm.amount),
            date: paymentForm.date!,
            type: PaymentType.RENT,
            method: paymentForm.method || PaymentMethod.CASH,
            monthKey
        } as Payment);
    }
    
    setIsPaymentOpen(false);
  };

  // --- HELPER COMPONENTS ---
  const StatusBadge = ({ status }: { status: RentInstallment['status'] }) => {
    switch (status) {
      case 'paid': return <Badge type="success" text="Paid" />;
      case 'overdue': return <Badge type="danger" text="Overdue" />;
      case 'partial': return <Badge type="warning" text="Partial" />;
      default: return <Badge type="neutral" text="Pending" />;
    }
  };

  const MethodIcon = ({ method }: { method: PaymentMethod }) => {
    switch (method) {
      case PaymentMethod.GCASH: return <Smartphone size={16} className="text-blue-500" />;
      case PaymentMethod.BANK_TRANSFER: return <Landmark size={16} className="text-indigo-500" />;
      case PaymentMethod.CHEQUE: return <ScrollText size={16} className="text-amber-600" />;
      case PaymentMethod.CASH: return <Banknote size={16} className="text-emerald-500" />;
      default: return <Wallet size={16} className="text-slate-400" />;
    }
  };

  // Helper for Lease Status Notification
  const getLeaseStatus = (leaseEnd?: string, status?: string) => {
    if (status === 'past') return { status: 'past', label: 'Moved Out' };
    if (!leaseEnd) return null;
    
    const end = new Date(leaseEnd);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', days: Math.abs(diffDays) };
    if (diffDays <= 30) return { status: 'expiring', days: diffDays };
    return null;
  };

  // --- VIEW: TENANT LIST (TABLE) ---
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Tenant Management</h2>
            <p className="text-slate-500">Overview of active and past leases.</p>
          </div>
          <Button onClick={openRegisterTenant}>
            <Plus size={16} className="inline mr-2" /> Register Tenant
          </Button>
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant Name</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Property</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Rent</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map(t => {
                const propertyName = properties.find(p => p.id === t.propertyId)?.name || 'Unknown Property';
                const leaseStatus = getLeaseStatus(t.leaseEnd, t.status);

                return (
                  <tr key={t.id} className={`hover:bg-slate-50 group transition-colors ${t.status === 'past' ? 'bg-slate-50/50 opacity-70' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${t.status === 'past' ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-700'}`}>
                          {t.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-slate-900 block">{t.name}</span>
                          
                          {/* Lease Expiration Warning */}
                          {leaseStatus?.status === 'expiring' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md mt-0.5 border border-amber-100">
                               <Clock size={10} /> Expires in {leaseStatus.days} days
                            </span>
                          )}
                          {leaseStatus?.status === 'expired' && t.status !== 'past' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md mt-0.5 border border-rose-100">
                               <AlertTriangle size={10} /> Expired {leaseStatus.days} days ago
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{propertyName}</td>
                    <td className="p-4">
                       {t.status === 'active' 
                         ? <Badge type="success" text="Active" /> 
                         : <Badge type="neutral" text="Moved Out" />
                       }
                    </td>
                    <td className="p-4 text-sm font-mono text-slate-900 text-right">{formatPHP(t.rentAmount)}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-3">
                      <button 
                        onClick={() => handleOpenLedger(t.id)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Manage Ledger
                      </button>
                      <div className="h-4 w-px bg-slate-200"></div>
                      <button 
                        onClick={() => openEditTenant(t)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        title="Edit Details"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No tenants found. Click "Register Tenant" to add one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Add/Edit Tenant Modal */}
        <Modal isOpen={isTenantModalOpen} onClose={() => setIsTenantModalOpen(false)} title={isEditingTenant ? "Edit Lease Details" : "Register Tenant"}>
          <form onSubmit={handleTenantSubmit}>
            <FormSelect
              label="Property Unit"
              options={properties.map(p => ({ label: p.name, value: p.id }))}
              value={tenantFormData.propertyId}
              onChange={e => setTenantFormData({...tenantFormData, propertyId: e.target.value})}
              required
            />
            <FormInput label="Full Name" value={tenantFormData.name || ''} onChange={e => setTenantFormData({...tenantFormData, name: e.target.value})} required />
            <FormInput label="Email" type="email" value={tenantFormData.email || ''} onChange={e => setTenantFormData({...tenantFormData, email: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Monthly Rent (PHP)" type="number" value={tenantFormData.rentAmount || 0} onChange={e => setTenantFormData({...tenantFormData, rentAmount: Number(e.target.value)})} required />
              <FormInput label="Due Day (1-28)" type="number" min="1" max="28" value={tenantFormData.rentDueDay || 1} onChange={e => setTenantFormData({...tenantFormData, rentDueDay: Number(e.target.value)})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <FormInput label="Lease Start Date" type="date" value={tenantFormData.leaseStart || ''} onChange={e => setTenantFormData({...tenantFormData, leaseStart: e.target.value})} required />
               <FormInput label="Lease End Date (Optional)" type="date" value={tenantFormData.leaseEnd || ''} onChange={e => setTenantFormData({...tenantFormData, leaseEnd: e.target.value})} />
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="secondary" onClick={() => setIsTenantModalOpen(false)}>Cancel</Button>
              <Button type="submit">{isEditingTenant ? "Update Tenant" : "Add Tenant"}</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // --- VIEW: TENANT LEDGER DETAIL ---
  if (!activeTenant) return null;

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-200">
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <button onClick={handleBackToList} className="p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {activeTenant.name}
              {activeTenant.status === 'active' 
                  ? <Badge type="success" text="Active" /> 
                  : <Badge type="neutral" text="Moved Out" />
              }
            </h2>
            <p className="text-slate-500 text-sm">Tenant Ledger • {properties.find(p => p.id === activeTenant.propertyId)?.name}</p>
          </div>
        </div>
        
        <div className="flex gap-2 self-end md:self-auto">
          {activeTenant.status === 'active' && (
              <>
                <Button variant="danger" onClick={openMoveOutModal} className="bg-rose-50 text-rose-600 border border-rose-100 shadow-none hover:bg-rose-600 hover:text-white text-xs sm:text-sm">
                    <LogOut size={16} className="inline mr-1 sm:mr-2" /> 
                    <span className="hidden sm:inline">End Lease / </span>Move Out
                </Button>
                <Button onClick={openAddPayment} className="text-xs sm:text-sm">
                    <Wallet size={16} className="inline mr-1 sm:mr-2" /> Record Pay
                </Button>
              </>
          )}
          {activeTenant.status === 'past' && (
              <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-500 font-medium flex items-center gap-2">
                  <CheckCircle size={16} /> Lease Closed
              </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEDGER TABLE (Main) */}
        <Card className="lg:col-span-2 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <FileText size={16} /> Payment History & Obligations
             </h3>
             <span className="text-xs text-slate-400 hidden sm:inline">FIFO Logic Applied</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount Due</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Paid</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-4 text-sm font-medium text-slate-900">{row.monthKey}</td>
                    <td className="p-4 text-sm text-slate-500">{new Date(row.dueDate).toLocaleDateString()}</td>
                    <td className="p-4 text-sm text-slate-900 font-mono text-right">{formatPHP(row.amountDue)}</td>
                    <td className="p-4 text-sm font-mono text-right">
                      <span className={row.amountPaid >= row.amountDue ? 'text-emerald-600' : 'text-slate-600'}>
                        {formatPHP(row.amountPaid)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">No ledger history available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* SIDEBAR: INFO & RECENT TRANSACTIONS */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Lease Details</h4>
              <button 
                onClick={() => openEditTenant(activeTenant)} 
                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
              >
                 <Edit2 size={12} /> Edit
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Monthly Rent</span>
                <span className="font-medium text-slate-900">{formatPHP(activeTenant.rentAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Due Day</span>
                <span className="font-medium text-slate-900">{activeTenant.rentDueDay}th of month</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lease Start</span>
                <span className="font-medium text-slate-900">{activeTenant.leaseStart}</span>
              </div>
               <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lease End</span>
                <span className="font-medium text-slate-900">{activeTenant.leaseEnd || 'Month-to-Month'}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-2">
                 <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-700">Balance Due</span>
                    <span className="font-bold text-rose-600">
                       {formatPHP(ledger.reduce((acc, row) => acc + (row.amountDue - row.amountPaid), 0))}
                    </span>
                 </div>
              </div>
              <div className="flex justify-between text-sm mt-1">
                 <span className="font-bold text-slate-700">Deposit Held</span>
                 <span className="font-bold text-emerald-600">
                    {formatPHP(moveOutFinancials.depositHeld)}
                 </span>
              </div>
            </div>
            
            {/* Danger Zone for Active Tenants */}
             {activeTenant.status === 'active' && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => handleDeleteTenant(activeTenant.id, activeTenant.name)}
                        className="w-full text-center text-xs text-slate-400 hover:text-rose-600 transition-colors"
                    >
                        Force Delete (Correct Mistake)
                    </button>
                </div>
             )}
          </Card>

          <Card className="p-0 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h4 className="text-sm font-bold text-slate-700">Raw Transactions</h4>
             </div>
             <div className="max-h-[300px] overflow-y-auto">
                {payments
                    .filter(p => p.tenantId === activeTenant.id)
                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(pay => (
                      <div key={pay.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 flex items-center justify-between group">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded">
                              <MethodIcon method={pay.method} />
                            </div>
                            <div>
                               <p className="text-xs font-bold text-slate-700">{pay.date}</p>
                               <p className="text-[10px] text-slate-500 uppercase">{pay.method}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                             <span className={`text-sm font-mono font-bold ${pay.type === PaymentType.EXPENSE ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {pay.type === PaymentType.EXPENSE ? '-' : '+'}{formatPHP(pay.amount)}
                             </span>
                             {/* Only allow edit/delete if tenant is active, or if user really needs to fix history */}
                             <div className="hidden group-hover:flex gap-1">
                                <button onClick={() => openEditPayment(pay)} className="text-slate-400 hover:text-indigo-600">
                                   <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeletePayment(pay.id)} className="text-slate-400 hover:text-rose-600">
                                   <Trash2 size={14} />
                                </button>
                             </div>
                         </div>
                      </div>
                    ))
                }
                {payments.filter(p => p.tenantId === activeTenant.id).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">No payments recorded.</div>
                )}
             </div>
          </Card>
        </div>
      </div>

      {/* MOVE OUT WIZARD MODAL */}
      <Modal isOpen={isMoveOutModalOpen} onClose={() => setIsMoveOutModalOpen(false)} title={`End Lease: ${activeTenant.name}`}>
         <form onSubmit={handleMoveOutSubmit}>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-sm">
                <div className="flex justify-between mb-2">
                    <span className="text-slate-500">Deposit Held:</span>
                    <span className="font-bold text-emerald-600">{formatPHP(moveOutFinancials.depositHeld)}</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span className="text-slate-500">Unpaid Rent:</span>
                    <span className="font-bold text-rose-600">-{formatPHP(moveOutFinancials.unpaidRent)}</span>
                </div>
                <div className="border-t border-slate-200 my-2"></div>
                <div className="flex justify-between text-base">
                    <span className="font-bold text-slate-700">Gross Refundable:</span>
                    <span className="font-bold text-indigo-700">{formatPHP(moveOutFinancials.netRefundable)}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormInput 
                    label="Move Out Date"
                    type="date"
                    value={moveOutData.terminationDate}
                    onChange={(e) => setMoveOutData({...moveOutData, terminationDate: e.target.value})}
                    required
                />
                <FormInput 
                    label="Deductions (Cleaning/Repairs)"
                    type="number"
                    value={moveOutData.deductions}
                    onChange={(e) => setMoveOutData({...moveOutData, deductions: Number(e.target.value)})}
                />
            </div>
            
            {Number(moveOutData.deductions) > 0 && (
                <FormInput 
                    label="Reason for Deduction"
                    placeholder="e.g. Broken window, deep cleaning"
                    value={moveOutData.deductionReason}
                    onChange={(e) => setMoveOutData({...moveOutData, deductionReason: e.target.value})}
                    required
                />
            )}

            <div className="flex items-center gap-3 mb-6 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                 <input 
                    type="checkbox" 
                    id="processRefund"
                    checked={moveOutData.processRefund}
                    onChange={(e) => setMoveOutData({...moveOutData, processRefund: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                 />
                 <label htmlFor="processRefund" className="text-sm text-indigo-900 cursor-pointer select-none">
                    Auto-generate Refund/Settlement Transaction?
                 </label>
            </div>

            <div className="text-right mb-6">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Final Net Refund to Tenant</p>
                <p className={`text-2xl font-bold font-mono ${moveOutFinancials.netRefundable - Number(moveOutData.deductions) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPHP(moveOutFinancials.netRefundable - Number(moveOutData.deductions))}
                </p>
            </div>

            <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsMoveOutModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="danger">Confirm Move Out</Button>
            </div>
         </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title={editingPaymentId ? "Edit Payment" : "Record Rent Payment"}>
         <form onSubmit={handlePaymentSubmit}>
           <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
             <p className="text-sm text-slate-500">Tenant</p>
             <p className="font-bold text-slate-900">{activeTenant?.name}</p>
             {!editingPaymentId && <p className="text-xs text-slate-400 mt-1">Rent: {formatPHP(activeTenant?.rentAmount || 0)}</p>}
           </div>
           
           <FormInput 
              label="Amount Received (PHP)" 
              type="number" 
              value={paymentForm.amount} 
              onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
              autoFocus
              required
           />
           <div className="grid grid-cols-2 gap-4">
             <FormInput 
                label="Date Received" 
                type="date" 
                value={paymentForm.date} 
                onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                required
             />
             <FormSelect
                label="Payment Method"
                options={[
                  { label: 'Cash', value: PaymentMethod.CASH },
                  { label: 'GCash', value: PaymentMethod.GCASH },
                  { label: 'Bank Transfer', value: PaymentMethod.BANK_TRANSFER },
                  { label: 'Cheque', value: PaymentMethod.CHEQUE },
                  { label: 'Other', value: PaymentMethod.OTHER },
                ]}
                value={paymentForm.method}
                onChange={e => setPaymentForm({...paymentForm, method: e.target.value as PaymentMethod})}
             />
           </div>
           
           <div className="flex justify-end gap-3 mt-6">
             <Button type="button" variant="secondary" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
             <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                 {editingPaymentId ? "Save Changes" : "Confirm Payment"}
             </Button>
           </div>
         </form>
      </Modal>

      {/* Reused Tenant Modal (Hidden unless open) */}
       <Modal isOpen={isTenantModalOpen} onClose={() => setIsTenantModalOpen(false)} title={isEditingTenant ? "Edit Lease Details" : "Register Tenant"}>
          <form onSubmit={handleTenantSubmit}>
            <FormSelect
              label="Property Unit"
              options={properties.map(p => ({ label: p.name, value: p.id }))}
              value={tenantFormData.propertyId}
              onChange={e => setTenantFormData({...tenantFormData, propertyId: e.target.value})}
              required
            />
            <FormInput label="Full Name" value={tenantFormData.name || ''} onChange={e => setTenantFormData({...tenantFormData, name: e.target.value})} required />
            <FormInput label="Email" type="email" value={tenantFormData.email || ''} onChange={e => setTenantFormData({...tenantFormData, email: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Monthly Rent (PHP)" type="number" value={tenantFormData.rentAmount || 0} onChange={e => setTenantFormData({...tenantFormData, rentAmount: Number(e.target.value)})} required />
              <FormInput label="Due Day (1-28)" type="number" min="1" max="28" value={tenantFormData.rentDueDay || 1} onChange={e => setTenantFormData({...tenantFormData, rentDueDay: Number(e.target.value)})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <FormInput label="Lease Start Date" type="date" value={tenantFormData.leaseStart || ''} onChange={e => setTenantFormData({...tenantFormData, leaseStart: e.target.value})} required />
               <FormInput label="Lease End Date (Optional)" type="date" value={tenantFormData.leaseEnd || ''} onChange={e => setTenantFormData({...tenantFormData, leaseEnd: e.target.value})} />
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="secondary" onClick={() => setIsTenantModalOpen(false)}>Cancel</Button>
              <Button type="submit">{isEditingTenant ? "Update Tenant" : "Add Tenant"}</Button>
            </div>
          </form>
        </Modal>
    </div>
  );
};
