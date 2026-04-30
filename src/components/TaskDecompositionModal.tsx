import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, User, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import UserSelector from './UserSelector';

interface TaskDecompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentTask: any;
  onDecompose: (subTasks: any[]) => void;
}

export default function TaskDecompositionModal({ isOpen, onClose, parentTask, onDecompose }: TaskDecompositionModalProps) {
  const [subTasks, setSubTasks] = useState<any[]>([
    { id: Date.now().toString(), title: '', assignee: '', assigneeId: '', assigneeName: '', dueDate: parentTask?.dueDate || '', content: '' }
  ]);
  const [showUserSelection, setShowUserSelection] = useState<string | null>(null);

  if (!isOpen || !parentTask) return null;

  const addSubTask = () => {
    setSubTasks([...subTasks, { id: Date.now().toString(), title: '', assignee: '', assigneeId: '', assigneeName: '', dueDate: parentTask.dueDate || '', content: '' }]);
  };

  const removeSubTask = (id: string) => {
    if (subTasks.length > 1) {
      setSubTasks(subTasks.filter(t => t.id !== id));
    }
  };

  const updateSubTask = (id: string, field: string, value: string) => {
    setSubTasks(subTasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSubmit = () => {
    if (subTasks.some(t => !t.title || !t.assignee)) {
      toast.error('请填写所有子任务的标题和执行人');
      return;
    }
    onDecompose(subTasks);
    onClose();
  };

  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">任务分解</h3>
            <span className="text-sm text-gray-500">原任务: {parentTask.title}</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              您可以将当前任务分解为多个子任务，并指派给不同的执行人。分解后，原任务将作为父任务进行跟踪。
            </div>
          </div>

          <div className="space-y-4">
            {subTasks.map((task, index) => (
              <div key={task.id} className="p-4 border border-gray-200 rounded-xl space-y-4 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">子任务 {index + 1}</span>
                  <button 
                    onClick={() => removeSubTask(task.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">任务标题</label>
                    <input 
                      type="text"
                      value={task.title}
                      onChange={(e) => updateSubTask(task.id, 'title', e.target.value)}
                      placeholder="输入子任务标题"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">执行人</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        readOnly
                        value={task.assignee}
                        onClick={() => setShowUserSelection(task.id)}
                        placeholder="选择执行人"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">截止时间</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="date"
                        value={task.dueDate}
                        onChange={(e) => updateSubTask(task.id, 'dueDate', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">任务描述</label>
                    <textarea 
                      value={task.content}
                      onChange={(e) => updateSubTask(task.id, 'content', e.target.value)}
                      placeholder="输入子任务详细描述"
                      className="w-full h-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={addSubTask}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            添加子任务
          </button>
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
            确认分解
          </button>
        </div>
      </div>

      {showUserSelection && (
        <UserSelector
          onSelect={(user) => {
            updateSubTask(showUserSelection, 'assignee', user.name);
            updateSubTask(showUserSelection, 'assigneeId', user.id);
            updateSubTask(showUserSelection, 'assigneeName', user.name);
            setShowUserSelection(null);
          }}
          onClose={() => setShowUserSelection(null)}
        />
      )}
    </div>,
    document.body
  );
}
