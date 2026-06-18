import type { Equipment, EquipmentBatch } from './equipment';
import type { BillingDetail, TimeSegment } from './rate';

export type OrderStatus = 'pending' | 'active' | 'completed' | 'overdue' | 'cancelled';

export interface BatchAllocation {
  batchId: string;
  batchNo: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  equipmentId: string;
  equipment: Equipment;
  batchId: string;
  batch: EquipmentBatch;
  batchNos: string[];
  batchAllocations: BatchAllocation[];
  quantity: number;
  startTime: string;
  endTime: string;
  actualEndTime?: string;
  billingDetail: BillingDetail;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  idCard?: string;
  items: OrderItem[];
  status: OrderStatus;
  startTime: string;
  endTime: string;
  actualEndTime?: string;
  rentalDuration: number;
  estimatedAmount: number;
  actualAmount?: number;
  rentalAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  deposit: number;
  billingDetail?: BillingDetail;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFormData {
  customerName: string;
  customerPhone: string;
  idCard?: string;
  startTime: string;
  endTime: string;
  deposit: number;
  remark?: string;
  items: {
    equipmentId: string;
    quantity: number;
  }[];
}

export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  pending: '待确认',
  active: '租赁中',
  completed: '已完成',
  overdue: '已超期',
  cancelled: '已取消'
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#F59E0B',
  active: '#3B82F6',
  completed: '#10B981',
  overdue: '#EF4444',
  cancelled: '#94A3B8'
};

export const PAYMENT_STATUS_TEXT = {
  unpaid: '未支付',
  partial: '部分支付',
  paid: '已支付'
};

export const PAYMENT_STATUS_COLOR = {
  unpaid: '#EF4444',
  partial: '#F59E0B',
  paid: '#10B981'
};
