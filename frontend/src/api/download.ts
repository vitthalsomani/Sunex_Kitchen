import { api } from './client';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** GET a CSV (or any file) endpoint with auth and trigger a browser download. */
export async function downloadCsv(
  path: string,
  filename: string,
  params?: Record<string, unknown>,
) {
  const res = await api.get(path, { responseType: 'blob', params });
  downloadBlob(res.data as Blob, filename);
}
