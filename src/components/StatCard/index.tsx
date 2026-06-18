import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  unit?: string;
  color?: 'blue' | 'green' | 'orange' | 'red';
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  unit,
  color = 'blue',
  trend,
  trendLabel,
  onClick
}) => {
  return (
    <View className={styles.statCard} onClick={onClick}>
      <View className={classnames(styles.iconWrapper, styles[color])}>
        <Text>{icon}</Text>
      </View>
      <View className={styles.content}>
        <Text className={styles.label}>{label}</Text>
        <View>
          <Text className={styles.value}>{value}</Text>
          {unit && <Text className={styles.unit}>{unit}</Text>}
        </View>
        {trend !== undefined && (
          <Text className={classnames(styles.trend, trend >= 0 ? styles.up : styles.down)}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel || '较昨日'}
          </Text>
        )}
      </View>
    </View>
  );
};

export default StatCard;
