import { GoogleGenAI } from '@google/genai';
const pdfParse = require('pdf-parse');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key' });

export const generateWorkshopSummary = async (pdfBuffer: Buffer): Promise<string> => {
  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Tóm tắt nội dung sau để dùng làm mô tả cho workshop sinh viên (ngắn gọn, thu hút, khoảng 3-4 câu):\n\n${text}`
    });

    return response.text || 'Không thể tạo tóm tắt.';
  } catch (error) {
    console.error('AI Summary Error:', error);
    return 'Lỗi khi tạo tóm tắt tự động.';
  }
};
