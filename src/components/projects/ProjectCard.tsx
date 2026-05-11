import React from 'react';
import { Calendar, Users, MessageSquare, ChevronRight } from 'lucide-react';
import { Project } from '../../types';
import { cn } from '../../lib/utils';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete?: (projectId: string) => void;
}

export const ProjectCard = ({ project, onClick, onDelete }: ProjectCardProps) => (
  <div 
    onClick={onClick}
    className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors"></div>
    
    <div className="relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">{project.projectName}</h4>
          <p className="text-sm text-gray-500 font-medium">{project.customerName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-bold border",
            project.projectLevel === 'S级' ? "bg-purple-50 text-purple-700 border-purple-200" :
            project.projectLevel === 'A级' ? "bg-red-50 text-red-700 border-red-200" :
            project.projectLevel === 'B级' ? "bg-blue-50 text-blue-700 border-blue-200" :
            "bg-gray-50 text-gray-600 border-gray-200"
          )}>
            {project.projectLevel}
          </span>
          {project.projectCategory && (
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">
              {project.projectCategory}
            </span>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定要删除这个项目吗？')) {
                  onDelete(project.id);
                }
              }}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Calendar className="w-4 h-4" />
          <span className="text-xs font-medium">更新: {project.updateDate}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Users className="w-4 h-4" />
          <span className="text-xs font-medium">项目经理: {project.team.pm || project.salesRep || project.team.sales || '-'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-gray-400">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-bold">{project.notes.length}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold">{Object.values(project.team).filter(Boolean).length}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-indigo-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          查看详情
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
);
