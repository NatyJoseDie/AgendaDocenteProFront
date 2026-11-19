export const DOCUMENT_ACCEPT_ATTRIBUTE = '.pdf,.doc,.docx,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';

const DOCUMENT_ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp'
]);

const DOCUMENT_ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp'
]);

export function isAllowedDocumentFile(file, maxSizeBytes = 15 * 1024 * 1024) {
  if (!file) {
    return { valid: false, message: 'No se seleccionó ningún archivo.' };
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, message: 'El archivo no puede superar los 20MB.' };
  }

  const mimeType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';

  if (DOCUMENT_ALLOWED_TYPES.has(mimeType) || DOCUMENT_ALLOWED_EXTENSIONS.has(extension)) {
    return { valid: true, message: '' };
  }

  return {
    valid: false,
    message: 'Solo se aceptan archivos PDF, DOC, DOCX, JPG, PNG o WEBP.'
  };
}
