import { Product, ProductCategory } from '../types';

export const initialProductCategories: ProductCategory[] = [
  {
    id: '01',
    name: '接插件',
    parentId: null,
    children: [
      {
        id: '0101',
        name: '工业连接器',
        parentId: '01',
        children: []
      },
      {
        id: '0102',
        name: '新能源连接器',
        parentId: '01',
        children: []
      }
    ]
  },
  {
    id: '02',
    name: '线束',
    parentId: null,
    children: [
      {
        id: '0201',
        name: '新能源线束',
        parentId: '02',
        children: []
      },
      {
        id: '0202',
        name: '智能家居线束',
        parentId: '02',
        children: []
      }
    ]
  },
  {
    id: '03',
    name: '继电器',
    parentId: null,
    children: []
  },
  {
    id: '04',
    name: '接触器',
    parentId: null,
    children: []
  }
];

export const initialProducts: Product[] = [
  {
    id: '1',
    materialNo: 'IO-001',
    materialName: '工业连接器A',
    specification: '8Pin IP67',
    categoryId: '0101',
    basicUnit: 'pcs',
    creationOrg: '研发部',
    inventoryCategory: '电子产品',
    materialAttribute: '标准件',
    allowNegativeInventory: false,
    enableBatchManagement: false,
    auxiliaryAttributeManagement: false,
    isPurchasable: true,
    isSalable: true,
    isStorable: true,
    isManufacturable: false,
    isOutsourceable: true,
    price: 68.00
  },
  {
    id: '2',
    materialNo: 'WH-101',
    materialName: '新能源线束B',
    specification: 'UL认证',
    categoryId: '0201',
    basicUnit: 'pcs',
    creationOrg: '生产部',
    inventoryCategory: '电子线材',
    materialAttribute: '定制件',
    allowNegativeInventory: false,
    enableBatchManagement: true,
    auxiliaryAttributeManagement: false,
    isPurchasable: true,
    isSalable: true,
    isStorable: true,
    isManufacturable: true,
    isOutsourceable: false,
    price: 96.00
  }
];
