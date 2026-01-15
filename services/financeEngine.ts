
import { Payment, Tenant, RentInstallment, PaymentType, Property, PropertyType } from '../types';

/**
 * Format currency to PHP
 */
export const formatPHP = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Generate a month key (YYYY-MM) from a date object or string
 */
export const getMonthKey = (date: Date | string): string => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * CORE LOGIC: Ledger Generation with FIFO Application
 * This function projects what SHOULD be paid based on lease terms,
 * and matches actual payments to these obligations.
 */
export const generateLedger = (
  tenant: Tenant,
  payments: Payment[]
): RentInstallment[] => {
  const ledger: RentInstallment[] = [];
  const start = new Date(tenant.leaseStart);
  // If active, project 1 month ahead. If past (moved out), stop at lease end or today.
  const leaseEnd = tenant.leaseEnd ? new Date(tenant.leaseEnd) : null;
  const now = new Date();
  
  // Determine the cutoff date for the ledger
  // If tenant is 'past' and has a lease end, stop there.
  // Otherwise, go to today + 1 month.
  let endPointer: Date;
  
  if (tenant.status === 'past' && leaseEnd) {
      endPointer = new Date(leaseEnd.getFullYear(), leaseEnd.getMonth(), 1);
  } else {
      endPointer = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  // Filter payments for this tenant that are RENT
  const tenantRentPayments = payments
    .filter(p => p.tenantId === tenant.id && p.type === PaymentType.RENT)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 1. Generate Obligations (Installments)
  const currentPointer = new Date(start);
  // Normalize to 1st of month to avoid loop issues with day logic
  currentPointer.setDate(1); 

  while (currentPointer <= endPointer) {
    const year = currentPointer.getFullYear();
    const month = currentPointer.getMonth();
    const monthKey = getMonthKey(currentPointer);
    
    // Calculate accurate due date based on rentDueDay
    // Handle short months by clamping to last day of month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(tenant.rentDueDay, daysInMonth);
    const dueDate = new Date(year, month, day);

    ledger.push({
      monthKey,
      dueDate: dueDate.toISOString(),
      amountDue: tenant.rentAmount,
      amountPaid: 0, // Will be filled by FIFO logic
      status: 'pending',
      tenantName: tenant.name,
      propertyId: tenant.propertyId
    });

    // Move to next month
    currentPointer.setMonth(currentPointer.getMonth() + 1);
  }

  // 2. FIFO Application
  // Distribute the total pool of paid money across obligations chronologically
  let totalPaidPool = tenantRentPayments.reduce((sum, p) => sum + p.amount, 0);

  for (const installment of ledger) {
    if (totalPaidPool <= 0) break;

    const amountToApply = Math.min(installment.amountDue, totalPaidPool);
    installment.amountPaid += amountToApply;
    totalPaidPool -= amountToApply;
  }

  // 3. Determine Status
  const todayTime = now.getTime();
  
  ledger.forEach(inst => {
    if (inst.amountPaid >= inst.amountDue) {
      inst.status = 'paid';
    } else if (inst.amountPaid > 0) {
      inst.status = 'partial';
    } else {
      const dueTime = new Date(inst.dueDate).getTime();
      // If tenant is past, everything unpaid is overdue regardless of date
      if (todayTime > dueTime || tenant.status === 'past') {
        inst.status = 'overdue';
      } else {
        inst.status = 'pending';
      }
    }
  });

  return ledger.reverse(); // Newest first
};

/**
 * Calculate Exit Position for Move-Out
 */
export const calculateMoveOutFinancials = (tenant: Tenant, payments: Payment[]) => {
  // 1. Calculate Deposit Held
  const deposits = payments
    .filter(p => p.tenantId === tenant.id && p.type === PaymentType.DEPOSIT)
    .reduce((sum, p) => sum + p.amount, 0);

  // 2. Calculate Unpaid Rent
  const ledger = generateLedger(tenant, payments);
  const unpaidRent = ledger.reduce((sum, row) => sum + (row.amountDue - row.amountPaid), 0);

  return {
    depositHeld: deposits,
    unpaidRent: unpaidRent,
    netRefundable: deposits - unpaidRent // If negative, tenant owes money
  };
};

/**
 * Dashboard Metrics Calculation
 */
export const calculateMetrics = (
  properties: Property[],
  tenants: Tenant[],
  payments: Payment[]
): any => {
  const totalRevenue = payments
    .filter(p => p.type === PaymentType.RENT || p.type === PaymentType.DEPOSIT)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalExpenses = payments
    .filter(p => p.type === PaymentType.EXPENSE)
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate outstanding rent
  let totalOutstanding = 0;
  tenants.forEach(tenant => {
    // Only calculate outstanding for active tenants to avoid noise from old history
    if (tenant.status === 'active') {
        const ledger = generateLedger(tenant, payments);
        ledger.forEach(l => {
            if (l.status === 'overdue' || l.status === 'partial') {
                totalOutstanding += (l.amountDue - l.amountPaid);
            }
        });
    }
  });

  // Filter out Personal properties for Occupancy Rate
  const rentalProperties = properties.filter(p => p.type !== PropertyType.PERSONAL);
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  
  const occupancyRate = rentalProperties.length > 0 
    ? (activeTenants / rentalProperties.length) * 100 
    : 0;

  return {
    totalRevenue,
    netIncome: totalRevenue - totalExpenses,
    occupancyRate,
    outstandingRent: totalOutstanding
  };
};

/**
 * Property-Level Financials Calculation
 * Handles Equity, ROI (Appreciation vs Yield), and Cap Rate
 */
export const calculatePropertyFinancials = (property: Property, payments: Payment[]) => {
  const isPersonal = property.type === PropertyType.PERSONAL;
  const propPayments = payments.filter(p => p.propertyId === property.id);

  // --- Equity Logic ---
  const equityPayments = propPayments
    .filter(p => p.type === PaymentType.EQUITY)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalEquityPaid = (property.downPayment || 0) + equityPayments;
  const remainingBalance = Math.max(0, property.purchasePrice - totalEquityPaid);
  const rawPercent = property.purchasePrice > 0 ? (totalEquityPaid / property.purchasePrice) * 100 : 0;
  const percentPaid = Math.min(100, rawPercent);
  const isFullyPaid = percentPaid >= 100;

  // --- ROI & Income Logic ---
  const totalRevenue = propPayments
    .filter(p => p.type === PaymentType.RENT || p.type === PaymentType.DEPOSIT)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalExpenses = propPayments
    .filter(p => p.type === PaymentType.EXPENSE)
    .reduce((sum, p) => sum + p.amount, 0);

  const netIncome = totalRevenue - totalExpenses;

  let roi = 0;
  let capRate = 0;

  if (isPersonal) {
    // Appreciation ROI: (Market Value - Purchase Price) / Purchase Price
    const currentVal = property.currentMarketValue || property.purchasePrice;
    roi = property.purchasePrice > 0 
      ? ((currentVal - property.purchasePrice) / property.purchasePrice) * 100 
      : 0;
  } else {
    // Rental Cash-on-Cash ROI: Net Income / Total Cash Invested
    roi = totalEquityPaid > 0 ? (netIncome / totalEquityPaid) * 100 : 0;
    
    // Annualized Cap Rate (Simplified Estimate)
    const purchaseDate = new Date(property.purchaseDate);
    const now = new Date();
    // Avoid division by zero months
    const monthsOwned = Math.max(1, (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth()));
    // Annualize the Net Income so far
    const annualizedNOI = (netIncome / monthsOwned) * 12;
    capRate = property.purchasePrice > 0 ? (annualizedNOI / property.purchasePrice) * 100 : 0;
  }

  return {
    isPersonal,
    totalEquityPaid,
    remainingBalance,
    percentPaid,
    isFullyPaid,
    netIncome,
    roi,
    capRate
  };
};

/**
 * Chart Data Generator
 */
export const generateChartData = (payments: Payment[]) => {
  const last6Months: string[] = [];
  const now = new Date();
  
  for(let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6Months.push(getMonthKey(d));
  }

  return last6Months.map(key => {
    const income = payments
      .filter(p => p.monthKey === key && p.type !== PaymentType.EXPENSE)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const expense = payments
      .filter(p => p.monthKey === key && p.type === PaymentType.EXPENSE)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      name: key,
      Income: income,
      Expense: expense
    };
  });
};

