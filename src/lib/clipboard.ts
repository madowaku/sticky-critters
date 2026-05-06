/**
 * Copy text to clipboard.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    console.warn("[clipboard] Failed to copy text");
    return false;
  }
}
