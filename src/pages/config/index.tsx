import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Button, Input, PullDownRefresh, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useRateStore } from '@/store/useRateStore';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import RateCard from '@/components/RateCard';
import EmptyState from '@/components/EmptyState';
import FeeDetail from '@/components/FeeDetail';
import { formatCurrency, calculateBilling } from '@/utils/billing';
import { generateOrderNo } from '@/utils/date';
import type { BillingDetail } from '@/types/rate';
import styles from './index.module.scss';

const ConfigPage: React.FC = () => {
  const {
    rateRules,
    penaltyRules,
    billingConfig,
    fetchRateRules,
    fetchBillingConfig,
    fetchPenaltyRules,
    getRateRuleByEquipment,
    updateBillingConfig,
    togglePenaltyRule,
    loading,
    error
  } = useRateStore();

  const { equipments, fetchEquipments } = useEquipmentStore();

  const [activeTab, setActiveTab] = useState<'rates' | 'penalty' | 'config' | 'trial'>('rates');
  const [refreshing, setRefreshing] = useState(false);

  const [trialEquipmentId, setTrialEquipmentId] = useState<string>('');
  const [trialQuantity, setTrialQuantity] = useState<string>('1');
  const [trialStartTime, setTrialStartTime] = useState<string>(
    new Date(Date.now()).toISOString().slice(0, 16).replace('T', ' ')
  );
  const [trialEndTime, setTrialEndTime] = useState<string>(
    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
  );
  const [trialOverdue, setTrialOverdue] = useState<boolean>(false);
  const [trialOverdueHours, setTrialOverdueHours] = useState<string>('2');
  const [trialResult, setTrialResult] = useState<BillingDetail | null>(null);

  const tabs = [
    { key: 'rates', label: '时段费率' },
    { key: 'penalty', label: '罚金规则' },
    { key: 'config', label: '系统配置' },
    { key: 'trial', label: '计费试算' }
  ];

  const equipmentOptions = useMemo(() => equipments.map(eq => ({
    id: eq.id,
    label: eq.name
  })), [equipments]);

  const equipmentIndex = useMemo(() => {
    const idx = equipmentOptions.findIndex(eq => eq.id === trialEquipmentId);
    return idx >= 0 ? idx : 0;
  }, [equipmentOptions, trialEquipmentId]);

  useEffect(() => {
    if (equipments.length > 0 && !trialEquipmentId) {
      setTrialEquipmentId(equipments[0].id);
    }
  }, [equipments, trialEquipmentId]);

  const handleTrialEquipmentChange = (e) => {
    const idx = Number(e.detail.value);
    if (equipmentOptions[idx]) {
      setTrialEquipmentId(equipmentOptions[idx].id);
    }
  };

  const handleTrial = () => {
    if (!trialEquipmentId) {
      Taro.showToast({ title: '请选择设备', icon: 'none' });
      return;
    }
    const qty = Number(trialQuantity);
    if (!qty || qty <= 0) {
      Taro.showToast({ title: '请输入有效数量', icon: 'none' });
      return;
    }
    const start = new Date(trialStartTime.replace(' ', 'T'));
    const end = new Date(trialEndTime.replace(' ', 'T'));
    if (end <= start) {
      Taro.showToast({ title: '结束时间需晚于开始时间', icon: 'none' });
      return;
    }

    const rateRule = getRateRuleByEquipment(trialEquipmentId);
    if (!rateRule) {
      Taro.showToast({ title: '该设备未配置费率', icon: 'none' });
      return;
    }

    let actualEndTime = end;
    let scheduledEndTime = end;
    if (trialOverdue) {
      const overdueHours = Number(trialOverdueHours);
      if (overdueHours > 0) {
        actualEndTime = new Date(end.getTime() + overdueHours * 60 * 60 * 1000);
      }
    }

    const result = calculateBilling({
      startTime: start.toISOString(),
      endTime: actualEndTime.toISOString(),
      rateRule,
      penaltyRule: billingConfig.defaultPenaltyRule,
      quantity: qty,
      scheduledEndTime: scheduledEndTime.toISOString(),
      enableOverduePenalty: billingConfig.enableOverduePenalty,
      defaultGracePeriodHours: billingConfig.defaultGracePeriodHours
    });
    setTrialResult(result);
  };

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
    updateBillingConfig({ [key]: numValue });
  };

  const handleToggleConfig = (key: string) => {
    updateBillingConfig({ [key]: !billingConfig[key] });
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
              penaltyRules.map(penalty => {
                const unit = (penalty.penaltyUnit === 'hourly' || penalty.penaltyUnit === 'hour') ? '小时' : '天';
                const graceHours = penalty.gracePeriodHours ?? penalty.gracePeriod ?? 0;
                const isEnabled = penalty.enabled ?? penalty.isEnabled ?? false;
                return (
                  <View key={penalty.id} className={styles.penaltyCard}>
                    <View className={styles.penaltyInfo}>
                      <Text className={styles.penaltyName}>{penalty.name}</Text>
                      {penalty.description && (
                        <Text className={styles.penaltyDetail}>
                          {penalty.description}
                        </Text>
                      )}
                      <Text className={styles.penaltyDetail}>
                        罚金费率：{formatCurrency(penalty.penaltyRate)}/{unit}
                        {graceHours > 0 && `，宽限期${graceHours}小时`}
                      </Text>
                    </View>
                    <View
                      className={classnames(styles.switch, isEnabled && styles.active)}
                      onClick={() => handleTogglePenalty(penalty.id)}
                    />
                  </View>
                );
              })
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

        {activeTab === 'trial' && (
          <>
            <Text className={styles.sectionTitle}>
              计费试算
              <Text className={styles.sectionDesc}>模拟租赁场景，验证费率计算是否正确</Text>
            </Text>

            <View className={styles.configCard}>
              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>选择设备</Text>
                  <Text className={styles.configDesc}>选择要试算的设备类型</Text>
                </View>
                <Picker
                  mode="selector"
                  range={equipmentOptions.map(eq => eq.label)}
                  value={equipmentIndex}
                  onChange={handleTrialEquipmentChange}
                >
                  <View className={styles.pickerValue}>
                    {equipmentOptions[equipmentIndex]?.label || '请选择'}
                  </View>
                </Picker>
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>租赁数量</Text>
                  <Text className={styles.configDesc}>同时租赁的设备台数</Text>
                </View>
                <Input
                  className={styles.configInput}
                  type="number"
                  value={trialQuantity}
                  onInput={(e) => setTrialQuantity(e.detail.value)}
                />
                <Text className={styles.configValue}>台</Text>
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>开始时间</Text>
                  <Text className={styles.configDesc}>租赁起始时间</Text>
                </View>
                <Picker
                  mode="multiSelector"
                  range={[
                    Array.from({length: 30}, (_, i) => {
                      const d = new Date(Date.now() + i * 86400000);
                      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    }),
                    Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')),
                    ['00', '30']
                  ]}
                  onChange={(e) => {
                    const [dateIdx, hourIdx, minIdx] = e.detail.value;
                    const dateStr = Array.from({length: 30}, (_, i) => {
                      const d = new Date(Date.now() + i * 86400000);
                      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    })[dateIdx];
                    setTrialStartTime(`${dateStr} ${String(hourIdx).padStart(2,'0')}:${minIdx === 0 ? '00' : '30'}`);
                  }}
                >
                  <View className={styles.pickerValue}>
                    {trialStartTime}
                  </View>
                </Picker>
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>结束时间</Text>
                  <Text className={styles.configDesc}>预计归还时间</Text>
                </View>
                <Picker
                  mode="multiSelector"
                  range={[
                    Array.from({length: 30}, (_, i) => {
                      const d = new Date(Date.now() + i * 86400000);
                      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    }),
                    Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')),
                    ['00', '30']
                  ]}
                  onChange={(e) => {
                    const [dateIdx, hourIdx, minIdx] = e.detail.value;
                    const dateStr = Array.from({length: 30}, (_, i) => {
                      const d = new Date(Date.now() + i * 86400000);
                      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    })[dateIdx];
                    setTrialEndTime(`${dateStr} ${String(hourIdx).padStart(2,'0')}:${minIdx === 0 ? '00' : '30'}`);
                  }}
                >
                  <View className={styles.pickerValue}>
                    {trialEndTime}
                  </View>
                </Picker>
              </View>

              <View className={styles.configRow}>
                <View>
                  <Text className={styles.configLabel}>模拟超期</Text>
                  <Text className={styles.configDesc}>开启后可模拟超期场景</Text>
                </View>
                <View
                  className={classnames(styles.switch, trialOverdue && styles.active)}
                  onClick={() => setTrialOverdue(!trialOverdue)}
                />
              </View>

              {trialOverdue && (
                <View className={styles.configRow}>
                  <View>
                    <Text className={styles.configLabel}>超期时长</Text>
                    <Text className={styles.configDesc}>模拟超期多少小时</Text>
                  </View>
                  <Input
                    className={styles.configInput}
                    type="digit"
                    value={trialOverdueHours}
                    onInput={(e) => setTrialOverdueHours(e.detail.value)}
                  />
                  <Text className={styles.configValue}>小时</Text>
                </View>
              )}

              <Button className={styles.trialBtn} onClick={handleTrial}>
                开始试算
              </Button>
            </View>

            {trialResult && (
              <FeeDetail
                billingDetail={trialResult}
                title="试算结果"
                showPenalty={true}
              />
            )}

            {!trialResult && (
              <View className={styles.emptyState}>
                <Text>点击「开始试算」查看计费明细</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </PullDownRefresh>
  );
};

export default ConfigPage;
