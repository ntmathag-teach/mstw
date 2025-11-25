import React, { ChangeEvent, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, CloudUpload } from 'lucide-react';
import { FileData } from '../types';

interface FileUploadProps {
  onFileSelect: (data: FileData) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [isDragOver, setIsDragOver] = useState(false);

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
          relative flex flex-col items-center justify-center w-full h-64 lg:h-80
          border-3 border-dashed rounded-2xl cursor-pointer 
          transition-all duration-300 ease-in-out group overflow-hidden
          ${isLoading 
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
            : isDragOver
              ? 'bg-indigo-50 border-indigo-500 scale-[1.02] shadow-xl'
              : 'bg-white border-gray-300 hover:border-indigo-400 hover:bg-slate-50 hover:shadow-md'
          }
        `}
      >
        {/* Background Decorative Circles */}
        <div className={`absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-100 rounded-full blur-3xl opacity-50 transition-all ${isDragOver ? 'scale-150' : 'scale-100'}`}></div>
        <div className={`absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50 transition-all ${isDragOver ? 'scale-150' : 'scale-100'}`}></div>

        <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className={`
            p-4 rounded-full mb-4 shadow-sm transition-all duration-300
            ${isDragOver ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'}
          `}>
             <CloudUpload className={`w-10 h-10 ${isLoading ? 'animate-pulse' : ''}`} />
          </div>
          
          <h3 className="mb-2 text-lg font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">
            {isDragOver ? 'Thả file vào đây ngay!' : 'Tải lên đề bài'}
          </h3>
          <p className="mb-4 text-sm text-gray-500 max-w-xs">
            Kéo thả hoặc nhấn để chọn file <br/>
            <span className="text-xs text-gray-400">(Hỗ trợ JPG, PNG & PDF)</span>
          </p>
          
          <div className="flex gap-3 mt-2">
             <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                <ImageIcon className="w-3 h-3 mr-1.5" /> Ảnh
             </span>
             <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-100">
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