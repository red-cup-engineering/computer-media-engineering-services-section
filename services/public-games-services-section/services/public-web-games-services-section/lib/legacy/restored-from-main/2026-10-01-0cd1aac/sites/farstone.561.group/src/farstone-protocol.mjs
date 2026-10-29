// farstone-protocol — versioned `farstone.protocol.v1`, Farstone's counterpart to Tidepool's own
// `tidepool-protocol.mts` (same sibling service, same shape — see that file's header, in the
// tidepool-services-section sibling, for the fuller rationale this mirrors verbatim). Wire-identical
// to qwzspace's own intent envelope (protocol.mjs's `intent(seq, body)` — `{k:"intent", seq, kind,
// args}`), with exactly ONE Farstone-defined kind: `{ kind: "command", args: { command } }`.
//
// `gameValidate(raw, actorId)` is the trust boundary room.mjs calls before anything reaches the
// queue. It shape-checks `args.command` as non-empty text <= 256 chars; nothing more — verb parsing,
// affordance checking, and effects all happen inside feltos's own `execute()`/capability handlers
// (via mud-server.mjs's `enqueue`/`tick`), which already refuse unknown verbs and impossible actions
// with a `message()` back to the actor. One command string, one grammar — the exact same string a
// human's WS client sends and the exact same string the existing `POST /command` JSON route already
// accepts as `body.command` (http.mjs). No new command grammar is invented for the WS transport.

import { createSingleCommandValidator, DEFAULT_MAX_COMMAND_LENGTH } from "@red-cup-engineering/ashlar-fabrication/single-command-game-protocol";

export const PROTOCOL_VERSION = "farstone.protocol.v1";
export const MAX_COMMAND_LENGTH = DEFAULT_MAX_COMMAND_LENGTH;

/** The room's own `validate: (raw) => intent | null` shape (intent-queue.mjs). `raw` here is
 *  qwzspace room.mjs's ALREADY-SHAPED `{k, seq, ...body}` at the intent branch — see
 *  `wireConnection`'s call `gameValidate(raw, actorId)`. The envelope shape-check and the
 *  command-string validation (trim, non-empty, length cap) are both owned by
 *  single-command-game-protocol-service — see that package's own header for why this exact
 *  shape is shared, not a per-game copy. */
export const gameValidate = createSingleCommandValidator({ maxCommandLength: MAX_COMMAND_LENGTH });
