import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Input, ScrollView, Button, PullDownRefresh } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import EquipmentCard from '@/components/EquipmentCard';
import EmptyState from '@/components/EmptyState';
import { CATEGORY_OPTIONS, BATCH_STATUS_TEXT } from '@/types/equipment';
import styles from './index.module.scss';

const EquipmentPage: React.FC = () => {
  const { equipments, fetchEquipments, loading, refreshBatchStatuses } = useEquipmentStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'expiry'>('name');
  const [refreshing, setRefreshing] = useState(false);

  const categories = ['全部', ...CATEGORY_OPTIONS];
  const statusFilters = [
    { key: 'all', label: '全部' },
    { key: 'normal', label: '正常' },
    { key: 'near_expiry', label: '临期' },
    { key: 'expired', label: '过期' },
    { key: 'locked', label: '锁定' }
  ];

  useEffect(() => {
    fetchEquipments();
    refreshBatchStatuses();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEquipments();
    refreshBatchStatuses();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const filteredEquipments = useMemo(() => {
    let result = [...equipments];

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(eq =>
        eq.name.toLowerCase().includes(keyword) ||
        eq.category.toLowerCase().includes(keyword) ||
        (eq.spec && eq.spec.toLowerCase().includes(keyword)) ||
        (eq.specification && eq.specification.toLowerCase().includes(keyword))
      );
    }

    if (activeCategory !== '全部') {
      result = result.filter(eq => eq.category === activeCategory);
    }

    if (statusFilter !== 'all') {
      result = result.filter(eq =>
        eq.batches.some(b => b.status === statusFilter)
      );
    }

    switch (sortBy) {
      case 'stock':
        result.sort((a, b) => b.availableQuantity - a.availableQuantity);
        break;
      case 'expiry':
        result.sort((a, b) => {
          const aMinExpiry = Math.min(...a.batches.map(b => new Date(b.expiryDate).getTime()));
          const bMinExpiry = Math.min(...b.batches.map(b => new Date(b.expiryDate).getTime()));
          return aMinExpiry - bMinExpiry;
        });
        break;
      default:
        result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [equipments, searchKeyword, activeCategory, statusFilter, sortBy]);

  const handleEquipmentClick = (id: string) => {
    Taro.navigateTo({
      url: `/pages/equipment-detail/index?id=${id}`
    });
  };

  const handleAddEquipment = () => {
    Taro.navigateTo({
      url: '/pages/add-equipment/index'
    });
  };

  const getStats = () => {
    const total = equipments.length;
    const normal = equipments.filter(eq => eq.batches.some(b => b.status === 'normal')).length;
    const nearExpiry = equipments.filter(eq => eq.batches.some(b => b.status === 'near_expiry')).length;
    const expired = equipments.filter(eq => eq.batches.some(b => b.status === 'expired' || b.status === 'locked')).length;
    return { total, normal, nearExpiry, expired };
  };

  const stats = getStats();

  return (
    <PullDownRefresh
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView scrollY className={styles.pageContainer}>
        <View className={styles.header}>
          <View className={styles.searchBar}>
            <Input
              className={styles.searchInput}
              placeholder="搜索设备名称、分类、规格..."
              value={searchKeyword}
              onInput={(e) => setSearchKeyword(e.detail.value)}
            />
            <Button className={styles.addBtn} onClick={handleAddEquipment}>
              + 新增
            </Button>
          </View>

          <ScrollView scrollX className={styles.categoryTabs}>
            {categories.map(cat => (
              <View
                key={cat}
                className={classnames(styles.categoryItem, activeCategory === cat && styles.active)}
                onClick={() => setActiveCategory(cat)}
              >
                <Text>{cat}</Text>
              </View>
            ))}
          </ScrollView>

          <View className={styles.batchStatusFilter}>
            {statusFilters.map(filter => (
              <View
                key={filter.key}
                className={classnames(styles.statusFilterItem, statusFilter === filter.key && styles.active)}
                onClick={() => setStatusFilter(filter.key)}
              >
                {filter.label}
                {filter.key !== 'all' && (
                  <Text> ({stats[filter.key as keyof typeof stats]})</Text>
                )}
              </View>
            ))}
          </View>

          <View className={styles.filterBar}>
            <Text className={styles.filterText}>
              共 {filteredEquipments.length} 个设备
            </Text>
            <View className={styles.filterActions}>
              <Text
                className={classnames(styles.filterAction, sortBy === 'name' && styles.active)}
                onClick={() => setSortBy('name')}
              >
                按名称
              </Text>
              <Text
                className={classnames(styles.filterAction, sortBy === 'stock' && styles.active)}
                onClick={() => setSortBy('stock')}
              >
                按库存
              </Text>
              <Text
                className={classnames(styles.filterAction, sortBy === 'expiry' && styles.active)}
                onClick={() => setSortBy('expiry')}
              >
                按效期
              </Text>
            </View>
          </View>
        </View>

        <View className={styles.listContent}>
          {loading ? (
            <View className={styles.loading}>
              <Text>加载中...</Text>
            </View>
          ) : filteredEquipments.length > 0 ? (
            filteredEquipments.map(eq => (
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
              subText={searchKeyword ? '没有找到匹配的设备' : '点击右上角新增设备'}
              actionText={searchKeyword ? '清除搜索' : '新增设备'}
              onAction={() => {
                if (searchKeyword) {
                  setSearchKeyword('');
                } else {
                  handleAddEquipment();
                }
              }}
            />
          )}
        </View>
      </ScrollView>
    </PullDownRefresh>
  );
};

export default EquipmentPage;
