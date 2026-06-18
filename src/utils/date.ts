import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import type { BatchStatus } from '@/types/equipment';

dayjs.extend(duration);

export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date, format: string = 'YYYY-MM-DD HH:mm'): string => {
  return dayjs(date).format(format);
};

export const formatTime = (date: string | Date, format: string = 'HH:mm'): string => {
  return dayjs(date).format(format);
};

export const getDaysDiff = (start: string | Date, end: string | Date): number => {
  return dayjs(end).diff(dayjs(start), 'day');
};

export const getHoursDiff = (start: string | Date, end: string | Date): number => {
  return dayjs(end).diff(dayjs(start), 'hour', true);
};

export const getMinutesDiff = (start: string | Date, end: string | Date): number => {
  return dayjs(end).diff(dayjs(start), 'minute', true);
};

export const getBatchStatus = (
  expiryDate: string | Date,
  nearExpiryDays: number = 7
): BatchStatus => {
  const now = dayjs();
  const expiry = dayjs(expiryDate);
  const daysToExpiry = expiry.diff(now, 'day');

  if (daysToExpiry < 0) {
    return 'expired';
  }
  if (daysToExpiry <= nearExpiryDays) {
    return 'near_expiry';
  }
  return 'normal';
};

export const isBatchAvailable = (status: BatchStatus): boolean => {
  return status === 'normal' || status === 'near_expiry';
};

export const isBatchExpired = (expiryDate: string | Date): boolean => {
  return dayjs().isAfter(dayjs(expiryDate), 'day');
};

export const isBatchNearExpiry = (
  expiryDate: string | Date,
  nearExpiryDays: number = 7
): boolean => {
  const daysToExpiry = getDaysDiff(new Date(), expiryDate);
  return daysToExpiry >= 0 && daysToExpiry <= nearExpiryDays;
};

export const getDurationText = (minutes: number): string => {
  const dur = dayjs.duration(minutes, 'minute');
  const hours = Math.floor(dur.asHours());
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}分钟`;
  }
  if (mins === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${mins}分钟`;
};

export const getDaysRemaining = (expiryDate: string | Date): number => {
  return Math.ceil(dayjs(expiryDate).diff(dayjs(), 'day', true));
};

export const generateOrderNo = (): string => {
  const now = dayjs();
  const timestamp = now.format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ZL${timestamp}${random}`;
};

export const generateBatchNo = (prefix: string = 'P'): string => {
  const now = dayjs();
  const timestamp = now.format('YYYYMMDD');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

export const roundDuration = (
  hours: number,
  roundingRule: 'up' | 'down' | 'none' = 'up'
): number => {
  switch (roundingRule) {
    case 'up':
      return Math.ceil(hours * 2) / 2;
    case 'down':
      return Math.floor(hours * 2) / 2;
    default:
      return Math.round(hours * 100) / 100;
  }
};

export const getNearExpiryEquipment = (equipments: any[]): any[] => {
  return equipments.filter(eq =>
    eq.batches.some((b: any) => b.status === 'near_expiry' || b.status === 'expired')
  );
};
