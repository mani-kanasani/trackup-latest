// Reading text out of an uploaded document.
//
// Two decisions worth knowing about.
//
// 1. The libraries are imported lazily. This app ships four runtime
//    dependencies on purpose, and pdfjs plus mammoth together are larger than
//    everything else combined. A static import would put them in the main
//    bundle for every user, including the ones who never upload anything.
//    Dynamic import lets Vite split them into chunks fetched only when someone
//    actually picks a file.
//
// 2. The result is always shown to the person before it is used. PDF text
//    extraction reorders tables: extracting the personal-injury blueprint this
//    was built against produced a failure-scenario table whose rows and
//    solutions no longer lined up. Feeding that straight to a model would
//    silently pair the wrong scenario with the wrong fix, so extraction fills a
//    textarea to be read rather than being consumed on the spot.

export type SupportedKind = 'pdf' | 'docx' | 'text';

export interface ExtractedFile {
  text: string;
  kind: SupportedKind;
  /** Pages read, for PDFs. Useful when a scan yields nothing. */
  pages?: number;
  /** Something the person needs to check before trusting the text. */
  warning?: string;
}

/** 10 MB, matching the case-study upload limit. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const kindOf = (file: File): SupportedKind | null => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (
    name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (/\.(txt|md|markdown|csv)$/.test(name) || file.type.startsWith('text/')) return 'text';
  return null;
};

const readPdf = async (file: File): Promise<ExtractedFile> => {
  const pdfjs = await import('pdfjs-dist');
  // Vite resolves this to a real asset URL at build time. Without it pdfjs
  // reaches for a CDN, which a strict self-hosted deployment will block.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const parts: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const line = content.items
      .map((i) => ('str' in i ? i.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (line) parts.push(line);
  }
  const text = parts.join('\n\n').trim();

  return {
    text,
    kind: 'pdf',
    pages: doc.numPages,
    warning: !text
      ? 'No text came out of that PDF. It is probably a scan, which needs OCR rather than extraction. Paste the text instead.'
      : 'PDF extraction flattens tables, so rows can end up separated from the columns they belong to. Read it before building the brief.',
  };
};

const readDocx = async (file: File): Promise<ExtractedFile> => {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const text = (value ?? '').replace(/\n{3,}/g, '\n\n').trim();
  return {
    text,
    kind: 'docx',
    warning: text ? undefined : 'That document appears to hold no text.',
  };
};

const readPlain = async (file: File): Promise<ExtractedFile> => ({
  text: (await file.text()).trim(),
  kind: 'text',
});

/**
 * Text out of a PDF, Word document or plain text file.
 *
 * Throws with a sentence a person can act on. Every failure here is one
 * somebody will hit while trying to get on with something else, so "Unsupported
 * MIME type" is not an acceptable answer.
 */
export const extractTextFromFile = async (file: File): Promise<ExtractedFile> => {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the 10 MB limit. Upload a smaller one.`,
    );
  }
  const kind = kindOf(file);
  if (!kind) {
    throw new Error(
      `Cannot read ${file.name}. Upload a PDF, a Word .docx, or a plain text file, or paste the text instead.`,
    );
  }

  try {
    if (kind === 'pdf') return await readPdf(file);
    if (kind === 'docx') return await readDocx(file);
    return await readPlain(file);
  } catch (err) {
    // A .docx that is really an old .doc, an encrypted PDF, a truncated
    // download. The library error is meaningless to the person holding the file.
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not read ${file.name}. It may be password protected, corrupted, or saved in an older format. ` +
        `Paste the text instead. (${detail.slice(0, 120)})`,
    );
  }
};
