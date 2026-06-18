import { create } from 'zustand';
import type { RateRule, TimeSlot, PenaltyRule, BillingConfig } from '@/types/rate';
import { DEFAULT_BILLING_CONFIG } from '@/types/rate';
import { mockRateRules, mockPenaltyRules, mockBillingConfig } from '@/data/mockRate';
import { validateTimeSlotOverlap } from '@/utils/billing';
import { useEquipmentStore } from './useEquipmentStore';

interface RateState {
  rateRules: RateRule[];
  penaltyRules: PenaltyRule[];
  billingConfig: BillingConfig;
  loading: boolean;
  error: string | null;
  selectedRule: RateRule | null;
  _initialized: boolean;

  fetchRateRules: () => void;
  fetchPenaltyRules: () => void;
  fetchBillingConfig: () => void;
  getRateRuleByEquipment: (equipmentId: string) => RateRule;
  getRateRuleById: (id: string) => RateRule | undefined;
  getDefaultRateRule: () => RateRule;

  addRateRule: (data: Omit<RateRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRateRule: (id: string, data: Partial<RateRule>) => void;
  deleteRateRule: (id: string) => void;

  addTimeSlot: (ruleId: string, slot: Omit<TimeSlot, 'id'>) => boolean;
  updateTimeSlot: (ruleId: string, slotId: string, data: Partial<TimeSlot>) => boolean;
  deleteTimeSlot: (ruleId: string, slotId: string) => void;
  removeTimeSlot: (ruleId: string, slotId: string) => void;

  addPenaltyRule: (data: Omit<PenaltyRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePenaltyRule: (id: string, data: Partial<PenaltyRule>) => void;
  togglePenaltyRule: (id: string) => void;

  updateBillingConfig: (config: Partial<BillingConfig>) => void;
  setSelectedRule: (rule: RateRule | null) => void;
}

const normalizeRateRule = (rule: RateRule): RateRule => ({
  ...rule,
  baseRate: rule.baseRate ?? rule.baseHourlyRate ?? 0,
  baseHourlyRate: rule.baseHourlyRate ?? rule.baseRate,
  dailyRate: rule.dailyRate ?? rule.baseDailyRate,
  baseDailyRate: rule.baseDailyRate ?? rule.dailyRate
});

const normalizePenaltyRule = (rule: PenaltyRule): PenaltyRule => ({
  ...rule,
  gracePeriodHours: rule.gracePeriodHours ?? rule.gracePeriod ?? 0,
  gracePeriod: rule.gracePeriod ?? rule.gracePeriodHours ?? 0,
  enabled: rule.enabled ?? rule.isEnabled ?? false,
  isEnabled: rule.isEnabled ?? rule.enabled
});

const normalizeBillingConfig = (config: BillingConfig): BillingConfig => ({
  ...DEFAULT_BILLING_CONFIG,
  ...config,
  nearExpiryDays: config.nearExpiryDays ?? DEFAULT_BILLING_CONFIG.nearExpiryDays,
  minBillingUnit: config.minBillingUnit ?? DEFAULT_BILLING_CONFIG.minBillingUnit,
  timePrecision: config.timePrecision ?? DEFAULT_BILLING_CONFIG.timePrecision,
  amountPrecision: config.amountPrecision ?? DEFAULT_BILLING_CONFIG.amountPrecision,
  roundingMode: config.roundingMode ?? DEFAULT_BILLING_CONFIG.roundingMode,
  autoLockExpired: config.autoLockExpired ?? DEFAULT_BILLING_CONFIG.autoLockExpired,
  enableOverduePenalty: config.enableOverduePenalty ?? DEFAULT_BILLING_CONFIG.enableOverduePenalty,
  defaultGracePeriodHours: config.defaultGracePeriodHours ?? DEFAULT_BILLING_CONFIG.defaultGracePeriodHours,
  enableOverdueReminder: config.enableOverdueReminder ?? DEFAULT_BILLING_CONFIG.enableOverdueReminder
});

export const useRateStore = create<RateState>((set, get) => ({
  rateRules: [],
  penaltyRules: [],
  billingConfig: normalizeBillingConfig(mockBillingConfig),
  loading: false,
  error: null,
  selectedRule: null,
  _initialized: false,

  fetchRateRules: () => {
    const { rateRules, _initialized } = get();
    if (_initialized && rateRules.length > 0) {
      set({ loading: false });
      return;
    }
    set({ loading: true });
    try {
      const normalized = mockRateRules.map(normalizeRateRule);
      set({ rateRules: normalized, loading: false, _initialized: true });
    } catch (err) {
      set({ error: '获取费率规则失败', loading: false });
      console.error('[RateStore] fetchRateRules error:', err);
    }
  },

  fetchPenaltyRules: () => {
    const { penaltyRules, _initialized } = get();
    if (_initialized && penaltyRules.length > 0) {
      set({ loading: false });
      return;
    }
    set({ loading: true });
    try {
      const normalized = mockPenaltyRules.map(normalizePenaltyRule);
      set({ penaltyRules: normalized, loading: false });
    } catch (err) {
      set({ error: '获取罚金规则失败', loading: false });
      console.error('[RateStore] fetchPenaltyRules error:', err);
    }
  },

  fetchBillingConfig: () => {
    set({ loading: false });
  },

  getRateRuleByEquipment: (equipmentId: string) => {
    const rule = get().rateRules.find(r => r.equipmentId === equipmentId);
    const defaultRule = get().rateRules.find(r => r.equipmentId === 'default');
    return rule || defaultRule || get().rateRules[0];
  },

  getDefaultRateRule: () => {
    return get().rateRules.find(r => r.equipmentId === 'default') || get().rateRules[0];
  },

  getRateRuleById: (id: string) => {
    const rule = get().rateRules.find(r => r.id === id);
    return rule ? normalizeRateRule(rule) : undefined;
  },

  removeTimeSlot: (ruleId: string, slotId: string) => {
    get().deleteTimeSlot(ruleId, slotId);
  },

  addRateRule: (data) => {
    const newRule: RateRule = normalizeRateRule({
      ...data,
      id: `RULE${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    set(state => ({ rateRules: [...state.rateRules, newRule] }));
    console.log('[RateStore] addRateRule:', newRule);
  },

  updateRateRule: (id, data) => {
    set(state => ({
      rateRules: state.rateRules.map(r =>
        r.id === id ? normalizeRateRule({ ...r, ...data, updatedAt: new Date().toISOString() }) : r
      )
    }));
    console.log('[RateStore] updateRateRule:', { id, data });
  },

  deleteRateRule: (id) => {
    set(state => ({
      rateRules: state.rateRules.filter(r => r.id !== id && r.equipmentId !== 'default')
    }));
    console.log('[RateStore] deleteRateRule:', id);
  },

  addTimeSlot: (ruleId, slot) => {
    const rule = get().rateRules.find(r => r.id === ruleId);
    if (!rule) return false;

    const allSlots = [...rule.timeSlots, slot];
    if (!validateTimeSlotOverlap(allSlots)) {
      set({ error: '时段存在重叠，请检查时间设置' });
      return false;
    }

    const newSlot: TimeSlot = {
      ...slot,
      id: `TS${Date.now()}`
    };

    set(state => ({
      rateRules: state.rateRules.map(r =>
        r.id === ruleId
          ? { ...r, timeSlots: [...r.timeSlots, newSlot], updatedAt: new Date().toISOString() }
          : r
      ),
      error: null
    }));
    console.log('[RateStore] addTimeSlot:', { ruleId, newSlot });
    return true;
  },

  updateTimeSlot: (ruleId, slotId, data) => {
    const rule = get().rateRules.find(r => r.id === ruleId);
    if (!rule) return false;

    const updatedSlots = rule.timeSlots.map(s =>
      s.id === slotId ? { ...s, ...data } : s
    );

    if (!validateTimeSlotOverlap(updatedSlots)) {
      set({ error: '时段存在重叠，请检查时间设置' });
      return false;
    }

    set(state => ({
      rateRules: state.rateRules.map(r =>
        r.id === ruleId
          ? { ...r, timeSlots: updatedSlots, updatedAt: new Date().toISOString() }
          : r
      ),
      error: null
    }));
    console.log('[RateStore] updateTimeSlot:', { ruleId, slotId, data });
    return true;
  },

  deleteTimeSlot: (ruleId, slotId) => {
    set(state => ({
      rateRules: state.rateRules.map(r =>
        r.id === ruleId
          ? {
              ...r,
              timeSlots: r.timeSlots.filter(s => s.id !== slotId),
              updatedAt: new Date().toISOString()
            }
          : r
      )
    }));
    console.log('[RateStore] deleteTimeSlot:', { ruleId, slotId });
  },

  addPenaltyRule: (data) => {
    const newRule: PenaltyRule = normalizePenaltyRule({
      ...data,
      id: `PEN${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    set(state => ({ penaltyRules: [...state.penaltyRules, newRule] }));
    console.log('[RateStore] addPenaltyRule:', newRule);
  },

  updatePenaltyRule: (id, data) => {
    set(state => ({
      penaltyRules: state.penaltyRules.map(p =>
        p.id === id ? normalizePenaltyRule({ ...p, ...data, updatedAt: new Date().toISOString() }) : p
      )
    }));
    console.log('[RateStore] updatePenaltyRule:', { id, data });
  },

  togglePenaltyRule: (id) => {
    set(state => ({
      penaltyRules: state.penaltyRules.map(p =>
        p.id === id
          ? normalizePenaltyRule({
              ...p,
              enabled: !p.enabled,
              isEnabled: !p.enabled,
              updatedAt: new Date().toISOString()
            })
          : p
      )
    }));
    console.log('[RateStore] togglePenaltyRule:', id);
  },

  updateBillingConfig: (config) => {
    const oldNearExpiryDays = get().billingConfig.nearExpiryDays;
    
    set(state => ({
      billingConfig: normalizeBillingConfig({ ...state.billingConfig, ...config })
    }));

    if (config.nearExpiryDays !== undefined && config.nearExpiryDays !== oldNearExpiryDays) {
      useEquipmentStore.getState().setNearExpiryDays(config.nearExpiryDays);
    }
    console.log('[RateStore] updateBillingConfig:', config);
  },

  setSelectedRule: (rule) => {
    set({ selectedRule: rule ? normalizeRateRule(rule) : null });
  }
}));
