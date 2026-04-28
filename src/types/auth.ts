export type Role = '运营' | '业务员' | 'FAE' | '产品部' | '供应链' | '管理员';

export interface User {
  id: string;
  ent_name: string;
  username: string;
  name: string;
  email?: string;
  role: string;
  roles?: string[];
  department_id: string;
  employeeNo: string;
  dataPermissions?: {
    customerVisibility: 'all' | 'department' | 'own' | 'custom';
    allowedCustomerIds?: string[];
  };
}

export interface Department {
  id: string;
  ent_name: string;
  name: string;
  manager_name: string;
  sub_departments?: Department[];
}
