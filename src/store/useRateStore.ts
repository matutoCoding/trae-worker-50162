import { create } from 'zustand';
import type { RateRule, TimeSlot, PenaltyRule, BillingConfig } from '@/types/rate';
import { mockRateRules, mockPenaltyRules, mockBillingConfig } from '@/data/mockRate';
import { validateTimeSlotOverlap } from '@/utils/billing';

interface RateState {
  rateRules: RateRule[];
  penaltyRules: PenaltyRule[];
  billingConfig: BillingConfig;
  loading: boolean;
  error: string | null;
  selectedRule: RateRule | null;

  fetchRateRules: () => void;
  fetchPenaltyRules: () => void;
  getRateRuleByEquipment: (equipmentId: string) => RateRule;
  getDefaultRateRule: () => RateRule;

  addRateRule: (data: Omit<RateRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRateRule: (id: string, data: Partial<RateRule>) => void;
  deleteRateRule: (id: string) => void;

  addTimeSlot: (ruleId: string, slot: Omit<TimeSlot, 'id'>) => boolean;
  updateTimeSlot: (ruleId: string, slotId: string, data: Partial<TimeSlot>) => boolean;
  deleteTimeSlot: (ruleId: string, slotId: string) => void;

  addPenaltyRule: (data: Omit<PenaltyRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePenaltyRule: (id: string, data: Partial<PenaltyRule>) => void;
  togglePenaltyRule: (id: string) => void;

  updateBillingConfig: (config: Partial<BillingConfig>) => void;
  setSelectedRule: (rule: RateRule | null) => void;
}

export const useRateStore = create<RateState>((set, get) => ({
  rateRules: [],
  penaltyRules: [],
  billingConfig: mockBillingConfig,
  loading: false,
  error: null,
  selectedRule: null,

  fetchRateRules: () => {
    set({ loading: true });
    try {
      set({ rateRules: mockRateRules, loading: false });
    } catch (err) {
      set({ error: '获取费率规则失败', loading: false });
      console.error('[RateStore] fetchRateRules error:', err);
    }
  },

  fetchPenaltyRules: () => {
    set({ loading: true });
    try {
      set({ penaltyRules: mockPenaltyRules, loading: false });
    } catch (err) {
      set({ error: '获取罚金规则失败', loading: false });
      console.error('[RateStore] fetchPenaltyRules error:', err);
    }
  },

  getRateRuleByEquipment: (equipmentId: string) => {
    const rule = get().rateRules.find(r => r.equipmentId === equipmentId);
    return rule || get().rateRules.find(r => r.equipmentId === 'default') || get().rateRules[0];
  },

  getDefaultRateRule: () => {
    return get().rateRules.find(r => r.equipmentId === 'default') || get().rateRules[0];
  },

  addRateRule: (data) => {
    const newRule: RateRule = {
      ...data,
      id: `RULE${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set(state => ({ rateRules: [...state.rateRules, newRule] }));
    console.log('[RateStore] addRateRule:', newRule);
  },

  updateRateRule: (id, data) => {
    set(state => ({
      rateRules: state.rateRules.map(r =>
        r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
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
    const newRule: PenaltyRule = {
      ...data,
      id: `PEN${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set(state => ({ penaltyRules: [...state.penaltyRules, newRule] }));
    console.log('[RateStore] addPenaltyRule:', newRule);
  },

  updatePenaltyRule: (id, data) => {
    set(state => ({
      penaltyRules: state.penaltyRules.map(p =>
        p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      )
    }));
    console.log('[RateStore] updatePenaltyRule:', { id, data });
  },

  togglePenaltyRule: (id) => {
    set(state => ({
      penaltyRules: state.penaltyRules.map(p =>
        p.id === id ? { ...p, isEnabled: !p.isEnabled, updatedAt: new Date().toISOString() } : p
      )
    }));
    console.log('[RateStore] togglePenaltyRule:', id);
  },

  updateBillingConfig: (config) => {
    set(state => ({
      billingConfig: { ...state.billingConfig, ...config }
    }));
    console.log('[RateStore] updateBillingConfig:', config);
  },

  setSelectedRule: (rule) => {
    set({ selectedRule: rule });
  }
}));
