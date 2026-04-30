import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mic, Image as ImageIcon, FileText, Loader2, Calendar, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AddSessionRecordModalProps {
  onClose: () => void;
  onSave: (data: { date: string; location: string; content: string; type: string }) => void;
  type: string;
}

export default function AddSessionRecordModal({ onClose, onSave, type }: AddSessionRecordModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState('');
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    // 模拟OCR/STT处理时间
    setTimeout(() => {
      let importedText = '';
      if (file.type.startsWith('image/')) {
        importedText = `[图片识别内容]\n${file.name} 中识别到：客户确认了首批订单数量，要求下周三前发货，并强调了包装的防水要求。`;
      } else if (file.type.startsWith('audio/')) {
        importedText = `[语音识别内容]\n${file.name} 中识别到：好的，价格方面我们可以接受，但是账期需要延长到60天。`;
      } else {
        importedText = `[文本导入内容]\n来自 ${file.name}：沟通纪要如下...`;
      }
      
      setContent(prev => prev + (prev ? '\n\n' : '') + importedText);
      setIsProcessing(false);
      toast.success('导入并识别成功');
    }, 1500);
  };

  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            新增{type === 'phone' ? '电话' : type === 'meeting' ? '会议' : '其他'}会话记录
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                会谈时间
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                会谈地点
              </label>
              <input
                type="text"
                placeholder="例如：客户公司会议室 / 线上会议"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">聊天记录/会谈纪要</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,audio/*,text/plain"
                  onChange={handleImport}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  图片/音频识别导入
                </button>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入沟通详情，或通过上方按钮导入识别..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[200px] resize-y"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSave({ date, location, content, type })}
            disabled={!content.trim() || isProcessing}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            保存记录
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
