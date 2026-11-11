import QRCode from 'qrcode';

export interface GenerateQrOptions {
  text: string;
  size?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

export class QrService {
  private static instance: QrService | null = null;

  public static getInstance(): QrService {
    if (!QrService.instance) {
      QrService.instance = new QrService();
    }
    return QrService.instance;
  }

  /**
   * Generates a high-resolution, scannable PNG QR code buffer.
   */
  public async generatePngBuffer(options: GenerateQrOptions): Promise<Buffer> {
    const {
      text,
      size = 512,
      darkColor = '#000000',
      lightColor = '#ffffff',
      errorCorrection = 'M',
    } = options;

    return QRCode.toBuffer(text, {
      type: 'png',
      width: size,
      margin: 2,
      color: {
        dark: darkColor,
        light: lightColor,
      },
      errorCorrectionLevel: errorCorrection,
    });
  }

  /**
   * Generates an SVG string of the QR code.
   */
  public async generateSvg(options: GenerateQrOptions): Promise<string> {
    const {
      text,
      size = 512,
      darkColor = '#000000',
      lightColor = '#ffffff',
      errorCorrection = 'M',
    } = options;

    return QRCode.toString(text, {
      type: 'svg',
      width: size,
      margin: 2,
      color: {
        dark: darkColor,
        light: lightColor,
      },
      errorCorrectionLevel: errorCorrection,
    });
  }
}

export const qrService = QrService.getInstance();
