import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Button, Input, PullDownRefresh } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useOrderStore } from '@/store/useOrderStore';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import { useRateStore } from '@/store/useRateStore';
import OrderCard from '@/components/OrderCard';
import EmptyState from '@/components/EmptyState';
import { calculateEstimatedAmount, formatCurrency } from '@/utils/billing';
import type { OrderStatus } from '@/types/order';
import styles from './index.module.scss';

const OrderPage: React.FC = () => {
  const { orders, fetchOrders, getStatistics, getOrdersByStatus, createOrder, loading, error } = useOrderStore();
  const { equipments, fetchEquipments } = useEquipmentStore();
  const { fetchRateRules, getRateRuleByEquipment, billingConfig } = useRateStore();

  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    startTime: dayjs().format('YYYY-MM-DD HH:mm'),
    endTime: dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm'),
    deposit: 0,
    remark: '',
    items: [] as { equipmentId: string; quantity: number }[]
  });

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待确认' },
    { key: 'active', label: '租赁中' },
    { key: 'completed', label: '已完成' },
    { key: 'overdue', label: '已超期' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    fetchOrders();
    fetchEquipments();
    fetchRateRules();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const filteredOrders = useMemo(() => {
    return getOrdersByStatus(activeTab);
  }, [orders, activeTab]);

  const stats = getStatistics();

  const estimatedAmount = useMemo(() => {
    if (formData.items.length === 0) return 0;
    let total = 0;
    for (const item of formData.items) {
      const rateRule = getRateRuleByEquipment(item.equipmentId);
      total += calculateEstimatedAmount(formData.startTime, formData.endTime, rateRule, item.quantity);
    }
    return Math.round(total * 100) / 100;
  }, [formData]);

  const handleOrderClick = (id: string) => {
    Taro.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    });
  };

  const handleCompleteOrder = (id: string) => {
    Taro.showModal({
      title: '确认归还',
      content: '确认设备已归还，将结算费用',
      success: (res) => {
        if (res.confirm) {
          useOrderStore.getState().completeOrder(id);
          Taro.showToast({ title: '归还成功', icon: 'success' });
        }
      }
    });
  };

  const handleCancelOrder = (id: string) => {
    Taro.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          useOrderStore.getState().cancelOrder(id);
          Taro.showToast({ title: '已取消', icon: 'success' });
        }
      }
    });
  };

  const toggleEquipment = (equipmentId: string) => {
    const existingIndex = formData.items.findIndex(i => i.equipmentId === equipmentId);
    if (existingIndex >= 0) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(i => i.equipmentId !== equipmentId)
      }));
    } else {
      const equipment = equipments.find(e => e.id === equipmentId);
      if (equipment && equipment.availableQuantity > 0) {
        setFormData(prev => ({
          ...prev,
          items: [...prev.items, { equipmentId, quantity: 1 }]
        }));
      } else {
        Taro.showToast({ title: '该设备暂无库存', icon: 'none' });
      }
    }
  };

  const updateQuantity = (equipmentId: string, delta: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.equipmentId !== equipmentId) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      })
    }));
  };

  const getBatchAllocationPreview = (equipmentId: string, quantity: number) => {
    const equipment = equipments.find(e => e.id === equipmentId);
    if (!equipment) return { batches: [], isSufficient: false, shortage: quantity, availableQty: 0 };

    const availableBatches = equipment.batches
      .filter(b => (b.status === 'normal' || b.status === 'near_expiry') && b.availableQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const result: { batchId: string; batchNo: string; quantity: number; expiryDate: string; status: string }[] = [];
    let remaining = quantity;

    for (const batch of availableBatches) {
      if (remaining <= 0) break;
      const takeQty = Math.min(batch.availableQuantity, remaining);
      result.push({
        batchId: batch.id,
        batchNo: batch.batchNo,
        quantity: takeQty,
        expiryDate: batch.expiryDate,
        status: batch.status
      });
      remaining -= takeQty;
    }

    const availableQty = availableBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
    return {
      batches: result,
      isSufficient: remaining <= 0,
      shortage: Math.max(0, remaining),
      availableQty
    };
  };

  const handleSubmit = () => {
    if (!formData.customerName.trim()) {
      Taro.showToast({ title: '请输入客户姓名', icon: 'none' });
      return;
    }
    if (!formData.customerPhone.trim()) {
      Taro.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
    if (formData.items.length === 0) {
      Taro.showToast({ title: '请选择租赁设备', icon: 'none' });
      return;
    }

    const insufficientItems: string[] = [];
    for (const item of formData.items) {
      const preview = getBatchAllocationPreview(item.equipmentId, item.quantity);
      if (!preview.isSufficient) {
        const eq = equipments.find(e => e.id === item.equipmentId);
        insufficientItems.push(`${eq?.name || '设备'}还差 ${preview.shortage} 台`);
      }
    }

    if (insufficientItems.length > 0) {
      Taro.showModal({
        title: '库存不足',
        content: insufficientItems.join('；\n'),
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    const order = createOrder(formData);
    if (order) {
      Taro.showToast({ title: '订单创建成功', icon: 'success' });
      setShowCreateForm(false);
      setFormData({
        customerName: '',
        customerPhone: '',
        startTime: dayjs().format('YYYY-MM-DD HH:mm'),
        endTime: dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm'),
        deposit: 0,
        remark: '',
        items: []
      });
    } else if (error) {
      Taro.showToast({ title: error, icon: 'none' });
    }
  };

  const previewBilling = () => {
    if (formData.items.length === 0) return;

    const equipment = equipments.find(e => e.id === formData.items[0].equipmentId);
    if (!equipment) return;

    const rateRule = getRateRuleByEquipment(equipment.id);
    const billing = calculateEstimatedAmount(formData.startTime, formData.endTime, rateRule, formData.items[0].quantity);

    Taro.showModal({
      title: '费用预览',
      content: `预计总费用：${formatCurrency(estimatedAmount)}`,
      showCancel: false
    });
  };

  return (
    <PullDownRefresh
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView scrollY className={styles.pageContainer}>
        {!showCreateForm ? (
          <>
            <View className={styles.header}>
              <View className={styles.statRow}>
                <View className={styles.statItem}>
                  <Text className={styles.statValue}>{stats.totalOrders}</Text>
                  <Text className={styles.statLabel}>总订单</Text>
                </View>
                <View className={styles.statItem}>
                  <Text className={styles.statValue}>{stats.activeOrders}</Text>
                  <Text className={styles.statLabel}>进行中</Text>
                </View>
                <View className={styles.statItem}>
                  <Text className={styles.statValue}>{stats.completedOrders}</Text>
                  <Text className={styles.statLabel}>已完成</Text>
                </View>
                <View className={styles.statItem}>
                  <Text className={styles.statValue}>{stats.overdueOrders}</Text>
                  <Text className={styles.statLabel}>已超期</Text>
                </View>
              </View>

              <Button className={styles.createBtn} onClick={() => setShowCreateForm(true)}>
                + 创建新订单
              </Button>

              <View className={styles.tabs}>
                {tabs.map(tab => (
                  <Text
                    key={tab.key}
                    className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
                    onClick={() => setActiveTab(tab.key as OrderStatus | 'all')}
                  >
                    {tab.label}
                  </Text>
                ))}
              </View>
            </View>

            <View className={styles.listContent}>
              {loading ? (
                <View className={styles.loading}>
                  <Text>加载中...</Text>
                </View>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => handleOrderClick(order.id)}
                    onComplete={() => handleCompleteOrder(order.id)}
                    onCancel={() => handleCancelOrder(order.id)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="📋"
                  text="暂无订单"
                  subText="点击上方按钮创建新订单"
                  actionText="创建订单"
                  onAction={() => setShowCreateForm(true)}
                />
              )}
            </View>
          </>
        ) : (
          <View className={styles.createForm}>
            <Text className={styles.formTitle}>创建租赁订单</Text>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>客户姓名 *</Text>
              <Input
                className={styles.formInput}
                placeholder="请输入客户姓名"
                value={formData.customerName}
                onInput={(e) => setFormData(prev => ({ ...prev, customerName: e.detail.value }))}
              />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>联系电话 *</Text>
              <Input
                className={styles.formInput}
                type="number"
                placeholder="请输入联系电话"
                value={formData.customerPhone}
                onInput={(e) => setFormData(prev => ({ ...prev, customerPhone: e.detail.value }))}
              />
            </View>

            <View className={styles.formRow}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>开始时间</Text>
                <Input
                  className={styles.formInput}
                  placeholder="YYYY-MM-DD HH:mm"
                  value={formData.startTime}
                  onInput={(e) => setFormData(prev => ({ ...prev, startTime: e.detail.value }))}
                />
              </View>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>结束时间</Text>
                <Input
                  className={styles.formInput}
                  placeholder="YYYY-MM-DD HH:mm"
                  value={formData.endTime}
                  onInput={(e) => setFormData(prev => ({ ...prev, endTime: e.detail.value }))}
                />
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>押金（元）</Text>
              <Input
                className={styles.formInput}
                type="digit"
                placeholder="0"
                value={formData.deposit.toString()}
                onInput={(e) => setFormData(prev => ({ ...prev, deposit: Number(e.detail.value) }))}
              />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>选择设备 *</Text>
              <View className={styles.equipmentSelector}>
                {equipments.filter(e => e.availableQuantity > 0).map(eq => (
                  <View
                    key={eq.id}
                    className={classnames(
                      styles.equipmentOption,
                      formData.items.some(i => i.equipmentId === eq.id) && styles.selected
                    )}
                    onClick={() => toggleEquipment(eq.id)}
                  >
                    {eq.name}（库存：{eq.availableQuantity}）
                  </View>
                ))}
              </View>

              {formData.items.length > 0 && (
                <View>
                  {formData.items.map(item => {
                    const eq = equipments.find(e => e.id === item.equipmentId);
                    const preview = getBatchAllocationPreview(item.equipmentId, item.quantity);
                    return (
                      <View key={item.equipmentId} className={styles.selectedEquipment}>
                        <View className={styles.selectedEquipHeader}>
                          <Text className={styles.selectedEquipName}>{eq?.name}</Text>
                          <View className={styles.qtyControl}>
                            <Button
                              className={styles.qtyBtn}
                              onClick={() => updateQuantity(item.equipmentId, -1)}
                            >
                              -
                            </Button>
                            <Text className={classnames(
                              styles.qtyValue,
                              !preview.isSufficient && styles.qtyInsufficient
                            )}>{item.quantity}</Text>
                            <Button
                              className={styles.qtyBtn}
                              onClick={() => updateQuantity(item.equipmentId, 1)}
                            >
                              +
                            </Button>
                          </View>
                        </View>

                        {!preview.isSufficient && (
                          <View className={styles.insufficientHint}>
                            <Text>⚠️ 库存不足，还差 {preview.shortage} 台（可用 {preview.availableQty} 台）</Text>
                          </View>
                        )}

                        {preview.batches.length > 0 && (
                          <View className={styles.batchAllocation}>
                            <Text className={styles.batchAllocationTitle}>分配批次（先进先出）：</Text>
                            {preview.batches.map(batch => (
                              <View key={batch.batchId} className={styles.batchAllocItem}>
                                <Text className={styles.batchAllocNo}>{batch.batchNo}</Text>
                                <Text className={styles.batchAllocQty}>{batch.quantity} 台</Text>
                                <Text className={classnames(
                                  styles.batchAllocExpiry,
                                  batch.status === 'near_expiry' && styles.statusNearExpiry
                                )}>
                                  {batch.status === 'near_expiry' ? '临期 ' : ''}
                                  {new Date(batch.expiryDate).toLocaleDateString('zh-CN')} 到期
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>备注</Text>
              <Input
                className={styles.formInput}
                placeholder="选填，订单备注信息"
                value={formData.remark}
                onInput={(e) => setFormData(prev => ({ ...prev, remark: e.detail.value }))}
              />
            </View>

            {estimatedAmount > 0 && (
              <View className={styles.estimatedAmount} onClick={previewBilling}>
                <Text className={styles.estimatedLabel}>预计费用：</Text>
                <Text className={styles.estimatedValue}>{formatCurrency(estimatedAmount)}</Text>
              </View>
            )}

            <View className={styles.actionBtns}>
              <Button className={styles.cancelBtn} onClick={() => setShowCreateForm(false)}>
                取消
              </Button>
              <Button className={styles.submitBtn} onClick={handleSubmit}>
                提交订单
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </PullDownRefresh>
  );
};

export default OrderPage;
