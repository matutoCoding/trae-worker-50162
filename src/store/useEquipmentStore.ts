import { create } from 'zustand';
import type { Equipment, EquipmentBatch, EquipmentFormData, BatchFormData } from '@/types/equipment';
import { mockEquipmentList } from '@/data/mockEquipment';
import { getBatchStatus, generateBatchNo } from '@/utils/date';

interface EquipmentState {
  equipments: Equipment[];
  loading: boolean;
  error: string | null;
  selectedEquipment: Equipment | null;
  nearExpiryDays: number;

  fetchEquipments: () => void;
  fetchEquipmentById: (id: string) => Equipment | undefined;
  getEquipmentById: (id: string) => Equipment | undefined;
  addEquipment: (data: EquipmentFormData) => Equipment;
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
}

export const useEquipmentStore = create<EquipmentState>((set, get) => ({
  equipments: [],
  loading: false,
  error: null,
  selectedEquipment: null,
  nearExpiryDays: 7,

  fetchEquipments: () => {
    set({ loading: true });
    try {
      const updated = mockEquipmentList.map(eq => ({
        ...eq,
        batches: eq.batches.map(batch => ({
          ...batch,
          status: getBatchStatus(batch.expiryDate, get().nearExpiryDays) === 'expired'
            ? 'locked'
            : getBatchStatus(batch.expiryDate, get().nearExpiryDays)
        }))
      }));
      set({ equipments: updated, loading: false });
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
    const newEquipment: Equipment = {
      id: `EQ${Date.now()}`,
      ...data,
      totalQuantity: 0,
      availableQuantity: 0,
      imageUrl: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/300/300`,
      batches: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set(state => ({ equipments: [...state.equipments, newEquipment] }));
    console.log('[EquipmentStore] addEquipment:', newEquipment);
    return newEquipment;
  },

  updateEquipment: (id: string, data: Partial<EquipmentFormData>) => {
    set(state => ({
      equipments: state.equipments.map(eq =>
        eq.id === id
          ? { ...eq, ...data, updatedAt: new Date().toISOString() }
          : eq
      )
    }));
    console.log('[EquipmentStore] updateEquipment:', { id, data });
  },

  deleteEquipment: (id: string) => {
    set(state => ({
      equipments: state.equipments.filter(eq => eq.id !== id)
    }));
    console.log('[EquipmentStore] deleteEquipment:', id);
  },

  addBatch: (equipmentId: string, data: BatchFormData) => {
    const status = getBatchStatus(data.expiryDate, get().nearExpiryDays);
    const newBatch: EquipmentBatch = {
      id: `${equipmentId}-batch-${Date.now()}`,
      batchNo: data.batchNo || generateBatchNo(),
      equipmentId,
      ...data,
      availableQuantity: data.quantity,
      status: status === 'expired' ? 'locked' : status,
      createdAt: new Date().toISOString()
    };

    set(state => ({
      equipments: state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          totalQuantity: eq.totalQuantity + data.quantity,
          availableQuantity: eq.availableQuantity + data.quantity,
          batches: [...eq.batches, newBatch],
          updatedAt: new Date().toISOString()
        };
      })
    }));
    console.log('[EquipmentStore] addBatch:', { equipmentId, newBatch });
  },

  updateBatch: (equipmentId: string, batchId: string, data: Partial<BatchFormData>) => {
    set(state => ({
      equipments: state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          batches: eq.batches.map(batch => {
            if (batch.id !== batchId) return batch;
            const updated = { ...batch, ...data };
            if (data.expiryDate) {
              const status = getBatchStatus(data.expiryDate, get().nearExpiryDays);
              updated.status = status === 'expired' ? 'locked' : status;
            }
            return updated;
          }),
          updatedAt: new Date().toISOString()
        };
      })
    }));
  },

  lockBatch: (equipmentId: string, batchId: string) => {
    set(state => ({
      equipments: state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          batches: eq.batches.map(batch =>
            batch.id === batchId ? { ...batch, status: 'locked' as const } : batch
          ),
          updatedAt: new Date().toISOString()
        };
      })
    }));
    console.log('[EquipmentStore] lockBatch:', { equipmentId, batchId });
  },

  unlockBatch: (equipmentId: string, batchId: string) => {
    set(state => ({
      equipments: state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          batches: eq.batches.map(batch => {
            if (batch.id !== batchId) return batch;
            const status = getBatchStatus(batch.expiryDate, get().nearExpiryDays);
            return { ...batch, status: status === 'expired' ? 'locked' : status };
          }),
          updatedAt: new Date().toISOString()
        };
      })
    }));
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
    set(state => ({
      equipments: state.equipments.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          availableQuantity: eq.availableQuantity - quantity,
          batches: eq.batches.map(batch =>
            batch.id === batchId
              ? { ...batch, availableQuantity: batch.availableQuantity - quantity }
              : batch
          ),
          updatedAt: new Date().toISOString()
        };
      })
    }));
    console.log('[EquipmentStore] reduceStock:', { equipmentId, batchId, quantity });
  },

  returnStock: (equipmentId: string, batchId: string, quantity: number) => {
    set(state => ({
      equipments: state.equipments.map(eq => {
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
      })
    }));
    console.log('[EquipmentStore] returnStock:', { equipmentId, batchId, quantity });
  },

  setSelectedEquipment: (equipment: Equipment | null) => {
    set({ selectedEquipment: equipment });
  },

  refreshBatchStatuses: () => {
    const { nearExpiryDays } = get();
    set(state => ({
      equipments: state.equipments.map(eq => ({
        ...eq,
        batches: eq.batches.map(batch => {
          const status = getBatchStatus(batch.expiryDate, nearExpiryDays);
          return {
            ...batch,
            status: batch.status === 'locked' ? 'locked' : status === 'expired' ? 'locked' : status
          };
        }),
        updatedAt: new Date().toISOString()
      }))
    }));
    console.log('[EquipmentStore] refreshBatchStatuses completed');
  }
}));
