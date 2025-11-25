import React, { useState } from 'react';
import { ProcessingStatus, FileData } from './types';
import { geminiService } from './services/geminiService';
import FileUpload from './components/FileUpload';
import FilePreview from './components/FilePreview';
import ResultDisplay from './components/ResultDisplay';
import { Loader2, Calculator, AlertCircle, Sparkles, FileText, ArrowRight, RefreshCw, ChevronRight } from 'lucide-react';

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
    <div className="min-h-screen text-slate-800 bg-slate-50/50 selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">MathScan</h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide">AI OCR CONVERTER</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 shadow-sm">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
               <span className="text-xs font-semibold text-slate-600">Gemini 2.5 Flash</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 h-[calc(100vh-8rem)]">
          
          {/* Left Column: Input (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-1 custom-scrollbar pb-10">
            
            {/* FRAME 1: DOCUMENT / UPLOAD AREA */}
            <div className={`bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-white p-1 flex flex-col ${!fileData ? 'flex-1 min-h-[400px]' : 'h-[500px]'} relative overflow-hidden transition-all duration-500 ease-in-out hover:shadow-2xl hover:shadow-indigo-100/50`}>
               <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-50/50 to-transparent rounded-bl-[100px] -mr-10 -mt-10 pointer-events-none"></div>
               
               <div className="p-5 pb-2 flex items-center gap-3 relative z-10 flex-none">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm shadow-sm">1</div>
                 <h2 className="text-lg font-bold text-slate-800">Tài liệu nguồn</h2>
               </div>

               <div className="flex-1 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 m-2 mt-0 relative group">
                  {!fileData ? (
                    <FileUpload onFileSelect={handleFileSelect} isLoading={status === ProcessingStatus.PROCESSING} />
                  ) : (
                    <FilePreview fileData={fileData} onClear={handleClearFile} />
                  )}
               </div>
            </div>

            {/* FRAME 2: CONTROL PANEL (Only visible if file uploaded) */}
            {fileData && (
                <div className="bg-white rounded-2xl shadow-lg shadow-indigo-100/50 border border-indigo-50/50 p-5 animate-in slide-in-from-bottom-6 duration-500 fill-mode-backwards">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold text-sm shadow-sm">2</div>
                        <h2 className="text-lg font-bold text-slate-800">Hành động</h2>
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                        {/* Start Button */}
                        {status !== ProcessingStatus.PROCESSING && status !== ProcessingStatus.SUCCESS ? (
                            <button
                                onClick={handleProcess}
                                className="col-span-2 py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out transform skew-x-12"></div>
                                <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <span className="text-lg tracking-wide">Bắt đầu chuyển đổi</span>
                                <ChevronRight className="w-5 h-5 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : status === ProcessingStatus.SUCCESS ? (
                            <button
                                onClick={handleProcess}
                                className="col-span-2 py-3 px-6 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-2 group"
                            >
                                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                Chuyển đổi lại
                            </button>
                        ) : null}
                        
                        {/* Reset Button */}
                        <button
                            onClick={handleClearFile}
                            className={`py-3 px-4 bg-white border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 ${status === ProcessingStatus.PROCESSING ? 'col-span-2' : 'col-span-2'}`}
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
                <div className="flex-1 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl shadow-indigo-100/50 p-6 text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative mb-5">
                        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75 delay-100"></div>
                        <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-white p-4 rounded-full shadow-lg border border-blue-50">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Đang phân tích AI...</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-[200px] leading-relaxed">Hệ thống đang nhận diện công thức toán và hình ảnh</p>
                </div>
             )}
             
             {status === ProcessingStatus.ERROR && (
                 <div className="bg-red-50/90 backdrop-blur border border-red-100 rounded-2xl p-6 shadow-lg shadow-red-100/50 flex items-start gap-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white p-2 rounded-full flex-none shadow-sm border border-red-100">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-red-900 text-lg">Đã xảy ra lỗi</h4>
                        <p className="text-red-700 mt-1 mb-3 text-sm leading-relaxed">{error}</p>
                    </div>
                 </div>
             )}
          </div>

          {/* Right Column: Output (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 h-full flex flex-col">
             <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-white flex flex-col h-full overflow-hidden transition-all duration-300">
                <div className="p-4 px-6 border-b border-slate-100 flex-none bg-white flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-sm shadow-sm">3</div>
                         <div>
                             <h2 className="text-lg font-bold text-slate-800">Kết quả đầu ra</h2>
                         </div>
                     </div>
                     {status === ProcessingStatus.SUCCESS && (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-in fade-in">
                            Hoàn tất
                         </span>
                     )}
                </div>
                
                <div className="flex-1 bg-slate-50/30 overflow-hidden relative">
                    {result ? (
                        <ResultDisplay 
                            key={fileData?.previewUrl || 'empty'} 
                            content={result} 
                            fileData={fileData} 
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 m-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                            <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                                <FileText className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="font-bold text-xl text-slate-700 mb-2">Chưa có kết quả</h3>
                            <p className="text-sm text-slate-500 max-w-sm text-center leading-relaxed">
                                Vui lòng tải tài liệu lên và nhấn nút <span className="font-semibold text-indigo-600">"Bắt đầu chuyển đổi"</span> để xem kết quả tại đây.
                            </p>
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
