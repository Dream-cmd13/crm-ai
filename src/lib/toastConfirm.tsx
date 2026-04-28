import React from 'react';
import { toast } from 'react-hot-toast';

export const confirmDialog = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[200px]">
        <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-2 mt-2">
          <button
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            onClick={() => {
              toast.dismiss(t.id);
              resolve(false);
            }}
          >
            取消
          </button>
          <button
            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            onClick={() => {
              toast.dismiss(t.id);
              resolve(true);
            }}
          >
            确定
          </button>
        </div>
      </div>
    ), { 
      duration: Infinity, 
      position: 'top-center',
      style: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }
    });
  });
};