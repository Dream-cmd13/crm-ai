import React, { useEffect, useState } from 'react';
import { Role } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Trophy, Target, TrendingUp, AlertCircle, Award } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';

interface PerformanceProps {
  role: Role;
}

export default function Performance({ role }: PerformanceProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-03');
  const [myMetrics, setMyMetrics] = useState<any>({
    score: 0,
    metrics: {
      delivery: { label: '交付达成率', value: 0, target: 100 },
      quality: { label: '质量达成率', value: 0, target: 100 },
      response: { label: '响应及时率', value: 0, target: 100 },
      collaboration: { label: '协同效率', value: 0, target: 100 }
    }
  });
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('crm_system_config')
          .select('value_json')
          .eq('id', 'performance_metrics')
          .limit(1);
        if (error) throw error;
        const raw = data?.[0]?.value_json;
        if (Array.isArray(raw) && raw[0]) setMyMetrics(raw[0]);
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
      }
    };
    fetchMetrics();
  }, []);

  const radarData = Object.keys(myMetrics.metrics).map(key => {
    const metric = myMetrics.metrics[key];
    const val = parseFloat(metric.value.toString());
    const tgt = parseFloat(metric.target.toString());
    return {
      subject: metric.label,
      A: val,
      fullMark: Math.max(val, tgt) * 1.2,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">绩效仪表盘</h1>
          <p className="text-gray-500 mt-1">量化跨部门协同绩效，结果驱动</p>
        </div>
        <div className="flex gap-3">
          <select 
            className="border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="2026-03">2026年3月</option>
            <option value="2026-02">2026年2月</option>
            <option value="2026-01">2026年1月</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-indigo-100" />
              <h3 className="font-semibold text-indigo-50">综合绩效得分</h3>
            </div>
            <div className="text-5xl font-bold mb-2">{myMetrics.score}</div>
            <p className="text-indigo-100 text-sm">排名: 部门第 2 名</p>
          </div>
          <div className="mt-6 pt-4 border-t border-indigo-400/30 flex justify-between items-center">
            <span className="text-sm text-indigo-100">考核周期: {selectedPeriod}</span>
            <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">优秀</span>
          </div>
        </div>

        <div className="md:col-span-3 grid grid-cols-2 gap-6">
          {(Object.entries(myMetrics.metrics) as [string, any][]).map(([key, metric]) => {
            const val = parseFloat(metric.value.toString());
            const tgt = parseFloat(metric.target.toString());
            const isGood = val >= tgt;
            
            return (
              <div key={key} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-gray-400" />
                    <h3 className="font-medium text-gray-700">{metric.label}</h3>
                  </div>
                  {isGood ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <TrendingUp className="w-3 h-3" /> 达标
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                      <AlertCircle className="w-3 h-3" /> 未达标
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold text-gray-900">{metric.value}</span>
                  <span className="text-sm text-gray-500 mb-1">目标: {metric.target}</span>
                </div>
                <div className="mt-4 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isGood ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min((val / tgt) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6">各项指标雷达图</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                <Radar name="实际值" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6">绩效计算引擎说明</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h4 className="font-medium text-gray-900">数据化工作模式</h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                系统自动从项目、任务、客户数据中抓取数据，计算绩效得分。过程数据（如任务完成及时率）与结果数据（如项目盈利）相结合，实现自动化的绩效核算。
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">当前岗位考核重点</h4>
              <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
                {(Object.values(myMetrics.metrics) as any[]).map((m, i) => (
                  <li key={i}>{m.label} (目标: {m.target})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
