import React, { useState } from 'react';
import { X, Loader2, Sparkles, Calendar, MapPin, FileText, Mic, Upload, CheckCircle2 } from 'lucide-react';
import { Contact, Customer } from '../types';
import { callAiProxy } from '../lib/aiProxy';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  customer: Customer;
  onSave?: (visitData: any) => void;
}

export default function VisitModal({ isOpen, onClose, contact, customer, onSave }: VisitModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitLocation, setVisitLocation] = useState('');
  const [visitObjective, setVisitObjective] = useState('');
  const [visitSummary, setVisitSummary] = useState('');
  const [todoTasks, setTodoTasks] = useState('');
  const [nextPlan, setNextPlan] = useState('');
  const [audioProcessed, setAudioProcessed] = useState(false);

  if (!isOpen) return null;

  const handleGenerateSuggestion = async () => {
    setIsGenerating(true);
    try {
      const prompt = `
        You are an expert B2B sales advisor. Generate a visit suggestion for the following customer contact.
        Customer: ${customer.name} (Industry: ${customer.industry})
        Contact: ${contact.name} (${contact.position})
        Contact Persona: Age ${contact.age || 'Unknown'}, Personality: ${contact.personality || 'Unknown'}, Decision Power: ${contact.decisionPower || 'Unknown'}.

        Provide a concise, actionable visit plan including:
        1. Recommended topics of conversation.
        2. Products to highlight.
        3. Communication style to adopt based on their personality.
      `;
      const text = await callAiProxy(prompt);
      if (text) setSuggestion(text);
    } catch (error) {
      console.error("Failed to generate suggestion:", error);
      setSuggestion("生成建议失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProcessAudio = async () => {
    setIsProcessingAudio(true);
    try {
      const transcript = String(visitObjective || '').trim();
      if (!transcript) {
        setVisitSummary('请先输入拜访录音转写内容，再执行AI整理。');
        setAudioProcessed(false);
        return;
      }
      const prompt = `
        You are an AI sales assistant. I am providing a transcript of a sales visit with ${contact.name} from ${customer.name}.

        Transcript:
        "${transcript}"

        Based on this transcript, extract and generate the following in JSON format:
        {
          "summary": "A concise summary of the visit (what was discussed).",
          "todoTasks": "A bulleted list of immediate tasks the sales rep needs to do.",
          "nextPlan": "The next follow-up plan or action item with the customer."
        }
      `;
      const text = await callAiProxy(prompt);
      if (text) {
        const result = JSON.parse(text);
        setVisitSummary(result.summary);
        setTodoTasks(result.todoTasks);
        setNextPlan(result.nextPlan);
        setAudioProcessed(true);
      }
    } catch (error) {
      console.error("Failed to process audio:", error);
      setVisitSummary("处理录音失败，请手动输入。");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">发起拜访 - {contact.name} ({customer.name})</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Audio Processing Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-indigo-600" />
                  AI 录音总结与任务提取
                </h4>
                <p className="text-xs text-indigo-600/70 mt-1">上传拜访录音，自动生成拜访记录、代办任务和下阶段计划</p>
              </div>
              <button 
                onClick={handleProcessAudio}
                disabled={isProcessingAudio || audioProcessed}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {isProcessingAudio ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 处理中...</>
                ) : audioProcessed ? (
                  <><CheckCircle2 className="w-4 h-4" /> 已完成</>
                ) : (
                  <><Upload className="w-4 h-4" /> 执行AI整理</>
                )}
              </button>
            </div>

            {audioProcessed && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                  <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><FileText className="w-3 h-3 text-indigo-500"/> 拜访总结</h5>
                  <p className="text-xs text-gray-600 leading-relaxed">{visitSummary}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                  <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500"/> 代办任务</h5>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{todoTasks}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                  <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Calendar className="w-3 h-3 text-amber-500"/> 下阶段计划</h5>
                  <p className="text-xs text-gray-600 leading-relaxed">{nextPlan}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">拜访时间</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="datetime-local" 
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">拜访地点</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={visitLocation}
                  onChange={(e) => setVisitLocation(e.target.value)}
                  placeholder="输入拜访地点"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">拜访目的 / 记录</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea 
                  value={audioProcessed ? visitSummary : visitObjective}
                  onChange={(e) => audioProcessed ? setVisitSummary(e.target.value) : setVisitObjective(e.target.value)}
                  placeholder="输入拜访目的或记录..."
                  rows={3}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>
          </div>

          <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                AI 拜访建议
              </h4>
              <button 
                onClick={handleGenerateSuggestion}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-200 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {suggestion ? '重新生成' : '生成建议'}
              </button>
            </div>
            
            {suggestion ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-white p-4 rounded-lg border border-indigo-100">
                {suggestion}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                点击上方按钮，AI 将基于客户画像、近期沟通记录和新品信息为您生成专属拜访建议。
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
            取消
          </button>
          <button 
            onClick={() => {
              if (onSave) {
                onSave({
                  visitDate,
                  visitLocation,
                  visitSummary: audioProcessed ? visitSummary : visitObjective,
                  todoTasks,
                  nextPlan
                });
              }
              onClose();
            }} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            确认发起
          </button>
        </div>
      </div>
    </div>
  );
}
