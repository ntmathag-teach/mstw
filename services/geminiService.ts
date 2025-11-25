import { GoogleGenAI } from "@google/genai";
import { FileData } from "../types";

const processFileWithGemini = async (fileData: FileData): Promise<string> => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Remove the data URL prefix (e.g., "data:image/png;base64,") to get raw base64
  const base64Data = fileData.base64.split(',')[1];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: fileData.mimeType,
              data: base64Data,
            },
          },
          {
            text: `
              Bạn là công cụ OCR chuyên nghiệp chuyển đổi đề thi Toán sang văn bản Word chuẩn nhất.

              NHIỆM VỤ:
              1. Chuyển đổi toàn bộ nội dung ảnh sang text.
              
              2. XỬ LÝ CÔNG THỨC TOÁN (Latex):
                 - Bắt buộc đặt trong: \`\${\` công thức \`}\$\`
                 - Ví dụ: \`\${ x^2 + 1 = 0 }\$\`
                 - TUYỆT ĐỐI KHÔNG dùng dấu backtick (\`) bao quanh \`\${\` và \`}\$\`.
                 
                 * QUY TẮC ĐẶC BIỆT CHO WORD (BẮT BUỘC TUÂN THỦ):
                 
                 A. MAX, MIN, LIM:
                   - TUYỆT ĐỐI KHÔNG DÙNG: \\max_{...}, \\min_{...}, \\lim_{...}
                   - BẮT BUỘC DÙNG cấu trúc \\underset...{\\mathop...}:
                     + Max: \`\${ \\underset{[a;b]}{\\mathop{\\max }}\\, y }\$\`
                     + Min: \`\${ \\underset{[a;b]}{\\mathop{\\min }}\\, y }\$\`
                     + Lim: \`\${ \\underset{x \\to +\\infty}{\\mathop{\\lim }}\\, f(x) }\$\`

                 B. TÍCH PHÂN (INTEGRAL):
                   - BẮT BUỘC thêm \\limits sau \\int để cận nằm chính xác trên/dưới.
                   - Ví dụ ĐÚNG: \`\${ \\int\\limits_{0}^{1}{x dx} }\$\`
                   - Sai: \\int_{0}^{1}

                 C. DẤU NGOẶC (BRACKETS):
                   - BẮT BUỘC dùng \\left và \\right để ngoặc tự co giãn theo nội dung bên trong.
                   - Ví dụ: \`\${ \\left( \\frac{x+1}{x-1} \\right) }\$\` thay vì ( ... )
                   - Áp dụng cho cả ngoặc tròn (), ngoặc vuông [], ngoặc nhọn {}.

                 D. KÝ HIỆU ĐỘ (DEGREE):
                   - Viết trực tiếp \\circ sau số, KHÔNG dùng mũ ^.
                   - Ví dụ ĐÚNG: \`\${ 45\\circ }\$\`
                   - Sai: 45^\\circ hay 45^{\\circ}
                 
                 E. TÊN HÌNH HỌC: 
                   - Các ký hiệu tên hình như S.ABCD, A'B'C', (SAB)... phải được coi là công thức toán.
                   - Ví dụ: \`\${ S.ABCD }\$\`, \`\${ (SAB) }\$\`.

                F. SỐ ÂM (NEGATIVE NUMBERS):
                   - Các số âm đứng riêng lẻ (đặc biệt trong các đáp án A, B, C, D) PHẢI được đóng gói thành công thức toán để dấu trừ hiển thị đúng là dấu trừ toán học.
                   - Ví dụ: thay vì viết "-2", hãy viết \`\${ -2 }\$\`.
                   - Ví dụ: A. \`\${ -5 }\$\`
                   - Áp dụng cho cả phân số âm, số thập phân âm.

              3. XỬ LÝ HÌNH VẼ, ĐỒ THỊ, BẢNG BIẾN THIÊN:
                 - Khi gặp hình vẽ, đồ thị hoặc bảng biến thiên (nơi chứa thông tin dạng hình ảnh không thể chuyển thành text đơn thuần), hãy chèn tag sau vào đúng vị trí đó:
                 \`[[CHÈN_HÌNH]]\`
                 - Không cần mô tả hình, chỉ cần đặt tag để người dùng sau này chèn ảnh vào.

              4. ĐỊNH DẠNG:
                 - Giữ nguyên cấu trúc Câu 1, Câu 2...
                 - TUYỆT ĐỐI KHÔNG dùng định dạng in đậm Markdown (\`**\`) cho chữ "Câu 1", "Câu 2"... Chỉ viết text thường.
                 - Các đáp án trắc nghiệm A, B, C, D nên xuống dòng.
            `
          }
        ]
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Không thể xử lý file. Vui lòng thử lại sau.");
  }
};

export const geminiService = {
  processFile: processFileWithGemini,
};
