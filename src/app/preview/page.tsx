import { notFound } from 'next/navigation';
import { GlassmorphismPreviewStudio } from '@/components/preview/GlassmorphismPreviewStudio';

export default function PreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <GlassmorphismPreviewStudio />;
}
