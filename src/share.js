// ---- Links: a seed to play, and a life sent (REDESIGN.md Phase 19) ----
// There is no server. A link carries everything in its hash, which a browser never sends anywhere, and the page reads it.
//   #play=<board>.<law>.<seed>   a seed to play: the board, the law and the seed, and nothing about anyone
//   #life=<payload>              a life sent: what its game was made of (src/engine/compare.js inputsOf) for the one person
//                                at it, packed (deflate-raw where the browser has it) and in base64url
// Opening a life plays its game again (replay) and checks it ended as it did where it was played (check), so a life from
// another version of the game says so instead of showing a life nobody lived. The seed is in the link: a curious player
// could work out the throws to come. It is a game among friends.
// Today's life is a seed from the date in UTC, the same for everyone that day.
import { mix } from "./engine/throws.js";
import { SITUATIONS } from "./content.js";
import { LAWS } from "./engine/laws/index.js";

const V = 1;
// the fields of a table row that a game is made from (src/engine/turn.js playerOf), and nothing else
const ROW = ["name", "type", "gender", "alias", "law"];

// ---- a person's choices, a character each ----
// A die or a law's act is its digit, a year in practice or not p or r, an option an upper-case letter by its id among
// every option's (A for the first, sorted), a law l and a lower-case letter by its id among the laws'. Anything else is
// written out between ~ and ;. The tables are this version's: a life from another is caught by its check.
const OPTS = () => [...new Set(Object.values(SITUATIONS).flatMap(x => x.options.map(o => o.id)))].sort();
const LAWIDS = () => Object.keys(LAWS).sort();
const UP = "ABCDEFGHIJKLMNOQSTUVWXYZ", LO = "abcdefghijkmnoqstuvwxyz";
export function packChoices(list) {
  const o = OPTS(), w = LAWIDS();
  return list.map(c => {
    if (/^\d$/.test(c) || c === "p" || c === "r") return c;
    if (c[0] === "o" && o.indexOf(c.slice(1)) >= 0 && o.indexOf(c.slice(1)) < UP.length) return UP[o.indexOf(c.slice(1))];
    if (c[0] === "l" && w.indexOf(c.slice(1)) >= 0 && w.indexOf(c.slice(1)) < LO.length) return "l" + LO[w.indexOf(c.slice(1))];
    return "~" + c + ";";
  }).join("");
}
export function unpackChoices(text) {
  const o = OPTS(), w = LAWIDS(), out = [];
  for (let j = 0; j < text.length; j++) {
    const c = text[j];
    if (c === "~") { const e = text.indexOf(";", j); out.push(text.slice(j + 1, e)); j = e; }
    else if (c === "l") out.push("l" + (w[LO.indexOf(text[++j])] ?? "?"));
    else if (UP.includes(c)) out.push("o" + o[UP.indexOf(c)]);
    else out.push(c);
  }
  return out;
}

// ---- packing ----
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function through(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
// "z" + deflated, or "j" + the plain text where the browser cannot deflate
export async function pack(obj) {
  const text = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === "function") return "z" + b64(await through(text, new CompressionStream("deflate-raw")));
  return "j" + b64(text);
}
export async function unpack(s) {
  const kind = s[0], bytes = unb64(s.slice(1));
  const text = kind === "z" ? await through(bytes, new DecompressionStream("deflate-raw")) : kind === "j" ? bytes : null;
  if (!text) throw new Error("not a life");
  return JSON.parse(new TextDecoder().decode(text));
}

// ---- a seed ----
export const playHash = ({ board = "110", law = "board", seed }) => `#play=${board}.${law || "board"}.${seed >>> 0}`;
export function readPlay(hash) {
  const m = /^#play=(\w+)\.(\w+)\.(\d+)$/.exec(hash);
  return m ? { board: m[1], law: m[2], seed: +m[3] >>> 0 } : null;
}
// Today's seed: the date in UTC, as YYYY-MM-DD, made a seed. Everyone's today is the same day somewhere.
export const dayOf = (date = new Date()) => date.toISOString().slice(0, 10);
export const dailySeed = (day = dayOf()) => mix(0x6d6f6b73, ...[...day].map(c => c.charCodeAt(0)));

// ---- a life ----
// The one person at the table, if there is just one: a life is sent by its person
export const personOf = state => {
  const at = state.players.map((p, i) => (p.type === "human" ? i : -1)).filter(i => i >= 0);
  return at.length === 1 ? at[0] : null;
};
// How a seat's game ended, to know a replay for the same: its lives, and where and at what age the last stood
export const checkOf = (state, i) => {
  const p = state.players[i];
  return [(p.past?.length ?? 0) + 1, p.pos, Math.floor(p.years ?? 0)];
};
// Whether game state can be sent as a life, and if not why not (for the tools): over, played on the 110 since Phase 19,
// with one person, born fresh (a life born of one before carries what no link holds), and never set by hand
export function sendable(state) {
  if (!state?.over) return "not over";
  if (!state.table || state.rules?.board) return "not replayable";
  if (state.tampered) return "set by hand";
  const i = personOf(state);
  if (i == null) return "not one person";
  if (state.table.some(r => r.born)) return "born of a life before";
  return null;
}
// The payload of a life: { v, s: seed, r: rules, t: table, c: choices, n: turns, p: the person's seat, k: check }
export function lifeOf(state) {
  if (sendable(state)) return null;
  const i = personOf(state);
  return {
    v: V, s: state.rng.seed >>> 0, r: state.rules, n: state.turns, p: i, k: checkOf(state, i),
    t: state.table.map(r => Object.fromEntries(ROW.filter(k => k === "name" || (r[k] != null && r[k] !== "")).map(k => [k, k === "name" ? r.name ?? "" : r[k]]))),
    c: packChoices(state.players[i].choices ?? []),
    // a game begun before Phase 19 step 3 and resumed threw off the shared sequence; every link since says nothing
    ...(state.throws === "own" ? {} : { d: "stream" }),
  };
}
export const lifeHash = async state => {
  const x = lifeOf(state);
  return x ? "#life=" + (await pack(x)) : null;
};
// A payload as the inputs a game is played again from (src/engine/compare.js replay), and its person's seat and check
export function inputsOfLife(x) {
  if (!x || x.v !== V || !Number.isInteger(x.s) || !Array.isArray(x.t) || !Number.isInteger(x.p) || !x.t[x.p]) throw new Error("not a life");
  return {
    inputs: { seed: x.s >>> 0, rules: { ...x.r }, table: x.t, turns: x.n, ...(x.d === "stream" ? { stream: true } : {}), choices: x.t.map((r, i) => (i === x.p ? unpackChoices(x.c ?? "") : r.type === "human" ? [] : null)) },
    seat: x.p, check: x.k,
  };
}
export async function readLife(hash) {
  const m = /^#life=([\w-]+)$/.exec(hash);
  return m ? inputsOfLife(await unpack(m[1])) : null;
}
// The hash of a link, from the link or from the hash alone
export const hashOf = text => {
  const s = String(text).trim(), at = s.indexOf("#");
  return at >= 0 ? s.slice(at) : null;
};
