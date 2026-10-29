// ---- The pixel art (12 x 16, facing right): a figure for each stage of life by gender, and the interlude's animals ----
// Pure data, so tests can read every figure (tests/sprites.test.mjs, tests/contrast.test.mjs); src/render/sprites.js draws it.
// K outline, S skin, H hair, G grey hair, W white beard, E eye, C clothes (player colour), c dark clothes,
// w white cloth, O/o saffron robe, B staff, Y gold, R slate; for the animals T/t shell, F/f tawny, N mane, A/a cat,
// M/m mongoose. Rows 14–15 are the legs; legsB is the other walk frame. `behind` patches rows of the climbing frames,
// seen from behind, after the head has become the back of the head. No figure carries a bindi, sindoor or mangalsutra:
// marital and community markers are kept off the board, as surnames are.
import { TOP } from "../content.js";

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

  // ---- female: two plaits with ribbons and a frock; one long plait; a sari with the pallu over the shoulder and the
  // hair in a bun; a grey bun, shawl and staff; a sannyāsinī in saffron; the crown ----
  student_f: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "............", "............", "............",
    "....KKKKK...", "...KHHHHHK..", "..KHHSSSSK..", "..KHSSESEK..", "..KHSSSSSK..", ".KHKKSSKKHK.",
    ".KHKCCCCKHK.", ".KCKCCCCKCK.", "..KSCCCCSK..", "..KCCCCCCK..", ".KCCCCCCCCK.", "...KS..SK...", "...KK..KK..."] },
  youth_f: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "............",
    "....KKKK....", "...KHHHHK...", "..KHHSSSSK..", "..KHSSESEK..", "..KHSSSSSK..", ".KHKSSSSK...", ".KHKKSSK....",
    ".KHKCCCCCK..", ".KHCCCCCCCK.", ".KHKCCCCKCK.", ".KCKCCCCKSK.", "..KKwwwwK...", "...KwwwwK...", "..KSK..KSK..", "..KK....KK.."],
    // the plait down the middle of the back, as it is seen on a ladder
    behind: [[6, "...KHHHHK..."], [7, "....KHHK...."], [8, "..KCCHHCCK.."], [9, ".KCCCHHCCCK."], [10, ".KCKCHHCKCK."], [11, ".KSKCKKCKSK."]] },
  householder_f: { back: "H", legsB: ["...KCCCCK...", "...KSKKSK..."], rows: [
    "............",
    "....KKKK....", ".KKKHHHHK...", "KHHKHSSSSK..", ".KKHSSESEK..", "..KHSSSSSK..", "...KSSSSK...", "....KSSK....",
    "..KccCCCCK..", ".KcccCCCCCK.", ".KcKcCCCKCK.", ".KcKCcCCKSK.", "..KKCCcCCK..", "..KCCCCcCK..", "..KCCCCCCK..", "..KSK..KSK.."] },
  forest_f: { back: "G", legsB: ["...KCCCCK.B.", "...KSKKSK.B."], rows: [
    "..........B.",
    "....KKKK..B.", "...KGGGGK.B.", "..KGGSSSSKB.", "..KGSSESEKB.", "..KGSSSSSKB.", ".KGGKSSSK.B.", ".KGGKSSK..B.",
    "..KccccccKB.", ".KcccccccSB.", ".KccccccKKB.", "..KKCCCCK.B.", "..KCCCCCK.B.", "..KCCCCCK.B.", "..KCCCCCCKB.", "..KSK..KSKB."],
    // the knot at the nape, seen from behind on a ladder
    behind: [[6, "...KKGGKK.B."], [7, "..KcKGGKcKB."]] },
  sage_f: { back: "G", legsB: ["...KOOOOK.B.", "...KK..KK.B."], rows: [
    "..........B.",
    "....KKKK..B.", "...KGGGGK.B.", "..KGGSSSSKB.", "..KGSSESEKB.", "..KGSSSSSKB.", "..KGKSSSK.B.", "...KKSSK..B.",
    "..KOOOOCOKB.", ".KOOOOCOOSB.", ".KOKOCOOKKB.", ".KSKCOOOK.B.", "...KOOOOK.B.", "...KooooK.B.", "...KOOOOK.B.", "..KK....KKB."] },
  divine_f: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "...YYYYYY...", "..YKKKKKKY..", ".Y.KYYYYK.Y.", ".YKHSSSSSKY.", ".YKHSSESEKY.", "..KHSSSSSK..", ".KHKSSSSK...", ".KHKKSSK....",
    ".KHYCCCCYK..", ".KYCCCCCCYK.", ".KSKCCCCKSK.", "...KCCCCK...", "...KwwwwK...", "...KwwwwK...", "..KSK..KSK..", "..KK....KK.."] },

  // ---- neutral: the male figures with no facial hair, and hair to the collar ----
  student_n: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "............", "............", "............",
    "....KKKKK...", "...KHHHHHK..", "..KHHSSSSK..", "..KHSSESEK..", "..KHSSSSSK..", "..KHKSSKK...",
    "...KCCCCK...", "..KCCCCCCKKK", "..KSCCCCKRRK", "...KCCCCKRRK", "...KwwwwKKKK", "...KS..SK...", "...KK..KK..."] },
  youth_n: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "............",
    "....KKKK....", "...KHHHHK...", "..KHHSSSSK..", "..KHSSESEK..", "..KHSSSSSK..", "..KHKSSSK...", "...KKSSK....",
    "..KCCCCCCK..", ".KCCCCCCCCK.", ".KCKCCCCKCK.", ".KSKCCCCKSK.", "...KwwwwK...", "...KwwwwK...", "..KSK..KSK..", "..KK....KK.."] },
  householder_n: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "............", "...KKKKKK...", "..KHHHHHHK..", "..KHHHHHSK..", "..KHSSESEK..", "..KHSSSSSK..", "...KSSSSK...", "....KSSK....",
    "..KCCCCCCK..", ".KCCCCCCCCK.", ".KCKCCCCKCK.", ".KSKCCCCKSK.", "...KwwwwK...", "...KwwwwK...", "..KSK..KSK..", "..KK....KK.."] },
  forest_n: { back: "G", legsB: ["....KSSK..B.", "....KKKK..B."], rows: [
    "..........B.",
    "....KKKK..B.", "...KGGGGK.B.", "..KGGSSSSKB.", "..KGSSESEKB.", "..KGSSSSSKB.", "..KGKSSSK.B.", "...KKSSK..B.",
    "..KccccccKB.", ".KcccccccSB.", ".KcKccccKKB.", ".KSKccccK.B.", "...KccccK.B.", "...KccccK.B.", "..KSK..KSKB.", "..KK....KKB."] },
  sage_n: { back: "S", legsB: ["...KOOOOK.B.", "...KK..KK.B."], rows: [
    "..........B.",
    ".....KK...B.", "....KHHK..B.", "...KSSSSK.B.", "..KSSSYSSKB.", "..KSSSESEKB.", "..KSSSSSSKB.", "...KKSSK..B.",
    "..KOOOOCOKB.", ".KOOOOCOOSB.", ".KOKOCOOKKB.", ".KSKCOOOK.B.", "...KOOOOK.B.", "...KooooK.B.", "...KOOOOK.B.", "..KK....KKB."] },
  divine_n: { back: "H", legsB: ["....KSSK....", "....KKKK...."], rows: [
    "...YYYYYY...", "..YKKKKKKY..", ".Y.KYYYYK.Y.", ".YKHSSSSSKY.", ".YKHSSESEKY.", "..KHSSSSSK..", "..KHKSSSK...", "...KKSSK....",
    "..KYCCCCYK..", ".KYCCCCCCYK.", ".KSKCCCCKSK.", "...KCCCCK...", "...KwwwwK...", "...KwwwwK...", "..KSK..KSK..", "..KK....KK.."] },

  // ---- the animal interlude (src/engine/animal.js): each in its own coat, a thread in the player's colour at the neck ----
  tortoise: { legsB: ["KKKKKKKKKKK.", "..KfK.KfK..."], rows: [
    "............", "............", "............", "............", "............", "............", "............", "............",
    "............", "............",
    "..KKKKK.....", ".KTtTtTK.KK.", "KTtTTtTTKfEK", "KtTTtTTtKCfK", "KKKKKKKKKKK.", ".KfK...KfK.."] },
  jackal: { legsB: ["..KfK...KfK.", "..KK.....KK."], rows: [
    "............", "............", "............", "............", "............", "............", "............",
    "........K.K.", ".......KfKfK", ".......KFEFK", ".KKKKKKKCFFK", "KfFFFFFFCKK.", "KfKFFFFFFK..", ".K.KfKKKfK..", "...KfK.KfK..", "...KK...KK.."] },
  // the mongoose stands reared up, as it does to look about, with its tail along the ground behind as a counterweight
  mongoose: { legsB: [".KKKKmKmK...", "....KKKKK..."], rows: [
    "............", "............", "............",
    ".....KKK....", "....KMMEKKK.", "....KMMMMMMK", "....KCCCCK..", "....KMMmMK..", "....KMMmMKK.", "....KMMmMmK.",
    "...KMMMmMK..", "KK.KMMMmMK..", "KmKMMMMmMK..", "KMmMMMMMMK..", ".KKKmKKKmK..", "...KKK.KKK.."] },
  cat: { legsB: ["..KaK...KaK.", "..KK....KK.."], rows: [
    "............", "............", "............", "............", "............", "............", "............",
    "K.......K.K.", "KK.....KAKAK", ".K.....KAEAK", ".K..KKKKAAAK", ".KKKAaAaCKK.", "..KAAaAaAK..", "..KAKKKKAK..", "..KaK..KaK..", "..KK...KK..."] },
  lion: { legsB: [".KfK...KfK..", ".KK....KK..."], rows: [
    "............", "............", "............", "............", "............", "............",
    "......KKKK..", ".....KNNNNK.", "K...KNNFEFFK", "K..KNNNFFFFK", "KKKKNNNCFFK.", "KFFFFNNCKK..", "KFFFFFFFFK..", "KfKKKKKKfK..", "KfK....KfK..", "KK.....KK..."] },
};
// Life stages follow the years lived (REDESIGN.md Phase 8), at the ages of the squares that used to bound them:
// a ladder ages you, a snake does not make you young again, and only the fall from Brahma starts you over.
// Hindi agrees with the player: hiF is the feminine, and neutral takes the masculine, as the rest of the Hindi does.
// गृहस्थ stays for both (गृहिणी is a housewife, not the āśrama).
export const STAGES = [
  { max: 10,   art: "baby",        en: "Baby",           hi: "शिशु" },
  { max: 20,   art: "toddler",     en: "Child",          hi: "बालक",           hiF: "बालिका" },
  { max: 30,   art: "student",     en: "Student",        hi: "विद्यार्थी",       hiF: "विद्यार्थिनी" },
  { max: 40,   art: "youth",       en: "Young scholar",  hi: "युवा विद्यार्थी",  hiF: "युवा विद्यार्थिनी" },
  { max: 60,   art: "householder", en: "Householder",    hi: "गृहस्थ" },
  { max: 80,   art: "forest",      en: "Forest-dweller", hi: "वानप्रस्थी",       hiF: "वानप्रस्थिनी" },
  { max: 100,  art: "sage",        en: "Renunciate",     hi: "संन्यासी",        hiF: "संन्यासिनी" },
  { max: TOP,  art: "divine",      en: "Divine soul",    hi: "दिव्य आत्मा" },
];
export const stageHi = (s, gender) => (gender === "f" && s.hiF) || s.hi;

