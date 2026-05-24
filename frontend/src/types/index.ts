export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface Home {
  id: string;
  name: string;
  inviteCode: string;
  currency?: string;
  createdBy: string;
  createdAt: string;
}

export interface HomeMembership {
  id: string;
  home: Home;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  subCategory?: string;
  description: string;
  date: string;
  paymentMethod: string;
  tags?: string;
  markAsTransfer?: boolean;
  rewardEligibility?: string;
  paidBy?: string;
}

export interface RecurringExpense {
  id: string;
  label: string;
  amount: number;
  frequency: string;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  category: string;
  subCategory?: string;
  paymentMethod?: string;
  paidBy?: string;
  description?: string;
  tags?: string;
  markAsTransfer?: boolean;
  rewardEligibility?: string;
  active?: boolean;
  lastGeneratedDate?: string;
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
  type: string;
  principalAmount: number;
  interestRate: number;
  emiAmount: number;
  startDate: string;
  endDate: string;
  outstandingBalance: number;
  tenureMonths?: number;
  prepayments?: string; // JSON array
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
}

export interface Prepayment {
  id: string;
  month: number; // month number from start (1-based)
  amount: number;
  type: 'reduce-tenure' | 'reduce-emi';
  kind?: 'part-payment' | 'rate-change'; // default: part-payment
  newRate?: number; // for rate-change
  day?: number; // day of month (optional)
  frequency?: 'one-time' | 'monthly' | 'quarterly' | 'yearly'; // default: one-time
}

export interface LoanTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'interest' | 'principal' | 'rate_change';
  note?: string;
}
