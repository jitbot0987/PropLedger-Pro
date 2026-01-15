
export enum PropertyType {
  RESIDENTIAL = 'Residential',
  COMMERCIAL = 'Commercial',
  INDUSTRIAL = 'Industrial',
  PERSONAL = 'Personal Use',
}

export enum PaymentType {
  RENT = 'Rent',
  DEPOSIT = 'Deposit',
  EXPENSE = 'Expense',
  EQUITY = 'Equity',
  LATE_FEE = 'Late Fee', // New Type
}

export enum PaymentMethod {
  CASH = 'Cash',
  GCASH = 'GCash',
  BANK_TRANSFER = 'Bank Transfer',
  CHEQUE = 'Cheque',
  OTHER = 'Other'
}

// Explicit Expense Categories
export type ExpenseCategory = 
  | 'Maintenance' 
  | 'Tax' 
  | 'Insurance' 
  | 'Utilities' 
  | 'Mortgage' 
  | 'HOA' 
  | 'Marketing'
  | 'Legal'
  | 'Other';

export interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  purchasePrice: number;
  purchaseDate: string; // ISO Date
  image?: string;
  // Financing Details
  downPayment: number;
  monthlyAmortization: number;
  // Valuation for Personal Use ROI
  currentMarketValue?: number;
}

export interface Tenant {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  rentAmount: number;
  rentDueDay: number; // 1-28
  leaseStart: string; // ISO Date
  leaseEnd?: string; // ISO Date
  status: 'active' | 'past';
}

export interface Payment {
  id: string;
  tenantId?: string; // Optional if it's a general property expense
  propertyId: string;
  amount: number;
  date: string; // ISO Date
  type: PaymentType;
  method: PaymentMethod;
  note?: string;
  monthKey?: string; // YYYY-MM helper for rent mapping
  expenseCategory?: ExpenseCategory; // New explicit field
}

export interface RentInstallment {
  monthKey: string; // YYYY-MM
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: 'paid' | 'partial' | 'overdue' | 'pending';
  tenantName: string;
  propertyId: string;
}

export interface AppState {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
}

export interface DashboardMetrics {
  totalRevenue: number;
  occupancyRate: number;
  outstandingRent: number;
  netIncome: number;
}
