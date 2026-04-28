import { GroupChat, WeChatUserMapping } from '../types';

export const mockWeChatUserMappings: WeChatUserMapping[] = [
  { wechatUserId: 'wxid_123', wechatNickname: '王总', mappedType: 'contact', mappedId: 'CON1', mappedName: '王总' },
  { wechatUserId: 'wxid_456', wechatNickname: '李工', mappedType: 'contact', mappedId: 'CON2', mappedName: '李工' },
  { wechatUserId: 'wxid_789', wechatNickname: '张三', mappedType: 'user', mappedId: 'U1', mappedName: '张三' },
  { wechatUserId: 'wxid_abc', wechatNickname: '陈工', mappedType: 'contact', mappedId: 'CON3', mappedName: '陈工' }
];

export const mockGroupChats: GroupChat[] = [
  {
    id: 'GC001',
    groupId: 'group_sixin_001',
    name: '四信通信-项目沟通群',
    customerId: 'CUS-20260317-001',
    members: [
      { wechatUserId: 'wxid_123', wechatNickname: '王总', mappedType: 'contact', mappedId: 'CON1', mappedName: '王总' },
      { wechatUserId: 'wxid_456', wechatNickname: '李工', mappedType: 'contact', mappedId: 'CON2', mappedName: '李工' },
      { wechatUserId: 'wxid_789', wechatNickname: '张三', mappedType: 'user', mappedId: 'U1', mappedName: '张三' }
    ],
    messages: [
      { id: 'M1', sender: '王总', content: '张总，二季度的交付计划确认了吗？', time: '2024-03-16 10:00' },
      { id: 'M2', sender: '张三', content: '王总，正在跟生产部确认，下午给您答复。', time: '2024-03-16 10:05' }
    ]
  },
  {
    id: 'GC002',
    groupId: 'group_dji_001',
    name: '大疆创新-项目沟通群',
    customerId: 'CUS-20260317-002',
    members: [
      { wechatUserId: 'wxid_abc', wechatNickname: '陈工', mappedType: 'contact', mappedId: 'CON3', mappedName: '陈工' },
      { wechatUserId: 'wxid_789', wechatNickname: '张三', mappedType: 'user', mappedId: 'U1', mappedName: '张三' }
    ],
    messages: [
      { id: 'M3', sender: '陈工', content: '张工，云台排线的样品测试反馈出来了，需要微调长度。', time: '2024-03-17 14:00' }
    ]
  }
];
