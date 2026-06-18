import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import classnames from 'classnames';
import type { Equipment } from '@/types/equipment';
import { BATCH_STATUS_TEXT, BATCH_STATUS_COLOR } from '@/types/equipment';
import { formatCurrency } from '@/utils/billing';
import styles from './index.module.scss';

interface EquipmentCardProps {
  equipment: Equipment;
  onClick?: () => void;
  showBatches?: boolean;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, onClick, showBatches = false }) => {
  const getStockClass = () => {
    if (equipment.availableQuantity === 0) return styles.out;
    if (equipment.availableQuantity < 10) return styles.low;
    return '';
  };

  const getStockText = () => {
    if (equipment.availableQuantity === 0) return '暂无库存';
    return `可租 ${equipment.availableQuantity}${equipment.unit}`;
  };

  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.header}>
        <Image
          className={styles.image}
          src={equipment.imageUrl}
          mode="aspectFill"
          lazyLoad
          onError={(e) => console.error('[EquipmentCard] 图片加载失败:', e)}
        />
        <View className={styles.info}>
          <Text className={styles.name}>{equipment.name}</Text>
          <Text className={styles.spec}>{equipment.spec}</Text>
          <Text className={styles.category}>{equipment.category}</Text>
        </View>
      </View>

      <View className={styles.priceRow}>
        <Text className={styles.price}>{formatCurrency(equipment.hourlyRate)}</Text>
        <Text className={styles.priceUnit}>/ 小时 | {formatCurrency(equipment.dailyRate)} / 天</Text>
      </View>

      <View className={styles.stockRow}>
        <Text className={styles.stockInfo}>
          库存：
          <Text className={classnames(styles.stockNum, getStockClass())}>
            {getStockText()}
          </Text>
          <Text> / 共 {equipment.totalQuantity}{equipment.unit}</Text>
        </Text>
      </View>

      {showBatches && equipment.batches.length > 0 && (
        <View className={styles.batches}>
          {equipment.batches.slice(0, 3).map(batch => (
            <View
              key={batch.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4rpx 12rpx',
                borderRadius: '8rpx',
                fontSize: '22rpx',
                background: `${BATCH_STATUS_COLOR[batch.status]}15`,
                color: BATCH_STATUS_COLOR[batch.status]
              }}
            >
              {BATCH_STATUS_TEXT[batch.status]} · {batch.batchNo}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default EquipmentCard;
