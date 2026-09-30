import { createRequire } from 'node:module';

interface PdfDocumentInstance {
  on(event: 'data', listener: (chunk: Buffer) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  addPage(): this;
  fontSize(size: number): this;
  text(text: string, options?: { continued?: boolean }): this;
  moveDown(lines?: number): this;
  fillColor(color: string): this;
  image(source: Buffer, options?: { fit?: [number, number]; align?: string }): this;
  end(): void;
}

interface PdfDocumentConstructor {
  new (options: { size: string; margin: number }): PdfDocumentInstance;
}

interface QrCodeModule {
  toDataURL(text: string): Promise<string>;
}

const loadModule = createRequire(__filename);
const PDFDocument = loadModule('pdfkit') as PdfDocumentConstructor;
const QRCode = loadModule('qrcode') as QrCodeModule;

export interface LabelInput {
  name: string;
  item: string;
  allergens: string[];
  orderId: string;
}

export interface LabelRenderResult {
  pdf: Buffer;
  zpl: string;
}

function renderPdf(batchId: string, labels: LabelInput[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    (async () => {
      for (const [index, label] of labels.entries()) {
        if (index > 0) {
          doc.addPage();
        }
        doc.fontSize(18).text(label.name, { continued: false });
        doc.moveDown(0.5);
        doc.fontSize(14).text(label.item);
        doc.moveDown(0.25);
        doc.fontSize(10).fillColor('#555555').text(`Allergens: ${label.allergens.join(', ') || 'None'}`);
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#000000').text(`Batch: ${batchId}`);
        doc.moveDown(0.25);
        doc.text(`Order: ${label.orderId}`);
        try {
          const qr = await QRCode.toDataURL(label.orderId);
          const data = qr.replace(/^data:image\/png;base64,/, '');
          const buffer = Buffer.from(data, 'base64');
          doc.image(buffer, { fit: [96, 96], align: 'left' });
        } catch (error) {
          doc.fontSize(8).fillColor('#ff0000').text('QR code unavailable');
        }
      }

      doc.end();
    })().catch(reject);
  });
}

function renderZpl(batchId: string, labels: LabelInput[]): string {
  return labels
    .map((label) => {
      return [
        '^XA',
        '^CI28',
        '^PW812',
        '^LH0,0',
        `^FO40,40^ADN,36,20^FD${label.name}^FS`,
        `^FO40,100^ADN,28,14^FD${label.item}^FS`,
        `^FO40,150^ADN,18,10^FDAllergens: ${label.allergens.join(', ') || 'None'}^FS`,
        `^FO40,200^ADN,18,10^FDBatch: ${batchId}^FS`,
        `^FO40,240^ADN,18,10^FDOrder: ${label.orderId}^FS`,
        `^FO500,80^BQN,2,6^FDQA,${label.orderId}^FS`,
        '^XZ'
      ].join('\n');
    })
    .join('\n');
}

export async function generateBatchLabels(batchId: string, labels: LabelInput[]): Promise<LabelRenderResult> {
  const pdf = await renderPdf(batchId, labels);
  const zpl = renderZpl(batchId, labels);
  return { pdf, zpl };
}
