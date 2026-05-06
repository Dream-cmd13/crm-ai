import { toast } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Search, Filter, BookOpen, ChevronRight, Tag, ExternalLink, Plus, Edit2, Trash2, X, Image as ImageIcon, Paperclip, Sparkles, Loader2, Package, Building2, Briefcase, Layers } from 'lucide-react';
import { CustomerCase, Customer, Project, Product } from '../types';
import { cn } from '../lib/utils';
import { loadLocalState, saveLocalState } from '../lib/localState';
import { fetchCasesFromSupabase, saveCaseToSupabase } from '../lib/caseRepository';
import { fetchCustomersModuleDataFromSupabase } from '../lib/customerRepository';
import { fetchProjectsFromSupabase } from '../lib/projectRepository';
import { fetchProductSeriesFromSupabase } from '../lib/productRepository';
import UniversalSelector from './UniversalSelector';

interface CaseLibraryProps {
  onSelect?: (caseItem: CustomerCase) => void;
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CaseLibrary({ onSelect, isModal = false, isOpen, onClose }: CaseLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('全部');
  const [cases, setCases] = useState<CustomerCase[]>(() => loadLocalState<CustomerCase[]>('crm.case_library', []));
  const [isEditing, setIsEditing] = useState(false);
  const [editingCase, setEditingCase] = useState<Partial<CustomerCase> | null>(null);
  const [viewingCase, setViewingCase] = useState<CustomerCase | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [seriesSearch, setSeriesSearch] = useState('');

  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showSeriesSelector, setShowSeriesSelector] = useState(false);
  const [painPointsStr, setPainPointsStr] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  const industries = ['全部', ...new Set(cases.map(c => c.industry))];

  useEffect(() => {
    if (editingCase) {
      setPainPointsStr(editingCase.painPoints?.join(', ') || '');
      setTagsStr(editingCase.tags?.join(', ') || '');
    } else {
      setPainPointsStr('');
      setTagsStr('');
    }
  }, [editingCase?.id, isEditing]);

