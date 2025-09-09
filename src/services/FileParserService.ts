import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

// Extend Window interface for PDF.js
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export interface ParsedContent {
  text: string;
  filename: string;
  type: string;
}

export class FileParserService {
  static async parseFile(file: File): Promise<ParsedContent> {
    const filename = file.name;
    const extension = filename.split('.').pop()?.toLowerCase();

    try {
      let text: string;

      switch (extension) {
        case 'pdf':
          text = await this.parsePDF(file);
          break;
        case 'xlsx':
        case 'xls':
          text = await this.parseExcel(file);
          break;
        case 'docx':
          text = await this.parseWord(file);
          break;
        case 'txt':
          text = await this.parseText(file);
          break;
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }

      return {
        text: text.trim(),
        filename,
        type: extension || 'unknown'
      };
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error(`Failed to parse ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async parsePDF(file: File): Promise<string> {
    try {
      // Load PDF.js dynamically
      if (typeof window !== 'undefined' && !window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
        
        // Configure worker
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText;
    } catch (error) {
      throw new Error('Failed to parse PDF file. Please ensure it contains readable text.');
    }
  }

  private static async parseExcel(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let fullText = '';
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetText = XLSX.utils.sheet_to_txt(worksheet);
      fullText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
    });
    
    return fullText;
  }

  private static async parseWord(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  private static async parseText(file: File): Promise<string> {
    return await file.text();
  }

  static getSupportedFormats(): string[] {
    return ['.pdf', '.xlsx', '.xls', '.docx', '.txt'];
  }

  static isFileSupported(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return this.getSupportedFormats().some(format => format.slice(1) === extension);
  }
}