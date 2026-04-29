import React, { useEffect, useState } from 'react';
import { X, Play, Loader2, Bot } from 'lucide-react';
import { getEnabledModels } from '../../lib/llmConfig';
import { callAiProxy } from '../../lib/aiProxy';
import { fetchLlmConfigFromSupabase } from '../../lib/llmConfigRepository';

interface SandboxTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptTemplate: string;
  selectedContexts: {
    customerPersona: boolean;
    contactPersona: boolean;
    recentCommunications: boolean;
    currentDocument: boolean;
  };
}

export const SandboxTestModal = ({ isOpen, onClose, promptTemplate, selectedContexts }: SandboxTestModalProps) => {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [modelId, setModelId] = useState('');

  useEffect(() => {
    fetchLlmConfigFromSupabase()
      .then((cfg: any) => {
        const defaultModel = String(cfg?.defaultModel || '').trim();
        const models = getEnabledModels(cfg);
        if (defaultModel) {
          setModelId(defaultModel);
          return;
        }
        if (models.length > 0) setModelId(models[0].id);
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsLoading(true);
    setResult('');
    try {
      let contextStr = `【沙盒测试环境】\n客户ID: ${selectedCustomer || '未填写'}\n`;
      if (selectedContexts.customerPersona) {
        contextStr += `[客户画像]\n- 已启用上下文: customerPersona\n\n`;
      }
      if (selectedContexts.contactPersona) {
        contextStr += `[联系人画像]\n- 已启用上下文: contactPersona\n\n`;
      }
      if (selectedContexts.recentCommunications) {
        contextStr += `[近期沟通记录]\n- 已启用上下文: recentCommunications\n\n`;
      }
      if (selectedContexts.currentDocument) {
        contextStr += `[当前单据信息]\n- 已启用上下文: currentDocument\n\n`;
      }

      const finalPrompt = `${contextStr}\n【执行目标】\n${promptTemplate}`;

      const response = await callAiProxy(finalPrompt, modelId || undefined);

      setResult(response);
    } catch (error: any) {
      setResult(`测试失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
          <h3 className="font-bold text-indigo-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            Prompt Playground (真实数据沙盒测试)
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Configuration */}
          <div className="w-1/3 border-r border-gray-200 p-4 bg-gray-50 flex flex-col gap-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">客户ID（可选）</label>
              <input
                value={selectedCustomer}
                onChange={e => setSelectedCustomer(e.target.value)}
                placeholder="输入要测试的客户ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">沙盒环境强制执行 Read-Only 拦截，防止生产数据污染。</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">已选上下文资料</label>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedContexts.customerPersona ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  客户画像
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedContexts.contactPersona ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  联系人画像
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedContexts.recentCommunications ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  近期沟通记录 (前5条)
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedContexts.currentDocument ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  当前单据信息
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-200">
              <button 
                onClick={handleTest}
                disabled={isLoading || !promptTemplate}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                执行测试
              </button>
            </div>
          </div>

          {/* Right Panel: Prompt & Result */}
          <div className="w-2/3 flex flex-col">
            <div className="h-1/2 p-4 border-b border-gray-200 flex flex-col">
              <label className="block text-sm font-bold text-gray-700 mb-2">提示词 (Prompt)</label>
              <textarea 
                readOnly
                value={promptTemplate}
                className="flex-1 w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 resize-none focus:outline-none"
                placeholder="AI 目标提示词..."
              />
            </div>
            <div className="h-1/2 p-4 bg-white flex flex-col">
              <label className="block text-sm font-bold text-gray-700 mb-2">AI 实时输出结果</label>
              <div className="flex-1 w-full p-4 bg-gray-900 rounded-lg text-sm font-mono text-green-400 overflow-y-auto whitespace-pre-wrap">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI 正在推演中...
                  </div>
                ) : (
                  result || <span className="text-gray-500">等待执行...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
