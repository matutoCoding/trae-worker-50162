import type { Order, OrderStatus } from '@/types/order';
import { calculateBilling } from '@/utils/billing';
import { mockEquipmentList } from './mockEquipment';
import { mockRateRules, mockBillingConfig } from './mockRate';
import { generateOrderNo, getHoursDiff } from '@/utils/date';

const now = new Date();
const addDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
const addHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

const customers = [
  { name: '张三', phone: '13800138001' },
  { name: '李四', phone: '13800138002' },
  { name: '王五', phone: '13800138003' },
  { name: '赵六', phone: '13800138004' },
  { name: '陈七', phone: '13800138005' },
  { name: '刘八', phone: '13800138006' },
  { name: '周九', phone: '13800138007' },
  { name: '吴十', phone: '13800138008' }
];

const generateOrder = (
  index: number,
  status: OrderStatus,
  startOffset: number,
  endOffset: number,
  equipmentCount: number = 1
): Order => {
  const customer = customers[index % customers.length];
  const startTime = addDays(startOffset);
  const endTime = addDays(endOffset);
  const equipment = mockEquipmentList[index % mockEquipmentList.length];
  const rateRule = mockRateRules.find(r => r.equipmentId === equipment.id) || mockRateRules[3];
  const quantity = (index % 3) + 1;

  const billingDetail = calculateBilling({
    startTime,
    endTime,
    rateRule,
    penaltyRule: mockBillingConfig.defaultPenaltyRule,
    quantity
  });

  const batch = equipment.batches.find(b => b.status === 'normal' || b.status === 'near_expiry')!;
  const batchNos = [batch.batchNo];
  const batchAllocations = [{
    batchId: batch.id,
    batchNo: batch.batchNo,
    quantity
  }];
  const subtotal = Math.round(billingDetail.totalAmount * 100) / 100;

  const rentalDuration = Math.round(getHoursDiff(startTime, endTime) * 100) / 100;
  const rentalAmount = Math.round(billingDetail.baseAmount * 100) / 100;
  const penaltyAmount = status === 'overdue' ? 50 : Math.round(billingDetail.penaltyAmount * 100) / 100;
  const deposit = Math.round(billingDetail.totalAmount * 0.3);
  const totalAmount = Math.round((rentalAmount + penaltyAmount + deposit) * 100) / 100;

  return {
    id: `ORD${String(index + 1).padStart(4, '0')}`,
    orderNo: generateOrderNo(),
    customerName: customer.name,
    customerPhone: customer.phone,
    idCard: index % 2 === 0 ? '110101199001011234' : undefined,
    items: [
      {
        id: `ITEM${index}`,
        orderId: `ORD${String(index + 1).padStart(4, '0')}`,
        equipmentId: equipment.id,
        equipment,
        batchId: batch.id,
        batch,
        batchNos,
        batchAllocations,
        quantity,
        startTime,
        endTime,
        actualEndTime: status === 'completed' ? endTime : undefined,
        billingDetail,
        unitPrice: equipment.hourlyRate,
        subtotal
      }
    ],
    status,
    startTime,
    endTime,
    rentalDuration,
    actualEndTime: status === 'completed' ? endTime : undefined,
    estimatedAmount: billingDetail.totalAmount,
    actualAmount: status === 'completed' ? billingDetail.totalAmount : undefined,
    rentalAmount,
    penaltyAmount,
    totalAmount,
    deposit,
    billingDetail,
    paymentStatus: status === 'completed' ? 'paid' : status === 'active' ? 'partial' : 'unpaid',
    remark: index % 3 === 0 ? '客户要求送上门' : undefined,
    createdAt: startTime,
    updatedAt: addDays(-1)
  };
};

export const mockOrderList: Order[] = [
  generateOrder(0, 'active', -2, 3),
  generateOrder(1, 'active', -1, 5, 2),
  generateOrder(2, 'pending', 0, 2),
  generateOrder(3, 'pending', 1, 4),
  generateOrder(4, 'completed', -7, -5),
  generateOrder(5, 'completed', -10, -8),
  generateOrder(6, 'completed', -15, -12),
  generateOrder(7, 'overdue', -5, -1),
  generateOrder(8, 'cancelled', -3, -1)
];

export const getOrderById = (id: string): Order | undefined => {
  return mockOrderList.find(o => o.id === id);
};

export const getOrdersByStatus = (status: OrderStatus | 'all'): Order[] => {
  if (status === 'all') return mockOrderList;
  return mockOrderList.filter(o => o.status === status);
};

export const getTodayOrders = (): Order[] => {
  const today = new Date().toISOString().split('T')[0];
  return mockOrderList.filter(o => o.startTime.startsWith(today));
};

export const getActiveOrders = (): Order[] => {
  return mockOrderList.filter(o => o.status === 'active' || o.status === 'overdue');
};

export const getTotalRevenue = (): number => {
  return mockOrderList
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.actualAmount || 0), 0);
};
