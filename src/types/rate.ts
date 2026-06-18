export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  rate: number;
  order: number;
}

export interface RateRule {
  id: string;
  equipmentId: string;
  equipmentName: string;
  baseHourlyRate: number;
  baseDailyRate: number;
  timeSlots: TimeSlot[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PenaltyRule {
  id: string;
  name: string;
  penaltyRate: number;
  penaltyUnit: 'hour' | 'day';
  gracePeriod: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingConfig {
  nearExpiryDays: number;
  defaultPenaltyRule: PenaltyRule;
  minRentalHours: number;
  roundingRule: 'up' | 'down' | 'none';
}

export interface TimeSegment {
  startTime: string;
  endTime: string;
  duration: number;
  rate: number;
  slotName: string;
  amount: number;
}

export interface BillingDetail {
  segments: TimeSegment[];
  baseAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  totalHours: number;
  penaltyHours: number;
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  nearExpiryDays: 7,
  defaultPenaltyRule: {
    id: 'default',
    name: '超期罚金规则',
    penaltyRate: 1.5,
    penaltyUnit: 'hour',
    gracePeriod: 30,
    isEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  minRentalHours: 1,
  roundingRule: 'up'
};
