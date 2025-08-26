import JSZip from 'jszip';
import { saveExportState } from './staticExportUtils';
import { createZipFromBuild } from './createZipFromBuild';
import { createDebugZip } from './debugZipExport';

interface BuildProgress {
  status: 'idle' | 'building' | 'zipping' | 'complete' | 'error';
  message: string;
  progress?: number;
}

export async function createStaticBuild(
  exportState: any,
  onProgress?: (progress: BuildProgress) => void
): Promise<Blob> {
  // First, save the export state for the build process
  saveExportState(exportState);
  
  // Use the production build approach
  return createZipFromBuild(exportState, onProgress);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}