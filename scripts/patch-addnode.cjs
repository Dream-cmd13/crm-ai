const fs = require('fs');
const path = 'src/components/architecture/AddNodeModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add import
code = code.replace(
  "import { getEnabledModels, loadLlmConfig } from '../../lib/llmConfig';",
  "import { getEnabledModels, loadLlmConfig } from '../../lib/llmConfig';\nimport { SandboxTestModal } from './SandboxTestModal';"
);

// 2. Add state variables inside AddNodeModal
code = code.replace(
  "const [personaFields, setPersonaFields] = useState<string[]>(['scale', 'mainProducts', 'painPoints', 'rdRequirements']);",
  `const [personaFields, setPersonaFields] = useState<string[]>(['scale', 'mainProducts', 'painPoints', 'rdRequirements']);
  
  const [useCustomerPersona, setUseCustomerPersona] = useState(false);
  const [useContactPersona, setUseContactPersona] = useState(false);
  const [useRecentCommunications, setUseRecentCommunications] = useState(false);
  const [useCurrentDocument, setUseCurrentDocument] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);`
);

// 3. Replace the 'isAiAssisted' block with the new UI
const oldBlockStart = '{isAiAssisted && (\n                <div className="space-y-4 p-4 border border-purple-100 bg-purple-50/30 rounded-xl">\n                  <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2">\n                    <Sparkles className="w-4 h-4" /> AI 辅助配置\n                  </h4>';
const oldBlockEndRegex = /<div className="text-\[11px\] text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">\s*说明：AI辅助节点已改为“直接选择模型”，无需填写 API 地址和 Key。\s*<\/div>\s*<\/div>\s*\)}/s;

const startIdx = code.indexOf(oldBlockStart);
if(startIdx !== -1) {
  const match = code.match(oldBlockEndRegex);
  if(match) {
    const endIdx = match.index + match[0].length;
    
    const newBlock = `{isAiAssisted && (
                <div className="space-y-4 p-4 border border-purple-100 bg-purple-50/30 rounded-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> AI 辅助配置 (自然语言)
                    </h4>
                    <button type="button" onClick={() => setIsSandboxOpen(true)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow">
                      带入真实客户测试
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">1. AI 需要达成什么目标？</label>
                    <textarea 
                      value={aiPromptTemplate} 
                      onChange={(e) => setAiPromptTemplate(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24" 
                      placeholder="直接写 Prompt，例如：分析客户意图，输出购买倾向..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">2. AI 需要参考什么资料？(AI 上下文数据源)</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={useCustomerPersona} onChange={e => setUseCustomerPersona(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                        客户画像
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={useContactPersona} onChange={e => setUseContactPersona(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                        联系人画像
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={useRecentCommunications} onChange={e => setUseRecentCommunications(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                        近期沟通记录 (限前5条)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={useCurrentDocument} onChange={e => setUseCurrentDocument(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                        当前单据信息
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">3. 模型选择</label>
                    <select
                      value={aiApiEndpoint || modelOptions[0].value}
                      onChange={(e) => setAiApiEndpoint(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {modelOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}`;
              
    code = code.substring(0, startIdx) + newBlock + code.substring(endIdx);
  }
}

// 4. Add SandboxTestModal to the end
code = code.replace(
  "    </div>\n  );\n};",
  `    </div>
      <SandboxTestModal
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        promptTemplate={aiPromptTemplate || autoPromptTemplate}
        selectedContexts={{
          customerPersona: useCustomerPersona,
          contactPersona: useContactPersona,
          recentCommunications: useRecentCommunications,
          currentDocument: useCurrentDocument
        }}
      />
    </div>
  );
};`
);

fs.writeFileSync(path, code);
console.log('Success');
