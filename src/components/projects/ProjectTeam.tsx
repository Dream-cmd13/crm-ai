import React from 'react';
import { Users, Edit } from 'lucide-react';

interface ProjectTeamProps {
  team: any;
  users: any[];
  setIsEditingMembers: (v: boolean) => void;
}

export const ProjectTeam: React.FC<ProjectTeamProps> = ({ team, users, setIsEditingMembers }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          项目成员
        </h3>
        <button 
          onClick={() => setIsEditingMembers(true)}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {Object.entries(team).map(([roleKey, value]) => {
          const userName = users.find(u => u.id === value || u.name === value)?.name || value;
          return (
            <div key={roleKey} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500 capitalize">{
                roleKey === 'sales' ? '业务员' :
                roleKey === 'pm' ? '项目经理' :
                roleKey === 'product' ? '产品负责人' :
                roleKey === 'quality' ? '品质负责人' :
                roleKey === 'purchasing' ? '采购' :
                roleKey === 'fae' ? 'FAE' : roleKey
              }</span>
              <span className="font-medium text-gray-900">{userName || '未分配'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
