
import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Properties } from './views/Properties';
import { Tenants } from './views/Tenants';
import { Reports } from './views/Reports';
import { Financing } from './views/Financing';

const AppContent = () => {
  const { activeTab } = useApp();

  const renderView = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'properties': return <Properties />;
      case 'tenants': return <Tenants />;
      case 'financing': return <Financing />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderView()}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