export const ANIMALS = ["tortoise", "jackal", "mongoose", "cat", "lion"];
// The figures that have a female and a neutral form; the baby and the child are shared.
export const GENDERED = ["student", "youth", "householder", "forest", "sage", "divine"];
// The art for a stage's figure, by gender: "f" female, "n" neutral (the naming's "A child"), anything else male.
export const artOf = (art, gender) => (GENDERED.includes(art) && (gender === "f" || gender === "n") && ART[`${art}_${gender}`]) || ART[art];

// The colours, but for the player's own (C, and c a shade darker), which sprites.js fills in.
export const PAL = {
  K: "#1A1208", S: "#E2A877", H: "#2A1A10", G: "#D9D6CF", W: "#F2F0EA", E: "#1A1208", w: "#F4F1E8",
  O: "#F08A1C", o: "#B85E0A", B: "#7A4B22", Y: "#FFD54A", R: "#3E444C",
  T: "#8C8A3E", t: "#55522A", F: "#C8913F", f: "#7A5424", N: "#7A3E14", A: "#A39C92", a: "#5E574E", M: "#A08C6A", m: "#6A5A44",
};

// The rows of a frame: 0/1 walking, 2/3 climbing (seen from behind). An animal climbs as it walks.
export function framesOf(art, frame) {
  let rows = art.rows.slice();
  if (frame % 2) rows.splice(14, 2, ...art.legsB);
  if (frame >= 2 && art.back) {
    // from behind: everything down to just below the eyes becomes the back of the head
    const eye = rows.findIndex(r => r.includes("E"));
    rows = rows.map((r, y) => (y <= eye + 1 ? r.replace(art.back === "S" ? /[SEWY]/g : /[SEW]/g, art.back) : r));
    for (const [y, r] of art.behind ?? []) rows[y] = r;
  }
  return rows;
}
