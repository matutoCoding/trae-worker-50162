import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import BatchTag from '@/components/BatchTag';
import { formatDate } from '@/utils/date';
import { formatCurrency } from '@/utils/billing';
import styles from './index.module.scss';

const EquipmentDetailPage: React.FC = () => {
  const router = useRouter();
  const equipmentId = router.params.id as string;
  const { getEquipmentById, equipments } = useEquipmentStore();

  const [equipment, setEquipment] = useState<any>(null);

  useEffect(() => {
    if (equipmentId) {
      const eq = getEquipmentById(equipmentId);
      setEquipment(eq);
    }
  }, [equipmentId, equipments]);

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
            equipment.batches.map((batch: any) => (
              <View key={batch.id} className={styles.batchItem}>
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
              </View>
            ))
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
