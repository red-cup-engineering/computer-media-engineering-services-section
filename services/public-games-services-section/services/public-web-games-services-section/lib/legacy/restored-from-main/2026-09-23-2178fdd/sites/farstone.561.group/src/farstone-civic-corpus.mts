/** Operating facts recovered from the PyFars civic corpus as live world claims. */
const offices = [
  ["farston-mayor", "mayor", ["executive-coordination", "emergency-session"]],
  ["farston-city-council", "city-council", ["ordinance", "civic-resolution"]],
  ["farston-records-clerk", "records-clerk", ["records", "petition-intake"]],
  ["farston-public-works", "public-works-director", ["infrastructure-operation", "water-quality-inspection"]],
  ["farston-building-safety", "building-safety-director", ["permit-review", "safety-inspection"]],
  ["farston-finance", "finance-director", ["budgeting", "account-reconciliation"]],
  ["farston-fire-chief", "fire-chief", ["emergency-response", "fire-inspection"]],
  ["farston-harbormaster", "harbormaster", ["harbor-coordination", "emergency-witnessing", "harbor-operations"]],
] as const;
const people = [
  ["aliyah-reyes", "Aliyah Reyes", "farston-mayor"], ["council-marquez", "Council Member Daniel Marquez", "farston-city-council"],
  ["council-okafor", "Council Member Ngozi Okafor", "farston-city-council"], ["finance-johnson", "Director Sam Johnson", "farston-finance"],
  ["fire-chief-novak", "Chief Sasha Novak", "farston-fire-chief"], ["public-works-chen", "Director Mei Chen", "farston-public-works"],
  ["building-safety-patel", "Director Patel", "farston-building-safety"], ["records-clerk-process", "Records Clerk Substrate Process", "farston-records-clerk"],
  // Quist is the contemporary bearer of the legacy harbormaster role, rather
  // than a duplicate authority kept alive only by old source topology.
  ["harbormaster-quist", "Harbormaster Quist", "farston-harbormaster"],
] as const;
const residents = ["anita-pearce", "ben-jordan", "ellis-pearce", "marisol-vazquez", "mira-jordan", "tomas-vazquez"] as const;
const businesses = ["farston-clinic", "farston-general-store", "farston-hardware", "farston-library", "ferry-terminal-cafe", "harbor-cafe"] as const;
const cadences = ["world-second", "world-minute", "world-hour", "world-day", "world-week", "world-month", "world-season", "world-year"] as const;
const duties = [
  ["decide-permit-within-30-days", "farston-building-safety", "permit-decision", "per-application"],
  ["inspect-public-water-quarterly", "farston-public-works", "water-quality-inspection", "per-calendar-quarter"],
  ["publish-budget-annually", "farston-finance", "budget-publication", "per-calendar-year"],
  ["publish-meeting-minutes-within-5-days", "farston-records-clerk", "meeting-minutes", "per-council-meeting"],
  ["respond-to-emergency-within-8-minutes", "farston-fire-chief", "emergency-response", "per-emergency-dispatch"],
] as const;

export const farstoneCivicCorpusAssertions = Object.freeze([
  ...offices.flatMap(([id, office, capabilities]) => [{ subject: id, predicate: "kind", object: "feltos.civic-office" }, { subject: id, predicate: "office", object: office }, ...capabilities.map((capability) => ({ subject: id, predicate: "capability", object: capability }))]),
  ...people.flatMap(([id, name, office]) => [{ subject: id, predicate: "kind", object: "feltos.civic-agent" }, { subject: id, predicate: "name", object: name }, { subject: id, predicate: "holds-office", object: office }]),
  ...residents.flatMap((id) => [{ subject: id, predicate: "kind", object: "feltos.citizen" }, { subject: id, predicate: "member-of", object: "farston-residents" }]),
  ...businesses.flatMap((id) => [{ subject: id, predicate: "kind", object: "feltos.civic-business" }, { subject: id, predicate: "member-of", object: "farston-commercial-community" }]),
  ...cadences.flatMap((id) => [{ subject: id, predicate: "kind", object: "feltos.cadence" }, { subject: id, predicate: "driven-by", object: "world-clock" }]),
  ...duties.flatMap(([id, holder, action, cadence]) => [{ subject: id, predicate: "kind", object: "feltos.civic-duty" }, { subject: id, predicate: "held-by", object: holder }, { subject: id, predicate: "required-action", object: action }, { subject: id, predicate: "cadence", object: cadence }]),
  { subject: "right-citizen-petition", predicate: "kind", object: "feltos.jural-relation" }, { subject: "right-citizen-petition", predicate: "claim-holder", object: "farston-residents" }, { subject: "right-citizen-petition", predicate: "duty-holder", object: "farston-city-council" }, { subject: "right-citizen-petition", predicate: "signature-threshold", object: 50 },
  { subject: "power-council-ordinance", predicate: "kind", object: "feltos.jural-relation" }, { subject: "power-council-ordinance", predicate: "power-holder", object: "farston-city-council" }, { subject: "power-council-ordinance", predicate: "liable-party", object: "farston-departments" },
]);
