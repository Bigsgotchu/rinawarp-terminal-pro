/**
 * String Utilities
 * Common string manipulation and comparison functions
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1
 * @param {string} str2
 * @returns {number} The edit distance
 */
export function levenshteinDistance(str1, str2) {
  const matrix = [];

  // Initialize first row and column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 * @param {string} str1
 * @param {string} str2
 * @returns {number} Similarity ratio
 */
export function stringSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

/**
 * Convert string to camelCase
 * @param {string} str
 * @returns {string}
 */
export function toCamelCase(str) {
  return str
    .replace(/[_-](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (_, char) => char.toLowerCase());
}

/**
 * Convert string to kebab-case
 * @param {string} str
 * @returns {string}
 */
export function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to snake_case
 * @param {string} str
 * @returns {string}
 */
export function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Truncate string with ellipsis
 * @param {string} str
 * @param {number} maxLength
 * @param {string} suffix
 * @returns {string}
 */
export function truncate(str, maxLength, suffix = '...') {
  if (str.length <= maxLength) return str;

  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Escape special regex characters
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a fuzzy regex pattern from input
 * @param {string} input
 * @returns {RegExp}
 */
export function fuzzyRegex(input) {
  const pattern = input
    .split('')
    .map(char => escapeRegex(char))
    .join('.*?');

  return new RegExp(pattern, 'i');
}

/**
 * Highlight matches in text
 * @param {string} text
 * @param {string} query
 * @param {string} openTag
 * @param {string} closeTag
 * @returns {string}
 */
export function highlightMatches(text, query, openTag = '<mark>', closeTag = '</mark>') {
  if (!query) return text;

  const regex = fuzzyRegex(query);
  const match = text.match(regex);

  if (!match) return text;

  let result = '';
  let lastIndex = 0;
  let queryIndex = 0;

  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i].toLowerCase() === query[queryIndex].toLowerCase()) {
      result += text.slice(lastIndex, i) + openTag + text[i] + closeTag;
      lastIndex = i + 1;
      queryIndex++;
    }
  }

  result += text.slice(lastIndex);
  return result;
}

/**
 * Parse command line into tokens
 * @param {string} commandLine
 * @returns {Array<string>}
 */
export function parseCommandLine(commandLine) {
  const tokens = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  let escaped = false;

  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
      continue;
    }

    if (char === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = '';
      continue;
    }

    if (char === ' ' && !inQuote) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Format bytes to human readable string
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration to human readable string
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}
