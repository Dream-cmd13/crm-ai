import React from 'react';
import CaseLibrary from '../components/CaseLibrary';
import { BookOpen } from 'lucide-react';

export default function CaseLibraryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">客户案例库</h1>
            <p className="text-sm text-gray-500">沉淀行业标杆案例，支持 SPIN & IMPACT 销售策略</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-[calc(100vh-140px)] shadow-sm">
        <CaseLibrary isModal={false} />
      </div>
    </div>
  );
}
