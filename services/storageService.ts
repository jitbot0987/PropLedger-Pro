
import { AppState, PropertyType, PaymentType, PaymentMethod } from '../types';

const STORAGE_KEY = 'prop_ledger_v1';
const CURRENT_VERSION = 1;

interface StorageSchema extends AppState {
  version: number;
}

const SEED_DATA: AppState = {
  properties: [
    {
      id: 'prop_1',
      name: 'Sunset Heights Apt 4B',
      address: '123 Sunset Blvd, Makati City',
      type: PropertyType.RESIDENTIAL,
      purchasePrice: 8500000,
      purchaseDate: '2021-06-15',
      image: 'https://picsum.photos/400/300',
      downPayment: 1700000, // 20%
      monthlyAmortization: 45000
    },
    {
      id: 'prop_2',
      name: 'Downtown Commercial Unit',
      address: '45 Corporate Drive, BGC',
      type: PropertyType.COMMERCIAL,
      purchasePrice: 15000000,
      purchaseDate: '2020-01-20',
      image: 'https://picsum.photos/401/300',
      downPayment: 5000000,
      monthlyAmortization: 85000
    },
    {
      id: 'prop_3',
      name: 'Tagaytay Vacation Home',
      address: 'Highlands Dr, Tagaytay',
      type: PropertyType.PERSONAL,
      purchasePrice: 12000000,
      currentMarketValue: 14500000, // Appreciated
      purchaseDate: '2019-11-10',
      image: 'https://picsum.photos/402/300',
      downPayment: 4000000,
      monthlyAmortization: 35000
    }
  ],
  tenants: [
    {
      id: 'ten_1',
      propertyId: 'prop_1',
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      rentAmount: 25000,
      rentDueDay: 5,
      leaseStart: '2023-01-01',
      status: 'active'
    },
    {
      id: 'ten_2',
      propertyId: 'prop_2',
      name: 'TechStart Inc.',
      email: 'billing@techstart.ph',
      rentAmount: 85000,
      rentDueDay: 15,
      leaseStart: '2023-03-01',
      status: 'active'
    }
  ],
  payments: [
    {
      id: 'pay_1',
      propertyId: 'prop_1',
      tenantId: 'ten_1',
      amount: 25000,
      date: '2023-01-05',
      type: PaymentType.RENT,
      method: PaymentMethod.GCASH,
      monthKey: '2023-01'
    },
     {
      id: 'pay_2',
      propertyId: 'prop_1',
      tenantId: 'ten_1',
      amount: 25000,
      date: '2023-02-05',
      type: PaymentType.RENT,
      method: PaymentMethod.BANK_TRANSFER,
      monthKey: '2023-02'
    },
     {
      id: 'pay_3',
      propertyId: 'prop_2',
      tenantId: 'ten_2',
      amount: 85000,
      date: '2023-03-15',
      type: PaymentType.RENT,
      method: PaymentMethod.CHEQUE,
      monthKey: '2023-03'
    },
    {
      id: 'pay_4',
      propertyId: 'prop_3', // Personal expense
      amount: 5000,
      date: '2023-04-01',
      type: PaymentType.EXPENSE,
      method: PaymentMethod.CASH,
      note: 'Maintenance: Garden',
      monthKey: '2023-04'
    }
  ]
};

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      console.log('No data found. Seeding database...');
      saveState(SEED_DATA);
      return SEED_DATA;
    }

    const data = JSON.parse(serialized);
    
    // Simple migration check (extendable)
    if (!data.version || data.version < CURRENT_VERSION) {
      console.log('Migrating data schema...');
      // Logic for migration would go here
    }

    // Ensure backwards compatibility if new fields are missing in old data
    const properties = (data.properties || []).map((p: any) => ({
      ...p,
      downPayment: p.downPayment || 0,
      monthlyAmortization: p.monthlyAmortization || 0,
      currentMarketValue: p.currentMarketValue || 0 // Default for existing data
    }));

    const payments = (data.payments || []).map((p: any) => ({
      ...p,
      method: p.method || PaymentMethod.CASH
    }));

    return {
      properties,
      tenants: data.tenants || [],
      payments,
    };
  } catch (error) {
    console.error('Failed to load state', error);
    return SEED_DATA;
  }
};

export const saveState = (state: AppState) => {
  try {
    const storageObject: StorageSchema = {
      ...state,
      version: CURRENT_VERSION
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageObject));
  } catch (error) {
    console.error('Failed to save state', error);
  }
};
