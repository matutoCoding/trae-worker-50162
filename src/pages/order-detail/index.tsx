import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Button, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import FeeDetail from '@/components/FeeDetail';
import { formatDateTime, formatDate } from '@/utils/date';
import { formatCurrency } from '@/utils/billing';
import { ORDER_STATUS_TEXT } from '@/types/order';
import styles from './index.module.scss';

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const orderId = router.params.id as string;
  const { getOrderById, completeOrder, cancelOrder, orders, recalculateOrderBilling, addPaymentRecord, refundDeposit } = useOrderStore();
  const { getEquipmentById } = useEquipmentStore();

  const [order, setOrder] = useState<any>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [paymentRemark, setPaymentRemark] = useState('');

  const paymentMethods = [
    { key: 'cash', label: '现金' },
    { key: 'wechat', label: '微信' },
    { key: 'alipay', label: '支付宝' },
    { key: 'card', label: '刷卡' },
    { key: 'other', label: '其他' }
  ];

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

  const toggleItemExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const isCompleted = order?.status === 'completed';

  const rentalDiff = useMemo(() => {
    if (!order || !isCompleted) return null;
    if (order.actualAmount === undefined) return null;
    const diff = Math.round((order.actualAmount - order.estimatedAmount) * 100) / 100;
    return diff;
  }, [order, isCompleted]);

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

  const handleAddPayment = () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    const remaining = Math.round((order.totalAmount - order.paidAmount) * 100) / 100;
    if (amount > remaining + 0.01) {
      Taro.showToast({ title: '收款金额不能超过未收金额', icon: 'none' });
      return;
    }
    addPaymentRecord(orderId, amount, paymentMethod, paymentRemark || undefined);
    Taro.showToast({ title: '收款成功', icon: 'success' });
    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentRemark('');
  };

  const handleRefundDeposit = () => {
    Taro.showModal({
      title: '退还押金',
      content: `确认退还押金 ${formatCurrency(order.deposit)} 吗？`,
      success: (res) => {
        if (res.confirm) {
          refundDeposit(orderId);
          Taro.showToast({ title: '押金已退还', icon: 'success' });
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
          {isCompleted && rentalDiff !== null && rentalDiff !== 0 && (
            <View className={styles.diffRow}>
              <Text className={styles.diffLabel}>费用差额</Text>
              <Text className={classnames(
                styles.diffValue,
                rentalDiff > 0 ? styles.diffPositive : styles.diffNegative
              )}>
                {rentalDiff > 0 ? '+' : ''}{formatCurrency(rentalDiff)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>租赁设备（点击展开明细）</Text>
        <View className={styles.equipmentList}>
          {order.items && order.items.map((item: any) => {
            const equipment = getEquipmentById(item.equipmentId);
            const isExpanded = expandedItems.has(item.id);
            return (
              <View key={item.id} className={styles.equipmentItem}>
                <View
                  className={styles.equipmentHeader}
                  onClick={() => toggleItemExpand(item.id)}
                >
                  <View className={styles.equipmentInfo}>
                    <Text className={styles.equipmentName}>{equipment?.name}</Text>
                    <Text className={styles.equipmentSpec}>{equipment?.specification}</Text>
                    <Text className={styles.equipmentQty}>数量：{item.quantity} 台</Text>
                  </View>
                  <View className={styles.equipmentRight}>
                    <Text className={styles.equipmentAmount}>{formatCurrency(item.subtotal)}</Text>
                    <Text className={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </View>

                {isExpanded && (
                  <View className={styles.itemDetail}>
                    <View className={styles.detailSection}>
                      <Text className={styles.detailSubtitle}>分配批次</Text>
                      {item.batchAllocations && item.batchAllocations.length > 0 ? (
                        item.batchAllocations.map((alloc: any) => {
                          const batch = equipment?.batches?.find((b: any) => b.id === alloc.batchId);
                          return (
                            <View key={alloc.batchId} className={styles.batchRow}>
                              <Text className={styles.batchNoText}>{alloc.batchNo}</Text>
                              <Text className={styles.batchQtyText}>{alloc.quantity} 台</Text>
                              <Text className={styles.batchExpiryText}>
                                {batch ? formatDate(batch.expiryDate) : ''} 到期
                              </Text>
                            </View>
                          );
                        })
                      ) : (
                        <Text className={styles.detailEmpty}>无批次信息</Text>
                      )}
                    </View>

                    <View className={styles.detailSection}>
                      <Text className={styles.detailSubtitle}>时段拆分明细</Text>
                      {item.billingDetail?.segments && item.billingDetail.segments.length > 0 ? (
                        <>
                          {item.billingDetail.segments.map((seg: any, idx: number) => (
                            <View key={idx} className={styles.segmentRow}>
                              <View className={styles.segmentInfo}>
                                <Text className={styles.segmentName}>{seg.slotName}</Text>
                                <Text className={styles.segmentTime}>
                                  {seg.startTime} ~ {seg.endTime}
                                </Text>
                              </View>
                              <View className={styles.segmentAmount}>
                                <Text className={styles.segmentRate}>{formatCurrency(seg.rate)}/小时</Text>
                                <Text className={styles.segmentDuration}>
                                  {seg.duration.toFixed(1)}小时 × {formatCurrency(seg.rate)}
                                </Text>
                                <Text className={styles.segmentPrice}>{formatCurrency(seg.amount)}</Text>
                              </View>
                            </View>
                          ))}
                          <View className={styles.itemSummary}>
                            <View className={styles.summaryRow}>
                              <Text className={styles.summaryLabel}>基础租金</Text>
                              <Text className={styles.summaryValue}>
                                {formatCurrency(item.billingDetail.baseAmount)}
                              </Text>
                            </View>
                            {item.billingDetail.penaltyAmount > 0 && (
                              <View className={styles.summaryRow}>
                                <Text className={styles.summaryLabel}>超期罚金</Text>
                                <Text className={classnames(styles.summaryValue, styles.penaltyValue)}>
                                  +{formatCurrency(item.billingDetail.penaltyAmount)}
                                </Text>
                              </View>
                            )}
                            <View className={classnames(styles.summaryRow, styles.totalRow)}>
                              <Text className={styles.totalLabel}>小计</Text>
                              <Text className={styles.totalValue}>
                                {formatCurrency(item.billingDetail.totalAmount)}
                              </Text>
                            </View>
                          </View>
                        </>
                      ) : (
                        <Text className={styles.detailEmpty}>无时段明细</Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {order.billingDetail && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            总费用明细
            {isCompleted && <Text className={styles.sectionSubtitle}>（实际结算）</Text>}
          </Text>
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
          {isCompleted && rentalDiff !== null && rentalDiff !== 0 && (
            <View className={styles.amountRow}>
              <Text className={styles.amountLabel}>预计费用</Text>
              <Text className={styles.amountValue} style={{ color: '#94A3B8' }}>
                {formatCurrency(order.estimatedAmount)}
              </Text>
            </View>
          )}
          <View className={`${styles.amountRow} ${styles.totalRow}`}>
            <Text className={styles.totalLabel}>应付总额</Text>
            <Text className={styles.totalValue}>{formatCurrency(order.totalAmount)}</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>收款情况</Text>
        <View className={styles.infoCard}>
          <View className={styles.amountRow}>
            <Text className={styles.amountLabel}>已收金额</Text>
            <Text className={styles.amountValue} style={{ color: '#16A34A' }}>
              {formatCurrency(order.paidAmount || 0)}
            </Text>
          </View>
          <View className={styles.amountRow}>
            <Text className={styles.amountLabel}>未收金额</Text>
            <Text className={styles.amountValue} style={{ color: '#DC2626' }}>
              {formatCurrency(Math.max(0, order.totalAmount - (order.paidAmount || 0)))}
            </Text>
          </View>
          <View className={styles.amountRow}>
            <Text className={styles.amountLabel}>收款状态</Text>
            <View className={classnames(styles.paymentStatus, styles[order.paymentStatus])}>
              <Text>{order.paymentStatus === 'paid' ? '已结清' : order.paymentStatus === 'partial' ? '部分收款' : '未收款'}</Text>
            </View>
          </View>
          <View className={styles.amountRow}>
            <Text className={styles.amountLabel}>押金状态</Text>
            <View className={classnames(styles.depositStatus, order.depositRefunded ? styles.refunded : styles.unrefunded)}>
              <Text>
                {order.depositRefunded
                  ? `已退还 ${formatCurrency(order.depositRefundAmount || order.deposit)}`
                  : `待退还 ${formatCurrency(order.deposit)}`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>收款记录</Text>
          {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
            <Text className={styles.addPaymentBtn} onClick={() => setShowPaymentModal(true)}>+ 新增收款</Text>
          )}
        </View>
        {order.paymentRecords && order.paymentRecords.length > 0 ? (
          <View className={styles.paymentList}>
            {order.paymentRecords.map((record: any) => {
              const method = paymentMethods.find(m => m.key === record.paymentMethod);
              return (
                <View key={record.id} className={styles.paymentItem}>
                  <View className={styles.paymentInfo}>
                    <Text className={styles.paymentMethod}>{method?.label || record.paymentMethod}</Text>
                    <Text className={styles.paymentTime}>{formatDateTime(record.createdAt)}</Text>
                    {record.remark && <Text className={styles.paymentRemark}>{record.remark}</Text>}
                  </View>
                  <Text className={styles.paymentAmount}>+{formatCurrency(record.amount)}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View className={styles.emptyState}>
            <Text>暂无收款记录</Text>
          </View>
        )}
      </View>

      {order.remark && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>备注</Text>
          <View className={styles.infoCard}>
            <Text style={{ color: '#64748B', fontSize: '28rpx' }}>{order.remark}</Text>
          </View>
        </View>
      )}

      {(order.status === 'pending' || order.status === 'active' || order.status === 'completed') && (
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
          {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
            <Button className={styles.secondaryBtn} onClick={() => setShowPaymentModal(true)}>
              收款
            </Button>
          )}
          {order.status === 'completed' && !order.depositRefunded && order.deposit > 0 && (
            <Button className={styles.secondaryBtn} onClick={handleRefundDeposit}>
              退押金
            </Button>
          )}
          {order.status === 'active' && (
            <Button className={styles.primaryBtn} onClick={handleComplete}>
              确认归还
            </Button>
          )}
        </View>
      )}

      {showPaymentModal && (
        <View className={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>新增收款</Text>
            <View className={styles.formItem}>
              <Text className={styles.formLabel}>收款金额</Text>
              <Input
                className={styles.formInput}
                type="digit"
                placeholder="请输入收款金额"
                value={paymentAmount}
                onInput={(e) => setPaymentAmount(e.detail.value)}
              />
              <Text className={styles.formHint}>
                未收金额：{formatCurrency(Math.max(0, order.totalAmount - (order.paidAmount || 0)))}
              </Text>
            </View>
            <View className={styles.formItem}>
              <Text className={styles.formLabel}>收款方式</Text>
              <View className={styles.methodList}>
                {paymentMethods.map(method => (
                  <View
                    key={method.key}
                    className={classnames(styles.methodItem, paymentMethod === method.key && styles.methodActive)}
                    onClick={() => setPaymentMethod(method.key)}
                  >
                    <Text>{method.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View className={styles.formItem}>
              <Text className={styles.formLabel}>备注</Text>
              <Input
                className={styles.formInput}
                placeholder="选填"
                value={paymentRemark}
                onInput={(e) => setPaymentRemark(e.detail.value)}
              />
            </View>
            <View className={styles.modalActions}>
              <Button className={styles.secondaryBtn} onClick={() => setShowPaymentModal(false)}>
                取消
              </Button>
              <Button className={styles.primaryBtn} onClick={handleAddPayment}>
                确认收款
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default OrderDetailPage;
