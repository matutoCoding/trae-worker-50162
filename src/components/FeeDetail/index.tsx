import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { BillingDetail } from '@/types/rate';
import { formatCurrency } from '@/utils/billing';
import { getDurationText } from '@/utils/date';
import styles from './index.module.scss';

interface FeeDetailProps {
  billingDetail: BillingDetail;
  title?: string;
  showPenalty?: boolean;
}

const FeeDetail: React.FC<FeeDetailProps> = ({
  billingDetail,
  title = '费用明细',
  showPenalty = true
}) => {
  return (
    <View className={styles.container}>
      <Text className={styles.title}>{title}</Text>

      {billingDetail.segments.length > 0 && (
        <View className={styles.segmentsList}>
          {billingDetail.segments.map((segment, index) => (
            <View key={index} className={styles.segmentItem}>
              <View className={styles.segmentInfo}>
                <Text className={styles.segmentName}>{segment.slotName}</Text>
                <Text className={styles.segmentTime}>
                  {segment.startTime} ~ {segment.endTime}
                </Text>
              </View>
              <View className={styles.segmentAmount}>
                <Text className={styles.segmentRate}>{formatCurrency(segment.rate)}/小时</Text>
                <Text className={styles.segmentDuration}>
                  {segment.duration.toFixed(1)}小时 × {formatCurrency(segment.rate)}
                </Text>
                <Text className={styles.segmentPrice}>{formatCurrency(segment.amount)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View className={styles.summary}>
        <View className={styles.summaryRow}>
          <Text className={styles.summaryLabel}>基础租金</Text>
          <Text className={styles.summaryValue}>{formatCurrency(billingDetail.baseAmount)}</Text>
        </View>

        {showPenalty && billingDetail.penaltyAmount > 0 && (
          <View className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>超期罚金</Text>
            <Text className={classnames(styles.summaryValue, styles.penalty)}>
              +{formatCurrency(billingDetail.penaltyAmount)}
            </Text>
          </View>
        )}

        <View className={classnames(styles.summaryRow, styles.total)}>
          <Text className={styles.totalLabel}>合计金额</Text>
          <Text className={styles.totalValue}>{formatCurrency(billingDetail.totalAmount)}</Text>
        </View>

        <Text className={styles.hoursInfo}>
          共计 {billingDetail.totalHours.toFixed(1)} 小时
          {billingDetail.penaltyHours > 0 && `，超期 ${billingDetail.penaltyHours.toFixed(1)} 小时`}
        </Text>
      </View>
    </View>
  );
};

export default FeeDetail;
