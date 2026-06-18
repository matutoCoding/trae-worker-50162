import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, PullDownRefresh } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useRateStore } from '@/store/useRateStore';
import StatCard from '@/components/StatCard';
import EquipmentCard from '@/components/EquipmentCard';
import OrderCard from '@/components/OrderCard';
import EmptyState from '@/components/EmptyState';
import { formatDate, getNearExpiryEquipment } from '@/utils/date';
import { formatCurrency } from '@/utils/billing';
import styles from './index.module.scss';

const HomePage: React.FC = () => {
  const { equipments, fetchEquipments, loading } = useEquipmentStore();
  const { orders, fetchOrders, getStatistics, getActiveOrders } = useOrderStore();
  const { fetchRateRules, fetchPenaltyRules } = useRateStore();

  const [activeTab, setActiveTab] = useState<'equipment' | 'order'>('equipment');
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'completed' | 'unsettled'>('active');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    fetchEquipments();
    fetchOrders();
    fetchRateRules();
    fetchPenaltyRules();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const stats = getStatistics();
  const nearExpiryList = getNearExpiryEquipment(equipments);
  const activeOrders = getActiveOrders();

  const filteredOrders = useMemo(() => {
    switch (orderFilter) {
      case 'active':
        return orders.filter(o => o.status === 'active' || o.status === 'overdue');
      case 'completed':
        return orders.filter(o => o.status === 'completed');
      case 'unsettled':
        return orders.filter(o => o.paymentStatus !== 'paid' || (o.deposit > 0 && !o.depositRefunded));
      default:
        return orders;
    }
  }, [orders, orderFilter]);

  const orderFilterTabs = [
    { key: 'active', label: '进行中' },
    { key: 'all', label: '全部' },
    { key: 'completed', label: '已完成' },
    { key: 'unsettled', label: '未结清' }
  ];

  const handleEquipmentClick = (id: string) => {
    Taro.navigateTo({
      url: `/pages/equipment-detail/index?id=${id}`
    });
  };

  const handleOrderClick = (id: string) => {
    Taro.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    });
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'addEquipment':
        Taro.navigateTo({ url: '/pages/equipment-add/index' });
        break;
      case 'createOrder':
        Taro.switchTab({ url: '/pages/order/index' });
        break;
      case 'rateConfig':
        Taro.switchTab({ url: '/pages/config/index' });
        break;
      case 'equipment':
        Taro.switchTab({ url: '/pages/equipment/index' });
        break;
      default:
        break;
    }
  };

  const handleCompleteOrder = (id: string) => {
    Taro.showModal({
      title: '确认归还',
      content: '确认设备已归还，将结算费用',
      success: (res) => {
        if (res.confirm) {
          useOrderStore.getState().completeOrder(id);
          Taro.showToast({ title: '归还成功', icon: 'success' });
          loadData();
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
          loadData();
        }
      }
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <PullDownRefresh
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView scrollY className={styles.pageContainer}>
        <View className={styles.header}>
          <View className={styles.headerContent}>
            <View className={styles.greeting}>
              <Text className={styles.greetingTitle}>{getGreeting()}，管理员</Text>
              <Text className={styles.greetingSub}>欢迎使用设备租赁管理系统</Text>
            </View>
            <View className={styles.date}>
              <Text>{formatDate(new Date(), 'MM月DD日 dddd')}</Text>
            </View>
          </View>

          <View className={styles.statGrid}>
            <StatCard
              icon="📋"
              label="今日订单"
              value={stats.todayOrders}
              color="blue"
              trend={12}
            />
            <StatCard
              icon="🔄"
              label="进行中"
              value={stats.activeOrders}
              color="orange"
            />
            <StatCard
              icon="✅"
              label="已完成"
              value={stats.completedOrders}
              color="green"
            />
            <StatCard
              icon="💰"
              label="累计收入"
              value={formatCurrency(stats.totalRevenue)}
              color="red"
              unit=""
            />
          </View>
        </View>

        <View className={styles.sectionTitle}>
          <Text>快捷操作</Text>
        </View>

        <View className={styles.quickActions}>
          <View className={styles.actionItem} onClick={() => handleQuickAction('addEquipment')}>
            <View className={styles.actionIcon}>➕</View>
            <Text className={styles.actionText}>新增设备</Text>
          </View>
          <View className={styles.actionItem} onClick={() => handleQuickAction('createOrder')}>
            <View className={styles.actionIcon}>📝</View>
            <Text className={styles.actionText}>创建订单</Text>
          </View>
          <View className={styles.actionItem} onClick={() => handleQuickAction('equipment')}>
            <View className={styles.actionIcon}>🔧</View>
            <Text className={styles.actionText}>设备管理</Text>
          </View>
          <View className={styles.actionItem} onClick={() => handleQuickAction('rateConfig')}>
            <View className={styles.actionIcon}>⚙️</View>
            <Text className={styles.actionText}>费率配置</Text>
          </View>
        </View>

        {nearExpiryList.length > 0 && (
          <View className={styles.warningSection}>
            <View className={styles.warningCard}>
              <View className={styles.warningTitle}>
                <Text>⚠️ 临期预警</Text>
              </View>
              <View className={styles.warningList}>
                {nearExpiryList.slice(0, 3).map(eq => (
                  <View
                    key={eq.id}
                    className={styles.warningItem}
                    onClick={() => handleEquipmentClick(eq.id)}
                  >
                    <Text className={styles.warningName}>{eq.name}</Text>
                    <Text className={styles.warningTag}>
                      {eq.batches.filter(b => b.status === 'near_expiry').length
                      个批次临期
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View className={styles.listSection}>
          <View className={styles.tabs}>
            <Text
              className={classnames(styles.tabItem, activeTab === 'equipment' && styles.active)}
              onClick={() => setActiveTab('equipment')}
            >
              热门设备
            </Text>
            <Text
              className={classnames(styles.tabItem, activeTab === 'order' && styles.active)}
              onClick={() => setActiveTab('order')}
            >
              订单
            </Text>
          </View>

          {loading ? (
            <View className={styles.loading}>
              <Text>加载中...</Text>
            </View>
          ) : activeTab === 'equipment' ? (
            equipments.length > 0 ? (
              equipments.slice(0, 5).map(eq => (
                <EquipmentCard
                  key={eq.id}
                  equipment={eq}
                  onClick={() => handleEquipmentClick(eq.id)}
                  showBatches
                />
              ))
            ) : (
              <EmptyState
                icon="🔧"
                text="暂无设备"
                subText="点击快捷操作添加设备"
                actionText="新增设备"
                onAction={() => handleQuickAction('addEquipment')}
              />
            )
          ) : (
            <>
              <View className={styles.subTabs}>
                {orderFilterTabs.map(tab => (
                  <Text
                    key={tab.key}
                    className={classnames(styles.subTabItem, orderFilter === tab.key && styles.active)}
                    onClick={() => setOrderFilter(tab.key as any)}
                  >
                    {tab.label}
                  </Text>
                ))}
              </View>
              {filteredOrders.length > 0 ? (
                filteredOrders.slice(0, 10).map(order => (
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
                  subText="点击创建新订单"
                  actionText="创建订单"
                  onAction={() => handleQuickAction('createOrder')}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </PullDownRefresh>
  );
};

export default HomePage;
