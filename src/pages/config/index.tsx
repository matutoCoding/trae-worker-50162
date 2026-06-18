import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Button, Input, PullDownRefresh } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useRateStore } from '@/store/useRateStore';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import RateCard from '@/components/RateCard';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/utils/billing';
import styles from './index.module.scss';

const ConfigPage: React.FC = () => {
  const {
    rateRules,
    penaltyRules,
    billingConfig,
    fetchRateRules,
    fetchBillingConfig,
    fetchPenaltyRules,
    updateBillingConfig,
    togglePenaltyRule,
    loading,
    error
  } = useRateStore();

  const { equipments, fetchEquipments } = useEquipmentStore();

  const [activeTab, setActiveTab] = useState<'rates' | 'penalty' | 'config'>('rates');
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    { key: 'rates', label: '时段费率' },
    { key: 'penalty', label: '罚金规则' },
    { key: 'config', label: '系统配置' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    fetchRateRules();
    fetchPenaltyRules();
    fetchBillingConfig();
    fetchEquipments();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const getEquipmentName = (equipmentId: string) => {
    const eq = equipments.find(e => e.id === equipmentId);
    return eq ? eq.name : '未关联设备';
  };

  const handleEditRate = (rateId: string) => {
    Taro.navigateTo({
      url: `/pages/rate-edit/index?id=${rateId}`
    });
  };

  const handleAddRate = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' });
  };

  const handleTogglePenalty = (penaltyId: string) => {
    Taro.showModal({
      title: '切换规则状态',
      content: '确定要切换该罚金规则的启用状态吗？',
      success: (res) => {
        if (res.confirm) {
          togglePenaltyRule(penaltyId);
          Taro.showToast({ title: '操作成功', icon: 'success' });
        }
      }
    });
  };

  const handleConfigChange = (key: string, value: string) => {
    const numValue = Number(value);
    if (isNaN(numValue)) return;
    
    updateBillingConfig({
      ...billingConfig,
      [key]: numValue
    });
  };

  const handleToggleConfig = (key: string) => {
    updateBillingConfig({
      ...billingConfig,
      [key]: !billingConfig[key]
    });
  };

  const rateRulesWithEquipName = rateRules.map(rule => ({
    ...rule,
    equipmentName: getEquipmentName(rule.equipmentId)
  }));

  return (
    <PullDownRefresh
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView scrollY className={styles.pageContainer}>
        <View className={styles.tabs}>
          {tabs.map(tab => (
            <Text
              key={tab.key}
              className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
              onClick={() => setActiveTab(tab.key as 'rates' | 'penalty' | 'config')}
            >
              {tab.label}
            </Text>
          ))}
        </View>

        {activeTab === 'rates' && (
          <>
            <Button className={styles.addBtn} onClick={handleAddRate}>
              + 新增费率规则
            </Button>

            {loading ? (
              <View className={styles.loading}>
                <Text>加载中...</Text>
              </View>
            ) : rateRulesWithEquipName.length > 0 ? (
              rateRulesWithEquipName.map(rule => (
                <RateCard
                  key={rule.id}
                  rateRule={rule}
                  equipmentName={rule.equipmentName}
                  onEdit={() => handleEditRate(rule.id)}
                />
              ))
            ) : (
              <EmptyState
                icon="⚙️"
                text="暂无费率规则"
                subText="点击上方按钮创建费率规则"
                actionText="创建规则"
                onAction={handleAddRate}
              />
            )}
          </>
        )}

        {activeTab === 'penalty' && (
          <>
            <Text className={styles.sectionTitle}>
              罚金规则
              <Text className={styles.sectionDesc}>超期未归还时的收费规则</Text>
            </Text>

            {loading ? (
              <View className={styles.loading}>
                <Text>加载中...</Text>
              </View>
            ) : penaltyRules.length > 0 ? (
              penaltyRules.map(penalty => (
                <View key={penalty.id} className={styles.penaltyCard}>
                  <View className={styles.penaltyInfo}>
                    <Text className={styles.penaltyName}>{penalty.name}</Text>
                    <Text className={styles.penaltyDetail}>
                      {penalty.description}
                    </Text>
                    <Text className={styles.penaltyDetail}>
                      罚金费率：{formatCurrency(penalty.penaltyRate)}/{penalty.penaltyUnit === 'hourly' ? '小时' : '天'}
                      {penalty.gracePeriodHours > 0 && `，宽限期${penalty.gracePeriodHours}小时`}
                    </Text>
                  </View>
                  <View
                    className={classnames(styles.switch, penalty.enabled && styles.active)}
                    onClick={() => handleTogglePenalty(penalty.id)}
                  />
                </View>
              ))
            ) : (
              <View className={styles.emptyState}>
                <Text>暂无罚金规则</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'config' && (
          <>
            <Text className={styles.sectionTitle}>
              计费配置
              <Text className={styles.sectionDesc}>全局计费相关参数设置</Text>
            </Text>

            <View className={styles.configCard}>
              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>最小计费单位</Text>
                  <Text className={styles.configDesc}>不足该时间按该时间计算</Text>
                </View>
                <Input
                  className={styles.configInput}
                  type="number"
                  value={billingConfig.minBillingUnit.toString()}
                  onInput={(e) => handleConfigChange('minBillingUnit', e.detail.value)}
                />
                <Text className={styles.configValue}>分钟</Text>
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>时间计算精度</Text>
                  <Text className={styles.configDesc}>时长计算时保留的小数位</Text>
                </View>
                <Input
                  className={styles.configInput}
                  type="number"
                  value={billingConfig.timePrecision.toString()}
                  onInput={(e) => handleConfigChange('timePrecision', e.detail.value)}
                />
                <Text className={styles.configValue}>位</Text>
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>金额保留小数位</Text>
                  <Text className={styles.configDesc}>费用计算时保留的小数位</Text>
                </View>
                <Input
                  className={styles.configInput}
                  type="number"
                  value={billingConfig.amountPrecision.toString()}
                  onInput={(e) => handleConfigChange('amountPrecision', e.detail.value)}
                />
                <Text className={styles.configValue}>位</Text>
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>四舍五入方式</Text>
                  <Text className={styles.configDesc}>
                    {billingConfig.roundingMode === 'round' ? '四舍五入' : 
                     billingConfig.roundingMode === 'ceil' ? '向上取整' : '向下取整'}
                  </Text>
                </View>
              </View>
            </View>

            <Text className={styles.sectionTitle}>
              效期配置
              <Text className={styles.sectionDesc}>设备批次效期管理参数</Text>
            </Text>

            <View className={styles.configCard}>
              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>临期预警天数</Text>
                  <Text className={styles.configDesc}>有效期不足该天数标记为临期</Text>
                </View>
                <Input
                  className={styles.configInput}
                  type="number"
                  value={billingConfig.nearExpiryDays.toString()}
                  onInput={(e) => handleConfigChange('nearExpiryDays', e.detail.value)}
                />
                <Text className={styles.configValue}>天</Text>
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>自动锁定过期批次</Text>
                  <Text className={styles.configDesc}>过期后自动锁定，不可租赁</Text>
                </View>
                <View
                  className={classnames(styles.switch, billingConfig.autoLockExpired && styles.active)}
                  onClick={() => handleToggleConfig('autoLockExpired')}
                />
              </View>
            </View>

            <Text className={styles.sectionTitle}>
              超期配置
              <Text className={styles.sectionDesc}>租期超期相关参数</Text>
            </Text>

            <View className={styles.configCard}>
              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>启用超期罚金</Text>
                  <Text className={styles.configDesc}>超过约定租期是否计算罚金</Text>
                </View>
                <View
                  className={classnames(styles.switch, billingConfig.enableOverduePenalty && styles.active)}
                  onClick={() => handleToggleConfig('enableOverduePenalty')}
                />
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>默认宽限期</Text>
                  <Text className={styles.configDesc}>宽限期内不计算罚金</Text>
                </View>
                <Input
                  className={styles.configInput}
                  type="number"
                  value={billingConfig.defaultGracePeriodHours.toString()}
                  onInput={(e) => handleConfigChange('defaultGracePeriodHours', e.detail.value)}
                />
                <Text className={styles.configValue}>小时</Text>
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>超期自动提醒</Text>
                  <Text className={styles.configDesc}>超期后自动发送提醒通知</Text>
                </View>
                <View
                  className={classnames(styles.switch, billingConfig.enableOverdueReminder && styles.active)}
                  onClick={() => handleToggleConfig('enableOverdueReminder')}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </PullDownRefresh>
  );
};

export default ConfigPage;
