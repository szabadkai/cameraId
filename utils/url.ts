/**
 * Ensures a URL string has a protocol (https://).
 * If the URL is empty or invalid, it returns a non-navigable link target ('#').
 * @param url The URL string to format.
 * @returns A valid URL string with a protocol or '#' for invalid input.
 */
export const formatUrl = (url?: string): string => {
  if (!url || url.trim() === '') {
    return '#';
  }
  
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  
  return `https://${trimmedUrl}`;
};
