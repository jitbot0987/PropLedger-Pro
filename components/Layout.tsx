
import React, { useState, ReactNode, useRef, useEffect } from 'react';
import { Home, Building2, Users, Receipt, Settings, Download, Upload, AlertTriangle, PieChart, Command, Landmark, Search, FileText, Moon, Sun, FileUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal, Button, ToastContainer, CommandPalette } from './UI';
import Papa from 'papaparse';
import { Payment, PaymentType, PaymentMethod, ExpenseCategory } from '../types';
import { getMonthKey } from '../services/financeEngine';

interface LayoutProps {
  children?: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Use Context for State & Actions
  const { 
    activeTab, 
    navigate, 
    refreshData, 
    toasts, 
    removeToast,
    tenants,
    properties,
    bulkAddPayments,
    notify
  } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'financing', label: 'Financing', icon: Landmark },
    { id: 'reports', label: 'Reports', icon: PieChart },
  ];

  // --- Theme Logic ---
  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // --- Dynamic Actions for Command Palette ---
  const baseActions = [
    { id: 'go_dash', label: 'Go to Dashboard', icon: Home, perform: () => navigate('dashboard') },
    { id: 'go_prop', label: 'Go to Properties', icon: Building2, perform: () => navigate('properties') },
    { id: 'go_ten', label: 'Go to Tenants', icon: Users, perform: () => navigate('tenants') },
    { id: 'go_fin', label: 'Go to Financing', icon: Landmark, perform: () => navigate('financing') },
    { id: 'go_rep', label: 'Go to Reports', icon: PieChart, perform: () => navigate('reports') },
    { id: 'act_export', label: 'Export Data Backup', icon: Download, perform: () => handleExport() },
    { id: 'act_settings', label: 'Open Settings', icon: Settings, perform: () => setIsSettingsOpen(true) },
    { id: 'act_theme', label: 'Toggle Dark Mode', icon: isDarkMode ? Sun : Moon, perform: () => toggleTheme() },
  ];

  const tenantActions = tenants.map(t => ({
    id: `ten_${t.id}`,
    label: `Tenant: ${t.name}`,
    icon: Users,
    perform: () => navigate('tenants', t.id)
  }));

  const propertyActions = properties.map(p => ({
    id: `prop_${p.id}`,
    label: `Property: ${p.name}`,
    icon: Building2,
    perform: () => navigate('properties')
  }));

  const commandActions = [...baseActions, ...tenantActions, ...propertyActions];

  const handleExport = () => {
    const data = localStorage.getItem('prop_ledger_v1');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCsvImportClick = () => {
    csvInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        if (!parsed.properties || !parsed.tenants || !parsed.payments) throw new Error("Invalid format");
        
        localStorage.setItem('prop_ledger_v1', json);
        refreshData();
        setIsSettingsOpen(false);
      } catch (err) {
        alert('Failed to import data. Invalid file format or missing required fields.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const newPayments: Payment[] = [];
          
          results.data.forEach((row: any) => {
            // Mapping: Date, Amount, Property Name, Category, Note
            const date = row['Date'];
            const amount = parseFloat(row['Amount']);
            const propName = row['Property Name'];
            const category = row['Category'] || 'Other';
            const note = row['Note'] || '';

            if (!date || isNaN(amount) || !propName) return; // Skip invalid rows

            // Find Property
            const prop = properties.find(p => p.name.toLowerCase() === propName.toLowerCase());
            if (!prop) return; // Property not found, skip

            // Determine Payment Type
            let type = PaymentType.EXPENSE;
            let expenseCategory: ExpenseCategory | undefined = undefined;

            if (category.toLowerCase() === 'rent') type = PaymentType.RENT;
            else if (category.toLowerCase() === 'deposit') type = PaymentType.DEPOSIT;
            else {
              // It's an expense
              expenseCategory = category as ExpenseCategory; 
              // Basic check if valid category, else 'Other'
              if (!['Maintenance','Tax','Insurance','Utilities','Mortgage','HOA','Marketing','Legal','Other'].includes(expenseCategory)) {
                 expenseCategory = 'Other';
              }
            }

            newPayments.push({
              id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              propertyId: prop.id,
              amount: Math.abs(amount),
              date: new Date(date).toISOString().split('T')[0],
              type,
              method: PaymentMethod.CASH, // Default
              note,
              expenseCategory,
              monthKey: getMonthKey(date)
            });
          });

          if (newPayments.length > 0) {
            bulkAddPayments(newPayments);
            setIsSettingsOpen(false);
          } else {
            notify('No valid payment records found in CSV', 'error');
          }
        } catch (error) {
           console.error(error);
           notify('Failed to parse CSV', 'error');
        }
      }
    });
    e.target.value = '';
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100">
      {/* Toast Overlay */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandOpen} 
        onClose={() => setIsCommandOpen(false)} 
        actions={commandActions} 
      />

      {/* Sidebar (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 dark:bg-slate-900 text-slate-300 shadow-2xl relative z-30 overflow-hidden">
        {/* Decorative Blur Circle */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="p-8 relative z-10">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
               <Receipt size={18} /> 
            </div>
            PropLedger
          </h1>
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-bold pl-11">Pro Edition</p>
        </div>

        <nav className="px-4 space-y-2 relative z-10 mt-4 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`group w-full flex items-center gap-4 px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/40 translate-x-1' 
                    : 'hover:bg-white/5 hover:text-white hover:translate-x-1'
                  }`}
              >
                <Icon size={20} className={`transition-colors ${isActive ? 'text-indigo-200' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-md space-y-2 relative z-10">
           <button 
             onClick={() => setIsCommandOpen(true)}
             className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-700 transition-colors mb-2 border border-slate-700/50"
           >
             <span className="flex items-center gap-2"><Command size={12} /> Search</span>
             <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">⌘K</span>
           </button>
           
           <button 
             onClick={toggleTheme}
             className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-700 transition-colors mb-2 border border-slate-700/50"
           >
             <span className="flex items-center gap-2">
                {isDarkMode ? <Sun size={12} /> : <Moon size={12} />} 
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
             </span>
           </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-4 w-full hover:bg-white/5 p-2 rounded-xl transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-white font-bold text-[10px] group-hover:border-indigo-500 transition-colors">
              AD
            </div>
            <div className="text-left">
              <p className="text-sm text-white font-medium group-hover:text-indigo-400 transition-colors">Admin User</p>
            </div>
            <Settings size={16} className="ml-auto text-slate-600 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50 dark:bg-slate-950 relative scroll-smooth pb-24 md:pb-0">
        {/* Background Gradients */}
        <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-900/10 to-transparent pointer-events-none z-0"></div>
        
        <div className="md:hidden sticky top-0 z-20 glass-panel border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center dark:bg-slate-900/80">
             <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Receipt className="text-indigo-600" size={20} /> PropLedger
             </div>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                <Settings size={18} />
             </button>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">
          <div className="animate-in fade-in duration-500">
            {children}
          </div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 pb-safe-area">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
             const Icon = item.icon;
             const isActive = activeTab === item.id;
             return (
               <button 
                 key={item.id}
                 onClick={() => navigate(item.id)}
                 className={`flex flex-col items-center justify-center py-3 px-2 w-full transition-colors relative
                   ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
               >
                 {isActive && (
                   <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full"></div>
                 )}
                 <Icon size={24} className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                 <span className="text-[10px] font-bold">{item.label}</span>
               </button>
             )
          })}
        </div>
      </nav>

      {/* Settings / Data Modal */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Data Management">
        <div className="space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex gap-4">
             <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg h-fit text-indigo-600 dark:text-indigo-400">
                <AlertTriangle size={20} />
             </div>
             <div>
               <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">Browser Storage</h4>
               <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1 leading-relaxed">
                 Your data lives in this browser's LocalStorage. It is not synced to the cloud. 
                 Please export your data regularly to avoid loss.
               </p>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
             <button 
               onClick={handleExport}
               className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:shadow-md transition-all group active:scale-95"
             >
               <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Download className="text-indigo-600 dark:text-indigo-300" size={20} />
               </div>
               <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">Export</span>
             </button>

             <button 
               onClick={handleImportClick}
               className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 hover:shadow-md transition-all group active:scale-95"
             >
               <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                 <Upload className="text-emerald-600 dark:text-emerald-300" size={20} />
               </div>
               <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">Restore JSON</span>
             </button>

             <button 
               onClick={handleCsvImportClick}
               className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-md transition-all group active:scale-95"
             >
               <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                 <FileUp className="text-blue-600 dark:text-blue-300" size={20} />
               </div>
               <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">Import CSV</span>
             </button>

             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept=".json"
               onChange={handleFileChange}
             />
             <input 
               type="file" 
               ref={csvInputRef} 
               className="hidden" 
               accept=".csv"
               onChange={handleCsvChange}
             />
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsSettingsOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
