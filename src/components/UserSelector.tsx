import React from 'react';
import UniversalSelector from './UniversalSelector';
import { User } from '../types';

interface UserSelectorProps {
  onSelect?: (user: User) => void;
  onSelectMultiple?: (users: User[]) => void;
  onClose?: () => void;
  inline?: boolean;
  selectedUserId?: string;
  selectedUserIds?: string[];
  multiple?: boolean;
}

export default function UserSelector({
  onSelect,
  onSelectMultiple,
  onClose,
  inline,
  selectedUserId,
  selectedUserIds,
  multiple
}: UserSelectorProps) {
  return (
    <UniversalSelector
      type="user"
      multiple={multiple}
      onSelect={onSelect}
      onSelectMultiple={onSelectMultiple}
      onClose={onClose}
      inline={inline}
      selectedId={selectedUserId}
      selectedIds={selectedUserIds}
    />
  );
}