import React from 'react';
import UniversalSelector from './UniversalSelector';
import { Customer } from '../types';

interface CustomerSelectorProps {
  onSelect: (customer: Customer) => void;
  onClose: () => void;
  customers?: Customer[];
}

export default function CustomerSelector({
  onSelect,
  onClose,
  customers
}: CustomerSelectorProps) {
  return (
    <UniversalSelector
      type="customer"
      onSelect={onSelect}
      onClose={onClose}
      // Note: the original 'customers' prop to override fetching is dropped to enforce reading real data as requested.
    />
  );
}