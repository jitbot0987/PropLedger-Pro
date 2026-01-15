
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState, Property, Tenant, Payment } from '../types';
import { loadState, saveState } from '../services/storageService';
import { ToastMessage, ToastType } from '../components/UI';

interface AppContextType extends AppState {
  addProperty: (prop: Property) => void;
  deleteProperty: (id: string) => void;
  addTenant: (tenant: Tenant) => void;
  updateTenant: (tenant: Tenant) => void;
  deleteTenant: (id: string) => void;
  addPayment: (payment: Payment) => void;
  updatePayment: (payment: Payment) => void;
  deletePayment: (id: string) => void;
  refreshData: () => void;
  // Notification System
  toasts: ToastMessage[];
  notify: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [state, setState] = useState<AppState>({
    properties: [],
    tenants: [],
    payments: []
  });
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
  }, []);

  // --- Notification Logic ---
  const notify = (message: string, type: ToastType = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Data Logic ---

  const addProperty = (prop: Property) => {
    const newState = { ...state, properties: [...state.properties, prop] };
    setState(newState);
    saveState(newState);
    notify('Property saved successfully');
  };

  const deleteProperty = (id: string) => {
    const newState = { 
      ...state, 
      properties: state.properties.filter(p => p.id !== id) 
    };
    setState(newState);
    saveState(newState);
    notify('Property deleted', 'success');
  };

  const addTenant = (tenant: Tenant) => {
    const newState = { ...state, tenants: [...state.tenants, tenant] };
    setState(newState);
    saveState(newState);
    notify('Tenant registered successfully');
  };

  const updateTenant = (tenant: Tenant) => {
    const newState = {
      ...state,
      tenants: state.tenants.map(t => t.id === tenant.id ? tenant : t)
    };
    setState(newState);
    saveState(newState);
    notify('Lease details updated');
  };

  const deleteTenant = (id: string) => {
    const newState = {
      ...state,
      tenants: state.tenants.filter(t => t.id !== id)
    };
    setState(newState);
    saveState(newState);
    notify('Tenant removed', 'success');
  };

  const addPayment = (payment: Payment) => {
    const newState = { ...state, payments: [...state.payments, payment] };
    setState(newState);
    saveState(newState);
    saveState(newState);
    notify('Payment recorded successfully');
  };

  const updatePayment = (payment: Payment) => {
    const newState = {
      ...state,
      payments: state.payments.map(p => p.id === payment.id ? payment : p)
    };
    setState(newState);
    saveState(newState);
    notify('Payment updated successfully');
  };

  const deletePayment = (id: string) => {
    const newState = {
      ...state,
      payments: state.payments.filter(p => p.id !== id)
    };
    setState(newState);
    saveState(newState);
    notify('Payment deleted', 'success');
  };

  const refreshData = () => {
     const loaded = loadState();
     setState(loaded);
     notify('Data reloaded');
  };

  return (
    <AppContext.Provider value={{ 
      ...state, 
      addProperty, 
      deleteProperty, 
      addTenant, 
      updateTenant,
      deleteTenant, 
      addPayment,
      updatePayment,
      deletePayment,
      refreshData,
      toasts,
      notify,
      removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
