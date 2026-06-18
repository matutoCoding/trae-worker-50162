import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useOrderStore } from '@/store/useOrderStore';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import FeeDetail from '@/components/FeeDetail';
import { formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/billing';
import { ORDER_STATUS_TEXT } from '@/types/order';
import styles from './index.module.scss';

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const orderId = router.params.id as string;
  const { getOrderById, completeOrder, cancelOrder, orders, recalculateOrderBilling } = useOrderStore();
  const { getEquipmentById } = useEquipmentStore();

  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (orderId) {
      const ord = getOrderById(orderId);
      if (ord) {
        recalculateOrderBilling(orderId);
      }
      setOrder(ord);
    }
  }, [orderId, orders]);

  useEffect(() => {
    if (order && orderId) {
      const updated = getOrderById(orderId);
      setOrder(updated);
    }
  }, [orders]);

  const handleComplete = () => {
    Taro.showModal({
      title: '确认归还',
      content: '确认设备已归还，将结算费用',
      success: (res) => {
        if (res.confirm) {
          completeOrder(orderId);
          Taro.showToast({ title: '归还成功', icon: 'success' });
          setTimeout(() => Taro.navigateBack(), 1000);
        }
      }
    });
  };

  const handleCancel = () => {
    Taro.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          cancelOrder(orderId);
          Taro.showToast({ title: '已取消', icon: 'success' });
          setTimeout(() => Taro.navigateBack(), 1000);
        }
      }
    });
  };

  if (!order) {
    return (
      <ScrollView scrollY className={styles.pageContainer}>
        <View className={styles.emptyState}>
          <Text>订单不存在</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className={styles.pageContainer}>
      <View className={styles.orderHeader}>
        <View className={styles.orderNoRow}>
          <Text className={styles.orderNo}>订单号：{order.orderNo}</Text>
          <View className={`${styles.statusTag} ${styles[order.status]}`}>
            {ORDER_STATUS_TEXT[order.status]}
          </View>
        </View>
        <View className={styles.customerInfo}>
          <Text className={styles.customerName}>{order.customerName}</Text>
          <Text className={styles.customerPhone}>{order.customerPhone}</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>租赁时间</Text>
        <View className={styles.infoCard}>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>开始时间</Text>
            <Text className={styles.infoValue}>{formatDateTime(order.startTime)}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>预计结束</Text>
            <Text className={styles.infoValue}>{formatDateTime(order.endTime)}</Text>
          </View>
          {order.actualEndTime && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>实际归还</Text>
              <Text className={styles.infoValue}>{formatDateTime(order.actualEndTime)}</Text>
            </View>
          )}
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>预计租期</Text>
            <Text className={styles.infoValue}>{order.rentalDuration}小时</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>租赁设备</Text>
        <View className={styles.equipmentList}>
          {order.items && order.items.map((item: any) => {
            const equipment = getEquipmentById(item.equipmentId);
            return (
              <View key={item.equipmentId} className={styles.equipmentItem}>
                <View className={styles.equipmentInfo}>
                  <Text className={styles.equipmentName}>{equipment?.name}</Text>
                  <Text className={styles.equipmentSpec}>{equipment?.specification}</Text>
                  <Text className={styles.equipmentQty}>数量：{item.quantity}</Text>
                  {item.batchNos && item.batchNos.length > 0 && (
                    <Text className={styles.batchInfo}>
                      批次：{item.batchNos.join(', ')}
                    </Text>
                  )}
                </View>
                <Text className={styles.equipmentAmount}>{formatCurrency(item.subtotal)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {order.billingDetail && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>费用明细</Text>
          <FeeDetail billingDetail={order.billingDetail} />
        </View>
      )}

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>费用合计</Text>
        <View className={styles.amountSection}>
          <View className={styles.amountRow}>
            <Text className={styles.amountLabel}>设备租金</Text>
            <Text className={styles.amountValue}>{formatCurrency(order.rentalAmount)}</Text>
          </View>
          {order.penaltyAmount > 0 && (
            <View className={styles.amountRow}>
              <Text className={styles.amountLabel}>超期罚金</Text>
              <Text className={styles.amountValue} style={{ color: '#EF4444' }}>
                +{formatCurrency(order.penaltyAmount)}
              </Text>
            </View>
          )}
          {order.deposit > 0 && (
            <View className={styles.amountRow}>
              <Text className={styles.amountLabel}>押金</Text>
              <Text className={styles.amountValue}>{formatCurrency(order.deposit)}</Text>
            </View>
          )}
          <View className={`${styles.amountRow} ${styles.totalRow}`}>
            <Text className={styles.totalLabel}>应付总额</Text>
            <Text className={styles.totalValue}>{formatCurrency(order.totalAmount)}</Text>
          </View>
        </View>
      </View>

      {order.remark && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>备注</Text>
          <View className={styles.infoCard}>
            <Text style={{ color: '#64748B', fontSize: '28rpx' }}>{order.remark}</Text>
          </View>
        </View>
      )}

      {(order.status === 'pending' || order.status === 'active') && (
        <View className={styles.actionBtns}>
          {order.status === 'pending' && (
            <Button className={styles.secondaryBtn} onClick={handleCancel}>
              取消订单
            </Button>
          )}
          {order.status === 'active' && (
            <Button className={`${styles.primaryBtn} ${styles.danger}`} onClick={handleCancel}>
              取消订单
            </Button>
          )}
          {order.status === 'active' && (
            <Button className={styles.primaryBtn} onClick={handleComplete}>
              确认归还
            </Button>
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default OrderDetailPage;
