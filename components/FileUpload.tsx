import React, { ChangeEvent, useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, CloudUpload, ClipboardPaste } from 'lucide-react';
import { FileData } from '../types';

interface FileUploadProps {
  onFileSelect: (data: FileData) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle Paste Event (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isLoading) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            // Rename file to make it meaningful
            const renamedFile = new File([file], `paste_${new Date().getTime()}.png`, { type: file.type });
            processFile(renamedFile);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isLoading]);

  // Handle Drag & Drop / File Input
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    processFile(file);
    event.target.value = '';
  };

  const processFile = (file?: File) => {
    if (!file) return;
    const mimeType = file.type;
    const reader = new FileReader();

    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const previewUrl = URL.createObjectURL(file);
      
      onFileSelect({
        file,
        previewUrl,
        base64,
        mimeType
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isLoading && e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLoading) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <label 
        htmlFor="file-upload" 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex-1 flex flex-col items-center justify-center w-full min-h-[300px]
          border-3 border-dashed rounded-xl cursor-pointer 
          transition-all duration-300 ease-out group overflow-hidden
          ${isLoading 
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
            : isDragOver
              ? 'bg-indigo-50/50 border-indigo-400 scale-[0.99] shadow-inner'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
          }
        `}
      >
        {/* Background Decorative Circles */}
        <div className={`absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-700`}></div>
        <div className={`absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-700`}></div>

        <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className={`
            p-5 rounded-2xl mb-5 shadow-sm transition-all duration-300 transform
            ${isDragOver 
                ? 'bg-indigo-100 text-indigo-600 scale-110' 
                : 'bg-white border border-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 group-hover:border-indigo-100 group-hover:shadow-md'
            }
          `}>
             <CloudUpload className={`w-10 h-10 ${isLoading ? 'animate-pulse' : ''}`} />
          </div>
          
          <h3 className="mb-2 text-lg font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">
            {isDragOver ? 'Thả file vào đây!' : 'Tải lên đề bài'}
          </h3>
          <p className="mb-6 text-sm text-slate-500 leading-relaxed max-w-[240px]">
            Kéo thả, chọn file hoặc nhấn <kbd className="px-2 py-1 rounded-md bg-white text-slate-600 font-bold text-xs border border-slate-200 shadow-sm mx-1">Ctrl + V</kbd> để dán ảnh trực tiếp
          </p>
          
          <div className="flex gap-2 justify-center">
             <span className="inline-flex items-center px-3 py-1 bg-slate-50 text-slate-600 text-[11px] font-semibold rounded-full border border-slate-100 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                <ImageIcon className="w-3 h-3 mr-1.5" /> PNG/JPG
             </span>
             <span className="inline-flex items-center px-3 py-1 bg-slate-50 text-slate-600 text-[11px] font-semibold rounded-full border border-slate-100 group-hover:border-red-200 group-hover:bg-red-50 group-hover:text-red-700 transition-colors">
                <FileText className="w-3 h-3 mr-1.5" /> PDF
             </span>
          </div>
        </div>
        
        <input 
          id="file-upload" 
          type="file" 
          className="hidden" 
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </label>
    </div>
  );
};

export default FileUpload;
