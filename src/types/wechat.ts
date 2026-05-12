export interface WeChatUserMapping {
  wechatUserId: string;
  wechatNickname: string;
  wechatAvatar?: string;
  mappedType: 'contact' | 'user' | 'unmapped';
  mappedId?: string; // Contact ID or User ID
  mappedName?: string;
}

export interface WechatBinding {
  id: number;
  wechatId: string;
  wechatName?: string;
  bindType: 'employee' | 'customer_contact';
  bindId: string;
  bindName?: string;       // JOIN getUserName / getContactName
  matchSource: string;
  isVerified: boolean;
  createdAt: string;
}

export interface ConversationMember {
  id: number;
  conversationId: number;
  wechatId: string;
  displayName?: string;
  memberType: 'customer_contact' | 'employee' | 'external_unknown';
  contactId?: string;
  employeeId?: string;
  isInternal: boolean;
  // 来自 JOIN 的绑定信息
  binding?: WechatBinding;
}

export interface UnresolvedNickname {
  id: number;
  nickname: string;
  candidateWxids: CandidateWxid[];
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: string;
}

export interface CandidateWxid {
  wxid: string;
  nickname: string;
  source: string;
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
