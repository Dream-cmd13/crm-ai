import React, { useState, useEffect } from 'react';
import { initialObjects, initialSystemFunctions } from '../data/ontologyData';
import { WorkflowFlow } from '../types/ontology';
import { Play, X } from 'lucide-react';

interface ReservedButtonsProps {
  moduleCode: string;
  contextData?: any;
}

export default function ReservedButtons({ moduleCode, contextData }: ReservedButtonsProps) {
  const [flows, setFlows] = useState<WorkflowFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<WorkflowFlow | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // In a real app, this would fetch from an API or global state
    const sysFunc = initialSystemFunctions.find(sf => sf.code === moduleCode);
    if (sysFunc && sysFunc.associatedOntologyId) {
      const obj = initialObjects.find(o => o.id === sysFunc.associatedOntologyId);
      if (obj && obj.flows) {
        // Find manual flows that are linked to this system function
        const manualFlows = obj.flows.filter(f => 
          sysFunc.customFlows.includes(f.id)
        );
        setFlows(manualFlows);
      }
    }
  }, [moduleCode]);

  const handleOpenModal = (flow: WorkflowFlow) => {
    setSelectedFlow(flow);
    setInputValues({});
    setResult(null);
  };

  const handleExecute = async () => {
    if (!selectedFlow) return;
    
    setIsExecuting(true);
    setResult(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log(`Executing ${selectedFlow.name}`, {
        context: contextData,
        inputs: inputValues
      });
      
      setResult({ success: true, message: '执行成功', data: { ...inputValues } });
    } catch (error) {
      setResult({ success: false, message: '执行失败' });
    } finally {
      setIsExecuting(false);
    }
  };

  if (flows.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        {flows.map(flow => (
          <button
            key={flow.id}
            onClick={() => handleOpenModal(flow)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
            title={flow.description}
          >
            <Play className="w-3.5 h-3.5" />
            {flow.name}
          </button>
        ))}
      </div>

      {selectedFlow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">{selectedFlow.name}</h3>
              <button 
                onClick={() => setSelectedFlow(null)} 
                className="text-gray-400 hover:text-gray-600"
                disabled={isExecuting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">{selectedFlow.description}</p>
              
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-500 italic">
                此流程无需额外参数
              </div>

              {result && (
                <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {result.message}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedFlow(null)} 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isExecuting}
              >
                取消
              </button>
              <button 
                onClick={handleExecute} 
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    执行中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    执行
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
