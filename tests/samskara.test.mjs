// REDESIGN.md Phase 16: what a life leaves the next (src/engine/samskara.js), the store it is kept in, and the next life
// born of it: half the guṇas, the heaviest debt as its prārabdha, the cast's names in other roles, the dream.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { soulOf, bornOf, validSoul, storeOf, storeWith, endOf, KEEP_SOULS, SOUL_V } from "../src/engine/samskara.js";
import { lifeOf, lifeText } from "../src/engine/account.js";
import { castOf, RETURNS_AS } from "../src/engine/cast.js";
import { karmaOf, debtIn } from "../src/engine/karma.js";
import { freshGunas } from "../src/engine/self.js";

const play = (seed, row = {}) => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f", ...row }], rules: { six: true }, seed });
  while (!s.over) playTurn(s);
  return s;
};
// the first seeds whose life ended unfreed and left a debt
const ended = (() => {
  const out = [];
  for (let seed = 1; out.length < 40; seed++) { const s = play(seed), soul = soulOf(s, 0); if (soul?.sancita.length && soul.dream) out.push([seed, s, soul]); }
  return out;
})();

test("a liberated life leaves nothing; an ended one leaves a record the store keeps", () => {
  let freed = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const s = play(seed);
    if (s.winner === 0) { freed++; assert.equal(soulOf(s, 0), null); assert.equal(endOf(s, 0), null); continue; }
    const soul = soulOf(s, 0);
    assert.ok(validSoul(soul), `seed ${seed}`);
    assert.equal(soul.v, SOUL_V);
    assert.equal(soul.lives, 1);
    assert.ok(soul.sancita.length <= 6);
    assert.ok(soul.sancita.every((x, k, a) => !k || a[k - 1].weight >= x.weight), "heaviest first");
    // it survives the store: JSON there and back
    assert.deepEqual(storeOf(JSON.parse(JSON.stringify(storeWith(null, "meera", soul)))).souls.meera, soul);
  }
  assert.ok(freed > 40 && freed < 160, `${freed} freed`);
});

test("an empty, corrupt, foreign or over-full store gives what it can, and never throws", () => {
  for (const raw of [null, undefined, 3, "x", [], {}, { v: 2, souls: {} }, { v: 1, souls: [] }, { v: 1, souls: { a: { v: 1 } } }])
    assert.deepEqual(storeOf(raw), { v: 1, souls: {} });
  const soul = ended[0][2];
  let store = null;
  for (let k = 0; k < KEEP_SOULS + 3; k++) store = storeWith(store, `n${k}`, soul);
  assert.deepEqual(Object.keys(store.souls), Array.from({ length: KEEP_SOULS }, (_, k) => `n${k + 3}`), "the oldest go first");
  // the one kept again goes last; a liberation takes it out
  store = storeWith(store, "n3", soul);
  assert.equal(Object.keys(store.souls).at(-1), "n3");
  assert.equal(storeWith(store, "n3", null).souls.n3, undefined);
  // a bad record among good ones is dropped, the rest kept
  const mixed = storeOf({ v: 1, souls: { good: soul, bad: { ...soul, last: { ...soul.last, gunas: { s: -1, r: 0, t: 0 } } } } });
  assert.deepEqual(Object.keys(mixed.souls), ["good"]);
  // and a record that does not resolve here is born fresh
  assert.equal(bornOf({ ...soul, v: 99 }), null);
  assert.equal(bornOf(null), null);
});

test("life two differs: half the gunas, the heaviest debt as an āgāmi seed from a life before, the cast in new roles", () => {
  let returned = 0;
  for (const [seed, , soul] of ended) {
    const born = bornOf(soul);
    const f = freshGunas(), sum = soul.last.gunas.s + soul.last.gunas.r + soul.last.gunas.t;
    for (const x of ["s", "r", "t"]) assert.ok(Math.abs(born.gunas[x] - (f[x] + soul.last.gunas[x] / sum) / 2) < 1e-9, `seed ${seed} ${x}`);
    const [slice] = born.karma.agami;
    assert.equal(slice.prior, true);
    assert.equal(slice.src, soul.sancita[0].src);
    assert.equal(slice.at, soul.sancita[0].at);
    assert.equal(born.karma.sancita.length, soul.sancita.length - 1);
    const t = play(seed + 5000, { name: "", alias: { en: "Ravi", hi: "रवि" }, gender: "m", born });
    assert.equal(t.players[0].prior.lives, 1);
    // a carried name never holds the role it held, and returns in the role its old one turns into
    const cast = castOf(t, 0, 1);
    for (const [who, c] of Object.entries(cast ?? {})) {
      if (!c?.before) continue;
      returned++;
      assert.equal(RETURNS_AS[c.before], who, `seed ${seed}: ${c.en} was the ${c.before}, now the ${who}`);
      assert.ok(soul.cast.some(x => x.role === c.before && x.en === c.en));
    }
  }
  assert.ok(returned > ended.length, `${returned} names returned in ${ended.length} lives`);
});

test("the next life's account opens on the dream, says the carried debt as from a life before, and leaks nothing", () => {
  for (const [seed, s, soul] of ended) {
    const t = play(seed + 5000, { name: "", alias: { en: "Ravi", hi: "रवि" }, gender: "m", born: bornOf(soul) });
    const en = lifeOf(t, 0, "en"), hi = lifeOf(t, 0, "hi");
    assert.match(en.open, /^Ravi dreams, some nights, of a woman named Meera/, `seed ${seed}`);
    assert.match(hi.open, /^रवि को कभी-कभी रात में एक औरत का सपना आता है, Meera नाम की/, `seed ${seed}`);
    for (const l of ["en", "hi"]) assert.doesNotMatch(lifeText(t, 0, l), /[{}]|undefined|null|NaN/, `seed ${seed} ${l}`);
    const prior = karmaOf(t.players[0]).agami.find(x => x.prior) ?? [...karmaOf(t.players[0]).sancita, ...karmaOf(t.players[0]).prarabdha].find(x => x.prior);
    if (prior) assert.match(debtIn("en", prior, { name: "Ravi", gender: "m" }), / in a life before$/);
    // the first life is the same however many come after it
    assert.equal(lifeText(play(seed), 0, "en"), lifeText(s, 0, "en"));
  }
  // a first life opens as it always has
  assert.doesNotMatch(lifeOf(ended[0][1], 0, "en").open, /dreams/);
});

test("no saṃskāra is the game as before: born null, or a record that does not resolve, plays the same dice", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const a = play(seed), b = play(seed, { born: null }), c = play(seed, { born: bornOf({ v: 0 }) });
    assert.deepEqual(b.log, a.log);
    assert.deepEqual(c.log, a.log);
    assert.equal(lifeText(c, 0, "hi"), lifeText(a, 0, "hi"));
  }
});
