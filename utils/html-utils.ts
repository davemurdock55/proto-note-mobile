// Export the function so it can be imported elsewhere
export function extractContentFromHtml(html: string): string {
  if (!html) return "<p>Start writing...</p>";

  // If it's already just content (not a full HTML document)
  if (!html.includes("<html>") && !html.includes("<!DOCTYPE")) {
    return html;
  }

  try {
    // Extract content from between body tags if it exists
    const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1].trim();
    }

    // If no body tags, try to find content after the head section
    const headEndMatch = /<\/head>/i.exec(html);
    if (headEndMatch) {
      const contentAfterHead = html.substring(headEndMatch.index + 7);
      const htmlEndMatch = /<\/html>/i.exec(contentAfterHead);
      if (htmlEndMatch) {
        return contentAfterHead.substring(0, htmlEndMatch.index).trim();
      }
      return contentAfterHead.trim();
    }

    // If all else fails, return the original content
    return html;
  } catch (error) {
    console.warn("Error extracting content from HTML:", error);
    return html;
  }
}
