import React from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Project } from '../../types';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeTab: string;
  setActiveTab: (v: string) => void;
  filteredProjects: Project[];
  displayCount: number;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onProjectClick: (p: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  onAddProject?: () => void;
}

export const ProjectList = ({
  searchTerm, setSearchTerm, activeTab, setActiveTab,
  filteredProjects, displayCount, onScroll, onProjectClick, onDeleteProject, onAddProject
}: ProjectListProps) => {
  const tabs = ['本周项目', '全部项目', '重点项目', '今日项目', '上周项目', '上周以前项目', '已关闭项目'];

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">项目管理</h2>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索项目..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">筛选</span>
          </button>
          <button
            type="button"
            onClick={onAddProject}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新建项目</span>
            <span className="sm:hidden">新建</span>
          </button>
        </div>
      </div>

      <div className="relative sm:hidden flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="搜索项目..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-shrink-0 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div 
        className="flex-1 overflow-y-auto pr-2 -mr-2"
        onScroll={onScroll}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.slice(0, displayCount).map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onClick={() => onProjectClick(project)} 
              onDelete={onDeleteProject}
            />
          ))}
        </div>
        
        {filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p>未找到匹配的项目</p>
          </div>
        )}
      </div>
    </div>
  );
};