  useEffect(() => {
    saveLocalState('crm.case_library', cases);
  }, [cases]);

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [{ customers: fetchedCustomers }, fetchedProjects, fetchedProducts] = await Promise.all([
          fetchCustomersModuleDataFromSupabase(),
          fetchProjectsFromSupabase(),
          fetchProductSeriesFromSupabase()
        ]);
        setCustomers(fetchedCustomers || []);
        setProjects(fetchedProjects as any);
        setSeriesList(fetchedProducts as any);
      } catch (e) {
        console.error('Error loading case reference data:', e);
        setCustomers([]);
        setProjects([]);
        setSeriesList([]);
      }
    };
    loadRefs();
  }, []);

  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const remote = await fetchCasesFromSupabase();
        if (remote.length > 0) {
          setCases(remote);
        }
      } catch (error) {
        console.error('Error fetching case library:', error);
      }
    };
    fetchRemote();
  }, []);

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesIndustry = selectedIndustry === '全部' || c.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  const handleSave = async () => {
    if (!editingCase?.title) {
      toast.error('请输入案例标题');
      return;
    }
    if (!editingCase?.customerId) {
      toast.error('请选择关联客户');
      return;
    }

    const finalCase = {
      ...editingCase,
      painPoints: painPointsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      tags: tagsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    };

    try {
      if (editingCase.id) {
        const merged = { ...cases.find((item) => item.id === editingCase.id), ...finalCase } as CustomerCase;
        const saved = await saveCaseToSupabase(merged);
        setCases(prev => prev.map(c => c.id === editingCase.id ? saved : c));
        toast.success('案例更新成功');
      } else {
        const newCase: CustomerCase = {
          ...finalCase,
          id: `CASE-${Date.now()}`,
          createDate: new Date().toISOString().split('T')[0],
          creatorName: '张三',
        } as CustomerCase;
        const saved = await saveCaseToSupabase(newCase);
        setCases(prev => [saved, ...prev]);
        toast.success('案例创建成功');
      }
      setIsEditing(false);
      setEditingCase(null);
    } catch (error) {
      console.error('Save case error:', error);
      toast.error('保存失败，请稍后重试');
    }
  };

  const handleFileUpload = (type: 'images' | 'attachments') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Simulate file upload
    const newUrls = Array.from(files).map(file => URL.createObjectURL(file));
    
    setEditingCase(prev => ({
      ...prev!,
      [type]: [...(prev?.[type] || []), ...newUrls]
    }));
    
    toast.success(`${type === 'images' ? '图片' : '附件'}上传成功`);
  };

  const handleAiGenerate = async () => {
    if (!editingCase?.customerId) {
      toast.error('请先选择客户');
      return;
    }
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const customer = customers.find(c => c.id === editingCase.customerId);
    const project = projects.find((p: any) => p.id === editingCase.projectId);
    const selectedSeries = seriesList.filter(s => (editingCase.productSeriesIds || []).includes(s.id));

    setEditingCase(prev => ({
      ...prev!,
      title: `${customer?.name || '客户'}${project?.projectName ? ' - ' + project.projectName : ''} 成功案例`,
      industry: customer?.industry || '',
      painPoints: project?.oppSummary ? [project.oppSummary] : ['效率低下', '成本过高'],
      solution: `针对客户在${project?.projectName || '项目'}中的需求，我们提供了${selectedSeries.map((s: any) => s.name).join('、') || '定制化'}方案...`,
      metrics: '交付周期缩短20%，综合成本降低15%',
      valueStatement: '通过高可靠性连接方案，确保了客户核心系统的稳定运行。',
      tags: ['AI生成', customer?.industry || '通用'].filter(Boolean)
    }));
    setIsGenerating(false);
  };

  if (isModal && !isOpen) return null;

  const content = (
    <div className={cn("flex flex-col h-full", isModal ? "" : "p-6")}>
      {isModal && (
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">客户案例库</h2>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-6 h-6 rotate-90" />
            </button>
          )}
        </div>
      )}

      <div className={cn("flex flex-col flex-1 min-h-0", isModal ? "p-6 overflow-y-auto" : "")}>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索案例标题、标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              {industries.map(industry => (
                <button
                  key={industry}
                  onClick={() => setSelectedIndustry(industry)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                    selectedIndustry === industry 
                      ? "bg-indigo-600 text-white" 
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {industry}
                </button>
              ))}
            </div>
            <button 
              onClick={() => {
                setEditingCase({ title: '', industry: '', painPoints: [], solution: '', metrics: '', valueStatement: '', tags: [], productSeriesIds: [], images: [], attachments: [] });
                setIsEditing(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap ml-2"
            >
              <Plus className="w-4 h-4" />
              新增案例
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 pb-6">
          {filteredCases.map(caseItem => (
            <div 
              key={caseItem.id}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-100 transition-all group cursor-pointer relative"
              onClick={() => setViewingCase(caseItem)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  {caseItem.industry}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCase(caseItem);
                      setIsEditing(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {caseItem.title}
              </h3>
              
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">核心痛点</p>
                  <div className="flex flex-wrap gap-1">
                    {caseItem.painPoints.map((p, i) => (
                      <span key={i} className="text-xs text-gray-600 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-400 rounded-full" />
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">关键成效</p>
                  <p className="text-sm font-medium text-emerald-600">{caseItem.metrics}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 flex-wrap">
                  {caseItem.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-[10px]">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  {caseItem.images && caseItem.images.length > 0 && <ImageIcon className="w-3.5 h-3.5" />}
                  {caseItem.attachments && caseItem.attachments.length > 0 && <Paperclip className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail View Modal */}
      {viewingCase && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{viewingCase.title}</h3>
                  <p className="text-xs text-gray-500">{viewingCase.industry} · {viewingCase.createDate} · 创建人: {viewingCase.creatorName}</p>
                </div>
              </div>
              <button onClick={() => setViewingCase(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <section>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Tag className="w-3 h-3 text-indigo-500" />
                      核心痛点
                    </h4>
                    <ul className="space-y-2">
                      {viewingCase.painPoints.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      关键成效
                    </h4>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <p className="text-sm font-bold text-emerald-700">{viewingCase.metrics}</p>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Package className="w-3 h-3 text-indigo-500" />
                      关联产品系列
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingCase.productSeriesIds?.map((sid) => {
                        const series = seriesList.find((s: any) => s.id === sid);
                        return series ? (
                          <span key={sid} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium border border-gray-200">
                            {series.name}
                          </span>
                        ) : null;
                      }) || <span className="text-xs text-gray-400 italic">未关联系列</span>}
                    </div>
                  </section>

                  {viewingCase.images && viewingCase.images.length > 0 && (
                    <section>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ImageIcon className="w-3 h-3 text-indigo-500" />
                        现场配图
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {viewingCase.images.map((img, i) => (
                          <img key={i} src={img} alt="Case" className="w-full h-24 object-cover rounded-lg border border-gray-100" referrerPolicy="no-referrer" />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>

              <section>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">解决方案</h4>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {viewingCase.solution}
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">价值陈述 (Value Statement)</h4>
                <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 text-sm text-indigo-900 font-medium italic">
                  “{viewingCase.valueStatement}”
                </div>
              </section>

              {viewingCase.attachments && viewingCase.attachments.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">附件资料</h4>
                  <div className="space-y-2">
                    {viewingCase.attachments.map((att, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">附件 {i + 1}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-indigo-500" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {viewingCase.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-white border border-gray-200 text-gray-500 rounded-md text-[10px] font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
              <button 
                onClick={() => {
                  setEditingCase(viewingCase);
                  setViewingCase(null);
                  setIsEditing(true);
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                编辑案例
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">{editingCase?.id ? '编辑案例' : '新增案例'}</h3>
                {!editingCase?.id && (
                  <button 
                    onClick={handleAiGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI 辅助生成
                  </button>
                )}
              </div>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">关联客户</label>
                  <button
                    type="button"
                    onClick={() => setShowCustomerSelector(true)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm flex items-center justify-between hover:border-indigo-300"
                  >
                    <span className={editingCase?.customerId ? 'text-gray-900' : 'text-gray-400'}>
                      {editingCase?.customerId ? (customers.find(c => c.id === editingCase.customerId)?.name || editingCase.customerId) : '选择客户'}
                    </span>
                    <Search className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">关联项目 (选填)</label>
                  <button
                    type="button"
                    onClick={() => setShowProjectSelector(true)}
                    className={cn(
                      "w-full px-4 py-2 border border-gray-200 rounded-xl text-sm flex items-center justify-between",
                      editingCase?.customerId ? "hover:border-indigo-300" : "bg-gray-50 text-gray-400 cursor-not-allowed"
                    )}
                    disabled={!editingCase?.customerId}
                  >
                    <span className={editingCase?.projectId ? 'text-gray-900' : 'text-gray-400'}>
                      {editingCase?.projectId ? ((projects as any[]).find(p => p.id === editingCase.projectId)?.projectName || editingCase.projectId) : '选择项目'}
                    </span>
                    <Search className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">关联产品系列</label>
                  <div className="space-y-3 p-3 border border-gray-200 rounded-xl bg-gray-50/50">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSeriesSelector(true)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-indigo-600 font-medium hover:bg-indigo-50"
                      >
                        选择产品系列
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(editingCase?.productSeriesIds || []).map((id) => {
                        const item = seriesList.find((series: any) => series.id === id);
                        return item ? (
                          <span key={id} className="px-2 py-1 rounded-md text-xs bg-indigo-100 text-indigo-700">
                            系列：{item.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">案例标题</label>
                  <input 
                    type="text" 
                    value={editingCase?.title || ''} 
                    onChange={e => setEditingCase(prev => ({ ...prev!, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="例如：某全球领先无人机厂商高频弯折优化案例"
                  />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">所属行业</label>
                  <input 
                    type="text" 
                    value={editingCase?.industry || ''} 
                    onChange={e => setEditingCase(prev => ({ ...prev!, industry: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">关键成效</label>
                  <input 
                    type="text" 
                    value={editingCase?.metrics || ''} 
                    onChange={e => setEditingCase(prev => ({ ...prev!, metrics: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="例如：售后返修率降低25%"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">核心痛点 (逗号分隔)</label>
                  <input 
                    type="text" 
                    value={painPointsStr} 
                    onChange={e => setPainPointsStr(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="请输入痛点，多个用逗号分隔"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">解决方案</label>
                  <textarea 
                    value={editingCase?.solution || ''} 
                    onChange={e => setEditingCase(prev => ({ ...prev!, solution: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[100px] resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">价值陈述</label>
                  <textarea 
                    value={editingCase?.valueStatement || ''} 
                    onChange={e => setEditingCase(prev => ({ ...prev!, valueStatement: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px] resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">配图与附件</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="file"
                      id="case-image-upload"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload('images')}
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('case-image-upload')?.click()}
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-all"
                    >
                      <ImageIcon className="w-5 h-5" />
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-medium">上传配图</span>
                        {editingCase?.images && editingCase.images.length > 0 && (
                          <span className="text-[10px] text-indigo-500">已上传 {editingCase.images.length} 张</span>
                        )}
                      </div>
                    </button>

                    <input
                      type="file"
                      id="case-attachment-upload"
                      className="hidden"
                      multiple
                      onChange={handleFileUpload('attachments')}
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('case-attachment-upload')?.click()}
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-all"
                    >
                      <Paperclip className="w-5 h-5" />
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-medium">上传附件</span>
                        {editingCase?.attachments && editingCase.attachments.length > 0 && (
                          <span className="text-[10px] text-indigo-500">已上传 {editingCase.attachments.length} 个</span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">标签 (逗号分隔)</label>
                  <input 
                    type="text" 
                    value={tagsStr} 
                    onChange={e => setTagsStr(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="请输入标签，多个用逗号分隔"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
              >
                保存案例
              </button>
            </div>
          </div>
        </div>
      )}
      {showCustomerSelector && (
        <UniversalSelector
          type="customer"
          onSelect={(customer) => {
            setEditingCase((prev) => ({ ...prev!, customerId: customer.id, projectId: '' }));
            setShowCustomerSelector(false);
          }}
          onClose={() => setShowCustomerSelector(false)}
        />
      )}

      {showProjectSelector && (
        <UniversalSelector
          type="project"
          customerId={editingCase?.customerId}
          onSelect={(project) => {
            setEditingCase((prev) => ({ ...prev!, projectId: project.id }));
            setShowProjectSelector(false);
          }}
          onClose={() => setShowProjectSelector(false)}
        />
      )}

      {showSeriesSelector && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">选择产品系列（可多选）</h4>
              <button onClick={() => setShowSeriesSelector(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <input
                value={seriesSearch}
                onChange={(e) => setSeriesSearch(e.target.value)}
                placeholder="搜索系列名称..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto p-3 space-y-1">
              {seriesList
                .filter((s: any) => String(s.name || '').toLowerCase().includes(seriesSearch.toLowerCase()))
                .map((s: any) => {
                  const selected = (editingCase?.productSeriesIds || []).includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 text-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          setEditingCase((prev) => {
                            const current = prev?.productSeriesIds || [];
                            const next = e.target.checked ? [...current, s.id] : current.filter((x) => x !== s.id);
                            return { ...prev!, productSeriesIds: Array.from(new Set(next)) };
                          });
                        }}
                      />
                      <span className="font-medium text-gray-900">{s.name}</span>
                      <span className="text-xs text-gray-500">{s.id}</span>
                    </label>
                  );
                })}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowSeriesSelector(false)} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">完成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
