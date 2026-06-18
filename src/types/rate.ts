export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  rate: number;
  order?: number;
}

export interface RateRule {
  id: string;
  equipmentId: string;
  equipmentName?: string;
  baseRate: number;
  baseHourlyRate?: number;
  dailyRate?: number;
  baseDailyRate?: number;
  timeSlots: TimeSlot[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PenaltyRule {
  id: string;
  name: string;
  description?: string;
  penaltyRate: number;
  penaltyUnit: 'hourly' | 'daily' | 'hour' | 'day';
  gracePeriod?: number;
  gracePeriodHours: number;
  enabled: boolean;
  isEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingConfig {
  nearExpiryDays: number;
  defaultPenaltyRule: PenaltyRule;
  minRentalHours?: number;
  minBillingUnit: number;
  timePrecision: number;
  amountPrecision: number;
  roundingMode: 'round' | 'ceil' | 'floor';
  roundingRule?: 'up' | 'down' | 'none';
  autoLockExpired: boolean;
  enableOverduePenalty: boolean;
  defaultGracePeriodHours: number;
  enableOverdueReminder: boolean;
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
    name: '标准超期罚金',
    description: '超过约定租期的宽限期后开始计算罚金',
    penaltyRate: 1.5,
    penaltyUnit: 'hourly',
    gracePeriodHours: 2,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  minBillingUnit: 30,
  timePrecision: 2,
  amountPrecision: 2,
  roundingMode: 'round',
  autoLockExpired: true,
  enableOverduePenalty: true,
  defaultGracePeriodHours: 2,
  enableOverdueReminder: true
};
