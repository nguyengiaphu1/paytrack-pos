'use client';

/**
 * Shared client-side clipboard, file download, and DOM-to-PNG capture/share helpers.
 * Keeps `html-to-image` strictly dynamically imported so it never bloats the initial bundle.
 */

export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!ok) {
    throw new Error('Clipboard unavailable');
  }
}

export function triggerDataUrlDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface RenderedPngResult {
  dataUrl: string;
  blob: Blob;
}

export async function captureElementAsPng(
  element: HTMLElement | null,
  options?: { pixelRatio?: number; backgroundColor?: string }
): Promise<RenderedPngResult | null> {
  if (!element) return null;
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(element, {
    pixelRatio: options?.pixelRatio ?? 2,
    backgroundColor: options?.backgroundColor ?? '#FFFFFF',
    cacheBust: true,
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return { dataUrl, blob };
}

export type ShareOrDownloadOutcome = 'shared' | 'downloaded' | 'aborted';

export async function shareOrDownloadElementPng(params: {
  element: HTMLElement | null;
  downloadFilename: string;
  shareFilename?: string;
  title: string;
  text: string;
}): Promise<ShareOrDownloadOutcome | null> {
  const rendered = await captureElementAsPng(params.element);
  if (!rendered) return null;

  const file = new File([rendered.blob], params.shareFilename ?? params.downloadFilename, {
    type: 'image/png',
  });

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: params.title,
        text: params.text,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'aborted';
      }
      throw err;
    }
  }

  triggerDataUrlDownload(rendered.dataUrl, params.downloadFilename);
  return 'downloaded';
}
