export interface WeChatUserMapping {
  wechatUserId: string;
  wechatNickname: string;
  wechatAvatar?: string;
  mappedType: 'contact' | 'user' | 'unmapped';
  mappedId?: string; // Contact ID or User ID
  mappedName?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  time: string;
}

export interface GroupChat {
  id: string;
  groupId: string;
  name: string;
  customerId: string;
  projectId?: string;
  inquiryId?: string;
  leadId?: string;
  opportunityId?: string;
  managerContactId?: string;
  managerEmployeeId?: string;
  members: WeChatUserMapping[];
  messages: ChatMessage[];
  lastSync?: string;
  lastMessage?: string;
  lastTime?: string;
  type?: 'wechat' | '1688' | 'dingtalk' | string;
}
