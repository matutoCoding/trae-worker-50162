import type { Equipment, EquipmentBatch } from '@/types/equipment';
import { getBatchStatus } from '@/utils/date';

const now = new Date();
const addDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const generateBatches = (equipmentId: string, count: number): EquipmentBatch[] => {
  const batches: EquipmentBatch[] = [];
  for (let i = 0; i < count; i++) {
    const productionDate = addDays(-30 - i * 15);
    const expiryDays = [90, 180, 365, 60, 15, 5, -3][i % 7];
    const expiryDate = addDays(expiryDays);
    const qty = [20, 15, 25, 10, 8, 12, 6][i % 7];
    const status = getBatchStatus(expiryDate, 7);

    batches.push({
      id: `${equipmentId}-batch-${i}`,
      batchNo: `P${20250101 + i * 100}${100 + i}`,
      equipmentId,
      productionDate,
      expiryDate,
      quantity: qty,
      availableQuantity: Math.floor(qty * 0.7),
      status: status === 'expired' ? 'locked' : status,
      createdAt: productionDate,
      remark: i % 3 === 0 ? '校验合格' : undefined
    });
  }
  return batches;
};

const equipmentImages = [
  'https://picsum.photos/id/1/300/300',
  'https://picsum.photos/id/2/300/300',
  'https://picsum.photos/id/3/300/300',
  'https://picsum.photos/id/6/300/300',
  'https://picsum.photos/id/8/300/300',
  'https://picsum.photos/id/9/300/300',
  'https://picsum.photos/id/119/300/300',
  'https://picsum.photos/id/160/300/300',
  'https://picsum.photos/id/201/300/300'
];

export const mockEquipmentList: Equipment[] = [
  {
    id: 'EQ001',
    name: '博世电锤GBH2-26',
    category: '电动工具',
    spec: '800W 26mm',
    unit: '台',
    totalQuantity: 50,
    availableQuantity: 35,
    dailyRate: 50,
    hourlyRate: 10,
    imageUrl: equipmentImages[0],
    description: '博世专业级电锤，适用于混凝土钻孔、凿击作业',
    batches: generateBatches('EQ001', 3),
    createdAt: addDays(-180),
    updatedAt: addDays(-7)
  },
  {
    id: 'EQ002',
    name: '东成角磨机S1M-FF03',
    category: '电动工具',
    spec: '100mm 710W',
    unit: '台',
    totalQuantity: 40,
    availableQuantity: 28,
    dailyRate: 35,
    hourlyRate: 7,
    imageUrl: equipmentImages[1],
    description: '工业级角磨机，金属切割、打磨专用',
    batches: generateBatches('EQ002', 4),
    createdAt: addDays(-150),
    updatedAt: addDays(-5)
  },
  {
    id: 'EQ003',
    name: '莱卡激光测距仪D2',
    category: '测量仪器',
    spec: '100m 精度±1.5mm',
    unit: '台',
    totalQuantity: 30,
    availableQuantity: 22,
    dailyRate: 80,
    hourlyRate: 15,
    imageUrl: equipmentImages[2],
    description: '高精度激光测距仪，室内外通用',
    batches: generateBatches('EQ003', 2),
    createdAt: addDays(-120),
    updatedAt: addDays(-3)
  },
  {
    id: 'EQ004',
    name: '沪工手动葫芦HSZ',
    category: '起重设备',
    spec: '2T 3m',
    unit: '台',
    totalQuantity: 20,
    availableQuantity: 12,
    dailyRate: 60,
    hourlyRate: 12,
    imageUrl: equipmentImages[3],
    description: '手拉葫芦，适用于设备安装、重物起吊',
    batches: generateBatches('EQ004', 3),
    createdAt: addDays(-200),
    updatedAt: addDays(-10)
  },
  {
    id: 'EQ005',
    name: '瑞凌电焊机ZX7-315',
    category: '焊接设备',
    spec: '315A 工业级',
    unit: '台',
    totalQuantity: 25,
    availableQuantity: 18,
    dailyRate: 70,
    hourlyRate: 14,
    imageUrl: equipmentImages[4],
    description: '逆变直流电焊机，适合各类钢材焊接',
    batches: generateBatches('EQ005', 2),
    createdAt: addDays(-160),
    updatedAt: addDays(-8)
  },
  {
    id: 'EQ006',
    name: '高洁吸尘器GS-1020',
    category: '清洁设备',
    spec: '20L 1200W',
    unit: '台',
    totalQuantity: 35,
    availableQuantity: 30,
    dailyRate: 25,
    hourlyRate: 5,
    imageUrl: equipmentImages[5],
    description: '干湿两用吸尘器，装修清洁必备',
    batches: generateBatches('EQ006', 4),
    createdAt: addDays(-90),
    updatedAt: addDays(-2)
  },
  {
    id: 'EQ007',
    name: '斯蒂尔油锯MS251',
    category: '园林工具',
    spec: '18寸 45.6cc',
    unit: '台',
    totalQuantity: 15,
    availableQuantity: 8,
    dailyRate: 90,
    hourlyRate: 18,
    imageUrl: equipmentImages[6],
    description: '专业级油锯，伐木、修枝效率高',
    batches: generateBatches('EQ007', 3),
    createdAt: addDays(-140),
    updatedAt: addDays(-15)
  },
  {
    id: 'EQ008',
    name: '3M安全帽H-700',
    category: '安全防护',
    spec: 'ABS材质 防冲击',
    unit: '顶',
    totalQuantity: 100,
    availableQuantity: 75,
    dailyRate: 5,
    hourlyRate: 1,
    imageUrl: equipmentImages[7],
    description: '高品质安全帽，工地作业必备',
    batches: generateBatches('EQ008', 5),
    createdAt: addDays(-250),
    updatedAt: addDays(-1)
  },
  {
    id: 'EQ009',
    name: '世达套筒工具组套',
    category: '手动工具',
    spec: '128件套 1/4"+3/8"+1/2"',
    unit: '套',
    totalQuantity: 30,
    availableQuantity: 20,
    dailyRate: 40,
    hourlyRate: 8,
    imageUrl: equipmentImages[8],
    description: '专业汽修机修套筒工具组，铬钒钢材质',
    batches: generateBatches('EQ009', 2),
    createdAt: addDays(-110),
    updatedAt: addDays(-4)
  }
];

export const getEquipmentById = (id: string): Equipment | undefined => {
  return mockEquipmentList.find(eq => eq.id === id);
};

export const getEquipmentByCategory = (category: string): Equipment[] => {
  if (category === '全部') return mockEquipmentList;
  return mockEquipmentList.filter(eq => eq.category === category);
};

export const getNearExpiryEquipment = (): Equipment[] => {
  return mockEquipmentList.filter(eq =>
    eq.batches.some(b => b.status === 'near_expiry' || b.status === 'expired')
  );
};

export const getAvailableEquipment = (): Equipment[] => {
  return mockEquipmentList.filter(eq => eq.availableQuantity > 0);
};
