import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import type { RateRule } from '@/types/rate';
import { formatCurrency } from '@/utils/billing';
import styles from './index.module.scss';

interface RateCardProps {
  rateRule: RateRule;
  onEdit?: () => void;
}

const RateCard: React.FC<RateCardProps> = ({ rateRule, onEdit }) => {
  return (
    <View className={styles.card}>
      <View className={styles.header}>
        <View className={styles.info}>
          <View>
            <Text className={styles.equipmentName}>{rateRule.equipmentName}</Text>
            {rateRule.isDefault && <Text className={styles.defaultBadge}>默认</Text>}
          </View>
          <Text className={styles.baseRate}>
            基础费率：<Text className={styles.hourlyRate}>{formatCurrency(rateRule.baseHourlyRate)}</Text>/小时
            {' | '}{formatCurrency(rateRule.baseDailyRate)}/天
          </Text>
        </View>
      </View>

      {rateRule.timeSlots.length > 0 && (
        <>
          <Text className={styles.slotsTitle}>分时段费率：</Text>
          <View className={styles.slotsList}>
            {rateRule.timeSlots.map(slot => (
              <View key={slot.id} className={styles.slotItem}>
                <Text className={styles.slotName}>{slot.name}</Text>
                <Text className={styles.slotTime}>{slot.startTime}-{slot.endTime}</Text>
                <Text className={styles.slotRate}>{formatCurrency(slot.rate)}/h</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View className={styles.footer}>
        <Button className={styles.editBtn} onClick={onEdit}>
          编辑费率
        </Button>
      </View>
    </View>
  );
};

export default RateCard;
