/** sessionStorage key holding the text of the announcement the visitor closed this session. */
export const ANNOUNCEMENT_DISMISSED_KEY = "announcement-dismissed";

/**
 * Inline script for the layout (next/script, beforeInteractive): marks <html data-announcement-dismissed> before
 * the first paint when this exact announcement was closed this session, so CSS hides the bar at once. Without it
 * the server-rendered bar showed, then disappeared at hydration and the page jumped (CLS 0.11 on slow phones).
 * The text is our own API content, embedded as a JSON string with `<` escaped (it can't close the script tag).
 */
export function announcementScript(text: string): string {
  const value = JSON.stringify(text).replace(/</g, "\\u003c");
  const key = JSON.stringify(ANNOUNCEMENT_DISMISSED_KEY);
  return `try{if(sessionStorage.getItem(${key})===${value})document.documentElement.dataset.announcementDismissed=""}catch(e){}`;
}
