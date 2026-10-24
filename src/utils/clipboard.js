/**
 * Robust cross-platform clipboard copy helper with WebView and insecure context fallbacks.
 */
export async function copyText(text) {
  if (!text) return false;

  // 1. Modern navigator.clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // 2. Fallback using hidden textarea & document.execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Native mobile share with clipboard copy fallback.
 */
export async function shareOrCopy({ title, text }) {
  if (navigator?.share) {
    try {
      await navigator.share({ title, text });
      return { shared: true, copied: false };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { shared: false, copied: false, cancelled: true };
      }
      // Fall through to clipboard copy
    }
  }

  const copied = await copyText(text);
  return { shared: false, copied, cancelled: false };
}
