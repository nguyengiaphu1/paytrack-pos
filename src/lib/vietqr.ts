import { stripVietnamese } from './vietnamese';

export interface BankOption {
  bin: string;
  shortName: string;
  name: string;
}

export const VIETNAM_BANKS: BankOption[] = [
  { bin: '970436', shortName: 'Vietcombank', name: 'Ngân hàng Ngoại thương (VCB)' },
  { bin: '970415', shortName: 'VietinBank', name: 'Ngân hàng Công thương (CTG)' },
  { bin: '970418', shortName: 'BIDV', name: 'Ngân hàng Đầu tư và Phát triển' },
  { bin: '970405', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp (VBA)' },
  { bin: '970407', shortName: 'Techcombank', name: 'Ngân hàng Kỹ thương (TCB)' },
  { bin: '970422', shortName: 'MB Bank', name: 'Ngân hàng Quân đội (MB)' },
  { bin: '970416', shortName: 'ACB', name: 'Ngân hàng Á Châu (ACB)' },
  { bin: '970432', shortName: 'VPBank', name: 'Ngân hàng Việt Nam Thịnh Vượng' },
  { bin: '970423', shortName: 'TPBank', name: 'Ngân hàng Tiên Phong' },
  { bin: '970403', shortName: 'Sacombank', name: 'Ngân hàng Sài Gòn Thương Tín' },
  { bin: '970441', shortName: 'VIB', name: 'Ngân hàng Quốc tế (VIB)' },
  { bin: '970437', shortName: 'HDBank', name: 'Ngân hàng Phát triển TP.HCM' },
  { bin: '970448', shortName: 'OCB', name: 'Ngân hàng Phương Đông' },
  { bin: '970443', shortName: 'SHB', name: 'Ngân hàng Sài Gòn - Hà Nội' },
  { bin: '970426', shortName: 'MSB', name: 'Ngân hàng Hàng Hải' },
  { bin: '970454', shortName: 'VietCapital', name: 'Ngân hàng Bản Việt (BVBank)' },
  { bin: '970431', shortName: 'Eximbank', name: 'Ngân hàng Xuất Nhập Khẩu' },
  { bin: '970429', shortName: 'SCB', name: 'Ngân hàng Sài Gòn' },
  { bin: '970440', shortName: 'SeABank', name: 'Ngân hàng Đông Nam Á' },
  { bin: '970428', shortName: 'Nam A Bank', name: 'Ngân hàng Nam Á' },
];

export interface VietQRInput {
  bankBin: string;
  accountNo: string;
  amount: number;
  memo: string;
}

function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function sanitizeVietQRMemo(rawMemo: string): string {
  const ascii = stripVietnamese(rawMemo)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (ascii || 'PAYTRACK').slice(0, 25);
}

/**
 * CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) required by EMVCo Tag 63.
 */
export function computeCRC16CCITT(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildVietQRPayload(input: VietQRInput): string {
  const bin = input.bankBin.replace(/\D/g, '').trim();
  const accountNo = input.accountNo.replace(/\s+/g, '').trim();

  if (!/^\d{6}$/.test(bin)) {
    throw new Error('Mã BIN ngân hàng phải gồm đúng 6 chữ số');
  }
  if (!accountNo || accountNo.length > 19) {
    throw new Error('Số tài khoản ngân hàng không hợp lệ');
  }

  const intAmount = Math.round(input.amount);
  if (!Number.isFinite(intAmount) || intAmount <= 0) {
    throw new Error('Số tiền QR phải lớn hơn 0đ');
  }

  const cleanMemo = sanitizeVietQRMemo(input.memo);

  // Tag 38: Napas 247 Merchant Account Information
  const bankInfo = tlv('00', bin) + tlv('01', accountNo);
  const napasAccount =
    tlv('00', 'A000000727') +
    tlv('01', bankInfo) +
    tlv('02', 'QRIBFTTA');

  // Tag 62: Additional Data Field (Purpose of transaction)
  const additionalData = tlv('08', cleanMemo);

  const withoutCRC =
    tlv('00', '01') +
    tlv('01', '12') + // 12 = Dynamic QR
    tlv('38', napasAccount) +
    tlv('53', '704') + // 704 = VND
    tlv('54', String(intAmount)) +
    tlv('58', 'VN') +
    tlv('62', additionalData) +
    '6304';

  const crc = computeCRC16CCITT(withoutCRC);
  return `${withoutCRC}${crc}`;
}
