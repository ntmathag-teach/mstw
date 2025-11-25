import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, Eye, Code, Scissors, ChevronRight, X, SkipForward, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { FileData } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface ResultDisplayProps {
  content: string;
  fileData: FileData | null;
}

const PLACEHOLDER_TAG = "[[CHÈN_HÌNH]]";

// Helper to convert Blob URL to Base64 for Clipboard Compatibility
const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Conversion failed", e);
        return "";
    }
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ content, fileData }) => {
  const [activeTab, setActiveTab] = useState<'raw' | 'preview'>('raw');
  const [copied, setCopied] = useState(false);
  
  // State for Cropping - Stores Blob URLs instead of Base64 strings for performance
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [croppedImages, setCroppedImages] = useState<Map<number, string>>(new Map()); // Index -> BlobURL
  const [currentCropIndex, setCurrentCropIndex] = useState<number>(0);
  const [totalPlaceholders, setTotalPlaceholders] = useState<number>(0);
  
  // PDF Rendering State
  const [cropImageSrc, setCropImageSrc] = useState<string>("");
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [selection, setSelection] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef<{x: number, y: number}>({ x: 0, y: 0 });

  // Cleanup Blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
        croppedImages.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []); 

  // 1. Clean up text and identify placeholders
  const { cleanedTextBase, placeholderIndices } = useMemo(() => {
    if (!content) return { cleanedTextBase: "", placeholderIndices: [] };
    let text = content;
    
    // Remove markdown code blocks and cleanup
    text = text.replace(/^```[a-z]*\n/gm, '').replace(/```$/gm, '');
    text = text.replace(/`\s*\$\{/g, '${').replace(/}\$\s*`/g, '}$');
    
    // REMOVE BOLD MARKDOWN (**text**) specifically for "Câu X" or globally to be safe for Word copy
    text = text.replace(/\*\*/g, '');

    // NUCLEAR OPTION: Remove ALL backticks (`)
    text = text.replace(/`/g, '');

    // AUTO-REPAIR: Fix missing closing $ (e.g., "${ x=1 }" -> "${ x=1 }$")
    text = text.replace(/(\$\{(?:[^{}]|\{[^{}]*\})*\})(?!\$)/g, '$1$');

    // Find all placeholders
    const indices: number[] = [];
    let match;
    const regex = /\[\[CHÈN_HÌNH\]\]/g;
    while ((match = regex.exec(text)) !== null) {
        indices.push(match.index);
    }
    
    return { cleanedTextBase: text, placeholderIndices: indices };
  }, [content]);

  useEffect(() => {
      setTotalPlaceholders(placeholderIndices.length);
  }, [placeholderIndices]);


  // 2. Logic to generate final Preview Content
  const previewContent = useMemo(() => {
     let text = cleanedTextBase;
     let count = 0;
     
     // Replace placeholders sequentially
     text = text.replace(/\[\[CHÈN_HÌNH\]\]/g, () => {
         const imgUrl = croppedImages.get(count);
         const index = count;
         count++;
         
         if (imgUrl) {
             return `\n![Image-${index}](${imgUrl})\n`;
         }
         return `\n**[Vị trí hình ảnh số ${index + 1}]**\n`;
     });

     // Fix Latex for preview ($...$)
     return text.replace(/\${/g, '$').replace(/}\$/g, '$');
  }, [cleanedTextBase, croppedImages]);

  // --- PDF HANDLING ---
  
  const loadPdf = async () => {
    if (!fileData || fileData.mimeType !== 'application/pdf') return;
    setIsPdfLoading(true);
    try {
        const loadingTask = pdfjsLib.getDocument(fileData.previewUrl);
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setPdfTotalPages(doc.numPages);
        setPdfPageNum(1);
        await renderPdfPage(doc, 1);
    } catch (error) {
        console.error("Error loading PDF", error);
    } finally {
        setIsPdfLoading(false);
    }
  };

  const renderPdfPage = async (doc: any, pageNum: number) => {
    setIsPdfLoading(true);
    try {
        const page = await doc.getPage(pageNum);
        const scale = 2.0; // Higher scale for better crop quality
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          setCropImageSrc(canvas.toDataURL('image/png'));
          setSelection(null); // Clear selection on page change
        }
    } catch (err) {
        console.error("Render error", err);
    } finally {
        setIsPdfLoading(false);
    }
  };

  const changePdfPage = (delta: number) => {
      if (!pdfDoc) return;
      const newPage = pdfPageNum + delta;
      if (newPage >= 1 && newPage <= pdfTotalPages) {
          setPdfPageNum(newPage);
          renderPdfPage(pdfDoc, newPage);
      }
  };


  // --- CROPPER LOGIC ---

  const startBatchCropping = () => {
      // Find the first index that hasn't been cropped yet
      let firstMissing = 0;
      for (let i = 0; i < totalPlaceholders; i++) {
          if (!croppedImages.has(i)) {
              firstMissing = i;
              break;
          }
      }
      setCurrentCropIndex(firstMissing);
      setIsCropModalOpen(true);
      setSelection(null);
      
      // Initialize Source Image
      if (fileData?.mimeType === 'application/pdf') {
          loadPdf();
      } else if (fileData) {
          setCropImageSrc(fileData.previewUrl);
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      startPos.current = { x, y };
      setIsDragging(true);
      setSelection({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      setSelection({
          x: Math.min(currentX, startPos.current.x),
          y: Math.min(currentY, startPos.current.y),
          w: Math.abs(currentX - startPos.current.x),
          h: Math.abs(currentY - startPos.current.y)
      });
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  const confirmCrop = () => {
      if (!selection || !imageRef.current || selection.w < 5 || selection.h < 5) return;

      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      const displayWidth = imageRef.current.width;
      const displayHeight = imageRef.current.height;

      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;

      const canvas = document.createElement('canvas');
      canvas.width = selection.w * scaleX;
      canvas.height = selection.h * scaleY;
      const ctx = canvas.getContext('2d');

      if (ctx) {
          ctx.drawImage(
              imageRef.current,
              selection.x * scaleX, selection.y * scaleY, selection.w * scaleX, selection.h * scaleY,
              0, 0, canvas.width, canvas.height
          );
          
          canvas.toBlob((blob) => {
              if (blob) {
                  const url = URL.createObjectURL(blob);
                  setCroppedImages(prev => new Map(prev).set(currentCropIndex, url));
                  handleNext();
              }
          }, 'image/png');
      }
  };

  const handleNext = () => {
      setSelection(null);
      if (currentCropIndex < totalPlaceholders - 1) {
          setCurrentCropIndex(prev => prev + 1);
      } else {
          setIsCropModalOpen(false); // Done
      }
  };

  const handleSkip = () => {
      setSelection(null);
       if (currentCropIndex < totalPlaceholders - 1) {
          setCurrentCropIndex(prev => prev + 1);
      } else {
          setIsCropModalOpen(false);
      }
  }

  // Draw selection box overlay
  useEffect(() => {
      if (!canvasRef.current || !selection) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
      
      ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
      ctx.fillRect(selection.x, selection.y, selection.w, selection.h);
  }, [selection]);

  // Init canvas size
  const onImageLoad = () => {
      if (imageRef.current && canvasRef.current) {
          canvasRef.current.width = imageRef.current.width;
          canvasRef.current.height = imageRef.current.height;
      }
  }


  // --- SMART COPY ---
  const handleSmartCopy = async () => {
    try {
        const lines = cleanedTextBase.split('\n');
        let htmlContent = `<html><body><style>img { max-width: 100%; height: auto; display: block; margin: 10px 0; }</style>`;
        
        let placeholderCounter = 0;

        for (const line of lines) {
            let processedLineHtml = "";
            let originalLine = line;

            const escapeHtml = (text: string) => text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            if (originalLine.includes(PLACEHOLDER_TAG)) {
                const parts = originalLine.split(PLACEHOLDER_TAG);
                for (let i = 0; i < parts.length; i++) {
                    processedLineHtml += escapeHtml(parts[i]);
                    if (i < parts.length - 1) {
                        const imgUrl = croppedImages.get(placeholderCounter);
                        placeholderCounter++;

                        if (imgUrl) {
                            const base64 = await blobUrlToBase64(imgUrl);
                            processedLineHtml += `<br/><img src="${base64}" alt="Image" width="300" /><br/>`;
                        } else {
                            processedLineHtml += ` <b>[Hình ảnh]</b> `;
                        }
                    }
                }
            } else {
                processedLineHtml = escapeHtml(originalLine);
            }

            if (processedLineHtml.trim() !== '') {
                htmlContent += `<p>${processedLineHtml}</p>`;
            }
        }

        htmlContent += `</body></html>`;
        const rawText = cleanedTextBase;

        const data = [new ClipboardItem({ 
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([rawText], { type: 'text/plain' }) 
        })];

        await navigator.clipboard.write(data);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        console.error("Copy failed", err);
        navigator.clipboard.writeText(cleanedTextBase);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden relative transition-all">
      
      {/* Batch Crop Banner */}
      {totalPlaceholders > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-5 py-3 border-b border-indigo-100 flex items-center justify-between">
              <div className="text-sm text-indigo-900 flex items-center gap-3">
                 <div className="bg-white p-1.5 rounded-lg shadow-sm text-indigo-600 ring-1 ring-indigo-50">
                    <Sparkles className="w-4 h-4" />
                 </div>
                 <div className="flex flex-col">
                     <span className="font-semibold">Phát hiện hình ảnh</span>
                     <span className="text-xs text-indigo-600/80">Cần chèn {totalPlaceholders} hình vào văn bản</span>
                 </div>
              </div>
              
              <div className="flex items-center gap-3">
                 <span className="text-xs font-bold text-indigo-800 bg-white/60 px-2 py-1 rounded-md border border-indigo-100">
                    {croppedImages.size} / {totalPlaceholders}
                 </span>
                 <button 
                    onClick={startBatchCropping}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center gap-1.5"
                >
                    {croppedImages.size === 0 ? "Bắt đầu cắt" : "Tiếp tục"}
                    <ChevronRight className="w-3 h-3" />
                </button>
              </div>
          </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100/80 sticky top-0 z-10 backdrop-blur-sm bg-white/80">
        <div className="flex bg-slate-100/80 rounded-xl p-1 gap-1">
            <button
                onClick={() => setActiveTab('raw')}
                className={`
                    flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300
                    ${activeTab === 'raw' 
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }
                `}
            >
                <Code className="w-4 h-4" /> Word Source
            </button>
            <button
                onClick={() => setActiveTab('preview')}
                className={`
                    flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300
                    ${activeTab === 'preview' 
                        ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }
                `}
            >
                <Eye className="w-4 h-4" /> Xem trước
            </button>
        </div>

        <button
          onClick={handleSmartCopy}
          className={`
            flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-lg active:scale-95 duration-300
            ${copied 
                ? 'bg-green-500 text-white translate-y-0.5' 
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }
          `}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Đã sao chép!' : 'Copy vào Word'}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-white group">
        {activeTab === 'raw' ? (
            <textarea
                className="w-full h-full p-8 font-mono text-sm text-slate-700 bg-white resize-none focus:outline-none leading-relaxed selection:bg-blue-100 custom-scrollbar"
                value={cleanedTextBase} 
                readOnly
                spellCheck={false}
            />
        ) : (
          <div className="w-full h-full p-8 overflow-auto relative bg-slate-50/30 custom-scrollbar">
             <div className="prose prose-slate prose-lg max-w-none prose-headings:text-indigo-900 prose-headings:font-bold prose-p:text-slate-700 prose-p:leading-8">
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        p: ({node, ...props}) => <p className="mb-6" {...props} />,
                        img: ({node, ...props}) => (
                            <span className="block my-8 border-2 border-dashed border-indigo-200/60 rounded-xl p-4 bg-white/50 text-center shadow-sm hover:shadow-md transition-shadow">
                                <img 
                                    {...props} 
                                    className="max-w-full h-auto mx-auto shadow-sm rounded-lg" 
                                    alt="Được trích xuất từ ảnh gốc"
                                />
                            </span>
                        )
                    }}
                >
                    {previewContent}
                </ReactMarkdown>
             </div>
          </div>
        )}
      </div>

      {/* CROP MODAL OVERLAY */}
      {isCropModalOpen && fileData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden ring-1 ring-white/10 animate-in zoom-in-95 duration-300">
                  
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-none">
                      <div className="flex items-center gap-4">
                          <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 border border-indigo-100">
                            <Scissors className="w-6 h-6" />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-900">Cắt ảnh thủ công</h3>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                  Vị trí: <span className="font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-100">#{currentCropIndex + 1}</span> 
                                  <span>trong tổng số {totalPlaceholders}</span>
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center gap-4">
                           {/* PDF Pagination Controls */}
                           {fileData.mimeType === 'application/pdf' && (
                              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 mr-4 shadow-sm">
                                  <button 
                                    onClick={() => changePdfPage(-1)}
                                    disabled={pdfPageNum <= 1 || isPdfLoading}
                                    className="p-1.5 hover:bg-gray-100 rounded-md transition-all disabled:opacity-30"
                                  >
                                      <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <span className="text-xs font-bold text-gray-700 px-3 min-w-[90px] text-center">
                                      Trang {pdfPageNum} / {pdfTotalPages}
                                  </span>
                                  <button 
                                    onClick={() => changePdfPage(1)}
                                    disabled={pdfPageNum >= pdfTotalPages || isPdfLoading}
                                    className="p-1.5 hover:bg-gray-100 rounded-md transition-all disabled:opacity-30"
                                  >
                                      <ChevronRight className="w-4 h-4" />
                                  </button>
                              </div>
                          )}

                           <button 
                             onClick={() => setIsCropModalOpen(false)}
                             className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors border border-transparent hover:border-red-100"
                           >
                               <X className="w-6 h-6 text-gray-400 hover:text-red-500" />
                           </button>
                      </div>
                  </div>

                  {/* Modal Body (Canvas) */}
                  <div className="flex-1 overflow-auto bg-slate-900 flex justify-center relative p-8 select-none custom-scrollbar">
                      {isPdfLoading ? (
                          <div className="flex flex-col items-center justify-center text-white/80">
                              <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-400" />
                              <p className="font-medium text-lg">Đang render trang PDF...</p>
                          </div>
                      ) : (
                        <div className="relative shadow-2xl ring-8 ring-black/20 inline-block rounded-lg overflow-hidden bg-white">
                            {cropImageSrc && (
                                <>
                                    <img 
                                        ref={imageRef}
                                        src={cropImageSrc} 
                                        alt="To Crop" 
                                        className="max-w-full"
                                        style={{ maxHeight: '70vh', display: 'block' }}
                                        onLoad={onImageLoad}
                                        draggable={false}
                                    />
                                    <canvas 
                                        ref={canvasRef}
                                        className="absolute top-0 left-0 cursor-crosshair touch-none"
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
                                    />
                                </>
                            )}
                        </div>
                      )}
                  </div>

                  {/* Modal Footer (Controls) */}
                  <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-between items-center flex-none">
                       <button 
                          onClick={handleSkip}
                          className="flex items-center px-5 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-colors text-sm font-semibold border border-transparent hover:border-slate-200"
                       >
                           <SkipForward className="w-4 h-4 mr-2" />
                           Bỏ qua hình này
                       </button>

                       <div className="flex items-center gap-4">
                           {!selection && (
                               <div className="text-sm text-slate-400 italic flex items-center animate-pulse">
                                   <Scissors className="w-4 h-4 mr-2" />
                                   Kéo chuột trên ảnh để chọn vùng cần cắt
                               </div>
                           )}
                           
                           <button 
                             onClick={confirmCrop}
                             disabled={!selection}
                             className={`
                                flex items-center px-8 py-3 rounded-xl transition-all font-bold shadow-lg
                                ${selection 
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:scale-105 active:scale-95 shadow-blue-500/30' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                                }
                             `}
                           >
                               <Check className="w-5 h-5 mr-2" />
                               Cắt & Tiếp tục
                           </button>
                       </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ResultDisplay;
