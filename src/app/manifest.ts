import type { MetadataRoute } from 'next';
import { THEME_COLOR_LIGHT } from '@/lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PayTrack POS',
    short_name: 'PayTrack',
    description: 'Sổ bán hàng, công nợ và VietQR cho cửa hàng bán lẻ.',
    start_url: '/',
    display: 'standalone',
    background_color: THEME_COLOR_LIGHT,
    theme_color: '#0E6B4E',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
