export interface CategoryAttribute {
  id: string;
  name: string;
  type: 'string' | 'number' | 'enum' | 'select' | 'boolean';
  options?: string[];
  required: boolean;
}

export interface Product {
  id: string;
  materialNo: string;
  materialName: string;
  specification: string;
  categoryId: string;
  seriesId?: string;
  basicUnit: string;
  creationOrg: string;
  inventoryCategory: string;
  materialAttribute: string;
  allowNegativeInventory: boolean;
  enableBatchManagement: boolean;
  auxiliaryAttributeManagement: boolean;
  isPurchasable: boolean;
  isSalable: boolean;
  isStorable: boolean;
  isManufacturable: boolean;
  isOutsourceable: boolean;
  attributes?: { [key: string]: string | number };
  imageUrl?: string;
  creatorName?: string;
  createDate?: string;
}

export interface ProductSeries {
  id: string;
  name: string;
  categoryId?: string;
  description?: string;
  fab?: {
    features: string;
    advantages: string;
    benefits: string;
  };
}

export interface ProductCategory {
  id: string;
  name: string;
  parentId: string | null;
  image?: string;
  children?: ProductCategory[];
  attributes?: CategoryAttribute[];
  fab?: {
    features: string;
    advantages: string;
    benefits: string;
  };
}
