import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { BatchStatus } from '@/types/equipment';
import { BATCH_STATUS_TEXT } from '@/types/equipment';
import styles from './index.module.scss';

interface BatchTagProps {
  status: BatchStatus;
  showText?: boolean;
  batchNo?: string;
  daysRemaining?: number;
}

const BatchTag: React.FC<BatchTagProps> = ({ status, showText = true, batchNo, daysRemaining }) => {
  const statusClass = {
    normal: styles.normal,
    near_expiry: styles.nearExpiry,
    expired: styles.expired,
    locked: styles.locked
  }[status];

  const getDisplayText = () => {
    let text = BATCH_STATUS_TEXT[status];
    if (status === 'near_expiry' && daysRemaining !== undefined) {
      text += `（剩${daysRemaining}天）`;
    }
    if (batchNo) {
      text += ` · ${batchNo}`;
    }
    return text;
  };

  return (
    <View className={classnames(styles.tag, statusClass)}>
      <Text>{showText ? getDisplayText() : BATCH_STATUS_TEXT[status]}</Text>
    </View>
  );
};

export default BatchTag;
