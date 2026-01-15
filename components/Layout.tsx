
import React, { useState, ReactNode, useRef, useEffect } from 'react';
import { Home, Building2, Users, Receipt, Settings, Download, Upload, AlertTriangle, PieChart, Command, Landmark, Search, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal, Button, ToastContainer, CommandPalette } from './UI';

interface LayoutProps {
  children?: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use Context for State & Actions
  const { 
    activeTab, 
    navigate, 
    refreshData, 
    toasts, 
    removeToast,
    tenants,
    properties 
  } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'financing', label: 'Financing', icon: Landmark },
    { id: 'reports', label: 'Reports', icon: PieChart },
  ];

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
  ];

  // Inject Tenants and Properties into Search
  const tenantActions = tenants.map(t => ({
    id: `ten_${t.id}`,
    label: `Tenant: ${t.name}`,
    icon: Users,
    perform: () => navigate('tenants', t.id) // Deep link to tenant
  }));

  const propertyActions = properties.map(p => ({
    id: `prop_${p.id}`,
    label: `Property: ${p.name}`,
    icon: Building2,
    perform: () => navigate('properties') // Could be deep linked later
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        // Basic schema validation
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Toast Overlay */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandOpen} 
        onClose={() => setIsCommandOpen(false)} 
        actions={commandActions} 
      />

      {/* Sidebar (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-slate-300 shadow-2xl relative z-30 overflow-hidden">
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
           {/* Cmd+K Hint */}
           <button 
             onClick={() => setIsCommandOpen(true)}
             className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-700 transition-colors mb-2 border border-slate-700/50"
           >
             <span className="flex items-center gap-2"><Command size={12} /> Search</span>
             <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">⌘K</span>
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
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50 relative scroll-smooth pb-24 md:pb-0">
        {/* Background Gradients */}
        <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none z-0"></div>
        
        {/* Mobile Header (Simplified) */}
        <div className="md:hidden sticky top-0 z-20 glass-panel border-b border-slate-200 px-4 py-3 flex justify-between items-center">
             <div className="flex items-center gap-2 font-bold text-slate-900">
                <Receipt className="text-indigo-600" size={20} /> PropLedger
             </div>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-slate-100 rounded-full text-slate-600">
                <Settings size={18} />
             </button>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">
          <div className="animate-in fade-in duration-500">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation (Sticky) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 z-40 pb-safe-area">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
             const Icon = item.icon;
             const isActive = activeTab === item.id;
             return (
               <button 
                 key={item.id}
                 onClick={() => navigate(item.id)}
                 className={`flex flex-col items-center justify-center py-3 px-2 w-full transition-colors relative
                   ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
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
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-4">
             <div className="p-2 bg-indigo-100 rounded-lg h-fit text-indigo-600">
                <AlertTriangle size={20} />
             </div>
             <div>
               <h4 className="font-bold text-indigo-900 text-sm">Browser Storage</h4>
               <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                 Your data lives in this browser's LocalStorage. It is not synced to the cloud. 
                 Please export your data regularly to avoid loss.
               </p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button 
               onClick={handleExport}
               className="flex flex-col items-center justify-center p-6 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 hover:shadow-md transition-all group active:scale-95"
             >
               <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Download className="text-indigo-600" size={24} />
               </div>
               <span className="font-bold text-slate-700">Export Backup</span>
               <span className="text-xs text-slate-400 mt-1">Download JSON</span>
             </button>

             <button 
               onClick={handleImportClick}
               className="flex flex-col items-center justify-center p-6 border border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md transition-all group active:scale-95"
             >
               <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                 <Upload className="text-emerald-600" size={24} />
               </div>
               <span className="font-bold text-slate-700">Restore Data</span>
               <span className="text-xs text-slate-400 mt-1">Upload JSON</span>
             </button>
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept=".json"
               onChange={handleFileChange}
             />
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsSettingsOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
