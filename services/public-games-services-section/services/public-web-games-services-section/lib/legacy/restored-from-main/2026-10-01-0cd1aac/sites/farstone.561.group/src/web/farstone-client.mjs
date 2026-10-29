import { connectRoom } from "@red-cup-engineering/qwzspace/client-browser";
import { createTufteRoomModel } from "@red-cup-engineering/qwzspace/tufte";
import { applyTufteProjectionPatch, diffTufteProjection, normalizeTufteModel } from "@red-cup-engineering/web-page-tiling-engine/browser";
import { connectTufteWorkspace } from "@red-cup-engineering/web-page-tiling-engine/topology";
import { farstoneRoomOptions } from "./farstone-view.mjs";

const root = document.querySelector("[data-tufte]");
// User-driven tiling: drag the splitters, arrow-key resize on a focused
// splitter, Alt+Shift+Arrow to swap panes; the arrangement persists locally.
const workspaceHandle = connectTufteWorkspace(root, { storageKey: "farstone.workspace" });
let client = null;
let frame = null;
let name = "";
let connection = "disconnected";
let accountMessage = "";
let registrationPassword = "";
let transcript = [];
let seenEvents = new Set();
let lastPlace = null;
const history = [];
let historyIndex = 0;
let projection = normalizeTufteModel(createTufteRoomModel(farstoneRoomOptions(null, { transcript })));

function append(text, kind = "output") {
  for (const line of String(text ?? "").split("\n")) transcript.push({ text: line, kind });
  if (transcript.length > 500) transcript = transcript.slice(-500);
}

function describePlace(nextFrame) {
  const place = nextFrame?.place;
  if (!place || place.id === lastPlace) return;
  const initialPlace = lastPlace === null;
  lastPlace = place.id;
  // The first perception needs a room for context. Later room changes arrive as ordered game
  // output events; rendering the same place again from the projection duplicates that response.
  if (!initialPlace) return;
  append(place.name ?? "Somewhere", "room-name");
  append(place.description ?? "");
  const occupants = (nextFrame.occupants ?? []).map(({ name: occupant }) => occupant).filter(Boolean);
  if (occupants.length) append(`Also here: ${occupants.join(", ")}.`);
  const exits = place.exits ?? [];
  append(`Obvious exits: ${exits.length ? exits.join(", ") : "none"}.`, "exits");
}

function absorbFrame(nextFrame) {
  frame = nextFrame ?? frame;
  if (!frame) return;
  name = frame.identity?.name ?? name;
  describePlace(frame);
  const occurrences = new Map();
  for (const event of (frame.recentEvents ?? [])) {
    const signature = `${event.tick ?? ""}\u0000${event.channel ?? ""}\u0000${event.text ?? ""}`;
    const occurrence = occurrences.get(signature) ?? 0;
    occurrences.set(signature, occurrence + 1);
    const key = event.id === undefined
      ? `${frame.actor ?? ""}\u0000${signature}\u0000${occurrence}`
      : `${frame.actor ?? ""}\u0000${event.id}`;
    if (seenEvents.has(key)) continue;
    seenEvents.add(key);
    append(event.text);
  }
}

function render() {
  const next = normalizeTufteModel(createTufteRoomModel(farstoneRoomOptions(frame, { connection, name, transcript, accountMessage, registrationPassword })));
  applyTufteProjectionPatch(root, diffTufteProjection(projection, next));
  projection = next;
  workspaceHandle.refresh?.();
  const log = document.querySelector("#farstone-transcript");
  if (log) log.scrollTop = log.scrollHeight;
}

async function settleTick() {
  const response = await fetch("/qwzspace/tick", { method: "POST" });
  if (!response.ok) {
    connection = "error";
    render();
  }
  return response;
}

function start() {
  client?.close();
  name = "Visitor";
  frame = null;
  accountMessage = "";
  registrationPassword = "";
  transcript = [];
  seenEvents = new Set();
  lastPlace = null;
  append("Connecting to Farstone…", "system");
  connection = "joining";
  render();
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  client = connectRoom(`${scheme}//${location.host}/`, {
    name,
    onState(state) {
      connection = state;
      if (state === "joining") void settleTick();
      if (state === "snapshot" || state === "delta" || state === "playing") {
        absorbFrame(client?.view.me());
      }
      // Joining settles presence first; the following tick produces the first perception frame.
      if (state === "playing" && !frame) void settleTick();
      render();
    },
  });
  client.view.on("snapshot", () => {
    absorbFrame(client.view.me());
    connection = "playing";
    render();
  });
}

async function send(command) {
  const value = String(command ?? "").trim();
  if (!client || !value) return;
  const identity = value.match(/^(register|login)\s+(\S+)(?:\s+(.+))?$/iu);
  if (identity) {
    await account(identity[1].toLowerCase(), identity[2], identity[3] ?? "");
    return;
  }
  append(`> ${value}`, "command");
  history.push(value);
  historyIndex = history.length;
  render();
  client.sendIntent("command", { command: value });
  await settleTick();
}

document.addEventListener("submit", (event) => {
  if (event.target?.id === "farstone-connect") {
    event.preventDefault();
    start();
  }
  if (event.target?.id === "farstone-account") {
    event.preventDefault();
    const data = new FormData(event.target);
    void account(event.submitter?.value ?? "login", String(data.get("name") ?? ""), String(data.get("password") ?? ""));
    event.target.elements.namedItem("password").value = "";
  }
  if (event.target?.id === "farstone-command") {
    event.preventDefault();
    const input = event.target.elements.namedItem("command");
    void send(input?.value);
    if (input) input.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target?.id !== "farstone-command-text" || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  historyIndex = event.key === "ArrowUp"
    ? Math.max(0, historyIndex - 1)
    : Math.min(history.length, historyIndex + 1);
  event.target.value = history[historyIndex] ?? "";
  event.target.setSelectionRange(event.target.value.length, event.target.value.length);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-farstone-command]");
  if (button) void send(button.dataset.farstoneCommand);
});

async function account(action, accountName, password) {
  if (!client) return;
  registrationPassword = "";
  accountMessage = "Connecting your account…";
  render();
  try {
    const result = await client.requestControl({ action, name: accountName, password });
    name = result.name;
    registrationPassword = result.password ?? "";
    accountMessage = action === "register" ? "Account created. Keep the password below to return to this character." : "Welcome back.";
    // Identity operations bypass the game intent log and command history.
    await settleTick();
  } catch (error) { accountMessage = error.message ?? "Unable to connect your account."; }
  render();
}

start();
