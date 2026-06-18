import { create } from 'zustand';
import type { Equipment, EquipmentBatch, EquipmentFormData, BatchFormData } from '@/types/equipment';
import { mockEquipmentList } from '@/data/mockEquipment';
import { getBatchStatus, generateBatchNo } from '@/utils/date';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '@/utils/storage';

interface EquipmentState {
  equipments: Equipment[];
  loading: boolean;
  error: string | null;
  selectedEquipment: Equipment | null;
  nearExpiryDays: number;
  _initialized: boolean;

  fetchEquipments: () => void;
  fetchEquipmentById: (id: string) => Equipment | undefined;
  getEquipmentById: (id: string) => Equipment | undefined;
  addEquipment: (data: EquipmentFormData) => boolean;
  updateEquipment: (id: string, data: Partial<EquipmentFormData>) => void;
  deleteEquipment: (id: string) => void;

  addBatch: (equipmentId: string, data: BatchFormData) => void;
  updateBatch: (equipmentId: string, batchId: string, data: Partial<BatchFormData>) => void;
  lockBatch: (equipmentId: string, batchId: string) => void;
  unlockBatch: (equipmentId: string, batchId: string) => void;

  getAvailableBatches: (equipmentId: string, quantity: number) => { batchId: string; quantity: number }[];
  reduceStock: (equipmentId: string, batchId: string, quantity: number) => void;
  returnStock: (equipmentId: string, batchId: string, quantity: number) => void;

  setSelectedEquipment: (equipment: Equipment | null) => void;
  refreshBatchStatuses: () => void;
  setNearExpiryDays: (days: number) => void;
}

const normalizeEquipment = (eq: any, nearExpiryDays: number): Equipment => {
  const categoryIcons: Record<string, string> = {
    '电动工具': '🔧',
    '手动工具': '🔨',
    '测量仪器': '📏',
    '清洁设备': '🧹',
    '起重设备': '🪜',
    '升降设备': '🪜',
    '动力设备': '⚡',
    '园林工具': '🌿',
    '焊接设备': '🔥',
    '其他': '📦'
  };

  return {
    ...eq,
    specification: eq.specification || eq.spec || '',
    weeklyRate: eq.weeklyRate || eq.dailyRate * 6,
    monthlyRate: eq.monthlyRate || eq.dailyRate * 25,
    icon: eq.icon || categoryIcons[eq.category] || '📦',
    unit: eq.unit || '台',
    hourlyRate: eq.hourlyRate || 0,
    dailyRate: eq.dailyRate || 0,
    totalQuantity: eq.totalQuantity || 0,
    availableQuantity: eq.availableQuantity || 0,
    batches: (eq.batches || []).map((batch: any) => {
      const status = getBatchStatus(batch.expiryDate, nearExpiryDays);
      return {
        ...batch,
        availableQuantity: batch.availableQuantity ?? batch.quantity,
        status: batch.status === 'locked' ? 'locked' : status === 'expired' ? 'locked' : status
      };
    })
  };
};

