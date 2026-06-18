import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import type { Order } from '@/types/order';
import { ORDER_STATUS_TEXT, ORDER_STATUS_COLOR, PAYMENT_STATUS_TEXT, PAYMENT_STATUS_COLOR } from '@/types/order';
import { formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/billing';
import styles from './index.module.scss';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onPay?: () => void;
  showActions?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onClick,
  onComplete,
  onCancel,
  onPay,
  showActions = true
}) => {
  const getPaymentClass = () => {
    if (order.paymentStatus === 'paid') return styles.paid;
    if (order.paymentStatus === 'partial') return styles.partial;
    return styles.unpaid;
  };

  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.header}>
        <Text className={styles.orderNo}>订单号：{order.orderNo}</Text>
        <Text
          className={styles.status}
          style={{
            background: `${ORDER_STATUS_COLOR[order.status]}15`,
            color: ORDER_STATUS_COLOR[order.status]
          }}
        >
          {ORDER_STATUS_TEXT[order.status]}
        </Text>
      </View>

      <View className={styles.customerInfo}>
        <View>
          <Text className={styles.customerName}>{order.customerName}</Text>
          <Text className={styles.customerPhone}> {order.customerPhone}</Text>
        </View>
      </View>

      <View className={styles.equipmentList}>
        {order.items.slice(0, 2).map(item => (
          <View key={item.id} className={styles.equipmentItem}>
            <Text className={styles.equipmentName}>{item.equipment.name}</Text>
            <Text className={styles.equipmentQty}>x{item.quantity}</Text>
          </View>
        ))}
        {order.items.length > 2 && (
          <Text className={styles.equipmentName} style={{ color: '$color-text-tertiary' }}>
            ...等 {order.items.length} 项
          </Text>
        )}
      </View>

      <View className={styles.timeInfo}>
        <Text>租期：{formatDateTime(order.startTime)}</Text>
        <Text>至 {formatDateTime(order.endTime)}</Text>
      </View>

      <View className={styles.footer}>
        <View>
          <Text className={styles.amount}>{formatCurrency(order.estimatedAmount)}</Text>
          <Text className={classnames(styles.paymentStatus, getPaymentClass())}>
            {' '}{PAYMENT_STATUS_TEXT[order.paymentStatus]}
          </Text>
        </View>

        {showActions && (order.status === 'pending' || order.status === 'active') && (
          <View className={styles.actions}>
            {order.status === 'pending' && (
              <Button
                className={styles.actionBtn}
                onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
              >
                取消
              </Button>
            )}
            {order.status === 'active' && (
              <Button
                className={classnames(styles.actionBtn, styles.primary)}
                onClick={(e) => { e.stopPropagation(); onComplete?.(); }}
              >
                归还
              </Button>
            )}
            {order.paymentStatus !== 'paid' && (
              <Button
                className={classnames(styles.actionBtn, styles.primary)}
                onClick={(e) => { e.stopPropagation(); onPay?.(); }}
              >
                支付
              </Button>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default OrderCard;
