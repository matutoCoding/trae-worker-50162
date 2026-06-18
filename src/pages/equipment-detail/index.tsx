import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import BatchTag from '@/components/BatchTag';
import { formatDate, getDaysRemaining } from '@/utils/date';
import { formatCurrency } from '@/utils/billing';
import styles from './index.module.scss';

const EquipmentDetailPage: React.FC = () => {
  const router = useRouter();
  const equipmentId = router.params.id as string;
  const { getEquipmentById, equipments, nearExpiryDays } = useEquipmentStore();

  const [equipment, setEquipment] = useState<any>(null);

  useEffect(() => {
    if (equipmentId) {
      const eq = getEquipmentById(equipmentId);
      setEquipment(eq);
    }
  }, [equipmentId, equipments]);

  const handleBatchClick = (batch: any) => {
    const daysRemaining = getDaysRemaining(batch.expiryDate);
    let title = '';
    let content = '';

    if (batch.status === 'locked') {
      title = '批次已锁定';
      const lockReason = batch.lockReason || (daysRemaining < 0 ? '批次已过期自动锁定' : '管理员手动锁定');
      content = `锁定原因：${lockReason}\n\n• 不可出租：该批次设备无法用于新建订单\n• 库存保留：库存数量仍然计入总库存，但不计入可用数量\n• 解锁方式：在批次管理中手动解锁，或联系管理员`;
    } else if (batch.status === 'expired') {
      title = '批次已过期';
      content = `已过期 ${Math.abs(daysRemaining)} 天\n\n• 不可出租：过期批次自动锁定，无法用于新建订单\n• 处理建议：建议盘点后报废或退回供应商\n• 恢复方式：如确认设备仍可使用，可在批次管理中手动解锁`;
    } else if (batch.status === 'near_expiry') {
      title = '批次即将到期';
      content = `还剩 ${daysRemaining} 天到期（临期阈值：${nearExpiryDays}天）\n\n• 可以出租：该批次设备仍可正常租赁\n• 出库优先：系统会按FIFO优先出库临期批次\n• 注意事项：建议尽快安排出库，避免批次过期锁定`;
    } else {
      title = '批次状态正常';
      content = `还剩 ${daysRemaining} 天到期\n\n• 可正常出租\n• 按FIFO规则参与出库排序`;
    }

    Taro.showModal({
      title,
      content,
      showCancel: false,
      confirmText: '我知道了'
    });
  };

  if (!equipment) {
    return (
      <ScrollView scrollY className={styles.pageContainer}>
        <View className={styles.emptyState}>
          <Text>设备不存在</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className={styles.pageContainer}>
      <View className={styles.header}>
        <View className={styles.equipmentImage}>
          {equipment.icon || '🔧'}
        </View>
        
        <View className={styles.equipmentInfo}>
          <Text className={styles.equipmentName}>{equipment.name}</Text>
          <Text className={styles.equipmentSpec}>规格：{equipment.specification}</Text>
          <Text className={styles.equipmentPrice}>{formatCurrency(equipment.hourlyRate)}/小时</Text>
          <Text className={styles.equipmentSpec}>{equipment.description}</Text>
        </View>

        <View className={styles.equipmentMeta}>
          <View className={styles.metaItem}>
            <Text className={styles.metaValue}>{equipment.totalQuantity}</Text>
            <Text className={styles.metaLabel}>总库存</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaValue}>{equipment.availableQuantity}</Text>
            <Text className={styles.metaLabel}>可用</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaValue}>{equipment.batches?.length || 0}</Text>
            <Text className={styles.metaLabel}>批次</Text>
          </View>
        </View>

        <View className={styles.actionBtns}>
          <Button className={styles.secondaryBtn}>编辑</Button>
          <Button className={styles.primaryBtn}>新增批次</Button>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>批次列表</Text>
        <View className={styles.batchesList}>
          {equipment.batches && equipment.batches.length > 0 ? (
            equipment.batches.map((batch: any) => {
              const daysRemaining = getDaysRemaining(batch.expiryDate);
              const isClickable = batch.status === 'near_expiry' || batch.status === 'locked' || batch.status === 'expired';
              const daysText = daysRemaining > 0
                ? `还剩 ${daysRemaining} 天`
                : daysRemaining === 0
                  ? '今天到期'
                  : `已过期 ${Math.abs(daysRemaining)} 天`;
              return (
                <View
                  key={batch.id}
                  className={classnames(styles.batchItem, isClickable && styles.batchClickable)}
                  onClick={() => isClickable && handleBatchClick(batch)}
                >
                  <View className={styles.batchHeader}>
                    <Text className={styles.batchNo}>批次号：{batch.batchNo}</Text>
                    <BatchTag status={batch.status} />
                  </View>
                  <View className={styles.batchDates}>
                    <Text>生产：{formatDate(batch.productionDate)}</Text>
                    <Text>到期：{formatDate(batch.expiryDate)}</Text>
                  </View>
                  <View className={styles.batchQty}>
                    <Text>库存：{batch.quantity}</Text>
                    <Text>可用：{batch.availableQuantity}</Text>
                  </View>
                  <View className={classnames(
                    styles.batchDays,
                    batch.status === 'locked' && styles.daysLocked,
                    batch.status === 'expired' && styles.daysExpired,
                    batch.status === 'near_expiry' && styles.daysNearExpiry,
                    batch.status === 'normal' && styles.daysNormal
                  )}>
                    {daysText}
                    {isClickable && <Text className={styles.clickHint}> 点击查看详情</Text>}
                  </View>
                </View>
              );
            })
          ) : (
            <View className={styles.emptyState}>
              <Text>暂无批次</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default EquipmentDetailPage;
