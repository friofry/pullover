import { GraphqlResponseError } from '@octokit/graphql'

function messagesOf(error: unknown): string[] {
  const texts: string[] = []
  // Both, deliberately. A GraphQL restriction carries the org in `errors`, and
  // `message` is only a join of those — but the same restriction can arrive as
  // a plain 403 whose sole copy of the text is `message`. The overlap costs
  // nothing: the caller collects into a Set.
  if (error instanceof Error) texts.push(error.message)
  if (error instanceof GraphqlResponseError) {
    for (const entry of error.errors ?? []) texts.push(entry.message)
  }
  return texts
}

/** Orgs GitHub named in an OAuth-app restriction error, sorted for stable copy. */
export function restrictedOrganizations(error: unknown): string[] {
  const orgs = new Set<string>()
  const pattern = /the `([^`]+)` organization has enabled OAuth App access restrictions/gi
  for (const text of messagesOf(error)) {
    for (const match of text.matchAll(pattern)) {
      const org = match[1]
      if (org !== undefined) orgs.add(org)
    }
  }
  return [...orgs].sort()
}

/** Union of org names, deduplicated and sorted so the warning copy is stable. */
export function mergeOrgs(...lists: string[][]): string[] {
  return [...new Set(lists.flat())].sort()
}

/** The payload @octokit/graphql stashes when it throws on a partial GraphQL response. */
export function graphqlPartialData(error: unknown): unknown {
  return error instanceof GraphqlResponseError ? error.data : null
}

export function formatRestrictedOrgs(orgs: string[]): string | null {
  if (orgs.length === 0) return null
  if (orgs.length === 1) return `${orgs[0]} hasn't approved Pullover`
  if (orgs.length === 2) return `${orgs[0]} and ${orgs[1]} haven't approved Pullover`
  return `${orgs.slice(0, -1).join(', ')} and ${orgs.at(-1)} haven't approved Pullover`
}
