/**
 * Convert stored HTML (legacy job descriptions) into plain-text blocks for safe rendering.
 * We never inject stored HTML into the page; React escapes the resulting strings.
 */
export function htmlToBlocks(html: string): { type: "p" | "li"; text: string }[] {
  const decoded = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<li[^>]*>/gi, "\n\u0000li ")
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

  return decoded
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.startsWith("\u0000li ") ? { type: "li" as const, text: line.slice(4).trim() } : { type: "p" as const, text: line },
    )
    .filter((b) => b.text.length > 0);
}

/** Only allow http(s) links from stored data (blocks javascript:, data: …). */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
