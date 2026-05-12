import React from 'react';
import SystemWechatQuery from '../components/SystemWechatQuery';

export default function WechatSession() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">微信会话</h2>
      <SystemWechatQuery />
    </div>
  );
}
