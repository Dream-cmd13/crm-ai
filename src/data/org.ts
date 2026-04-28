import { Department, User } from '../types';

export const mockDepartments: Department[] = [
  {
    id: 'D1',
    ent_name: '总公司',
    name: '销售部',
    manager_name: '张总',
    sub_departments: [
      { id: 'D1-1', ent_name: '总公司', name: '销售一组', manager_name: '张三' },
      { id: 'D1-2', ent_name: '总公司', name: '销售二组', manager_name: '李四' }
    ]
  },
  {
    id: 'D2',
    ent_name: '总公司',
    name: '技术部',
    manager_name: '王总',
    sub_departments: [
      { id: 'D2-1', ent_name: '总公司', name: '研发组', manager_name: '赵六' },
      { id: 'D2-2', ent_name: '总公司', name: 'FAE组', manager_name: '钱七' }
    ]
  }
];

export const mockUsers: User[] = [
  { id: 'EMP002', ent_name: '总公司', username: 'zhangsan', name: '张三', role: '业务员', department_id: 'D1-1', employeeNo: 'E002' },
  { id: 'EMP003', ent_name: '总公司', username: 'lisi', name: '李四', role: '业务员', department_id: 'D1-2', employeeNo: 'E003' },
  { id: 'EMP004', ent_name: '总公司', username: 'wangwu', name: '王五', role: 'FAE', department_id: 'D2-2', employeeNo: 'E004' },
  { id: 'EMP005', ent_name: '总公司', username: 'zhaoliu', name: '赵六', role: '研发', department_id: 'D2-1', employeeNo: 'E005' },
  { id: 'EMP001', ent_name: '总公司', username: 'admin', name: '系统管理员', role: '管理员', department_id: 'D1', employeeNo: 'E001' }
];
