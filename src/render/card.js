// ---- Landing card: always both languages, the current one first ----
import { GOAL, LADDERS, SNAKES, SQ, HEAVEN } from "../content.js";
import { lang, t, srcText } from "../i18n.js";
import { G } from "../state.js";
import { $, reduced } from "../ui.js";
import { ashramaOf, labEls } from "./board.js";

export function squareInfo(n) {
  const both = (en, hi) => (lang === "hi" ? [hi, en] : [en, hi]);
  const sl = LADDERS[n] || SNAKES[n];
  if (sl) {
    const virtue = !!LADDERS[n], [title, other] = both(sl.en, sl.hi), [story, story2] = both(...sl.story);
    return { kind: virtue ? "virtue" : "vice", big: sl.ic, title, alt: `${other} · ${sl.skt}`, story, story2, src: sl.src,
      eb: `${t(virtue ? "virtue" : "vice")} · ${ashramaOf(n)}`, ft: t(virtue ? "ladderTo" : "snakeTo", { n: sl.to }) };
  }
  if (n === GOAL) {
    const [title, other] = both("Moksha", "मोक्ष"), [story, story2] = both("Freedom from the cycle of birth and death.", "जन्म और मृत्यु के चक्र से मुक्ति।");
    return { kind: "goal", big: "ॐ", title, alt: `${other} · ${t("liberation")}`, story, story2, src: "", eb: t("end"), ft: "" };
  }
  if (HEAVEN[n]) {
    const h = HEAVEN[n], [title, other] = both(h.en, h.hi), [story, story2] = both(...h.story);
    return { kind: "heaven", big: h.ic, title, alt: other, story, story2, src: "", eb: t("realm"), ft: "" };
  }
  if (SQ[n]) {
    const [ic, en, hi, sen, shi, src] = SQ[n], [title, other] = both(en, hi), [story, story2] = both(sen, shi);
    return { kind: "story", big: ic, title, alt: other, story, story2, src, eb: `${t("story")} · ${ashramaOf(n)}`, ft: "" };
  }
  return null;
}

function cardExtras(kind) {
  const rnd = i => (i * 37) % 100;
  if (kind === "virtue") return `<div class="rays"></div>` + [...Array(7)].map((_, i) => `<span class="sp" style="left:${8 + rnd(i + 1) * 0.84}%;animation-delay:${(i * 0.26).toFixed(2)}s">✦</span>`).join("");
  if (kind === "heaven" || kind === "goal") return `<div class="rays"></div>` + [...Array(6)].map((_, i) => `<span class="pt" style="left:${6 + rnd(i + 2) * 0.86}%;animation-delay:${(i * 0.4).toFixed(2)}s">🌸</span>`).join("");
  return "";
}

export async function showCard(n, quick) {
  const info = squareInfo(n);
  if (!info) return;
  const g = G.gen, box = $("sqcard"), card = box.firstElementChild, story = info.kind === "story";
  card.className = "sq " + info.kind;
  card.innerHTML = cardExtras(info.kind) +
    `<span class="eb">${info.eb}</span><span class="big">${info.big}</span><span class="nm">${info.title}</span>` +
    `<span class="dv">${info.alt}</span><p class="tc">${info.story}</p><p class="tc2">${info.story2}</p>` +
    (info.src ? `<span class="src">${srcText(info.src)}</span>` : "") + (info.ft ? `<span class="ft">${info.ft}</span>` : "");
  box.hidden = false;
  // zoom out of the square the player landed on
  const from = labEls[n].getBoundingClientRect(), to = card.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const shrunk = { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`, opacity: 0.3 };
  if (!reduced) card.animate([shrunk, { transform: "none", opacity: 1 }], { duration: story ? 320 : 420, easing: "cubic-bezier(.2,.8,.25,1.15)" });
  const ms = story ? (quick ? 1100 : 2600) : quick ? 1600 : 3400;
  await new Promise(res => { G.cardClose = res; setTimeout(res, ms); });
  G.cardClose = null;
  if (!reduced && g === G.gen) await card.animate([{ transform: "none", opacity: 1 }, { ...shrunk, opacity: 0 }], { duration: 240, easing: "ease-in" }).finished.catch(() => {});
  if (g === G.gen) box.hidden = true;
}
$("sqcard").addEventListener("click", () => G.cardClose?.());
