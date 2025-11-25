import React, { useState } from 'react';
import { ProcessingStatus, FileData } from './types';
import { geminiService } from './services/geminiService';
import FileUpload from './components/FileUpload';
import FilePreview from './components/FilePreview';
import ResultDisplay from './components/ResultDisplay';
import { Loader2, Calculator, AlertCircle, Sparkles, FileText, ArrowRight, RefreshCw, Play } from 'lucide-react';

const App: React.FC = () => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileSelect = (data: FileData) => {
    setFileData(data);
    setStatus(ProcessingStatus.IDLE);
    setResult('');
    setError('');
  };

  const handleClearFile = () => {
    setFileData(null);
    setStatus(ProcessingStatus.IDLE);
    setResult('');
    setError('');
  };

  const handleProcess = async () => {
    if (!fileData) return;

    setStatus(ProcessingStatus.PROCESSING);
    setError('');

    try {
      const text = await geminiService.processFile(fileData);
      setResult(text);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi không xác định");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen text-slate-800">
      
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800">MathScan</h1>
                <p className="text-sm text-slate-500 font-medium">AI to Word/LaTeX Converter</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               Gemini 2.5 Flash
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 h-[calc(100vh-8rem)]">
          
          {/* Left Column: Input (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-1 custom-scrollbar">
            
            {/* FRAME 1: DOCUMENT / UPLOAD AREA */}
            <div className={`bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-white p-6 flex flex-col ${!fileData ? 'flex-1' : 'h-[500px]'} relative overflow-hidden transition-all duration-300`}>
               <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
               
               <div className="flex items-center gap-3 mb-4 relative z-10 flex-none">
                 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm ring-4 ring-white shadow-sm">1</div>
                 <h2 className="text-lg font-bold text-slate-800">Tài liệu nguồn</h2>
               </div>

               <div className="flex-1 overflow-hidden rounded-2xl relative">
                  {!fileData ? (
                    <FileUpload onFileSelect={handleFileSelect} isLoading={status === ProcessingStatus.PROCESSING} />
                  ) : (
                    <FilePreview fileData={fileData} onClear={handleClearFile} />
                  )}
               </div>
            </div>

            {/* FRAME 2: CONTROL PANEL (Only visible if file uploaded) */}
            {fileData && (
                <div className="bg-white rounded-2xl shadow-lg shadow-indigo-100/50 border border-indigo-50 p-5 animate-in slide-in-from-bottom-6 duration-300">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm ring-4 ring-white shadow-sm">2</div>
                        <h2 className="text-lg font-bold text-slate-800">Bảng điều khiển</h2>
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                        {/* Start Button */}
                        {status !== ProcessingStatus.PROCESSING && status !== ProcessingStatus.SUCCESS ? (
                            <button
                                onClick={handleProcess}
                                className="col-span-2 py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 group"
                            >
                                <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                                    <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                                </div>
                                <span className="text-lg">Bắt đầu chuyển đổi</span>
                                <ArrowRight className="w-5 h-5 ml-auto opacity-70" />
                            </button>
                        ) : status === ProcessingStatus.SUCCESS ? (
                            <button
                                onClick={handleProcess}
                                className="col-span-2 py-3 px-6 bg-green-50 text-green-700 hover:bg-green-100 font-bold rounded-xl border border-green-200 transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Chuyển đổi lại
                            </button>
                        ) : null}
                        
                        {/* Reset Button */}
                        <button
                            onClick={handleClearFile}
                            className={`py-3 px-4 bg-white border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${status === ProcessingStatus.PROCESSING ? 'col-span-2' : 'col-span-2'}`}
                            disabled={status === ProcessingStatus.PROCESSING}
                        >
                            <RefreshCw className={`w-4 h-4 ${status === ProcessingStatus.PROCESSING ? 'animate-spin' : ''}`} />
                            {status === ProcessingStatus.PROCESSING ? 'Đang xử lý...' : 'Chọn tài liệu khác'}
                        </button>
                     </div>
                </div>
            )}

             {/* Status Loading State */}
             {status === ProcessingStatus.PROCESSING && (
                <div className="flex-1 flex flex-col items-center justify-center bg-white/80 backdrop-blur rounded-2xl border border-white shadow-lg p-6 text-center animate-in fade-in duration-500">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-white p-3 rounded-full shadow-md">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Đang xử lý AI...</h3>
                    <p className="text-sm text-slate-500 mt-1">Đang phân tích cấu trúc toán học</p>
                </div>
             )}
             
             {status === ProcessingStatus.ERROR && (
                 <div className="bg-red-50/80 backdrop-blur border border-red-100 rounded-2xl p-6 shadow-sm flex items-start gap-4 animate-in shake">
                    <div className="bg-red-100 p-2 rounded-full flex-none">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-red-900 text-lg">Lỗi xử lý</h4>
                        <p className="text-red-700 mt-1 mb-3">{error}</p>
                    </div>
                 </div>
             )}
          </div>

          {/* Right Column: Output (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 h-full flex flex-col">
             <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-white flex flex-col h-full overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex-none bg-white flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm ring-4 ring-white shadow-sm">3</div>
                         <div>
                             <h2 className="text-lg font-bold text-slate-800">Kết quả đầu ra</h2>
                             <p className="text-xs text-slate-400 font-medium">Sẵn sàng copy sang Word</p>
                         </div>
                     </div>
                </div>
                
                <div className="flex-1 p-1 bg-slate-50/50 overflow-hidden relative">
                    {result ? (
                        <ResultDisplay 
                            key={fileData?.previewUrl || 'empty'} 
                            content={result} 
                            fileData={fileData} 
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 m-4 rounded-xl bg-slate-50/50">
                            <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                                <FileText className="w-12 h-12 text-slate-200" />
                            </div>
                            <p className="font-medium text-lg">Kết quả sẽ hiển thị tại đây</p>
                            <p className="text-sm">Vui lòng hoàn thành bước 1 & 2</p>
                        </div>
                    )}
                </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;