import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker for pdfjs-dist v3.x
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface PDFPage {
  pageNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

export interface PDFExtractionResult {
  pages: PDFPage[];
  totalPages: number;
}

/**
 * Convert PDF pages to high-resolution images for OCR
 * Uses 2x scale for better accuracy
 */
export async function extractPDFPages(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PDFExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pages: PDFPage[] = [];

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.((i - 1) / totalPages);
    
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better OCR accuracy
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    const imageDataUrl = canvas.toDataURL('image/png');
    
    pages.push({
      pageNumber: i,
      imageDataUrl,
      width: viewport.width,
      height: viewport.height,
    });

    onProgress?.(i / totalPages);
  }

  return { pages, totalPages };
}

/**
 * Check if a file is a PDF
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
