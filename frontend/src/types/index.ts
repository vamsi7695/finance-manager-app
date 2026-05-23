export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
}

export interface Card {
  id: string;
  cardNumber: string;
  cardType: 'CREDIT' | 'DEBIT';
  bankName: string;
  expiryDate: string;
  cardHolderName: string;
  lastFourDigits: string;
  encrypted: boolean;
  perks: Perk[];
}

export interface Perk {
  id: string;
  cardId: string;
  name: string;
  description: string;
  category: string;
}

export interface Insurance {
  id: string;
  provider: string;
  policyNumber: string;
  type: string; // health, life, vehicle, etc.
  premium: number;
  coverageAmount: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}

export interface Loan {
  id: string;
  lender: string;
  type: string; // home, personal, car, education
  principalAmount: number;
  interestRate: number;
  emiAmount: number;
  startDate: string;
  endDate: string;
  outstandingBalance: number;
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
}
