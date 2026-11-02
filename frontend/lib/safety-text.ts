/** Restore paragraphs lost when PowerPoint text runs were joined during import.
 * Already formatted/admin-authored text keeps its exact line breaks.
 */
export function formatSafetyText(text:string):string {
  if (text.includes('\n')) return text;
  return text
    .replace(/(\d{1,2})\.\s*(?=อัตรา|จำนวน)/g, '\n\n$1. ')
    .replace(/\s*(ไตร(?:มาส|\s*มาส|\s*มาม)?\s*[1-4]\s*=)/g, '\n$1')
    .trim();
}
