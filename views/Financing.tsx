
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculatePropertyFinancials, formatPHP } from '../services/financeEngine';
import { Card, Badge, EmptyState } from '../components/UI';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, ShieldCheck, Wallet, CheckCircle, Landmark, TrendingDown } from 'lucide-react';

export const Financing = () => {
  const { properties, payments } = useApp();

  // Aggregate Portfolio Financials
  const financials = useMemo(() => {
    let totalAssets = 0; // Current Market Value
    let totalAcquisitionCost = 0; // Purchase Price
    let totalEquity = 0;
    let totalDebt = 0;

    const details = properties.map(prop => {
      const stats = calculatePropertyFinancials(prop, payments);
      const assetValue = prop.currentMarketValue || prop.purchasePrice;
      
      totalAssets += assetValue;
      totalAcquisitionCost += prop.purchasePrice;
      totalEquity += stats.totalEquityPaid;
      totalDebt += stats.remainingBalance;

      return {
        ...prop,
        ...stats,
        assetValue
      };
    });

    return {
      totalAssets,
      totalAcquisitionCost,
      totalEquity,
      totalDebt,
      details,
      portfolioDelta: totalAssets - totalAcquisitionCost
    };
  }, [properties, payments]);

  const chartData = [
    { name: 'Equity Paid', value: financials.totalEquity, color: '#10b981' },
    { name: 'Outstanding Debt', value: financials.totalDebt, color: '#f43f5e' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Financing & Equity</h2>
        <p className="text-slate-500 mt-1 text-lg">Track your ownership progress and outstanding debts.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 border-l-4 border-indigo-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Market Value</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatPHP(financials.totalAssets)}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Landmark size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Combined current valuation</p>
        </Card>

        {/* New Valuation Delta Card */}
        <Card className={`p-6 border-l-4 ${financials.portfolioDelta >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
           <div className="flex justify-between items-start">
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unrealized Gain</p>
                <h3 className={`text-2xl font-bold ${financials.portfolioDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {financials.portfolioDelta >= 0 ? '+' : ''}{formatPHP(financials.portfolioDelta)}
                </h3>
             </div>
             <div className={`p-3 rounded-xl ${financials.portfolioDelta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {financials.portfolioDelta >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
             </div>
           </div>
           <p className="text-xs text-slate-500 mt-3">Value vs. Acquisition Cost</p>
        </Card>

        <Card className="p-6 border-l-4 border-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Equity</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatPHP(financials.totalEquity)}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <ShieldCheck size={24} />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
             <div className="bg-emerald-500 h-full" style={{ width: `${(financials.totalEquity / (financials.totalAssets || 1)) * 100}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-1">{(financials.totalEquity / (financials.totalAssets || 1) * 100).toFixed(1)}% Ownership</p>
        </Card>

        <Card className="p-6 border-l-4 border-rose-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Debt</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatPHP(financials.totalDebt)}</h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
              <Wallet size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Remaining mortgage balance</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Detailed Table */}
        <Card className="lg:col-span-2 overflow-hidden">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50">
             <h3 className="font-bold text-slate-800">Portfolio Breakdown</h3>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                 <tr>
                   <th className="p-4">Property</th>
                   <th className="p-4 text-right">Acquisition</th>
                   <th className="p-4 text-right">Current Value</th>
                   <th className="p-4 text-right">Appreciation</th>
                   <th className="p-4 text-center w-32">Ownership</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-sm">
                 {financials.details.map(item => (
                   <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                     <td className="p-4">
                       <div className="font-bold text-slate-900">{item.name}</div>
                       <div className="text-xs text-slate-500">{item.type}</div>
                     </td>
                     <td className="p-4 text-right font-mono text-slate-600">
                       {formatPHP(item.purchasePrice)}
                     </td>
                     <td className="p-4 text-right font-medium text-slate-900">
                       {formatPHP(item.assetValue)}
                     </td>
                     <td className={`p-4 text-right font-bold ${item.valuationDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.valuationDelta !== 0 ? formatPHP(item.valuationDelta) : '-'}
                     </td>
                     <td className="p-4">
                       {item.isFullyPaid ? (
                         <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 py-1 rounded-md border border-emerald-100">
                           <CheckCircle size={12} /> Full
                         </div>
                       ) : (
                         <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                           <div className="bg-emerald-500 h-full" style={{ width: `${item.percentPaid}%` }}></div>
                         </div>
                       )}
                       {!item.isFullyPaid && <div className="text-center text-[10px] text-slate-400 mt-1">{item.percentPaid.toFixed(1)}%</div>}
                     </td>
                   </tr>
                 ))}
                 {financials.details.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-8 text-center text-slate-500">No properties found.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </Card>

        {/* Visual Chart */}
        <Card className="p-6 flex flex-col items-center justify-center min-h-[300px]">
           <h3 className="font-bold text-slate-800 mb-4 w-full text-left">Portfolio Structure</h3>
           {financials.totalAssets > 0 ? (
             <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => formatPHP(val)} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center text-xs text-slate-400 mt-2">
                   Loan-to-Value (LTV): {((financials.totalDebt / financials.totalAssets) * 100).toFixed(1)}%
                </div>
             </div>
           ) : (
              <EmptyState title="No Data" description="Add properties to see charts" icon={PieChart} />
           )}
        </Card>
      </div>
    </div>
  );
};
