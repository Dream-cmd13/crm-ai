import { KnowledgeItem } from '../types';

export const mockKnowledgeItems: KnowledgeItem[] = [
  {
    id: 'K1',
    title: '防水线束设计规范',
    content: '详细说明了IP68等级防水线束的设计要点...',
    category: '工艺',
    tags: ['防水', '线束', '规范'],
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-01'
  },
  {
    id: 'K2',
    title: '海康威视项目复盘',
    content: '针对安防摄像头项目的成功经验总结...',
    category: '复盘',
    tags: ['海康威视', '安防', '复盘'],
    creatorId: 'U2',
    creatorNo: 'E002',
    creatorName: '李四',
    createDate: '2026-03-15'
  }
];
