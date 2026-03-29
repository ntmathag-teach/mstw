import { GoogleGenAI } from "@google/genai";
import { FileData, ProcessingConfig, ProcessingMode } from "../types";

const processFileWithGemini = async (fileData: FileData, config: ProcessingConfig): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Remove the data URL prefix (e.g., "data:image/png;base64,") to get raw base64
  const base64Data = fileData.base64.split(',')[1];

  const isCloneMode = config.mode === ProcessingMode.CLONE;
  const cloneCount = config.cloneCount || 1;

  const systemPrompt = `
    Bạn là công cụ AI chuyên nghiệp hỗ trợ giáo viên Toán.
    
    NHIỆM VỤ CHÍNH: ${isCloneMode ? `Tạo ${cloneCount} câu hỏi tương tự từ tài liệu nguồn.` : 'Chuyển đổi toàn bộ nội dung ảnh sang văn bản Word chuẩn.'}

    ${isCloneMode ? `
    QUY TẮC TẠO CÂU HỎI TƯƠNG TỰ (CLONE):
    1. Phân tích sâu câu hỏi gốc: Xác định chủ đề (ví dụ: Tích phân), đơn vị kiến thức (ví dụ: Tính chất tích phân), và mức độ nhận thức (Nhận biết/Thông hiểu/Vận dụng).
    2. Sáng tạo đa dạng (BẮT BUỘC): 
       - TUYỆT ĐỐI KHÔNG chỉ thay đổi số (hệ số, cận) trong cùng một công thức của câu gốc cho tất cả các câu clone.
       - Hãy khai thác các TÍNH CHẤT KHÁC NHAU của cùng đơn vị kiến thức đó.
       - Ví dụ với Tích phân xác định (Nhận biết):
         + Câu 1: Dùng tính chất nhân hằng số: \${ \int kf(x) }\$.
         + Câu 2: Dùng tính chất cộng/trừ: \${ \int [f(x) \pm g(x)] }\$.
         + Câu 3: Dùng tính chất tách đoạn: \${ \int_a^c = \int_a^b + \int_b^c }\$.
         + Câu 4: Dùng tính chất đảo cận: \${ \int_a^b = -\int_b^a }\$.
       - Thay đổi đối tượng: Nếu câu gốc dùng hàm f(x), câu sau có thể dùng biến t, hoặc kết hợp f(x) với một hàm cụ thể (như x, x^2) nếu vẫn giữ đúng mức độ nhận thức.
    3. Cấu trúc: Trình bày rõ ràng từng câu hỏi kèm 4 đáp án trắc nghiệm A, B, C, D. Đảm bảo các đáp án nhiễu (distractors) được tính toán dựa trên các lỗi sai thường gặp của học sinh.
    ` : ''}

    QUY TẮC XỬ LÝ CÔNG THỨC TOÁN (Latex) - BẮT BUỘC:
    - CẤU TRÚC: \`\${\` công thức \`}\$\` (Mở bằng \`\${\` và ĐÓNG bằng \`}\$\`)
    - MAX, MIN, LIM: Dùng \\underset...{\\mathop...} (Ví dụ: \`\${ \\underset{[a;b]}{\\mathop{\\max }}\\, y }\$\`)
    - TÍCH PHÂN: Dùng \\limits (Ví dụ: \`\${ \\int\\limits_{0}^{1}{x dx} }\$\`)
    - DẤU NGOẶC: Dùng \\left và \\right (Ví dụ: \`\${ \\left( \\frac{x+1}{x-1} \\right) }\$\`)
    - KÝ HIỆU ĐỘ: Dùng \\circ (Ví dụ: \`\${ 45\\circ }\$\`)
    - SỐ ÂM: Đóng gói thành công thức (Ví dụ: \`\${ -2 }\$\`)

    XỬ LÝ HÌNH VẼ/BẢNG BIỂU:
    - Nếu là chuyển đổi: Chèn tag \`[[CHÈN_HÌNH]]\` tại vị trí có hình/bảng.
    - Nếu là tạo câu hỏi tương tự: Mô tả ngắn gọn hình vẽ cần có (Ví dụ: [Hình vẽ: Đồ thị hàm số bậc 3 có 2 điểm cực trị]) nếu câu hỏi mới cần hình.

    ĐỊNH DẠNG ĐẦU RA:
    - Trình bày sạch sẽ, dễ đọc.
    - Không dùng in đậm Markdown cho "Câu 1", "Câu 2".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: fileData.mimeType,
              data: base64Data,
            },
          },
          {
            text: systemPrompt
          }
        ]
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Không thể xử lý yêu cầu. Vui lòng thử lại sau.");
  }
};

export const geminiService = {
  processFile: processFileWithGemini,
};