export const useEquipmentStore = create<EquipmentState>((set, get) => ({
  equipments: [],
  loading: false,
  error: null,
  selectedEquipment: null,
  nearExpiryDays: 7,
  _initialized: false,

  fetchEquipments: () => {
    const { equipments, _initialized, nearExpiryDays } = get();
    if (_initialized && equipments.length > 0) {
      get().refreshBatchStatuses();
      set({ loading: false });
      return;
    }
    set({ loading: true });
    try {
      const savedDays = loadFromStorage<number>(STORAGE_KEYS.NEAR_EXPIRY_DAYS);
      const effectiveDays = savedDays ?? nearExpiryDays;
      const savedEquipments = loadFromStorage<Equipment[]>(STORAGE_KEYS.EQUIPMENTS);
      const source = savedEquipments && savedEquipments.length > 0 ? savedEquipments : mockEquipmentList;
      const updated = source.map(eq => normalizeEquipment(eq, effectiveDays));
      set({ equipments: updated, nearExpiryDays: effectiveDays, loading: false, _initialized: true });
      if (!savedEquipments || savedEquipments.length === 0) {
        saveToStorage(STORAGE_KEYS.EQUIPMENTS, updated);
        saveToStorage(STORAGE_KEYS.NEAR_EXPIRY_DAYS, effectiveDays);
      }
    } catch (err) {
      set({ error: '获取设备列表失败', loading: false });
      console.error('[EquipmentStore] fetchEquipments error:', err);
    }
  },

  fetchEquipmentById: (id: string) => {
    return get().equipments.find(eq => eq.id === id);
  },

  getEquipmentById: (id: string) => {
    return get().equipments.find(eq => eq.id === id);
  },

  addEquipment: (data: EquipmentFormData) => {
    try {
      const { nearExpiryDays } = get();
      const equipmentId = `EQ${Date.now()}`;
      let totalQty = 0;

      const batches = (data.batches || []).map(batchData => {
        totalQty += batchData.quantity;
        const status = getBatchStatus(batchData.expiryDate, nearExpiryDays);
        return {
          id: `${equipmentId}-batch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          batchNo: batchData.batchNo,
          equipmentId,
          productionDate: batchData.productionDate,
          expiryDate: batchData.expiryDate,
          quantity: batchData.quantity,
          availableQuantity: batchData.quantity,
          status: status === 'expired' ? 'locked' : status,
          createdAt: new Date().toISOString(),
          remark: batchData.remark
        } as EquipmentBatch;
      });

      const newEquipment = normalizeEquipment({
        id: equipmentId,
        name: data.name,
        category: data.category,
        spec: data.spec || data.specification,
        specification: data.specification,
        unit: data.unit || '台',
        totalQuantity: totalQty,
        availableQuantity: totalQty,
        dailyRate: data.dailyRate,
        weeklyRate: data.weeklyRate || data.dailyRate * 6,
        monthlyRate: data.monthlyRate || data.dailyRate * 25,
        hourlyRate: data.hourlyRate,
        imageUrl: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/300/300`,
        icon: data.icon,
        description: data.description,
        batches,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, nearExpiryDays);

      set(state => {
        const equipments = [...state.equipments, newEquipment];
        saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
        return { equipments };
      });
      console.log('[EquipmentStore] addEquipment:', newEquipment);
      return true;
    } catch (err) {
      console.error('[EquipmentStore] addEquipment error:', err);
      return false;
    }
  },

  updateEquipment: (id: string, data: Partial<EquipmentFormData>) => {
    set(state => {
      const equipments = state.equipments.map(eq =>
        eq.id === id
          ? { ...eq, ...data, updatedAt: new Date().toISOString() }
          : eq
      );
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
      return { equipments };
    });
    console.log('[EquipmentStore] updateEquipment:', { id, data });
  },

  deleteEquipment: (id: string) => {
    set(state => {
      const equipments = state.equipments.filter(eq => eq.id !== id);
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
      return { equipments };
    });
    console.log('[EquipmentStore] deleteEquipment:', id);
  },

  addBatch: (equipmentId: string, data: BatchFormData) => {
    const { nearExpiryDays } = get();
    const status = getBatchStatus(data.expiryDate, nearExpiryDays);
    const newBatch: EquipmentBatch = {
      id: `${equipmentId}-batch-${Date.now()}`,
      batchNo: data.batchNo || generateBatchNo(),
      equipmentId,
      ...data,
      availableQuantity: data.quantity,
      status: status === 'expired' ? 'locked' : status,
      createdAt: new Date().toISOString()
    };

    set(state => {
      const equipments = state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          totalQuantity: eq.totalQuantity + data.quantity,
          availableQuantity: eq.availableQuantity + data.quantity,
          batches: [...eq.batches, newBatch],
          updatedAt: new Date().toISOString()
        };
      });
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
      return { equipments };
    });
    console.log('[EquipmentStore] addBatch:', { equipmentId, newBatch });
  },

  updateBatch: (equipmentId: string, batchId: string, data: Partial<BatchFormData>) => {
    const { nearExpiryDays } = get();
    set(state => {
      const equipments = state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          batches: eq.batches.map(batch => {
            if (batch.id !== batchId) return batch;
            const updated = { ...batch, ...data };
            if (data.expiryDate) {
              const status = getBatchStatus(data.expiryDate, nearExpiryDays);
              updated.status = status === 'expired' ? 'locked' : status;
            }
            return updated;
          }),
          updatedAt: new Date().toISOString()
        };
      });
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
      return { equipments };
    });
  },

  lockBatch: (equipmentId: string, batchId: string) => {
    set(state => {
      const equipments = state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          batches: eq.batches.map(batch =>
            batch.id === batchId ? { ...batch, status: 'locked' as const } : batch
          ),
          updatedAt: new Date().toISOString()
        };
      });
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
      return { equipments };
    });
    console.log('[EquipmentStore] lockBatch:', { equipmentId, batchId });
  },

  unlockBatch: (equipmentId: string, batchId: string) => {
    const { nearExpiryDays } = get();
    set(state => {
      const equipments = state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          batches: eq.batches.map(batch => {
            if (batch.id !== batchId) return batch;
            const status = getBatchStatus(batch.expiryDate, nearExpiryDays);
            return { ...batch, status: status === 'expired' ? 'locked' : status };
          }),
          updatedAt: new Date().toISOString()
        };
      });
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
      return { equipments };
    });
    console.log('[EquipmentStore] unlockBatch:', { equipmentId, batchId });
  },

  getAvailableBatches: (equipmentId: string, quantity: number) => {
    const equipment = get().equipments.find(eq => eq.id === equipmentId);
    if (!equipment) return [];

    const availableBatches = equipment.batches
      .filter(b => (b.status === 'normal' || b.status === 'near_expiry') && b.availableQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const result: { batchId: string; quantity: number }[] = [];
    let remaining = quantity;

    for (const batch of availableBatches) {
      if (remaining <= 0) break;
      const takeQty = Math.min(batch.availableQuantity, remaining);
      result.push({ batchId: batch.id, quantity: takeQty });
      remaining -= takeQty;
    }

    console.log('[EquipmentStore] getAvailableBatches (FIFO):', { equipmentId, quantity, result });
    return result;
  },

  reduceStock: (equipmentId: string, batchId: string, quantity: number) => {
    set(state => {
      const equipments = state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          availableQuantity: Math.max(0, eq.availableQuantity - quantity),
          batches: eq.batches.map(batch =>
            batch.id === batchId
              ? { ...batch, availableQuantity: Math.max(0, batch.availableQuantity - quantity) }
              : batch
          ),
          updatedAt: new Date().toISOString()
        };
      });
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
      return { equipments };
    });
    console.log('[EquipmentStore] reduceStock:', { equipmentId, batchId, quantity });
  },

  returnStock: (equipmentId: string, batchId: string, quantity: number) => {
    set(state => {
      const equipments = state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          availableQuantity: eq.availableQuantity + quantity,
          batches: eq.batches.map(batch =>
            batch.id === batchId
              ? { ...batch, availableQuantity: batch.availableQuantity + quantity }
              : batch
          ),
          updatedAt: new Date().toISOString()
        };
      });
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
      return { equipments };
    });
    console.log('[EquipmentStore] returnStock:', { equipmentId, batchId, quantity });
  },

  setSelectedEquipment: (equipment: Equipment | null) => {
    set({ selectedEquipment: equipment });
  },

  refreshBatchStatuses: () => {
    const { nearExpiryDays } = get();
    set(state => {
      const equipments = state.equipments.map(eq => ({
        ...eq,
        batches: eq.batches.map(batch => {
          const status = getBatchStatus(batch.expiryDate, nearExpiryDays);
          return {
            ...batch,
            status: batch.status === 'locked'
              ? 'locked'
              : status === 'expired'
                ? 'locked'
                : status
          };
        }),
        updatedAt: new Date().toISOString()
      }));
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
      return { equipments };
    });
    console.log('[EquipmentStore] refreshBatchStatuses completed with nearExpiryDays=', nearExpiryDays);
  },

  setNearExpiryDays: (days: number) => {
    console.log('[EquipmentStore] setNearExpiryDays:', days);
    set({ nearExpiryDays: days });
    saveToStorage(STORAGE_KEYS.NEAR_EXPIRY_DAYS, days);
    get().refreshBatchStatuses();
  }
}));
