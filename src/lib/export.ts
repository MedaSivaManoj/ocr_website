import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Export text as a plain text file
 */
export function exportAsText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${filename}.txt`);
}

/**
 * Export text as a searchable PDF
 */
export function exportAsPDF(text: string, filename: string): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // PDF settings
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 6;
  let yPosition = margin;

  // Set font
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);

  // Split text into lines that fit the page width
  const lines = pdf.splitTextToSize(text, maxWidth);

  lines.forEach((line: string) => {
    // Check if we need a new page
    if (yPosition > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.text(line, margin, yPosition);
    yPosition += lineHeight;
  });

  pdf.save(`${filename}.pdf`);
}

/**
 * Export text as a DOCX file
 */
export async function exportAsDOCX(text: string, filename: string): Promise<void> {
  // Split text into paragraphs
  const paragraphs = text.split('\n').filter(p => p.trim()).map(
    (paragraphText) =>
      new Paragraph({
        children: [
          new TextRun({
            text: paragraphText,
            size: 24, // 12pt
            font: 'Calibri',
          }),
        ],
        spacing: {
          after: 200,
        },
      })
  );

  // If no paragraphs, add the full text as one
  if (paragraphs.length === 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: text || ' ',
            size: 24,
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
