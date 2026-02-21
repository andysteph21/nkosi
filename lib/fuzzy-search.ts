/**
 * Compute the Levenshtein distance between two strings.
 * This measures the minimum number of single-character edits
 * (insertions, deletions, substitutions) to transform one string into another.
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length

  // Quick exit for trivial cases
  if (aLen === 0) return bLen
  if (bLen === 0) return aLen

  // Use a single-row DP approach for memory efficiency
  let previousRow = Array.from({ length: bLen + 1 }, (_, i) => i)

  for (let i = 1; i <= aLen; i++) {
    const currentRow = [i]
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      currentRow[j] = Math.min(
        currentRow[j - 1] + 1,        // insertion
        previousRow[j] + 1,            // deletion
        previousRow[j - 1] + cost      // substitution
      )
    }
    previousRow = currentRow
  }

  return previousRow[bLen]
}

/**
 * Determine the maximum allowed edit distance based on term length.
 * - 1-3 chars: exact match only (0)
 * - 4-6 chars: tolerate 1 mistake
 * - 7+ chars: tolerate 2 mistakes
 */
function maxDistanceForLength(length: number): number {
  if (length <= 3) return 0
  if (length <= 6) return 1
  return 2
}

/**
 * Check if a query term fuzzy-matches a target string.
 * Normalizes both strings (lowercase, trimmed) before comparing.
 * First tries substring inclusion (fast path), then falls back to
 * Levenshtein distance on individual words.
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const normalizedQuery = query.toLowerCase().trim()
  const normalizedTarget = target.toLowerCase().trim()

  if (!normalizedQuery) return true

  // Fast path: exact substring match
  if (normalizedTarget.includes(normalizedQuery)) return true

  // Split query into individual terms for word-level matching
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean)
  const targetWords = normalizedTarget.split(/\s+/).filter(Boolean)

  // Every query term must match at least one target word
  return queryTerms.every((term) => {
    const maxDist = maxDistanceForLength(term.length)

    // Check if any target word is close enough to this query term
    return targetWords.some((word) => {
      // Substring check on individual word
      if (word.includes(term) || term.includes(word)) return true

      // Levenshtein distance check
      return levenshteinDistance(term, word) <= maxDist
    })
  })
}

/**
 * Search a list of string fields for a fuzzy match against a query.
 * Returns true if any of the fields match.
 */
export function fuzzyMatchAny(query: string, fields: string[]): boolean {
  return fields.some((field) => fuzzyMatch(query, field))
}
