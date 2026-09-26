const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Escapes raw text as HTML, then re-applies **bold** markdown as <strong> tags.
 * Use this for any AI-generated interpretation_text passed to dangerouslySetInnerHTML.
 */
export function formatInterpretationHtml(text: string, strongClassName = 'text-primary-600'): string {
  return escapeHtml(text).replace(
    /\*\*(.*?)\*\*/g,
    `<strong class="${strongClassName}">$1</strong>`
  );
}
