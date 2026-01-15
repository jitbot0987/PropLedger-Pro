
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { generateIncomeStatement, generateFinancialSummary, formatPHP, getMonthKey } from '../services/financeEngine';
import { Card, Button, FormSelect, Modal, FormInput, Badge } from '../components/UI';
import { PaymentType, PaymentMethod, Payment } from '../types';
import { FileText, Download, Filter, Search, Edit2, Trash2, PieChart, Table as TableIcon, List } from 'lucide-react';

export const Reports = () => {
  const { payments, properties, updatePayment, deletePayment } = useApp();
  const [activeView, setActiveView] = useState<'pnl' | 'ledger' | 'summary'>('pnl');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Ledger Filter State
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // --- DATA GENERATION ---

  // 1. P&L Data
  const pnlData = useMemo(() => {
    return generateIncomeStatement(payments, selectedYear);
  }, [payments, selectedYear]);

  // 2. Filtered Ledger Data
  const filteredLedger = useMemo(() => {
    return payments
      .filter(p => {
        // Search Filter
        const matchesSearch = 
          p.note?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.amount.toString().includes(searchTerm) ||
          p.monthKey?.includes(searchTerm);

        // Property Filter
        const matchesProperty = selectedPropertyFilter === 'all' || p.propertyId === selectedPropertyFilter;

        return matchesSearch && matchesProperty;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm, selectedPropertyFilter]);

  // 3. Summary Data (Monthly & Yearly)
  const summaryData = useMemo(() => {
    return generateFinancialSummary(payments);
  }, [payments]);

  // --- HANDLERS ---
  const handleEditClick = (payment: Payment) => {
    setEditingPayment({ ...payment });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (payment: Payment) => {
    if (window.confirm(`Are you sure you want to delete this payment of ${formatPHP(payment.amount)}?`)) {
        deletePayment(payment.id);
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    // Ensure monthKey matches new date if date changed
    const updatedPayment = {
        ...editingPayment,
        monthKey: getMonthKey(editingPayment.date)
    };

    updatePayment(updatedPayment);
    setIsEditModalOpen(false);
    setEditingPayment(null);
  };

  const handleExportSummary = () => {
    const headers = ['Period,Income,Expense,Net Income'];
    const rows = summaryData.monthlyStats.map(row => 
      `${row.period},${row.income},${row.expense},${row.net}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Accounting</h2>
          <p className="text-slate-500">Financial statements and general ledger.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
           <button 
             onClick={() => setActiveView('pnl')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'pnl' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
           >
             <div className="flex items-center gap-2"><PieChart size={16} /> P&L</div>
           </button>
           <button 
             onClick={() => setActiveView('summary')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
           >
             <div className="flex items-center gap-2"><TableIcon size={16} /> Summary</div>
           </button>
           <button 
             onClick={() => setActiveView('ledger')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'ledger' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
           >
             <div className="flex items-center gap-2"><List size={16} /> Ledger</div>
           </button>
        </div>
      </div>

      {activeView === 'pnl' && (
        <Card className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Profit & Loss Statement</h3>
              <p className="text-sm text-slate-500">Fiscal Year {selectedYear}</p>
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-slate-900"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Revenue Section */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Revenue</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Rental Income</span>
                  <span className="font-medium text-slate-900">{formatPHP(pnlData.revenue.Rent)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Security Deposits</span>
                  <span className="font-medium text-slate-900">{formatPHP(pnlData.revenue.Deposit)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-slate-200">
                  <span className="font-bold text-slate-800">Total Revenue</span>
                  <span className="font-bold text-emerald-600">{formatPHP(pnlData.revenue.Total)}</span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Operating Expenses</h4>
              <div className="space-y-3">
                {Object.keys(pnlData.expenses).length > 0 ? (
                  Object.entries(pnlData.expenses).map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="text-slate-600">{category}</span>
                      <span className="font-medium text-slate-900">{formatPHP(amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400 italic">No expenses recorded for this period.</div>
                )}
                
                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-slate-200">
                  <span className="font-bold text-slate-800">Total Operating Expenses</span>
                  <span className="font-bold text-rose-600">{formatPHP(pnlData.totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Net Income Section */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-900">Net Operating Income</span>
                <span className={`text-xl font-bold ${pnlData.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPHP(pnlData.netIncome)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeView === 'summary' && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
               <h3 className="text-lg font-bold text-slate-900">Financial Summary</h3>
               <p className="text-sm text-slate-500">Aggregated Income & Expenses</p>
            </div>
            <Button variant="secondary" onClick={handleExportSummary} className="text-xs">
               <Download size={14} className="mr-2 inline" /> Export CSV
            </Button>
          </div>

          <div className="p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Monthly Table */}
                <div>
                   <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Monthly Breakdown
                   </h4>
                   <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                            <th className="p-3">Period</th>
                            <th className="p-3 text-right">Income</th>
                            <th className="p-3 text-right">Expense</th>
                            <th className="p-3 text-right">Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {summaryData.monthlyStats.map(row => (
                            <tr key={row.period} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-xs font-bold text-slate-600">{row.period}</td>
                              <td className="p-3 text-right text-emerald-600 font-medium">+{formatPHP(row.income)}</td>
                              <td className="p-3 text-right text-rose-600 font-medium">{row.expense > 0 ? '-' : ''}{formatPHP(row.expense)}</td>
                              <td className={`p-3 text-right font-bold ${row.net >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                                 {formatPHP(row.net)}
                              </td>
                            </tr>
                          ))}
                          {summaryData.monthlyStats.length === 0 && (
                            <tr><td colSpan={4} className="p-4 text-center text-slate-400">No data available</td></tr>
                          )}
                        </tbody>
                      </table>
                   </div>
                </div>

                {/* Yearly Table */}
                <div>
                   <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Annual Overview
                   </h4>
                   <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                            <th className="p-3">Year</th>
                            <th className="p-3 text-right">Income</th>
                            <th className="p-3 text-right">Expense</th>
                            <th className="p-3 text-right">Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {summaryData.yearlyStats.map(row => (
                            <tr key={row.period} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">{row.period}</td>
                              <td className="p-3 text-right text-emerald-600 font-medium">+{formatPHP(row.income)}</td>
                              <td className="p-3 text-right text-rose-600 font-medium">{row.expense > 0 ? '-' : ''}{formatPHP(row.expense)}</td>
                              <td className={`p-3 text-right font-bold ${row.net >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                                 {formatPHP(row.net)}
                              </td>
                            </tr>
                          ))}
                           {summaryData.yearlyStats.length === 0 && (
                            <tr><td colSpan={4} className="p-4 text-center text-slate-400">No data available</td></tr>
                          )}
                        </tbody>
                      </table>
                   </div>
                </div>
             </div>
          </div>
        </Card>
      )}

      {activeView === 'ledger' && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-900">General Ledger</h3>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
               {/* PROPERTY FILTER */}
               <div className="relative">
                  <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select 
                     className="w-full sm:w-48 pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 appearance-none bg-white cursor-pointer hover:border-slate-300 transition-colors"
                     value={selectedPropertyFilter}
                     onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                  >
                     <option value="all">All Properties</option>
                     {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                  </select>
               </div>

               {/* SEARCH FILTER */}
               <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search transactions..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Description / Note</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Method</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.map((payment) => {
                  const propName = properties.find(p => p.id === payment.propertyId)?.name || '-';
                  
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 group">
                        <td className="p-4 text-slate-600 font-mono text-xs">{payment.date}</td>
                        <td className="p-4">
                        {payment.tenantId ? (
                            <span className="text-indigo-600 font-medium">Rent Payment</span>
                        ) : (
                            <span className="text-slate-900">{payment.note || 'General Transaction'}</span>
                        )}
                        </td>
                        <td className="p-4 text-slate-500 text-xs truncate max-w-[150px]" title={propName}>
                            {propName}
                        </td>
                        <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium 
                            ${payment.type === PaymentType.EXPENSE ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {payment.type === PaymentType.EXPENSE ? payment.note?.split(':')[0] || 'Expense' : 'Income'}
                        </span>
                        </td>
                        <td className="p-4 text-slate-500 text-xs uppercase">{payment.method}</td>
                        <td className={`p-4 text-right font-mono font-medium ${payment.type === PaymentType.EXPENSE ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {payment.type === PaymentType.EXPENSE ? '-' : '+'}{formatPHP(payment.amount)}
                        </td>
                        <td className="p-4 flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(payment)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                            <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(payment)} className="p-1 text-slate-400 hover:text-rose-600 transition-colors" title="Delete">
                            <Trash2 size={16} />
                        </button>
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredLedger.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                 <p className="font-bold">No transactions found.</p>
                 <p className="text-xs mt-1">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* EDIT TRANSACTION MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Transaction">
         {editingPayment && (
             <form onSubmit={handleUpdateSubmit}>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase">Transaction ID</p>
                    <p className="font-mono text-xs text-slate-700">{editingPayment.id}</p>
                    <div className="mt-2">
                         <Badge 
                            type={editingPayment.type === PaymentType.EXPENSE ? 'danger' : 'success'} 
                            text={editingPayment.type} 
                         />
                    </div>
                </div>

                <FormInput 
                    label="Amount (PHP)"
                    type="number"
                    value={editingPayment.amount}
                    onChange={(e) => setEditingPayment({...editingPayment, amount: Number(e.target.value)})}
                    required
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <FormInput 
                        label="Date"
                        type="date"
                        value={editingPayment.date}
                        onChange={(e) => setEditingPayment({...editingPayment, date: e.target.value})}
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
                        value={editingPayment.method}
                        onChange={(e) => setEditingPayment({...editingPayment, method: e.target.value as PaymentMethod})}
                    />
                </div>

                <FormInput 
                    label="Note / Description"
                    placeholder="Transaction details..."
                    value={editingPayment.note || ''}
                    onChange={(e) => setEditingPayment({...editingPayment, note: e.target.value})}
                />

                <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </div>
             </form>
         )}
      </Modal>

    </div>
  );
};
