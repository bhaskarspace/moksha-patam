// ---- The Mirror (REDESIGN.md Phase 16) ----
// A third view of a finished life, beside the book (the account) and the path (the moves): the Yakṣa's questions put to
// the player, not the book, after they have read what the book says they did. Three a life, chosen by what the life did
// (content/mirror.json `when`); a rebellion in p.witness always takes the first place, and is asked about by what was
// chosen and what the life took. The rest are drawn off a sequence of their own, so the dice never change. Nothing is
// answered or recorded: this reads the state and writes nothing. Pure, so the page, the tools and the tests run it alike.
import { MIRROR, SITUATIONS } from "../content.js";
import { makeRng, next } from "../rng.js";
import { wordsIn } from "../i18n.js";
import { yearsAlong } from "./self.js";
import { worthOf, optionOf } from "./qbn.js";
import { castAlong, castArcs } from "./cast.js";

export const ASKED = 3;
// the squares where choosing the better option is helping someone: the meal (49), the sick child (51), the guest (56)
const HELP = new Set([49, 51, 56]);
// the least worth option of square n: none of its options is worth less
const least = (n, id) => { const o = optionOf(n, id); return !!o && SITUATIONS[n].options.every(x => worthOf(x) >= worthOf(o)); };

// What player i's life did that a question can be about, for the `when` of content/mirror.json.
function deeds(state, i) {
  const p = state.players[i], w = p.witness ?? [], along = yearsAlong(p.life || [], p.told || []);
  const rebel = w.findLast(x => x.chose !== x.took && !x.grace) ?? null;
  const arcs = castArcs(state, i, along), cc = castAlong(state, i, along), cast = cc.at(-1)?.cast ?? {};
  const unwritten = arcs.find(a => a.kind === "died" && cast[a.who]?.en) ?? null;
  return {
    rebel: rebel && { ...rebel, age: along[rebel.i]?.years ?? p.years },
    helped: w.some(x => HELP.has(x.sq) && !least(x.sq, x.chose)),
    held: p.holding != null || !!p.held?.length,
    least: w.some(x => least(x.sq, x.took)),
    refused: !!p.refusals?.length,
    unwritten: unwritten && cast[unwritten.who],
    still: (p.practised ?? 0) > 0 || (p.peak ?? -1) >= 3,
    always: true,
  };
}

// The three questions for player i, in the order asked: [{ id, rebel?, who? }]. A life that fits fewer than three is
// asked the ones that need least of it, in this order.
const FALLBACK = ["year", "held", "still"];
export function mirrorOf(state, i) {
  const qs = MIRROR.questions ?? [], d = deeds(state, i), out = [];
  const add = q => { if (q && out.length < ASKED && !out.some(x => x.id === q.id)) out.push({ id: q.id, ...(q.when === "rebel" ? { rebel: d.rebel } : {}), ...(q.when === "unwritten" ? { who: d.unwritten } : {}) }); };
  if (d.rebel) add(qs.find(q => q.when === "rebel"));
  const fits = qs.filter(q => q.when !== "rebel" && d[q.when]);
  const r = makeRng((state.rng.seed ^ 0x6d2b79f5 ^ Math.imul(i + 1, 0x27d4eb2d) ^ Math.imul(state.players[i]?.rebirths ?? 0, 0x632be5ab)) >>> 0);
  // a draw for every candidate, in authored order, so what one life fits never moves another's
  const order = fits.map(q => [next(r), q]).sort((a, b) => a[0] - b[0]).map(([, q]) => q);
  order.forEach(add);
  for (const id of FALLBACK) add(qs.find(q => q.id === id && q.when !== "unwritten"));
  return out;
}

// A question in language l, filled for the life it is put to.
export function mirrorIn(l, m) {
  const q = MIRROR.questions.find(x => x.id === m.id);
  if (!q) return "";
  const t = q.q[l] || q.q.en, v = {};
  if (m.rebel) {
    const chose = optionOf(m.rebel.sq, m.rebel.chose)?.mirror?.chose, took = optionOf(m.rebel.sq, m.rebel.took)?.mirror?.took;
    Object.assign(v, { age: wordsIn(l, Math.floor(m.rebel.age)), chose: chose?.[l] || chose?.en || "", took: took?.[l] || took?.en || "" });
  }
  if (m.who) v.who = m.who[l] || m.who.en;
  // put to the player, so no agreement with the life's gender: only the four values
  return t.replace(/\{(age|chose|took|who)\}/g, (_, k) => v[k] ?? "");
}
export const mirrorIntroIn = l => MIRROR.intro?.[l] || MIRROR.intro?.en || "";
