import React from 'react';
import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface WorkflowStep {
  id: string;
  name: string;
  status: 'completed' | 'current' | 'pending';
  assignee?: string;
  time?: string;
}

interface WorkflowProgressProps {
  steps: WorkflowStep[];
  className?: string;
}

export default function WorkflowProgress({ steps, className }: WorkflowProgressProps) {
  // Filter out steps that are pending if the user wants to hide them
  // But usually we show the current and previous steps.
  // The user said "没有到的任务节点不显示", so we only show completed and current.
  const visibleSteps = steps.filter(step => step.status !== 'pending' || steps.findIndex(s => s.id === step.id) === steps.findIndex(s => s.status === 'current'));

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          业务流程进度
        </h4>
      </div>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-100" />
        
        <div className="space-y-6">
          {visibleSteps.map((step, index) => (
            <div key={step.id} className="relative flex gap-4 items-start">
              <div className={cn(
                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                step.status === 'completed' ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-100" :
                step.status === 'current' ? "bg-white border-indigo-600 shadow-sm shadow-indigo-100" :
                "bg-white border-gray-200"
              )}>
                {step.status === 'completed' ? (
                  <Check className="w-4 h-4 text-white" />
                ) : step.status === 'current' ? (
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300" />
                )}
              </div>
              
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <h5 className={cn(
                    "text-sm font-bold",
                    step.status === 'completed' ? "text-gray-900" :
                    step.status === 'current' ? "text-indigo-600" :
                    "text-gray-400"
                  )}>
                    {step.name}
                  </h5>
                  {step.time && <span className="text-[10px] text-gray-400 font-mono">{step.time}</span>}
                </div>
                {step.assignee && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    处理人: <span className="font-medium text-gray-700">{step.assignee}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
