function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function transcriptHtml(lines) {
  const content = lines.length > 0
    ? lines.map((line) => `<div class="mud-line mud-line--${escapeHtml(line.kind ?? "output")}">${escapeHtml(line.text)}</div>`).join("")
    : '<div class="mud-line quiet">Connect to the harbor to begin.</div>';
  return `<div id="farstone-transcript" class="mud-transcript" role="log" aria-live="polite" aria-relevant="additions text" tabindex="0">${content}</div>`;
}

function roomHtml(frame, connected) {
  const place = frame?.place;
  if (!connected || !place) {
    return '<p class="quiet">Connect to read your surroundings and begin exploring.</p>';
  }
  const occupants = (frame.occupants ?? []).map(({ name }) => name).filter(Boolean);
  const exits = place.exits ?? [];
  return [
    `<p class="room-name">${escapeHtml(place.name ?? "Somewhere")}</p>`,
    place.description ? `<p class="room-description">${escapeHtml(place.description)}</p>` : "",
    occupants.length ? `<p class="quiet">Also here: ${escapeHtml(occupants.join(", "))}.</p>` : "",
    exits.length
      ? `<p class="room-exits">${exits.map((exit) => `<button type="button" data-farstone-command="go ${escapeHtml(exit)}">${escapeHtml(exit)}</button>`).join("")}</p>`
      : '<p class="quiet">No obvious exits.</p>',
  ].join("");
}

// The tiling arrangement: transcript-over-command carries the left two
// thirds; watch-over-surroundings carries the right third. TUFTE's workspace
// keeps this a user-arrangeable starting point, not a fixed frame.
export const FARSTONE_WORKSPACE = {
  split: "row",
  sizes: [0.66, 0.34],
  children: [
    { split: "column", sizes: [0.84, 0.16], children: ["terminal", "command"] },
    { split: "column", sizes: [0.55, 0.45], children: ["connection", "room"] },
  ],
};

export function farstoneRoomOptions(frame, { connection = "disconnected", name = "", transcript = [], accountMessage = "", registrationPassword = "" } = {}) {
  const connected = connection === "playing" || connection === "snapshot" || connection === "delta";
  const statusHtml = connected
    ? `<p><strong>${escapeHtml(frame?.identity?.name ?? name ?? "Visitor")}</strong><br><span class="quiet">${escapeHtml(frame?.place?.name ?? "the harbor")}</span></p>${frame?.identity?.registered ? '<p>Your character is saved. Use your account to return from another browser or MUD client.</p>' : `<p>Explore as a visitor, or create an account to keep this character.</p><form id="farstone-account"><label for="account-name">Account name</label><input id="account-name" name="name" autocomplete="username" maxlength="24" pattern="[a-z][a-z0-9-]*" required><label for="account-password">Password (returning players)</label><input id="account-password" name="password" type="password" autocomplete="current-password"><p><button type="submit" name="action" value="login">Log in</button> <button type="submit" name="action" value="register">Create account</button></p></form>`}${accountMessage ? `<p role="status">${escapeHtml(accountMessage)}</p>` : ""}${registrationPassword ? `<p>Save your password. It is shown only here:</p><input aria-label="Your new password" readonly value="${escapeHtml(registrationPassword)}" autocomplete="off">` : ""}`
    : `<p>${connection === "disconnected" || connection === "error" ? "The connection is closed." : "Connecting to the harbor…"}</p><form id="farstone-connect"><button type="submit">Reconnect</button></form>`;
  return {
    title: "Farstone",
    subtitle: "A living harbor on the cold North Atlantic",
    eyebrow: "Browser client",
    tick: frame?.tick,
    entries: [],
    tileForEntry: () => [],
    workspace: FARSTONE_WORKSPACE,
    leadingTiles: [{
      id: "connection",
      role: "status",
      lifecycle: connected ? "active" : connection === "error" ? "stale" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: connected ? "The watch" : connection === "error" ? "Connection interrupted" : "Come ashore",
      html: statusHtml,
    }, {
      id: "terminal",
      role: "now",
      lifecycle: connected ? "active" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: "Transcript",
      html: transcriptHtml(transcript),
    }],
    trailingTiles: [{
      id: "command",
      role: "action",
      lifecycle: connected ? "active" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: "Command",
      html: `<form id="farstone-command" class="mud-prompt"><label for="farstone-command-text" aria-label="Command prompt">&gt;</label><input id="farstone-command-text" name="command" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="help" ${connected ? "autofocus" : "disabled"}><button type="submit" ${connected ? "" : "disabled"}>Send</button></form>`,
    }, {
      id: "room",
      role: "aside",
      lifecycle: connected ? "active" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: "Surroundings",
      html: roomHtml(frame, connected),
    }],
    footerHtml: '<p>Drag the pane edges, or press Alt+Shift+Arrow inside a pane, to rearrange the deck. <a href="/">Return to Farstone</a></p>',
  };
}
