import { Product, ProductCategory } from '../types';

export const mockProductCategories: ProductCategory[] = [
  {
    id: 'C1',
    name: '连接器',
    parentId: null,
    attributes: [
      { id: 'attr-1', name: '针数', type: 'number', required: true },
      { id: 'attr-2', name: '编码类型', type: 'select', options: ['A-Code', 'B-Code', 'D-Code', 'X-Code'], required: true },
      { id: 'attr-3', name: '外壳材质', type: 'select', options: ['金属', '塑料'], required: false }
    ],
    fab: {
      features: '高可靠性 M12/M8 工业连接器，支持多种编码（A/B/D/X），防护等级 IP67/IP68。',
      advantages: '采用优质铜合金镀金端子，插拔次数高达 500 次以上；全金属屏蔽外壳，抗电磁干扰能力强。',
      benefits: '确保工业自动化设备在恶劣环境下的稳定连接，减少因连接故障导致的停机时间，降低维护成本。'
    },
    children: [
      { id: 'C1-1', name: 'M系列连接器', parentId: 'C1' },
      { id: 'C1-2', name: 'USB系列连接器', parentId: 'C1' }
    ]
  },
  {
    id: 'C2',
    name: '线束',
    parentId: null,
    attributes: [
      { id: 'attr-4', name: '长度(m)', type: 'number', required: true },
      { id: 'attr-5', name: '线径(AWG)', type: 'number', required: true },
      { id: 'attr-6', name: '护套材质', type: 'select', options: ['PVC', 'PUR', 'LSZH'], required: true }
    ],
    children: [
      { id: 'C2-1', name: '工业线束', parentId: 'C2' },
      { id: 'C2-2', name: '医疗线束', parentId: 'C2' }
    ]
  }
];

export const mockProducts: Product[] = [
  {
    id: 'P1',
    materialNo: 'M12-4P-M-A',
    materialName: 'M12 4芯 公头 A-Code',
    specification: 'M12, 4芯, 公头, A-Code, 焊接式',
    categoryId: 'C1-1',
    basicUnit: 'PCS',
    creationOrg: '总公司',
    inventoryCategory: '成品',
    materialAttribute: '自制',
    allowNegativeInventory: false,
    enableBatchManagement: true,
    auxiliaryAttributeManagement: false,
    isPurchasable: false,
    isSalable: true,
    isStorable: true,
    isManufacturable: true,
    isOutsourceable: false,
    attributes: {
      'attr-1': 4,
      'attr-2': 'A-Code',
      'attr-3': '金属'
    }
  },
  {
    id: 'P2',
    materialNo: 'USB-C-M-3.1',
    materialName: 'USB-C 3.1 公头',
    specification: 'USB-C, 3.1, 公头, 沉板式',
    categoryId: 'C1-2',
    basicUnit: 'PCS',
    creationOrg: '总公司',
    inventoryCategory: '成品',
    materialAttribute: '采购',
    allowNegativeInventory: false,
    enableBatchManagement: false,
    auxiliaryAttributeManagement: false,
    isPurchasable: true,
    isSalable: true,
    isStorable: true,
    isManufacturable: false,
    isOutsourceable: false,
    attributes: {
      'attr-1': 24,
      'attr-2': 'X-Code',
      'attr-3': '塑料'
    }
  }
];
