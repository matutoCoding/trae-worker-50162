import dayjs from 'dayjs';
import type { TimeSlot, BillingDetail, TimeSegment, RateRule, PenaltyRule } from '@/types/rate';
import { getHoursDiff, getMinutesDiff, roundDuration } from './date';

interface CalculateBillingParams {
  startTime: string;
  endTime: string;
  rateRule: RateRule;
  penaltyRule?: PenaltyRule;
  quantity?: number;
  roundingRule?: 'up' | 'down' | 'none';
}

interface SplitTimeSegmentsParams {
  startTime: string;
  endTime: string;
  timeSlots: TimeSlot[];
  baseRate: number;
}

export const splitTimeSegments = ({
  startTime,
  endTime,
  timeSlots,
  baseRate
}: SplitTimeSegmentsParams): TimeSegment[] => {
  const segments: TimeSegment[] = [];
  const start = dayjs(startTime);
  const end = dayjs(endTime);

  if (end.isBefore(start)) {
    console.error('[Billing] 结束时间不能早于开始时间', { startTime, endTime });
    return [];
  }

  const sortedSlots = [...timeSlots].sort((a, b) => a.order - b.order);

  let currentTime = start.clone();

  while (currentTime.isBefore(end)) {
    const currentDate = currentTime.format('YYYY-MM-DD');
    const currentMinutes = currentTime.hour() * 60 + currentTime.minute();

    let matchingSlot: TimeSlot | null = null;
    for (const slot of sortedSlots) {
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const [endH, endM] = slot.endTime.split(':').map(Number);
      const slotStartMinutes = startH * 60 + startM;
      const slotEndMinutes = endH * 60 + endM;

      if (slotEndMinutes <= slotStartMinutes) {
        if (currentMinutes >= slotStartMinutes || currentMinutes < slotEndMinutes) {
          matchingSlot = slot;
          break;
        }
      } else {
        if (currentMinutes >= slotStartMinutes && currentMinutes < slotEndMinutes) {
          matchingSlot = slot;
          break;
        }
      }
    }

    const currentRate = matchingSlot ? matchingSlot.rate : baseRate;
    const slotName = matchingSlot ? matchingSlot.name : '标准时段';

    let segmentEnd: dayjs.Dayjs;
    if (matchingSlot) {
      const [endH, endM] = matchingSlot.endTime.split(':').map(Number);
      segmentEnd = dayjs(currentDate).hour(endH).minute(endM).second(0);

      if (endH * 60 + endM <= currentMinutes) {
        segmentEnd = segmentEnd.add(1, 'day');
      }
    } else {
      segmentEnd = currentTime.clone().endOf('day');
    }

    const actualSegmentEnd = segmentEnd.isAfter(end) ? end : segmentEnd;
    const duration = getMinutesDiff(currentTime.toISOString(), actualSegmentEnd.toISOString()) / 60;
    const amount = duration * currentRate;

    if (duration > 0) {
      segments.push({
        startTime: currentTime.format('YYYY-MM-DD HH:mm'),
        endTime: actualSegmentEnd.format('YYYY-MM-DD HH:mm'),
        duration: Math.round(duration * 100) / 100,
        rate: currentRate,
        slotName,
        amount: Math.round(amount * 100) / 100
      });
    }

    currentTime = actualSegmentEnd;
  }

  console.log('[Billing] 分段计费明细', { segments, startTime, endTime });
  return segments;
};