/**
 * Generate Income Statement (P&L) Data
 * Groups data by category within a timeframe
 */
export const generateIncomeStatement = (payments: Payment[], year: number) => {
  // Filter for the specific year
  const yearlyPayments = payments.filter(p => new Date(p.date).getFullYear() === year);

  // Initialize Structure
  const statement = {
    revenue: {
      Rent: 0,
      Deposit: 0,
      Other: 0,
      Total: 0
    },
    expenses: {} as Record<string, number>,
    totalExpenses: 0,
    netIncome: 0
  };

  yearlyPayments.forEach(p => {
    if (p.type === PaymentType.RENT) {
      statement.revenue.Rent += p.amount;
      statement.revenue.Total += p.amount;
    } else if (p.type === PaymentType.DEPOSIT) {
      statement.revenue.Deposit += p.amount;
      statement.revenue.Total += p.amount;
    } else if (p.type === PaymentType.EXPENSE) {
      // Extract Category from note (Format: "Category: Note")
      // If no colon, use "Uncategorized"
      const category = p.note ? p.note.split(':')[0].trim() : 'Uncategorized';
      
      if (!statement.expenses[category]) {
        statement.expenses[category] = 0;
      }
      statement.expenses[category] += p.amount;
      statement.totalExpenses += p.amount;
    }
  });

  statement.netIncome = statement.revenue.Total - statement.totalExpenses;

  return statement;
};

/**
 * Generate Aggregated Financial Summary (Monthly & Yearly)
 */
export const generateFinancialSummary = (payments: Payment[]) => {
  const monthly: Record<string, { income: number; expense: number }> = {};
  const yearly: Record<string, { income: number; expense: number }> = {};

  payments.forEach(p => {
    const date = new Date(p.date);
    if (isNaN(date.getTime())) return;

    const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const yKey = `${date.getFullYear()}`;
    
    // Initialize
    if (!monthly[mKey]) monthly[mKey] = { income: 0, expense: 0 };
    if (!yearly[yKey]) yearly[yKey] = { income: 0, expense: 0 };

    const amount = p.amount;

    if (p.type === PaymentType.EXPENSE) {
      monthly[mKey].expense += amount;
      yearly[yKey].expense += amount;
    } else if (p.type === PaymentType.RENT || p.type === PaymentType.DEPOSIT) {
      // Only count Rent and Deposit as Income to match P&L logic
      // Equity payments are excluded from P&L (Capital Expenditure)
      monthly[mKey].income += amount;
      yearly[yKey].income += amount;
    }
  });

  // Transform to array and sort descending by period
  const monthlyStats = Object.keys(monthly).map(key => ({
      period: key,
      income: monthly[key].income,
      expense: monthly[key].expense,
      net: monthly[key].income - monthly[key].expense
  })).sort((a,b) => b.period.localeCompare(a.period));

   const yearlyStats = Object.keys(yearly).map(key => ({
      period: key,
      income: yearly[key].income,
      expense: yearly[key].expense,
      net: yearly[key].income - yearly[key].expense
  })).sort((a,b) => b.period.localeCompare(a.period));

  return { monthlyStats, yearlyStats };
};
