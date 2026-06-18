import { create } from 'zustand';
import type { Order, OrderFormData, OrderStatus, OrderItem, BatchAllocation } from '@/types/order';
import type { BillingDetail } from '@/types/rate';
import { mockOrderList } from '@/data/mockOrder';
import { calculateBilling } from '@/utils/billing';
import { generateOrderNo, getMinutesDiff, getHoursDiff } from '@/utils/date';
import { useEquipmentStore } from './useEquipmentStore';
import { useRateStore } from './useRateStore';

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  selectedOrder: Order | null;

  fetchOrders: () => void;
  fetchOrderById: (id: string) => Order | undefined;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByStatus: (status: OrderStatus | 'all') => Order[];

  createOrder: (data: OrderFormData) => Order | null;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  completeOrder: (id: string, actualEndTime?: string) => void;
  cancelOrder: (id: string) => void;

  updatePaymentStatus: (id: string, status: 'unpaid' | 'partial' | 'paid', amount?: number) => void;
  recalculateOrderBilling: (id: string) => BillingDetail | null;

  getStatistics: () => {
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    totalRevenue: number;
    overdueOrders: number;
    todayOrders: number;
  };

  setSelectedOrder: (order: Order | null) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,
  selectedOrder: null,

  fetchOrders: () => {
    const { orders } = get();
    if (orders.length > 0) {
      set({ loading: false });
      return;
    }
    set({ loading: true });
    try {
      set({ orders: mockOrderList, loading: false });
    } catch (err) {
      set({ error: '获取订单列表失败', loading: false });
      console.error('[OrderStore] fetchOrders error:', err);
    }
  },

  fetchOrderById: (id: string) => {
    return get().orders.find(o => o.id === id);
  },

  getOrderById: (id: string) => {
    return get().orders.find(o => o.id === id);
  },

  getOrdersByStatus: (status: OrderStatus | 'all') => {
    if (status === 'all') return get().orders;
    return get().orders.filter(o => o.status === status);
  },

  createOrder: (data: OrderFormData) => {
    try {
      const equipmentStore = useEquipmentStore.getState();
      const rateStore = useRateStore.getState();

      const orderItems: OrderItem[] = [];
      let totalEstimatedAmount = 0;
      let totalBillingDetail: BillingDetail = {
        segments: [],
        baseAmount: 0,
        penaltyAmount: 0,
        totalAmount: 0,
        totalHours: 0,
        penaltyHours: 0
      };

      for (const item of data.items) {
        const equipment = equipmentStore.fetchEquipmentById(item.equipmentId);
        if (!equipment) continue;

        const rateRule = rateStore.getRateRuleByEquipment(item.equipmentId);
        const batchAllocation = equipmentStore.getAvailableBatches(item.equipmentId, item.quantity);

        if (batchAllocation.length === 0) {
          set({ error: `${equipment.name} 库存不足` });
          return null;
        }

        const batchNos: string[] = [];
        const batchAllocations: BatchAllocation[] = [];
        let firstBatch: any = null;
        let totalQuantity = 0;

        for (const alloc of batchAllocation) {
          const batch = equipment.batches.find(b => b.id === alloc.batchId);
          if (!batch) continue;

          if (!firstBatch) firstBatch = batch;
          batchNos.push(batch.batchNo);
          batchAllocations.push({
            batchId: batch.id,
            batchNo: batch.batchNo,
            quantity: alloc.quantity
          });
          totalQuantity += alloc.quantity;
          equipmentStore.reduceStock(equipment.id, batch.id, alloc.quantity);
        }

        const billingDetail = calculateBilling({
          startTime: data.startTime,
          endTime: data.endTime,
          rateRule,
          penaltyRule: rateStore.billingConfig.defaultPenaltyRule,
          quantity: totalQuantity
        });

        const subtotal = Math.round(billingDetail.totalAmount * 100) / 100;

        orderItems.push({
          id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          orderId: '',
          equipmentId: equipment.id,
          equipment,
          batchId: firstBatch.id,
          batch: firstBatch,
          batchNos,
          batchAllocations,
          quantity: totalQuantity,
          startTime: data.startTime,
          endTime: data.endTime,
          billingDetail,
          unitPrice: equipment.hourlyRate,
          subtotal
        });

        totalEstimatedAmount += subtotal;
        totalBillingDetail = {
          segments: [...totalBillingDetail.segments, ...billingDetail.segments],
          baseAmount: totalBillingDetail.baseAmount + billingDetail.baseAmount,
          penaltyAmount: totalBillingDetail.penaltyAmount + billingDetail.penaltyAmount,
          totalAmount: totalBillingDetail.totalAmount + billingDetail.totalAmount,
          totalHours: totalBillingDetail.totalHours + billingDetail.totalHours,
          penaltyHours: totalBillingDetail.penaltyHours + billingDetail.penaltyHours
        };
      }

      if (orderItems.length === 0) {
        set({ error: '未选择有效的设备' });
        return null;
      }

      const rentalDuration = Math.round(getHoursDiff(data.startTime, data.endTime) * 100) / 100;
      const rentalAmount = Math.round(totalBillingDetail.baseAmount * 100) / 100;
      const penaltyAmount = Math.round(totalBillingDetail.penaltyAmount * 100) / 100;
      const totalAmount = Math.round((rentalAmount + penaltyAmount + data.deposit) * 100) / 100;

      const newOrder: Order = {
        id: `ORD${Date.now()}`,
        orderNo: generateOrderNo(),
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        idCard: data.idCard,
        items: orderItems.map(item => ({ ...item, orderId: `ORD${Date.now()}` })),
        status: 'pending',
        startTime: data.startTime,
        endTime: data.endTime,
        rentalDuration,
        estimatedAmount: Math.round(totalEstimatedAmount * 100) / 100,
        rentalAmount,
        penaltyAmount,
        totalAmount,
        deposit: data.deposit,
        billingDetail: totalBillingDetail,
        paymentStatus: 'unpaid',
        remark: data.remark,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      set(state => ({ orders: [...state.orders, newOrder], error: null }));
      console.log('[OrderStore] createOrder:', newOrder);
      return newOrder;
    } catch (err) {
      set({ error: '创建订单失败' });
      console.error('[OrderStore] createOrder error:', err);
      return null;
    }
  },

  updateOrderStatus: (id: string, status: OrderStatus) => {
    set(state => ({
      orders: state.orders.map(o =>
        o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
      )
    }));
    console.log('[OrderStore] updateOrderStatus:', { id, status });
  },

  completeOrder: (id: string, actualEndTime?: string) => {
    const order = get().orders.find(o => o.id === id);
    if (!order) return;

    const endTime = actualEndTime || new Date().toISOString();
    const equipmentStore = useEquipmentStore.getState();
    const rateStore = useRateStore.getState();

    let totalActualAmount = 0;
    let totalBillingDetail: BillingDetail = {
      segments: [],
      baseAmount: 0,
      penaltyAmount: 0,
      totalAmount: 0,
      totalHours: 0,
      penaltyHours: 0
    };

    const updatedItems = order.items.map(item => {
      const rateRule = rateStore.getRateRuleByEquipment(item.equipmentId);
      const billingDetail = calculateBilling({
        startTime: item.startTime,
        endTime,
        rateRule,
        penaltyRule: rateStore.billingConfig.defaultPenaltyRule,
        quantity: item.quantity
      });

      const subtotal = Math.round(billingDetail.totalAmount * 100) / 100;

      totalActualAmount += billingDetail.totalAmount;
      totalBillingDetail = {
        segments: [...totalBillingDetail.segments, ...billingDetail.segments],
        baseAmount: totalBillingDetail.baseAmount + billingDetail.baseAmount,
        penaltyAmount: totalBillingDetail.penaltyAmount + billingDetail.penaltyAmount,
        totalAmount: totalBillingDetail.totalAmount + billingDetail.totalAmount,
        totalHours: totalBillingDetail.totalHours + billingDetail.totalHours,
        penaltyHours: totalBillingDetail.penaltyHours + billingDetail.penaltyHours
      };

      if (item.batchAllocations && item.batchAllocations.length > 0) {
        for (const alloc of item.batchAllocations) {
          equipmentStore.returnStock(item.equipmentId, alloc.batchId, alloc.quantity);
        }
      } else {
        equipmentStore.returnStock(item.equipmentId, item.batchId, item.quantity);
      }

      return {
        ...item,
        actualEndTime: endTime,
        billingDetail,
        subtotal
      };
    });

    const rentalDuration = Math.round(getHoursDiff(order.startTime, endTime) * 100) / 100;
    const rentalAmount = Math.round(totalBillingDetail.baseAmount * 100) / 100;
    const penaltyAmount = Math.round(totalBillingDetail.penaltyAmount * 100) / 100;
    const totalAmount = Math.round((rentalAmount + penaltyAmount + order.deposit) * 100) / 100;

    set(state => ({
      orders: state.orders.map(o =>
        o.id === id
          ? {
              ...o,
              status: 'completed',
              actualEndTime: endTime,
              rentalDuration,
              actualAmount: Math.round(totalActualAmount * 100) / 100,
              rentalAmount,
              penaltyAmount,
              totalAmount,
              billingDetail: totalBillingDetail,
              updatedAt: new Date().toISOString(),
              items: updatedItems
            }
          : o
      )
    }));
    console.log('[OrderStore] completeOrder:', { id, actualEndTime: endTime, totalActualAmount, penaltyAmount });
  },

  cancelOrder: (id: string) => {
    const order = get().orders.find(o => o.id === id);
    if (!order) return;

    const equipmentStore = useEquipmentStore.getState();
    for (const item of order.items) {
      if (item.batchAllocations && item.batchAllocations.length > 0) {
        for (const alloc of item.batchAllocations) {
          equipmentStore.returnStock(item.equipmentId, alloc.batchId, alloc.quantity);
        }
      } else {
        equipmentStore.returnStock(item.equipmentId, item.batchId, item.quantity);
      }
    }

    set(state => ({
      orders: state.orders.map(o =>
        o.id === id
          ? { ...o, status: 'cancelled', updatedAt: new Date().toISOString() }
          : o
      )
    }));
    console.log('[OrderStore] cancelOrder:', id);
  },

  updatePaymentStatus: (id: string, status: 'unpaid' | 'partial' | 'paid', amount?: number) => {
    set(state => ({
      orders: state.orders.map(o =>
        o.id === id
          ? {
              ...o,
              paymentStatus: status,
              updatedAt: new Date().toISOString()
            }
          : o
      )
    }));
    console.log('[OrderStore] updatePaymentStatus:', { id, status, amount });
  },

  recalculateOrderBilling: (id: string) => {
    const order = get().orders.find(o => o.id === id);
    if (!order) return null;

    const rateStore = useRateStore.getState();
    const now = new Date().toISOString();
    const endTime = order.actualEndTime || now;

    let totalBilling: BillingDetail = {
      segments: [],
      baseAmount: 0,
      penaltyAmount: 0,
      totalAmount: 0,
      totalHours: 0,
      penaltyHours: 0
    };

    for (const item of order.items) {
      const rateRule = rateStore.getRateRuleByEquipment(item.equipmentId);
      const billing = calculateBilling({
        startTime: item.startTime,
        endTime,
        rateRule,
        penaltyRule: rateStore.billingConfig.defaultPenaltyRule,
        quantity: item.quantity
      });

      totalBilling = {
        segments: [...totalBilling.segments, ...billing.segments],
        baseAmount: totalBilling.baseAmount + billing.baseAmount,
        penaltyAmount: totalBilling.penaltyAmount + billing.penaltyAmount,
        totalAmount: totalBilling.totalAmount + billing.totalAmount,
        totalHours: totalBilling.totalHours + billing.totalHours,
        penaltyHours: totalBilling.penaltyHours + billing.penaltyHours
      };
    }

    const rentalDuration = Math.round(getHoursDiff(order.startTime, endTime) * 100) / 100;
    const rentalAmount = Math.round(totalBilling.baseAmount * 100) / 100;
    const penaltyAmount = Math.round(totalBilling.penaltyAmount * 100) / 100;
    const totalAmount = Math.round((rentalAmount + penaltyAmount + order.deposit) * 100) / 100;

    set(state => ({
      orders: state.orders.map(o =>
        o.id === id
          ? {
              ...o,
              rentalDuration,
              rentalAmount,
              penaltyAmount,
              totalAmount,
              billingDetail: totalBilling
            }
          : o
      )
    }));

    console.log('[OrderStore] recalculateOrderBilling:', { id, billing: totalBilling });
    return totalBilling;
  },

  getStatistics: () => {
    const { orders } = get();
    const today = new Date().toISOString().split('T')[0];

    const stats = {
      totalOrders: orders.length,
      activeOrders: orders.filter(o => o.status === 'active' || o.status === 'overdue').length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      totalRevenue: orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.actualAmount || 0), 0),
      overdueOrders: orders.filter(o => o.status === 'overdue').length,
      todayOrders: orders.filter(o => o.startTime.startsWith(today)).length
    };

    console.log('[OrderStore] getStatistics:', stats);
    return stats;
  },

  setSelectedOrder: (order: Order | null) => {
    set({ selectedOrder: order });
  }
}));
