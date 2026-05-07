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
  categoryName?: string;
  seriesId?: string;
  basicUnit: string;
  price?: number;
  minPrice?: number;
  status?: number;
  brandId?: string;
  brandName?: string;
  minPackQty?: number;
  minOrderQty?: number;
  outsourceSupplierDrawing?: string;
  drawing3d?: string;
  supplier?: string;
  supplierNo?: string;
  supplierMaterialNo?: string;
  supplierMaterialName?: string;
  productLineLevel1Id?: string;
  productLineLevel2Id?: string;
  productBelonging?: number;
  groupId?: string;
  groupName?: string;
  outsourceCustomerDrawing?: string;
  customerOriginalDrawing?: string;
  changeDrawingDetail?: string;
  specificationDoc?: string;
  inspectionStandard?: string;
  spuId?: string;
  spuName?: string;
  platformMaterialNo?: string;
  materialLeadTime?: number;
  packagingMethod?: string;
  packagingSpec?: string;
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
  seriesNo?: string;
  name: string;
  categoryId?: string;
  description?: string;
  fab?: {
    features: string;
    advantages: string;
    benefits: string;
  };
}

export interface ProductSpu {
  id: string;
  name: string;
  brandId?: string;
  categoryId?: string;
  categoryName?: string;
  createDate?: string;
}

export interface ProductSpuOption {
  id: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
  status: number;
  createDate?: string;
}

export interface Group {
  id: string;
  name: string;
  manager?: string;
  createDate?: string;
}

export interface ProductLine {
  id: string;
  parentId: string | null;
  name: string;
  manager?: string;
  createDate?: string;
  children?: ProductLine[];
}

export interface ProductCategory {
  id: string;
  name: string;
  parentId: string | null;
  image?: string;
  status?: number;
  createDate?: string;
  children?: ProductCategory[];
  attributes?: CategoryAttribute[];
  fab?: {
    features: string;
    advantages: string;
    benefits: string;
  };
}
