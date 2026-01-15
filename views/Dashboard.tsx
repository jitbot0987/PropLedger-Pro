
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateMetrics, formatPHP, generateChartData, getUpcomingExpirations } from '../services/financeEngine';
import { Card, EmptyState } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, AlertCircle, Building, Users, Receipt, PieChart, Clock, ArrowRight } from 'lucide-react';

export const Dashboard = () => {
  const { properties, tenants, payments, navigate } = useApp();

  const metrics = useMemo(() => calculateMetrics(properties, tenants, payments), [properties, tenants, payments]);
  const chartData = useMemo(() => generateChartData(payments), [payments]);
  const expirations = useMemo(() => getUpcomingExpirations(tenants), [tenants]);

  const StatCard = ({ title, value, subtext, icon: Icon, color, delay }: any) => (
    <Card className={`p-6 flex items-start justify-between border-l-4 ${delay} animate-slide-up opacity-0 dark:bg-slate-900 dark:border-slate-700`} style={{borderLeftColor: color.includes('emerald') ? '#10b981' : color.includes('rose') ? '#f43f5e' : color.includes('indigo') ? '#6366f1' : '#1e293b'}}>
      <div>
        <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h3>
        {subtext && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">{subtext}</p>}
      </div>
      <div className={`p-3.5 rounded-2xl shadow-lg ${color} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in duration-700">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Financial Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">Real-time metrics from your properties.</p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Date</p>
           <p className="text-xl font-mono font-medium text-slate-700 dark:text-slate-300">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
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

      {payments.length === 0 ? (
        <div className="py-12 animate-in fade-in slide-in-from-bottom-4">
            <EmptyState 
                title="No Financial Data Yet" 
                description="Your dashboard will light up once you start recording rent payments and expenses."
                icon={PieChart}
                action={{ label: "Go to Properties", onClick: () => navigate('properties') }}
            />
        </div>
      ) : (
        /* Bento Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 stagger-5 animate-slide-up opacity-0">
            
            {/* Main Chart */}
            <Card className="lg:col-span-2 p-8 min-h-[450px] dark:bg-slate-900 dark:border-slate-800" noHover>
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cash Flow Analysis</h3>
                <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1 outline-none text-slate-700 dark:text-slate-300">
                    <option>Last 6 Months</option>
                </select>
            </div>
            
            <div className="h-[350px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.2} />
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
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '12px',
                        color: '#1e293b'
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

            {/* Sidebar Column */}
            <div className="flex flex-col gap-8 h-full">
              {/* Lease Watchlist (New) */}
              <Card className="p-0 flex flex-col dark:bg-slate-900 dark:border-slate-800" noHover>
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock size={20} className="text-amber-500" /> Lease Watchlist
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Expiring within 60 days</p>
                  </div>
                  <div className="p-4 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar">
                    {expirations.length === 0 ? (
                       <div className="text-center py-6 text-slate-400 text-sm">No upcoming expirations.</div>
                    ) : (
                       expirations.map(t => (
                         <div key={t.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm flex items-center justify-between">
                            <div>
                               <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t.name}</p>
                               <p className="text-xs text-slate-500">{t.leaseEnd}</p>
                            </div>
                            <div className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${t.daysLeft <= 15 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                               {t.daysLeft <= 15 && <AlertCircle size={10} />}
                               {t.daysLeft} days
                            </div>
                         </div>
                       ))
                    )}
                  </div>
              </Card>

              {/* Recent Activity */}
              <Card className="p-0 flex flex-col flex-1 dark:bg-slate-900 dark:border-slate-800" noHover>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activity</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto flex-1 custom-scrollbar min-h-[200px]">
                  {payments.slice().reverse().slice(0, 5).map((payment, idx) => (
                  <div key={payment.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${idx * 100}ms`}}>
                      <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${payment.type === 'Expense' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                          {payment.type === 'Expense' ? <Building size={18} /> : <TrendingUp size={18} />}
                          </div>
                          <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-200 line-clamp-1">
                              {tenants.find(t => t.id === payment.tenantId)?.name || payment.note || 'General Transaction'}
                          </p>
                          <div className="flex gap-2 items-center mt-0.5">
                              <span className="text-xs text-slate-500 font-medium">{payment.date}</span>
                              {payment.method && (
                              <span className="text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300 font-bold">
                                  {payment.method}
                              </span>
                              )}
                          </div>
                          </div>
                      </div>
                      <span className={`text-sm font-bold font-mono ${payment.type === 'Expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {payment.type === 'Expense' ? '-' : '+'}{formatPHP(payment.amount)}
                      </span>
                      </div>
                  </div>
                  ))}
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                  <button 
                      onClick={() => navigate('reports')}
                      className="w-full text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors py-2 flex items-center justify-center gap-2"
                  >
                      View All Transactions <ArrowRight size={14} />
                  </button>
              </div>
              </Card>
            </div>
        </div>
      )}
    </div>
  );
};
