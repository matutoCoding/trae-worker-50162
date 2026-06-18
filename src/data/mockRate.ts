import type { RateRule, PenaltyRule, BillingConfig } from '@/types/rate';
import { DEFAULT_BILLING_CONFIG } from '@/types/rate';

const now = new Date().toISOString();

export const mockRateRules: RateRule[] = [
  {
    id: 'RULE001',
    equipmentId: 'EQ001',
    equipmentName: '博世电锤GBH2-26',
    baseRate: 10,
    baseHourlyRate: 10,
    dailyRate: 50,
    baseDailyRate: 50,
    timeSlots: [
      { id: 'TS001', name: '早高峰', startTime: '08:00', endTime: '12:00', rate: 12, order: 1 },
      { id: 'TS002', name: '午间', startTime: '12:00', endTime: '14:00', rate: 8, order: 2 },
      { id: 'TS003', name: '下午', startTime: '14:00', endTime: '18:00', rate: 12, order: 3 },
      { id: 'TS004', name: '晚间', startTime: '18:00', endTime: '22:00', rate: 15, order: 4 },
      { id: 'TS005', name: '夜间', startTime: '22:00', endTime: '08:00', rate: 6, order: 5 }
    ],
    isDefault: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'RULE002',
    equipmentId: 'EQ002',
    equipmentName: '东成角磨机S1M-FF03',
    baseRate: 7,
    baseHourlyRate: 7,
    dailyRate: 35,
    baseDailyRate: 35,
    timeSlots: [
      { id: 'TS006', name: '工作时间', startTime: '08:00', endTime: '18:00', rate: 8, order: 1 },
      { id: 'TS007', name: '加班时间', startTime: '18:00', endTime: '22:00', rate: 10, order: 2 },
      { id: 'TS008', name: '夜间', startTime: '22:00', endTime: '08:00', rate: 5, order: 3 }
    ],
    isDefault: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'RULE003',
    equipmentId: 'EQ003',
    equipmentName: '莱卡激光测距仪D2',
    baseRate: 15,
    baseHourlyRate: 15,
    dailyRate: 80,
    baseDailyRate: 80,
    timeSlots: [
      { id: 'TS009', name: '工作日', startTime: '08:00', endTime: '18:00', rate: 15, order: 1 },
      { id: 'TS010', name: '晚间', startTime: '18:00', endTime: '22:00', rate: 20, order: 2 },
      { id: 'TS011', name: '夜间', startTime: '22:00', endTime: '08:00', rate: 10, order: 3 }
    ],
    isDefault: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'RULE004',
    equipmentId: 'default',
    equipmentName: '通用费率',
    baseRate: 8,
    baseHourlyRate: 8,
    dailyRate: 40,
    baseDailyRate: 40,
    timeSlots: [
      { id: 'TS012', name: '工作日白天', startTime: '08:00', endTime: '18:00', rate: 8, order: 1 },
      { id: 'TS013', name: '工作日晚间', startTime: '18:00', endTime: '22:00', rate: 12, order: 2 },
      { id: 'TS014', name: '夜间', startTime: '22:00', endTime: '08:00', rate: 5, order: 3 },
      { id: 'TS015', name: '周末全天', startTime: '00:00', endTime: '24:00', rate: 10, order: 4 }
    ],
    isDefault: true,
    createdAt: now,
    updatedAt: now
  }
];

export const mockPenaltyRules: PenaltyRule[] = [
  {
    id: 'PEN001',
    name: '标准超期罚金',
    description: '适用于大部分设备的标准超期罚金规则',
    penaltyRate: 1.5,
    penaltyUnit: 'hourly',
    gracePeriod: 120,
    gracePeriodHours: 2,
    enabled: true,
    isEnabled: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'PEN002',
    name: '重型设备罚金',
    description: '适用于大型或重型设备，罚金费率更高',
    penaltyRate: 2.0,
    penaltyUnit: 'hourly',
    gracePeriod: 240,
    gracePeriodHours: 4,
    enabled: true,
    isEnabled: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'PEN003',
    name: '按天罚金',
    description: '按天计算罚金，适用于长期租赁设备',
    penaltyRate: 1.2,
    penaltyUnit: 'daily',
    gracePeriod: 1440,
    gracePeriodHours: 24,
    enabled: false,
    isEnabled: false,
    createdAt: now,
    updatedAt: now
  }
];

export const mockBillingConfig: BillingConfig = {
  ...DEFAULT_BILLING_CONFIG
};

export const getRateRuleByEquipmentId = (equipmentId: string): RateRule => {
  return mockRateRules.find(r => r.equipmentId === equipmentId) || mockRateRules[3];
};

export const getDefaultRateRule = (): RateRule => {
  return mockRateRules[3];
};

export const getEnabledPenaltyRules = (): PenaltyRule[] => {
  return mockPenaltyRules.filter(p => p.enabled || p.isEnabled);
};
