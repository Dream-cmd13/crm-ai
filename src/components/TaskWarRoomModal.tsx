import React, { useState } from 'react';
import { X, CheckCircle2, Bot, Send, Loader2, User } from 'lucide-react';
import { callAiProxy } from '../lib/aiProxy';
import { TodoTask } from '../types/task';

interface TaskWarRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TodoTask;
  onUpdate?: (updatedTask: TodoTask) => void;
}

export default function TaskWarRoomModal({ isOpen, onClose, task, onUpdate }: TaskWarRoomModalProps) {
  const [feedback, setFeedback] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(task.aiSuggestions || []);
  const [isInferring, setIsInferring] = useState(false);
  const [objectives, setObjectives] = useState<any[]>(task.objectives || [
    { id: '1', title: '确认客户真实预算', completed: false, feedback: '' },
    { id: '2', title: '发送最新产品画册', completed: false, feedback: '' }
  ]);

  if (!isOpen || !task) return null;

  const handleToggleObjective = (id: string) => {
    setObjectives(objs => objs.map(o => o.id === id ? { ...o, completed: !o.completed } : o));
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return;
    
    // Optimistic UI update
    const newFeedback = feedback;
    setFeedback('');
    
    // Append to task history or first objective for demo
    const updatedObjs = [...objectives];
    updatedObjs[0].feedback = newFeedback;
    setObjectives(updatedObjs);

    setIsInferring(true);
    try {
      const prompt = `客户反馈: "${newFeedback}"。请提供应对策略，使用价值销售法切入，限3条简短建议。`;
      const response = await callAiProxy(prompt);
      
      const newSuggestions = response.split('\n').filter(s => s.trim().length > 0);
      setAiSuggestions(newSuggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsInferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden">
        
        {/* Left: Human Zone */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 bg-gray-50">
          <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Human Zone (作战室)
              </h2>
              <p className="text-xs text-gray-500 mt-1">{task.title}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full md:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-700">多目标 CheckList</h3>
            {objectives.map(obj => (
              <div key={obj.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <button onClick={() => handleToggleObjective(obj.id)} className="mt-0.5">
                    <CheckCircle2 className={`w-5 h-5 ${obj.completed ? 'text-green-500' : 'text-gray-300'}`} />
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${obj.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {obj.title}
                    </p>
                    {obj.feedback && (
                      <div className="mt-2 text-xs text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                        最新反馈: {obj.feedback}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <label className="block text-xs font-bold text-gray-700 mb-2">录入最新进展与客户反馈</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="例如: 客户嫌贵，说竞品只要一半价格..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                onKeyDown={e => e.key === 'Enter' && handleFeedbackSubmit()}
              />
              <button 
                onClick={handleFeedbackSubmit}
                disabled={isInferring || !feedback.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
              >
                {isInferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Copilot */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
            <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              AI Copilot (实时策略)
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-purple-100 rounded-full hidden md:block">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isInferring ? (
              <div className="flex flex-col items-center justify-center h-full text-purple-600 space-y-4 opacity-70">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm font-medium">正在结合客户画像与最新反馈，推演应对策略...</p>
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-3 max-h-[100%] overflow-y-auto pr-1">
                {aiSuggestions.map((sug, idx) => (
                  <div key={idx} className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-900 flex items-start gap-3 overflow-hidden">
                    <span className="font-bold text-purple-400 mt-0.5">{idx + 1}.</span>
                    <p className="whitespace-pre-wrap break-words">{sug.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                <Bot className="w-12 h-12 opacity-20" />
                <p className="text-sm">等待录入反馈以生成策略...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
