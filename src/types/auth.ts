export type Role = '运营' | '业务员' | 'FAE' | '产品部' | '供应链' | '管理员';

export interface User {
  id: string;
  auth_id?: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  english_name?: string;
  employeeNo?: string;
  role: string;
  roles?: string[];
  department_id: string;
  is_active?: boolean;
  legacy_wanlian_id?: number;
  pad_permissions?: string[];
  reviews?: Record<string, any>;
  system_role_ids?: string[];
  custom_permissions?: Record<string, any>;
  wechat_name?: string;
  wechat_id?: string;
  dataPermissions?: {
    customerVisibility: 'all' | 'department' | 'own' | 'custom';
    allowedCustomerIds?: string[];
  };
}

export interface Department {
  id: string;
  name: string;
  manager_name?: string;
  responsibilities?: string;
  roles?: string[];
  role_members?: Record<string, string[]>;
  attributes?: string;
  sub_departments?: Department[];
  parent_id?: string;
  type?: number;
  legacy_wanlian_id?: number;
  okrs?: Record<string, any>;
  reviews?: Record<string, any>;
}
