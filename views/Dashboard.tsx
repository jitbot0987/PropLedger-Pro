import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateMetrics, formatPHP, generateChartData } from '../services/financeEngine';
import { Card } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, AlertCircle, Building, Users, Receipt } from 'lucide-react';

export const Dashboard = () => {
  const { properties, tenants, payments } = useApp();

  const metrics = useMemo(() => calculateMetrics(properties, tenants, payments), [properties, tenants, payments]);
  const chartData = useMemo(() => generateChartData(payments), [payments]);

  const StatCard = ({ title, value, subtext, icon: Icon, color, delay }: any) => (
    <Card className={`p-6 flex items-start justify-between border-l-4 ${delay} animate-slide-up opacity-0`} style={{borderLeftColor: 'var(--tw-border-opacity)'}}>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
        {subtext && <p className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1">{subtext}</p>}
      </div>
      <div className={`p-3.5 rounded-2xl shadow-lg ${color} bg-opacity-10`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in duration-700">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Overview</h2>
          <p className="text-slate-500 mt-1 text-lg">Real-time metrics from your properties.</p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Date</p>
           <p className="text-xl font-mono font-medium text-slate-700">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats Grid - Staggered */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stagger-1 animate-slide-up opacity-0">
          <StatCard 
            title="Total Revenue" 
            value={formatPHP(metrics.totalRevenue)} 
            subtext="Lifetime collected"
            icon={TrendingUp}
            color="bg-emerald-500"
          />
        </div>
        <div className="stagger-2 animate-slide-up opacity-0">
          <StatCard 
            title="Outstanding Rent" 
            value={formatPHP(metrics.outstandingRent)} 
            subtext="Needs attention"
            icon={AlertCircle}
            color="bg-rose-500"
          />
        </div>
        <div className="stagger-3 animate-slide-up opacity-0">
          <StatCard 
            title="Occupancy Rate" 
            value={`${metrics.occupancyRate.toFixed(1)}%`} 
            subtext={`${tenants.filter(t=>t.status==='active').length} Active Tenants`}
            icon={Users}
            color="bg-indigo-500"
          />
        </div>
        <div className="stagger-4 animate-slide-up opacity-0">
          <StatCard 
            title="Net Income" 
            value={formatPHP(metrics.netIncome)} 
            subtext="After expenses"
            icon={Building}
            color="bg-slate-800"
          />
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 stagger-5 animate-slide-up opacity-0">
        
        {/* Main Chart */}
        <Card className="lg:col-span-2 p-8 min-h-[450px]" noHover>
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-bold text-slate-900">Cash Flow Analysis</h3>
             <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-1 outline-none">
                <option>Last 6 Months</option>
             </select>
          </div>
          
          <div className="h-[350px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => {
                    if (val === 0) return '₱0';
                    if (val >= 1000) return `₱${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`;
                    return `₱${val}`;
                  }} 
                  dx={-10}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: '12px'
                  }}
                  formatter={(value: number) => formatPHP(value)}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar 
                  dataKey="Income" 
                  fill="#10b981" 
                  radius={[6, 6, 6, 6]} 
                  barSize={24} 
                  animationDuration={1500}
                />
                <Bar 
                  dataKey="Expense" 
                  fill="#f43f5e" 
                  radius={[6, 6, 6, 6]} 
                  barSize={24} 
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Activity / Quick Feed */}
        <Card className="p-0 flex flex-col h-full" noHover>
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-slate-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 custom-scrollbar">
            {payments.slice().reverse().slice(0, 6).map((payment, idx) => (
              <div key={payment.id} className="p-5 hover:bg-slate-50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${idx * 100}ms`}}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${payment.type === 'Expense' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                       {payment.type === 'Expense' ? <Building size={18} /> : <TrendingUp size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">
                        {tenants.find(t => t.id === payment.tenantId)?.name || payment.note || 'General Transaction'}
                      </p>
                      <div className="flex gap-2 items-center mt-0.5">
                        <span className="text-xs text-slate-500 font-medium">{payment.date}</span>
                        {payment.method && (
                          <span className="text-[10px] uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                            {payment.method}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold font-mono ${payment.type === 'Expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {payment.type === 'Expense' ? '-' : '+'}{formatPHP(payment.amount)}
                  </span>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Receipt size={24} />
                 </div>
                 <p>No activity yet.</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
             <button className="w-full text-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-2">View All Transactions &rarr;</button>
          </div>
        </Card>
      </div>
    </div>
  );
};