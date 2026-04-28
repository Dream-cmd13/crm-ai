import React from 'react';
import { Code } from 'lucide-react';

interface EmptyFlowsProps {
  onAdd: () => void;
}

export const EmptyFlows = ({ onAdd }: EmptyFlowsProps) => (
  <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
    <Code className="w-8 h-8 mx-auto text-gray-300 mb-2" />
    <p>暂无流程定义</p>
    <button onClick={onAdd} className="mt-2 text-indigo-600 font-medium text-sm hover:underline">点击添加第一个流程</button>
  </div>
);
