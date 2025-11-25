import React from 'react';
import { FileData } from '../types';
import { X, FileText, Image as ImageIcon } from 'lucide-react';

interface FilePreviewProps {
  fileData: FileData;
  onClear: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ fileData, onClear }) => {
  const isPdf = fileData.mimeType === 'application/pdf';

  return (
    <div className="relative w-full h-full border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 px-4 bg-white border-b border-gray-100 flex-none">
        <div className="flex items-center gap-3 truncate max-w-[85%]">
          {isPdf ? (
             <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                <FileText className="w-5 h-5 text-red-500" />
             </div>
          ) : (
             <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                <ImageIcon className="w-5 h-5 text-blue-500" />
             </div>
          )}
          <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-slate-700 truncate leading-tight" title={fileData.file.name}>
                {fileData.file.name}
              </span>
              <span className="text-[11px] text-slate-400 font-medium uppercase mt-0.5">
                {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
              </span>
          </div>
        </div>
        <button 
          onClick={onClear}
          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500"
          title="Xóa file hiện tại"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Preview Body */}
      <div className="flex-1 bg-slate-50 flex items-center justify-center overflow-auto relative min-h-[300px]">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
        
        {isPdf ? (
          <embed 
            src={fileData.previewUrl} 
            type="application/pdf" 
            className="w-full h-full relative z-10" 
          />
        ) : (
          <img 
            src={fileData.previewUrl} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain p-4 relative z-10 drop-shadow-sm" 
          />
        )}
      </div>
    </div>
  );
};

export default FilePreview;
