import { supabase } from '../utils/supabase';

const BUCKET = 'equipment-documents';
const MAX_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

/** Upload a PDF for an equipment record; returns a public URL. */
export async function uploadEquipmentPdf(
  equipmentId: string,
  file: File
): Promise<string> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are allowed.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('PDF must be 10 MB or smaller.');
  }

  const path = `${equipmentId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Could not resolve document URL.');
  return data.publicUrl;
}
