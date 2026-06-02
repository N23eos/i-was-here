import QRCode from 'qrcode'

// QR claim-ссылки → PNG data URL (для экрана и встраивания в PDF).
export async function qrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
  })
}

// PNG-байты QR (для pdf-lib embedPng).
export async function qrPngBytes(url: string): Promise<Uint8Array> {
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
  })
}
