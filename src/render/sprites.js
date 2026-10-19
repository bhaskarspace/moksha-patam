// ---- Pixel-art characters, one per stage of life (12 x 16, facing right) ----
import { TOP } from "../content.js";
import { L } from "../i18n.js";
import { P_HEX } from "../ui.js";

// K outline, S skin, H hair, G grey hair, W white beard, E eye, C clothes (player colour), c dark clothes,
// w white cloth, O/o saffron robe, B staff, Y gold, R slate. Rows 14–15 are the legs; legsB is the other walk frame.
export const ART = {
  baby: { back: "H", legsB: ["..KSK.KSK...", "...K...K...."], rows: [
    "............", "............", "............", "............", "............", "............", "............", "............",
    "......KKKK..", ".....KHHHHK.", ".....KSSESK.", "..KKKKSSSSK.", ".KCCCCCKKK..", "KCwwwCCCK...", ".KSK..KSK...", "..K....K...."] },
  toddler: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "............", "............", "............", "............", "............",
    "....KKKKK...", "...KHHHHHK..", "..KHSSSSSK..", "..KSSSESEK..", "..KSSSSSSK..", "...KKSSKK...",
    "...KCCCCK...", "..KSCCCCSK..", "...KwwwwK...", "...KS..SK...", "...KK..KK..."] },
  student: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "............", "............", "............",
    "....KKKKK...", "...KHHHHHK..", "..KHHSSSSK..", "..KHSSESEK..", "..KSSSSSSK..", "...KKSSKK...",
    "...KCCCCK...", "..KCCCCCCKKK", "..KSCCCCKRRK", "...KCCCCKRRK", "...KwwwwKKKK", "...KS..SK...", "...KK..KK..."] },
  youth: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "............",
    "....KKKK....", "...KHHHHK...", "..KHHSSSSK..", "..KHSSESEK..", "..KSSSSSSK..", "...KSSSSK...", "....KSSK....",
    "..KCCCCCCK..", ".KCCCCCCCCK.", ".KCKCCCCKCK.", ".KSKCCCCKSK.", "...KwwwwK...", "...KwwwwK...", "..KSK..KSK..", "..KK....KK.."] },
  householder: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "....KKKK....", "...KccccK...", "..KccccccK..", "..KHSSSSSK..", "..KSSSESEK..", "..KSSKKKSK..", "...KSSSSK...", "....KSSK....",
    "..KCCCCCCK..", ".KCCCCCCCCK.", ".KCKCCCCKCK.", ".KSKCCCCKSK.", "...KwwwwK...", "...KwwwwK...", "..KSK..KSK..", "..KK....KK.."] },
  forest: { back: "G", legsB: ["....KSSK..B.", "....KKKK..B."], rows: [
    "....KKKK..B.", "...KGGGGK.B.", "..KGGSSSSKB.", "..KGSSESEKB.", "..KSSSSSSKB.", "..KSGGGGSKB.", "...KGGGGK.B.", "....KGGK..B.",
    "..KccccccKB.", ".KcccccccSB.", ".KcKccccKKB.", ".KSKccccK.B.", "...KccccK.B.", "...KccccK.B.", "..KSK..KSKB.", "..KK....KKB."] },
  sage: { back: "S", legsB: ["...KOOOOK.B.", "...KK..KK.B."], rows: [
    ".....KK...B.", "....KHHK..B.", "...KSSSSK.B.", "..KSSSYSSKB.", "..KSSSESEKB.", "..KSWWWWSKB.", "...KWWWWK.B.", "....KWWK..B.",
    "..KOOOOCOKB.", ".KOOOOCOOSB.", ".KOKOCOOKKB.", ".KSKCOOOK.B.", "...KOOOOK.B.", "...KooooK.B.", "...KOOOOK.B.", "..KK....KKB."] },
  divine: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "...YYYYYY...", "..YKKKKKKY..", ".Y.KYYYYK.Y.", ".YKHSSSSSKY.", ".YKSSSESEKY.", "..KSSSSSSK..", "...KSSSSK...", "....KSSK....",
    "..KYCCCCYK..", ".KYCCCCCCYK.", ".KSKCCCCKSK.", "...KCCCCK...", "...KwwwwK...", "...KwwwwK...", "..KSK..KSK..", "..KK....KK.."] },
};
// Life stages follow board position: ladders age you, snakes send you back to a younger self.
export const STAGES = [
  { max: 10,   art: "baby",        en: "Baby",           hi: "शिशु" },
  { max: 20,   art: "toddler",     en: "Child",          hi: "बालक" },
  { max: 30,   art: "student",     en: "Student",        hi: "विद्यार्थी" },
  { max: 40,   art: "youth",       en: "Young scholar",  hi: "युवा विद्यार्थी" },
  { max: 60,   art: "householder", en: "Householder",    hi: "गृहस्थ" },
  { max: 80,   art: "forest",      en: "Forest-dweller", hi: "वानप्रस्थी" },
  { max: 100,  art: "sage",        en: "Renunciate",     hi: "संन्यासी" },
  { max: TOP,  art: "divine",      en: "Divine soul",    hi: "दिव्य आत्मा" },
];
export const stageOf = pos => STAGES.findIndex(s => Math.max(pos, 1) <= s.max);
export const stageName = i => L(STAGES[i].en, STAGES[i].hi);

const spriteCache = new Map();
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * (1 + f)));
  return "#" + ch.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
// frame: 0/1 walking, 2/3 climbing (seen from behind)
export function spriteURL(stage, color, frame) {
  const key = `${stage}|${color}|${frame}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const art = ART[STAGES[stage].art];
  let rows = art.rows.slice();
  if (frame % 2) rows.splice(14, 2, ...art.legsB);
  // from behind: everything down to just below the eyes becomes the back of the head
  if (frame >= 2) { const eye = rows.findIndex(r => r.includes("E")); rows = rows.map((r, y) => (y <= eye + 1 ? r.replace(art.back === "S" ? /[SEWY]/g : /[SEW]/g, art.back) : r)); }
  const pal = {
    K: "#1A1208", S: "#E2A877", H: "#2A1A10", G: "#D9D6CF", W: "#F2F0EA", E: "#1A1208", w: "#F4F1E8",
    O: "#F08A1C", o: "#B85E0A", B: "#7A4B22", Y: "#FFD54A", R: "#3E444C", C: P_HEX[color], c: shade(P_HEX[color], -0.35),
  };
  const cv = document.createElement("canvas"); cv.width = 12; cv.height = 16;
  const c = cv.getContext("2d");
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { c.fillStyle = pal[ch]; c.fillRect(x, y, 1, 1); } }));
  const url = `url(${cv.toDataURL()})`;
  spriteCache.set(key, url);
  return url;
}
