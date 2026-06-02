import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { qrPngBytes } from './qr'

// Лист стикеров A4: сетка QR с подписью события. Печать → резать → клеить.
// 2 колонки × 3 ряда = 6 стикеров/страница. QR ~150pt (~5.3см, хорошо сканится).
const PAGE_W = 595.28 // A4 pt
const PAGE_H = 841.89
const COLS = 2
const ROWS = 3
const PER_PAGE = COLS * ROWS
const QR_SIZE = 150
const MARGIN = 40

export async function buildStickerSheet(
  eventName: string,
  urls: string[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Предрендерим QR PNG-ы (embedPng переиспользует одинаковые объекты не нужно — у нас разные).
  const cellW = (PAGE_W - 2 * MARGIN) / COLS
  const cellH = (PAGE_H - 2 * MARGIN) / ROWS

  for (let i = 0; i < urls.length; i++) {
    if (i % PER_PAGE === 0) pdf.addPage([PAGE_W, PAGE_H])
    const page = pdf.getPage(pdf.getPageCount() - 1)

    const idx = i % PER_PAGE
    const col = idx % COLS
    const row = Math.floor(idx / COLS)

    const cellX = MARGIN + col * cellW
    // y отсчитывается снизу: верхний ряд = больший y.
    const cellTop = PAGE_H - MARGIN - row * cellH

    const png = await pdf.embedPng(await qrPngBytes(urls[i]))
    const qrX = cellX + (cellW - QR_SIZE) / 2
    const qrY = cellTop - QR_SIZE - 24
    page.drawImage(png, { x: qrX, y: qrY, width: QR_SIZE, height: QR_SIZE })

    // Подпись события над QR.
    const title = truncate(eventName, 28)
    const tW = fontBold.widthOfTextAtSize(title, 12)
    page.drawText(title, {
      x: cellX + (cellW - tW) / 2,
      y: cellTop - 16,
      size: 12,
      font: fontBold,
      color: rgb(0, 0, 0),
    })

    // Подпись «Scan to claim» под QR.
    const sub = 'Scan to claim your badge'
    const sW = font.widthOfTextAtSize(sub, 9)
    page.drawText(sub, {
      x: cellX + (cellW - sW) / 2,
      y: qrY - 14,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
  }

  return pdf.save()
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}
