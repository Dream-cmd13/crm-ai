import React from 'react';
import UniversalSelector from './UniversalSelector';
import { Product } from '../types';

interface ProductSelectorProps {
  onSelect: (product: Product) => void;
  onClose?: () => void;
  inline?: boolean;
  selectedProductId?: string;
}

export default function ProductSelector({
  onSelect,
  onClose,
  inline,
  selectedProductId
}: ProductSelectorProps) {
  return (
    <UniversalSelector
      type="product"
      onSelect={onSelect}
      onClose={onClose}
      inline={inline}
      selectedId={selectedProductId}
    />
  );
}