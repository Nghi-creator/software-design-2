import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key' });

type AiSummaryDependencies = {
  extractPdfText: (pdfBuffer: Buffer) => Promise<string>;
  generateContent: (prompt: string) => Promise<string | undefined>;
};

const defaultAiSummaryDependencies: AiSummaryDependencies = {
  extractPdfText: async (pdfBuffer) => {
    const parser = new PDFParse({ data: pdfBuffer });
    const data = await parser.getText();

    return data.text;
  },
  generateContent: async (prompt) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    return response.text;
  }
};

export const cleanPdfText = (text: string) => {
  return text
    .replace(/\u0000/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const generateWorkshopSummary = async (
  pdfBuffer: Buffer,
  dependencies: AiSummaryDependencies = defaultAiSummaryDependencies
): Promise<string> => {
  try {
    const text = cleanPdfText(await dependencies.extractPdfText(pdfBuffer));

    const summary = await dependencies.generateContent(
      `Tóm tắt nội dung sau để dùng làm mô tả cho workshop sinh viên (ngắn gọn, thu hút, khoảng 3-4 câu):\n\n${text}`
    );

    return summary || 'Không thể tạo tóm tắt.';
  } catch (error) {
    console.error('AI Summary Error:', error);
    return 'Lỗi khi tạo tóm tắt tự động.';
  }
};
