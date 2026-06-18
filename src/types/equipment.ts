export type BatchStatus = 'normal' | 'near_expiry' | 'expired' | 'locked';

export interface EquipmentBatch {
  id: string;
  batchNo: string;
  equipmentId: string;
  productionDate: string;
  expiryDate: string;
  quantity: number;
  availableQuantity: number;
  status: BatchStatus;
  createdAt: string;
  remark?: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  spec: string;
  specification: string;
  unit: string;
  totalQuantity: number;
  availableQuantity: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  hourlyRate: number;
  imageUrl: string;
  icon: string;
  description?: string;
  batches: EquipmentBatch[];
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentFormData {
  name: string;
  category: string;
  spec?: string;
  specification: string;
  unit?: string;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  hourlyRate: number;
  icon: string;
  description?: string;
  batches: Omit<EquipmentBatch, 'id' | 'equipmentId' | 'availableQuantity' | 'status'>[];
}

export interface BatchFormData {
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  quantity: number;
  remark?: string;
}

export const BATCH_STATUS_TEXT: Record<BatchStatus, string> = {
  normal: '正常',
  near_expiry: '临期',
  expired: '过期',
  locked: '锁定'
};

export const BATCH_STATUS_COLOR: Record<BatchStatus, string> = {
  normal: '#10B981',
  near_expiry: '#F59E0B',
  expired: '#EF4444',
  locked: '#94A3B8'
};

export const CATEGORY_OPTIONS = [
  '电动工具',
  '手动工具',
  '测量仪器',
  '起重设备',
  '焊接设备',
  '清洁设备',
  '园林工具',
  '安全防护',
  '其他'
];
