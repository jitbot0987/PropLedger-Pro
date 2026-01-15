
import { Payment, Tenant, RentInstallment, PaymentType, Property, PropertyType, ExpenseCategory } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
 */
export const generateLedger = (
  tenant: Tenant,
  payments: Payment[]
): RentInstallment[] => {
  const ledger: RentInstallment[] = [];
  const start = new Date(tenant.leaseStart);
  const leaseEnd = tenant.leaseEnd ? new Date(tenant.leaseEnd) : null;
  const now = new Date();
  
  let endPointer: Date;
  
  if (tenant.status === 'past' && leaseEnd) {
      endPointer = new Date(leaseEnd.getFullYear(), leaseEnd.getMonth(), 1);
  } else {
      endPointer = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const tenantRentPayments = payments
    .filter(p => p.tenantId === tenant.id && p.type === PaymentType.RENT)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const currentPointer = new Date(start);
  currentPointer.setDate(1); 

  while (currentPointer <= endPointer) {
    const year = currentPointer.getFullYear();
    const month = currentPointer.getMonth();
    const monthKey = getMonthKey(currentPointer);
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(tenant.rentDueDay, daysInMonth);
    const dueDate = new Date(year, month, day);

    ledger.push({
      monthKey,
      dueDate: dueDate.toISOString(),
      amountDue: tenant.rentAmount,
      amountPaid: 0,
      status: 'pending',
      tenantName: tenant.name,
      propertyId: tenant.propertyId
    });

    currentPointer.setMonth(currentPointer.getMonth() + 1);
  }

  let totalPaidPool = tenantRentPayments.reduce((sum, p) => sum + p.amount, 0);

  for (const installment of ledger) {
    if (totalPaidPool <= 0) break;

    const amountToApply = Math.min(installment.amountDue, totalPaidPool);
    installment.amountPaid += amountToApply;
    totalPaidPool -= amountToApply;
  }

  const todayTime = now.getTime();
  
  ledger.forEach(inst => {
    if (inst.amountPaid >= inst.amountDue) {
      inst.status = 'paid';
    } else if (inst.amountPaid > 0) {
      inst.status = 'partial';
    } else {
      const dueTime = new Date(inst.dueDate).getTime();
      if (todayTime > dueTime || tenant.status === 'past') {
        inst.status = 'overdue';
      } else {
        inst.status = 'pending';
      }
    }
  });

  return ledger.reverse();
};

/**
 * Calculate Exit Position for Move-Out
 */
export const calculateMoveOutFinancials = (tenant: Tenant, payments: Payment[]) => {
  const deposits = payments
    .filter(p => p.tenantId === tenant.id && p.type === PaymentType.DEPOSIT)
    .reduce((sum, p) => sum + p.amount, 0);

  const ledger = generateLedger(tenant, payments);
  const unpaidRent = ledger.reduce((sum, row) => sum + (row.amountDue - row.amountPaid), 0);
  
  return {
    depositHeld: deposits,
    unpaidRent: unpaidRent,
    netRefundable: deposits - unpaidRent 
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
  // Revenue includes Rent, Deposit, and Late Fees
  const totalRevenue = payments
    .filter(p => p.type === PaymentType.RENT || p.type === PaymentType.DEPOSIT || p.type === PaymentType.LATE_FEE)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalExpenses = payments
    .filter(p => p.type === PaymentType.EXPENSE)
    .reduce((sum, p) => sum + p.amount, 0);

  let totalOutstanding = 0;
  tenants.forEach(tenant => {
    if (tenant.status === 'active') {
        const ledger = generateLedger(tenant, payments);
        ledger.forEach(l => {
            if (l.status === 'overdue' || l.status === 'partial') {
                totalOutstanding += (l.amountDue - l.amountPaid);
            }
        });
    }
  });

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

  // --- Valuation & Depreciation ---
  const currentVal = property.currentMarketValue || property.purchasePrice;
  const valuationDelta = currentVal - property.purchasePrice; 

  // --- ROI & Income Logic ---
  const totalRevenue = propPayments
    .filter(p => p.type === PaymentType.RENT || p.type === PaymentType.DEPOSIT || p.type === PaymentType.LATE_FEE)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalExpenses = propPayments
    .filter(p => p.type === PaymentType.EXPENSE)
    .reduce((sum, p) => sum + p.amount, 0);

  const netIncome = totalRevenue - totalExpenses;

  let roi = 0;
  let capRate = 0;

  if (isPersonal) {
    roi = property.purchasePrice > 0 
      ? ((currentVal - property.purchasePrice) / property.purchasePrice) * 100 
      : 0;
  } else {
    roi = totalEquityPaid > 0 ? (netIncome / totalEquityPaid) * 100 : 0;
    
    const purchaseDate = new Date(property.purchaseDate);
    const now = new Date();
    const monthsOwned = Math.max(1, (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth()));
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
    capRate,
    valuationDelta,
    currentVal
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
 */
export const generateIncomeStatement = (payments: Payment[], year: number) => {
  const yearlyPayments = payments.filter(p => new Date(p.date).getFullYear() === year);

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
    } else if (p.type === PaymentType.LATE_FEE) {
      statement.revenue.Other += p.amount;
      statement.revenue.Total += p.amount;
    } else if (p.type === PaymentType.EXPENSE) {
      let category = p.expenseCategory as string;
      if (!category) {
        category = p.note ? p.note.split(':')[0].trim() : 'Uncategorized';
      }
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
 * Generate Aggregated Financial Summary
 */
export const generateFinancialSummary = (payments: Payment[]) => {
  const monthly: Record<string, { income: number; expense: number }> = {};
  const yearly: Record<string, { income: number; expense: number }> = {};

  payments.forEach(p => {
    const date = new Date(p.date);
    if (isNaN(date.getTime())) return;

    const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const yKey = `${date.getFullYear()}`;
    
    if (!monthly[mKey]) monthly[mKey] = { income: 0, expense: 0 };
    if (!yearly[yKey]) yearly[yKey] = { income: 0, expense: 0 };

    const amount = p.amount;

    if (p.type === PaymentType.EXPENSE) {
      monthly[mKey].expense += amount;
      yearly[yKey].expense += amount;
    } else if (p.type === PaymentType.RENT || p.type === PaymentType.DEPOSIT || p.type === PaymentType.LATE_FEE) {
      monthly[mKey].income += amount;
      yearly[yKey].income += amount;
    }
  });

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

/**
 * Generate PDF Receipt using jsPDF
 */
export const generateReceiptPDF = (tenant: Tenant, payment: Payment, property: Property) => {
  const doc = new jsPDF({ format: 'a5', orientation: 'landscape', unit: 'mm' });
  const primaryColor = '#4f46e5'; // Indigo 600

  // Header Background
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(0, 0, 210, 30, 'F');

  // Logo / Brand
  doc.setFontSize(18);
  doc.setTextColor(primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("PropLedger", 10, 15);
  
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("OFFICIAL RECEIPT", 10, 22);

  // Receipt Details
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Receipt No: #${payment.id.slice(-6).toUpperCase()}`, 150, 15);
  doc.text(`Date: ${payment.date}`, 150, 22);

  // Content Box
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.rect(10, 40, 190, 80);

  // From / To
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Received From:", 15, 50);
  doc.text("For Property:", 100, 50);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(tenant.name, 15, 58);
  doc.text(property.name, 100, 58);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(property.address, 100, 64);

  // Amount
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.roundedRect(15, 75, 180, 25, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Amount Received", 20, 85);
  
  doc.setFontSize(16);
  doc.setTextColor(primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text(formatPHP(payment.amount), 20, 95);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Payment Method:", 120, 85);
  doc.setTextColor(0);
  doc.text(payment.method, 120, 95);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("This receipt is generated electronically by PropLedger Pro.", 10, 135);

  doc.save(`Receipt_${payment.date}_${tenant.name.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Get Upcoming Lease Expirations
 */
export const getUpcomingExpirations = (tenants: Tenant[]) => {
  const today = new Date();
  const threshold = new Date();
  threshold.setDate(today.getDate() + 60); // Next 60 days

  return tenants
    .filter(t => t.status === 'active' && t.leaseEnd)
    .map(t => {
      const endDate = new Date(t.leaseEnd!);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...t, daysLeft: diffDays };
    })
    .filter(t => t.daysLeft >= 0 && t.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);
};
