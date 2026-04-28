import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { X, User, MessageSquare, AlertCircle } from 'lucide-react';
import UserSelector from './UserSelector';

interface TaskTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  onTransfer: (taskId: string, targetUserId: string, targetUserName: string, reason: string) => void;
}

export default function TaskTransferModal({ isOpen, onClose, task, onTransfer }: TaskTransferModalProps) {
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [reason, setReason] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = () => {
    if (!targetUserId) {
      toast.error('请选择目标执行人');
      return;
    }
    onTransfer(task.id, targetUserId, targetUserName, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">任务转交</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              您可以将当前任务转交给其他同事处理。转交后，该任务将从您的待办列表中移除。
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">目标执行人</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  value={targetUserName}
                  readOnly
                  onClick={() => setShowUserSelector(true)}
                  placeholder="点击选择同事"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">转交原因 / 备注</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="输入转交原因或需要交接的事项..."
                  className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-32 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSubmit}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            确认转交
          </button>
        </div>
      </div>
      
      {showUserSelector && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <UserSelector 
            onSelect={(user) => {
              setTargetUserId(user.id);
              setTargetUserName(user.name);
              setShowUserSelector(false);
            }}
            onClose={() => setShowUserSelector(false)}
          />
        </div>
      )}
    </div>
  );
}
