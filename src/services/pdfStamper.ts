import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface WatermarkOptions {
  pdfBuffer: Buffer;
  text: string;
  opacity?: number;
  color?: 'red' | 'gray' | 'blue';
  fontSize?: number;
}

export class PdfStamperService {
  private static instance: PdfStamperService | null = null;

  public static getInstance(): PdfStamperService {
    if (!PdfStamperService.instance) {
      PdfStamperService.instance = new PdfStamperService();
    }
    return PdfStamperService.instance;
  }

  /**
   * Applies a diagonal, semi-transparent watermark across all pages of a PDF document.
   */
  public async applyWatermark(options: WatermarkOptions): Promise<Buffer> {
    const {
      pdfBuffer,
      text,
      opacity = 0.15,
      color = 'red',
      fontSize = 54,
    } = options;

    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    let colorRgb = rgb(0.85, 0.1, 0.1); // default red
    if (color === 'gray') {
      colorRgb = rgb(0.4, 0.4, 0.4);
    } else if (color === 'blue') {
      colorRgb = rgb(0.1, 0.3, 0.85);
    }

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    for (const page of pages) {
      const { width, height } = page.getSize();
      // Center position adjusted for 45-degree rotation
      const x = width / 2 - (textWidth / 2) * Math.cos(Math.PI / 4);
      const y = height / 2 - (textWidth / 2) * Math.sin(Math.PI / 4) + textHeight;

      page.drawText(text, {
        x: Math.max(20, x),
        y: Math.max(20, y),
        size: fontSize,
        font,
        color: colorRgb,
        opacity: Math.min(Math.max(opacity, 0.05), 0.8),
        rotate: degrees(45),
      });
    }

    const modifiedBytes = await pdfDoc.save();
    return Buffer.from(modifiedBytes);
  }
}

export const pdfStamperService = PdfStamperService.getInstance();
