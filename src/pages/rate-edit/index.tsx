import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Button, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useRateStore } from '@/store/useRateStore';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import { validateTimeSlotOverlap } from '@/utils/billing';
import type { TimeSlot } from '@/types/rate';
import styles from './index.module.scss';

const DEFAULT_SLOT_NAMES = ['早高峰', '日间', '晚高峰', '夜间', '周末', '节假日'];

const RateEditPage: React.FC = () => {
  const router = useRouter();
  const rateId = router.params.id as string;
  const { getRateRuleById, addTimeSlot, updateTimeSlot, removeTimeSlot, updateRateRule, loading } = useRateStore();
  const { getEquipmentById } = useEquipmentStore();

  const [rateRule, setRateRule] = useState<any>(null);
  const [baseRate, setBaseRate] = useState('');
  const [timeSlots, setTimeSlots] = useState<Array<{
    id?: string;
    name: string;
    startTime: string;
    endTime: string;
    rate: string;
  }>>([]);
  const [hasOverlap, setHasOverlap] = useState(false);

  useEffect(() => {
    if (rateId) {
      const rule = getRateRuleById(rateId);
      if (rule) {
        setRateRule(rule);
        setBaseRate(rule.baseRate.toString());
        setTimeSlots(rule.timeSlots.map(slot => ({
          ...slot,
          rate: slot.rate.toString(),
        })));
      }
    }
  }, [rateId]);

  useEffect(() => {
    if (timeSlots.length >= 2) {
      const slots = timeSlots.map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
      }));
      setHasOverlap(!validateTimeSlotOverlap(slots));
    } else {
      setHasOverlap(false);
    }
  }, [timeSlots]);

  const equipment = rateRule ? getEquipmentById(rateRule.equipmentId) : null;

  const addNewSlot = () => {
    const usedNames = timeSlots.map(s => s.name);
    const availableName = DEFAULT_SLOT_NAMES.find(n => !usedNames.includes(n)) || '新时段';
    
    setTimeSlots(prev => [
      ...prev,
      {
        name: availableName,
        startTime: '00:00',
        endTime: '06:00',
        rate: baseRate,
      }
    ]);
  };

  const updateSlot = (index: number, field: string, value: string) => {
    setTimeSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ));
  };

  const removeSlot = (index: number) => {
    if (timeSlots.length <= 1) {
      Taro.showToast({ title: '至少保留一个时段', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '删除时段',
      content: '确定要删除该时段吗？',
      success: (res) => {
        if (res.confirm) {
          const slot = timeSlots[index];
          if (slot.id) {
            removeTimeSlot(rateId, slot.id);
          }
          setTimeSlots(prev => prev.filter((_, i) => i !== index));
        }
      }
    });
  };

  const handleSubmit = async () => {
    if (!baseRate || Number(baseRate) <= 0) {
      Taro.showToast({ title: '请输入有效基础费率', icon: 'none' });
      return;
    }

    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      if (!slot.name.trim()) {
        Taro.showToast({ title: `时段${i + 1}请输入名称`, icon: 'none' });
        return;
      }
      if (!slot.startTime || !slot.endTime) {
        Taro.showToast({ title: `时段${i + 1}请填写完整时间`, icon: 'none' });
        return;
      }
      if (!slot.rate || Number(slot.rate) <= 0) {
        Taro.showToast({ title: `时段${i + 1}请输入有效费率`, icon: 'none' });
        return;
      }
    }

    if (hasOverlap) {
      Taro.showToast({ title: '时段存在重叠，请调整', icon: 'none' });
      return;
    }

    try {
      updateRateRule(rateId, { baseRate: Number(baseRate) });

      for (const slot of timeSlots) {
        const slotData = {
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          rate: Number(slot.rate),
        };

        if (slot.id) {
          await updateTimeSlot(rateId, slot.id, slotData);
        } else {
          await addTimeSlot(rateId, slotData as Omit<TimeSlot, 'id'>);
        }
      }

      Taro.showToast({ title: '费率更新成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1000);
    } catch (error) {
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  };

  if (!rateRule) {
    return (
      <ScrollView scrollY className={styles.pageContainer}>
        <View style={{ padding: '80rpx', textAlign: 'center', color: '#94A3B8' }}>
          <Text>费率规则不存在</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className={styles.pageContainer}>
      <View className={styles.formCard}>
        <Text className={styles.formTitle}>关联设备</Text>
        <View style={{ padding: '24rpx', background: '#F8FAFC', borderRadius: '16rpx' }}>
          <Text style={{ fontSize: '32rpx', fontWeight: '600', color: '#1E293B' }}>
            {equipment?.name || '未找到设备'}
          </Text>
          <Text style={{ fontSize: '24rpx', color: '#64748B', marginTop: '8rpx' }}>
            {equipment?.specification}
          </Text>
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formTitle}>基础费率</Text>
        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>
            <Text className={styles.formRequired}>*</Text>基础小时费率（元）
          </Text>
          <Input
            className={styles.formInput}
            type="digit"
            placeholder="0.00"
            value={baseRate}
            onInput={(e) => setBaseRate(e.detail.value)}
          />
          <Text style={{ fontSize: '24rpx', color: '#94A3B8', marginTop: '8rpx' }}>
            未匹配到特殊时段时使用此费率
          </Text>
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formTitle}>分时段费率</Text>

        <View className={styles.timeSlotList}>
          {timeSlots.map((slot, index) => (
            <View key={index} className={styles.timeSlotItem}>
              <View className={styles.slotHeader}>
                <Input
                  className={styles.slotName}
                  placeholder="时段名称"
                  value={slot.name}
                  onInput={(e) => updateSlot(index, 'name', e.detail.value)}
                />
                <Button className={styles.removeBtn} onClick={() => removeSlot(index)}>
                  删除
                </Button>
              </View>

              <View className={styles.slotTimeRow}>
                <Input
                  className={styles.timeInput}
                  placeholder="HH:mm"
                  value={slot.startTime}
                  onInput={(e) => updateSlot(index, 'startTime', e.detail.value)}
                />
                <Text className={styles.timeSeparator}>至</Text>
                <Input
                  className={styles.timeInput}
                  placeholder="HH:mm"
                  value={slot.endTime}
                  onInput={(e) => updateSlot(index, 'endTime', e.detail.value)}
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>时段费率（元/小时）</Text>
                <Input
                  className={styles.formInput}
                  type="digit"
                  placeholder="0.00"
                  value={slot.rate}
                  onInput={(e) => updateSlot(index, 'rate', e.detail.value)}
                />
              </View>
            </View>
          ))}
        </View>

        {hasOverlap && (
          <View className={styles.overlapWarning}>
            ⚠️ 时段存在重叠，请调整时间范围
          </View>
        )}

        <Button className={styles.addSlotBtn} onClick={addNewSlot}>
          + 新增时段
        </Button>
      </View>

      <View className={styles.actionBtns}>
        <Button className={styles.cancelBtn} onClick={() => Taro.navigateBack()}>
          取消
        </Button>
        <Button className={styles.submitBtn} onClick={handleSubmit} loading={loading}>
          保存
        </Button>
      </View>
    </ScrollView>
  );
};

export default RateEditPage;