export const calculateBilling = ({
  startTime,
  endTime,
  rateRule,
  penaltyRule,
  quantity = 1,
  roundingRule = 'up'
}: CalculateBillingParams): BillingDetail => {
  const baseHourlyRate = rateRule.baseRate ?? rateRule.baseHourlyRate ?? 0;
  const segments = splitTimeSegments({
    startTime,
    endTime,
    timeSlots: rateRule.timeSlots,
    baseRate: baseHourlyRate
  });

  let baseAmount = segments.reduce((sum, seg) => sum + seg.amount, 0);
  let totalHours = segments.reduce((sum, seg) => sum + seg.duration, 0);
  totalHours = roundDuration(totalHours, roundingRule);
  baseAmount = Math.round(baseAmount * 100) / 100;

  let penaltyAmount = 0;
  let penaltyHours = 0;

  if (penaltyRule) {
    const isPenaltyEnabled = penaltyRule.enabled ?? penaltyRule.isEnabled ?? false;
    const gracePeriodMinutes = penaltyRule.gracePeriodHours ?? penaltyRule.gracePeriod ?? 0;
    
    if (isPenaltyEnabled) {
      const now = dayjs();
      const scheduledEnd = dayjs(endTime);
      const gracePeriodMs = gracePeriodMinutes * 60 * 1000;

      if (now.isAfter(scheduledEnd.add(gracePeriodMs, 'millisecond'))) {
        const overdueMinutes = getMinutesDiff(scheduledEnd.toISOString(), now.toISOString());
        const effectiveOverdueMinutes = Math.max(0, overdueMinutes - gracePeriodMinutes);

        if (effectiveOverdueMinutes > 0) {
          penaltyHours = roundDuration(effectiveOverdueMinutes / 60, roundingRule);
          const penaltyRate = baseHourlyRate * penaltyRule.penaltyRate;
          penaltyAmount = Math.round(penaltyHours * penaltyRate * 100) / 100;

          console.log('[Billing] 超期罚金计算', {
            overdueMinutes,
            gracePeriod: gracePeriodMinutes,
            effectiveOverdueMinutes,
            penaltyHours,
            penaltyRate,
            penaltyAmount
          });
        }
      }
    }
  }

  const totalAmount = Math.round((baseAmount + penaltyAmount) * quantity * 100) / 100;

  return {
    segments: segments.map(seg => ({
      ...seg,
      amount: Math.round(seg.amount * quantity * 100) / 100
    })),
    baseAmount: Math.round(baseAmount * quantity * 100) / 100,
    penaltyAmount,
    totalAmount,
    totalHours,
    penaltyHours
  };
};

export const calculateEstimatedAmount = (
  startTime: string,
  endTime: string,
  rateRule: RateRule,
  quantity: number = 1
): number => {
  const billing = calculateBilling({
    startTime,
    endTime,
    rateRule,
    quantity,
    roundingRule: 'up'
  });
  return billing.totalAmount;
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

export const getAvailableBatchesByFIFO = (
  batches: { id: string; expiryDate: string; availableQuantity: number; status: string }[],
  quantity: number
): { batchId: string; quantity: number }[] => {
  const availableBatches = batches
    .filter(b => b.status === 'normal' || b.status === 'near_expiry')
    .filter(b => b.availableQuantity > 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const result: { batchId: string; quantity: number }[] = [];
  let remaining = quantity;

  for (const batch of availableBatches) {
    if (remaining <= 0) break;

    const takeQty = Math.min(batch.availableQuantity, remaining);
    result.push({
      batchId: batch.id,
      quantity: takeQty
    });
    remaining -= takeQty;
  }

  if (remaining > 0) {
    console.warn('[Billing] 库存不足，无法满足需求', { requested: quantity, available: quantity - remaining });
  }

  console.log('[Billing] FIFO出库批次分配', { requested: quantity, allocation: result });
  return result;
};

export const validateTimeSlotOverlap = (timeSlots: Omit<TimeSlot, 'id'>[]): boolean => {
  const sorted = [...timeSlots].sort((a, b) => {
    const [aH, aM] = a.startTime.split(':').map(Number);
    const [bH, bM] = b.startTime.split(':').map(Number);
    return (aH * 60 + aM) - (bH * 60 + bM);
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const [currEndH, currEndM] = current.endTime.split(':').map(Number);
    const [nextStartH, nextStartM] = next.startTime.split(':').map(Number);

    const currEnd = currEndH * 60 + currEndM;
    const nextStart = nextStartH * 60 + nextStartM;

    if (currEnd > nextStart) {
      console.error('[Billing] 时段重叠', { current, next });
      return false;
    }
  }

  return true;
};
