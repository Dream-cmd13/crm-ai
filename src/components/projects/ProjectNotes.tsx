import React from 'react';
import { MessageSquare } from 'lucide-react';

interface ProjectNotesProps {
  notes: any[];
  newNote: string;
  setNewNote: (v: string) => void;
  handleAddNote: () => void;
}

export const ProjectNotes: React.FC<ProjectNotesProps> = ({ notes, newNote, setNewNote, handleAddNote }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col h-[500px]">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-amber-500" />
        协同动态
      </h3>
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {notes.map(note => (
          <div key={note.id} className="bg-gray-50 p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">{note.author}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">{note.role}</span>
              </div>
              <span className="text-xs text-gray-400">{note.date}</span>
            </div>
            <p className="text-sm text-gray-700">{note.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100">
        <textarea 
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="发布项目动态或留言..."
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24 mb-3"
        ></textarea>
        <div className="flex justify-end">
          <button 
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发布动态
          </button>
        </div>
      </div>
    </div>
  );
};
