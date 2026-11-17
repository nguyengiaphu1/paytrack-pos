import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PayTrack POS — Sổ bán hàng & Công nợ',
    short_name: 'PayTrack POS',
    description:
      'Quản lý bán hàng POS, ghi nợ khách quen, nhắc thu nợ đa thiết bị, VietQR động và hóa đơn điện tử.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F9FA',
    theme_color: '#0E6B4E',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
