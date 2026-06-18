import React, { useState } from 'react';
import { View, Text, ScrollView, Button, Input, TextArea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import { generateBatchNo } from '@/utils/date';
import type { EquipmentBatch } from '@/types/equipment';
import styles from './index.module.scss';

const CATEGORIES = [
  { key: '电动工具', icon: '🔧', label: '电动工具' },
  { key: '手动工具', icon: '🔨', label: '手动工具' },
  { key: '测量仪器', icon: '📏', label: '测量仪器' },
  { key: '清洁设备', icon: '🧹', label: '清洁设备' },
  { key: '升降设备', icon: '🪜', label: '升降设备' },
  { key: '动力设备', icon: '⚡', label: '动力设备' },
  { key: '园林工具', icon: '🌿', label: '园林工具' },
  { key: '焊接设备', icon: '🔥', label: '焊接设备' },
  { key: '其他', icon: '📦', label: '其他' },
];

const ICONS = ['🔧', '⚡', '🔨', '🧰', '📏', '🪜', '🔥', '💨', '🌿', '⚙️', '🧹', '💡', '🔩', '🪚', '🔌', '📦', '🎯', '🛠️'];

const AddEquipmentPage: React.FC = () => {
  const { addEquipment, loading } = useEquipmentStore();

  const [formData, setFormData] = useState({
    name: '',
    specification: '',
    description: '',
    category: '',
    hourlyRate: '',
    dailyRate: '',
    weeklyRate: '',
    monthlyRate: '',
    icon: '🔧',
  });

  const [batches, setBatches] = useState<Array<{
    batchNo: string;
    productionDate: string;
    expiryDate: string;
    quantity: string;
  }>>([
    {
      batchNo: generateBatchNo(),
      productionDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quantity: '1',
    }
  ]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBatchChange = (index: number, field: string, value: string) => {
    setBatches(prev => prev.map((batch, i) => 
      i === index ? { ...batch, [field]: value } : batch
    ));
  };

  const addBatch = () => {
    setBatches(prev => [
      ...prev,
      {
        batchNo: generateBatchNo(),
        productionDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantity: '1',
      }
    ]);
  };

  const removeBatch = (index: number) => {
    if (batches.length <= 1) {
      Taro.showToast({ title: '至少保留一个批次', icon: 'none' });
      return;
    }
    setBatches(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Taro.showToast({ title: '请输入设备名称', icon: 'none' });
      return;
    }
    if (!formData.specification.trim()) {
      Taro.showToast({ title: '请输入规格型号', icon: 'none' });
      return;
    }
    if (!formData.category) {
      Taro.showToast({ title: '请选择设备分类', icon: 'none' });
      return;
    }
    if (!formData.hourlyRate || Number(formData.hourlyRate) <= 0) {
      Taro.showToast({ title: '请输入有效小时费率', icon: 'none' });
      return;
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (!batch.productionDate || !batch.expiryDate) {
        Taro.showToast({ title: `批次${i + 1}请填写完整日期`, icon: 'none' });
        return;
      }
      if (!batch.quantity || Number(batch.quantity) <= 0) {
        Taro.showToast({ title: `批次${i + 1}请填写有效数量`, icon: 'none' });
        return;
      }
    }

    const equipmentData = {
      name: formData.name.trim(),
      specification: formData.specification.trim(),
      description: formData.description.trim(),
      category: formData.category,
      hourlyRate: Number(formData.hourlyRate),
      dailyRate: Number(formData.dailyRate) || 0,
      weeklyRate: Number(formData.weeklyRate) || 0,
      monthlyRate: Number(formData.monthlyRate) || 0,
      icon: formData.icon,
      batches: batches.map(batch => ({
        batchNo: batch.batchNo,
        productionDate: batch.productionDate,
        expiryDate: batch.expiryDate,
        quantity: Number(batch.quantity),
      })) as Omit<EquipmentBatch, 'id' | 'equipmentId' | 'availableQuantity' | 'status'>[]
    };

    const success = await addEquipment(equipmentData);
    if (success) {
      Taro.showToast({ title: '设备添加成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1000);
    } else {
      Taro.showToast({ title: '添加失败，请重试', icon: 'none' });
    }
  };

  return (
    <ScrollView scrollY className={styles.pageContainer}>
      <View className={styles.formCard}>
        <Text className={styles.formTitle}>基本信息</Text>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>
            <Text className={styles.formRequired}>*</Text>设备名称
          </Text>
          <Input
            className={styles.formInput}
            placeholder="请输入设备名称"
            value={formData.name}
            onInput={(e) => handleInputChange('name', e.detail.value)}
          />
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>
            <Text className={styles.formRequired}>*</Text>规格型号
          </Text>
          <Input
            className={styles.formInput}
            placeholder="如：博世GBH2-26"
            value={formData.specification}
            onInput={(e) => handleInputChange('specification', e.detail.value)}
          />
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>设备描述</Text>
          <TextArea
            className={styles.formTextarea}
            placeholder="选填，设备特性、使用说明等"
            value={formData.description}
            onInput={(e) => handleInputChange('description', e.detail.value)}
          />
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>
            <Text className={styles.formRequired}>*</Text>设备分类
          </Text>
          <View className={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <View
                key={cat.key}
                className={classnames(styles.categoryItem, formData.category === cat.key && styles.selected)}
                onClick={() => handleInputChange('category', cat.key)}
              >
                <View className={styles.categoryIcon}>{cat.icon}</View>
                <Text>{cat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>设备图标</Text>
          <View className={styles.iconGrid}>
            {ICONS.map(icon => (
              <View
                key={icon}
                className={classnames(styles.iconItem, formData.icon === icon && styles.selected)}
                onClick={() => handleInputChange('icon', icon)}
              >
                {icon}
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formTitle}>计费标准</Text>

        <View className={styles.formRow}>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.formRequired}>*</Text>小时费率（元）
            </Text>
            <Input
              className={styles.formInput}
              type="digit"
              placeholder="0.00"
              value={formData.hourlyRate}
              onInput={(e) => handleInputChange('hourlyRate', e.detail.value)}
            />
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>日费率（元）</Text>
            <Input
              className={styles.formInput}
              type="digit"
              placeholder="0.00"
              value={formData.dailyRate}
              onInput={(e) => handleInputChange('dailyRate', e.detail.value)}
            />
          </View>
        </View>

        <View className={styles.formRow}>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>周费率（元）</Text>
            <Input
              className={styles.formInput}
              type="digit"
              placeholder="0.00"
              value={formData.weeklyRate}
              onInput={(e) => handleInputChange('weeklyRate', e.detail.value)}
            />
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>月费率（元）</Text>
            <Input
              className={styles.formInput}
              type="digit"
              placeholder="0.00"
              value={formData.monthlyRate}
              onInput={(e) => handleInputChange('monthlyRate', e.detail.value)}
            />
          </View>
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formTitle}>批次信息</Text>

        {batches.map((batch, index) => (
          <View key={index} className={styles.batchItem}>
            <View className={styles.batchHeader}>
              <Text className={styles.batchNo}>批次 {index + 1}：{batch.batchNo}</Text>
              <Button className={styles.removeBtn} onClick={() => removeBatch(index)}>
                删除
              </Button>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>
                  <Text className={styles.formRequired}>*</Text>生产日期
                </Text>
                <Input
                  className={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={batch.productionDate}
                  onInput={(e) => handleBatchChange(index, 'productionDate', e.detail.value)}
                />
              </View>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>
                  <Text className={styles.formRequired}>*</Text>有效期至
                </Text>
                <Input
                  className={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={batch.expiryDate}
                  onInput={(e) => handleBatchChange(index, 'expiryDate', e.detail.value)}
                />
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>
                <Text className={styles.formRequired}>*</Text>入库数量
              </Text>
              <Input
                className={styles.formInput}
                type="number"
                placeholder="请输入数量"
                value={batch.quantity}
                onInput={(e) => handleBatchChange(index, 'quantity', e.detail.value)}
              />
            </View>
          </View>
        ))}

        <Button className={styles.addBatchBtn} onClick={addBatch}>
          + 新增批次
        </Button>
      </View>

      <View className={styles.actionBtns}>
        <Button className={styles.cancelBtn} onClick={() => Taro.navigateBack()}>
          取消
        </Button>
        <Button className={styles.submitBtn} onClick={handleSubmit} loading={loading}>
          提交
        </Button>
      </View>
    </ScrollView>
  );
};

export default AddEquipmentPage;
