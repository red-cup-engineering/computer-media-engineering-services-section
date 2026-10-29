/**
 * Shared types for Lantern, mirroring the data model sketched in DESIGN.md. Pure type
 * declarations only — `erasableSyntaxOnly` friendly, no runtime code, no `enum`.
 */

 // wing-relative, forward-slashed path — e.g. "glossary/terms/atari.md"

/** Anki-style four-button self-grade, DESIGN.md §2. 1=Again, 2=Hard, 3=Good, 4=Easy. */

/** Frontmatter values as the hand-rolled parser (frontmatter.mts) produces them: every key
 * maps to either a single scalar string or a flat list of strings. Nested maps (e.g. this
 * corpus's `references:` block) are deliberately not represented — see DESIGN.md §7. */

   

    

  

export const DEFAULT_ATTRIBUTE_FIELDS = ['cites', 'type', 'tags'];
export const DEFAULT_EXCLUDE_FIELDS = ['cites', 'references', 'defines', 'aliases', 'teaches'];
