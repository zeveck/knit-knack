// scarfFacts.js — the Infinite Scarf's milestones (the comparison pictures), the "Someday…" goals, the
// knitting facts that arrive in between, and the schedule that places them. Every fact is worded with
// "about"; heights are the milestone lengths the design sets.

// cm: the length at which the scarf becomes taller than it (also the thing's drawn height)
export const MILESTONES = [
  { cm: 10, name: 'a mug', img: 'cmp-01-mug', fact: 'A typical mug is about 10 cm tall and holds about 300 ml of tea.' },
  { cm: 20, name: 'a pencil, stood up', img: 'cmp-02-pencil', fact: 'A new wooden pencil is about 19 cm long. Its "lead" is really graphite mixed with clay.' },
  { cm: 30, name: 'a school ruler, stood up', img: 'cmp-03-ruler', fact: 'A school ruler is about 30 cm long: about 12 inches, or one foot.' },
  { cm: 38, name: 'a bowling pin', img: 'cmp-04-bowling-pin', fact: 'A ten-pin bowling pin is about 38 cm tall and weighs about 1.5 kg.' },
  { cm: 75, name: 'a kitchen table', img: 'cmp-05-kitchen-table', fact: 'Most tables are about 75 cm tall, a comfy height for sitting at.' },
  { cm: 100, name: 'a guitar, stood up', img: 'cmp-06-guitar', fact: 'A full-size acoustic guitar is about 1 m long, from the end of its body to the top of its head.', unlock: 'Sparkle yarn' },
  { cm: 110, name: 'an emperor penguin', img: 'cmp-07-emperor-penguin', fact: 'Emperor penguins, the tallest penguins, stand about 1.1 m tall and can dive more than about 500 m deep.' },
  { cm: 180, name: 'a grown-up', img: 'cmp-08-grown-up', fact: 'A tall grown-up stands about 1.8 m. Most grown-ups are about 1.5 to 1.9 m tall.' },
  { cm: 200, name: 'a front door', img: 'cmp-09-front-door', fact: 'A front door is usually about 2 m tall and about 90 cm wide.' },
  { cm: 300, name: 'a basketball hoop', img: 'cmp-10-basketball-hoop', fact: 'A basketball hoop\'s rim is 10 feet off the floor: about 3.05 m.', unlock: 'Glow yarn' },
  { cm: 440, name: 'a double-decker bus', short: 'a bus', img: 'cmp-11-double-decker-bus', fact: 'A London double-decker bus is about 4.4 m tall.' },
  { cm: 550, name: 'a giraffe', img: 'cmp-12-giraffe', fact: 'Giraffes are the tallest animals: a big male is about 5.5 m tall, and his neck alone is about 1.8 m long.' },
  { cm: 750, name: 'a two-storey house', img: 'cmp-13-house', fact: 'A two-storey house is about 7 to 8 m tall to the top of its roof.' },
  { cm: 1000, name: 'an Olympic diving tower', short: 'a diving tower', img: 'cmp-14-diving-tower', fact: 'The highest Olympic diving platform is 10 m up. Divers hit the water at about 50 km/h.' },
  { cm: 1300, name: 'a Brachiosaurus', img: 'cmp-15-brachiosaurus', fact: 'A Brachiosaurus could raise its head about 12 to 13 m high, about as tall as a four-storey building.' },
  { cm: 2000, name: 'a big oak tree', img: 'cmp-16-oak', fact: 'A big oak tree is about 20 m tall, and an oak can live for about 1,000 years.' },
  { cm: 3000, name: 'a blue whale, stood on its tail', short: 'a blue whale', img: 'cmp-17-blue-whale', fact: 'Blue whales, the biggest animals known, grow to about 30 m long. A blue whale\'s heart weighs about 180 kg.' },
  { cm: 4600, name: 'the Statue of Liberty (heel to torch)', short: 'Statue of Liberty', img: 'cmp-18-statue-of-liberty', fact: 'From heel to torch the Statue of Liberty is about 46 m tall. Her index finger is about 2.4 m long.' },
  { cm: 5600, name: 'the Leaning Tower of Pisa', short: 'Pisa\'s tower', img: 'cmp-19-leaning-tower-of-pisa', fact: 'The Leaning Tower of Pisa is about 56 m tall and leans by about 4 degrees.' },
  { cm: 11600, name: 'the tallest tree, a coast redwood', short: 'a coast redwood', img: 'cmp-20-coast-redwood', fact: 'The tallest known tree, a coast redwood called Hyperion, is about 116 m tall.' },
];

// beyond the pictures: code-drawn silhouettes
export const SOMEDAY = [
  { cm: 33000, name: 'the Eiffel Tower', sil: 'eiffel', fact: 'The Eiffel Tower is about 330 m tall, antennas included.' },
  { cm: 82800, name: 'the Burj Khalifa', sil: 'burj', fact: 'The Burj Khalifa, the world\'s tallest building, is about 828 m tall.' },
  { cm: 885000, name: 'Mount Everest', sil: 'everest', fact: 'Mount Everest rises about 8.85 km above sea level.' },
  { cm: 10000000, name: 'the edge of space', sil: 'space', fact: 'Space is usually said to start about 100 km up, at the Kármán line.' },
  { cm: 40000000, name: 'up to the space station', sil: 'iss', fact: 'The International Space Station flies about 400 km up and goes round the Earth about every 90 minutes.' },
  { cm: 4007500000, name: 'long enough to wrap once round the Earth', sil: 'earth', fact: 'The Earth is about 40,075 km round at the equator.' },
  { cm: 38440000000, name: 'to the Moon', sil: 'moon', fact: 'The Moon is about 384,400 km away. Purl is very impressed.' },
];
export const GOALS = [...MILESTONES, ...SOMEDAY];

// about 40 knitting facts, shown in order as the scarf grows
export const FACTS = [
  'The oldest knitted socks we know of are about 1,000 years old, from Egypt. They were knit in the round, in blue and white cotton.',
  'The word "knit" comes from the Old English "cnyttan", to tie in a knot, a word about 1,000 years old.',
  'Every row of this scarf adds about 1 cm, so each metre is 100 rows and 1,200 stitches.',
  'Garter stitch makes a ridge every 2 rows, so a garter scarf like this one has about one ridge for every 2 cm.',
  'A purl stitch is just a knit stitch seen from the back. In garter stitch, about half the stitches you see on the front are purl bumps.',
  'The stocking frame, a knitting machine, was invented by William Lee in England in 1589, about 435 years ago.',
  'Queen Elizabeth I was given her first pair of knitted silk stockings in about 1561, and is said never to have worn cloth stockings again.',
  'Stocking stitch (stockinette) is named after stockings, which were knit by hand in Europe from about the 1500s.',
  'Fair Isle knitting is named after Fair Isle, a tiny Shetland island about 5 km long.',
  'Traditional Fair Isle uses only 2 colours in any one row, though a whole sweater may use about 5 to 10.',
  'Aran sweaters come from the Aran Islands off the west coast of Ireland, and became famous around the world in about the 1950s.',
  'Cables are made by knitting stitches out of order, often holding a few on a short cable needle about 10 to 15 cm long.',
  'A bobble is made by working about 3 to 5 stitches into one stitch, then knitting them back down to one.',
  'Lace is made with yarn-overs, holes made on purpose, each paired with a decrease so the stitch count stays about the same.',
  'Shetland lace shawls can be so fine that a shawl about 2 m across will pass through a wedding ring.',
  'Lace knitting has been a Shetland tradition since about the 1840s.',
  'Sheep were first kept by people about 10,000 years ago.',
  'There are about 1.2 billion sheep in the world.',
  'Most sheep are shorn about once a year, usually in spring.',
  'Australia grows about a quarter of the world\'s wool.',
  'In 2015 a merino sheep named Chris was found carrying a fleece of about 41 kg, a world record.',
  'Fine merino wool fibres are about 20 microns thick, much thinner than a human hair (about 70 microns).',
  'Wool can take up about 30% of its own weight in water vapour and still feel dry.',
  'Mohair comes from Angora goats, not rabbits. Their hair grows about 2.5 cm a month, and they are shorn about twice a year.',
  'A cashmere goat gives only about 150 g of fine cashmere a year.',
  'An alpaca grows about 2 to 4 kg of fleece a year.',
  'A single silkworm cocoon is one thread about 300 to 900 m long.',
  'Cotton fibres, the fluffy hairs on the cotton plant\'s seeds, are about 3 cm long.',
  'A 100 g ball of medium (worsted) wool is about 200 m long.',
  'Fine lace yarn can run to about 800 m in just 100 g.',
  'A 100 g ball of sock yarn is about 400 m long, enough for about one pair of grown-up socks.',
  'Thin sock yarn knits about 7 or 8 stitches to the inch; super chunky yarn, like this scarf, about 2.',
  'A gauge (tension) swatch is usually about 10 cm square.',
  'A US size 8 knitting needle is about 5 mm across.',
  'Old British needle sizes counted down: an old UK size 8 is about 4 mm, and a bigger number meant a thinner needle.',
  'Hazel Tindall from Shetland once knit 262 stitches in 3 minutes: about 1.5 stitches a second.',
  'About a hundred years ago, during World War I, millions of people knit socks and scarves for soldiers.',
  'World Wide Knit in Public Day began in 2005, about 20 years ago, and is held every June.',
  'Felting shrinks wool with heat, water and rubbing; a felted piece can shrink by about a third.',
  'A grown-up\'s sweater in medium yarn takes about 30,000 stitches or more.',
];

// The fact slots: every 25 cm up to 2 m, every 50 cm up to 10 m, every 1 m up to 50 m, then every 5 m.
// A slot within 10 cm of a comparison is skipped. Slots take FACTS in order, then become stat cards.
let SLOTS = null;
export function factSlots(upTo = 1e7) {
  if (SLOTS && SLOTS.max >= upTo) return SLOTS.list;
  const list = [];
  const near = (cm) => GOALS.some((m) => Math.abs(m.cm - cm) <= 10);
  const add = (cm) => { if (!near(cm)) list.push(cm); };
  for (let c = 25; c <= 200; c += 25) add(c);
  for (let c = 250; c <= 1000; c += 50) add(c);
  for (let c = 1100; c <= 5000; c += 100) add(c);
  for (let c = 5500; c <= upTo; c += 500) add(c);
  SLOTS = { max: upTo, list };
  return list;
}
// what lands at slot j: a fact, or a stat card once the facts run out
export function slotCard(j) { return j < FACTS.length ? { kind: 'fact', text: FACTS[j], n: j } : { kind: 'stat', n: j - FACTS.length }; }

export const goalAfter = (cm) => GOALS.find((m) => m.cm > cm) || null;
export const lastPassed = (cm) => { let b = null; for (const m of MILESTONES) if (m.cm <= cm) b = m; return b; };
// one formatter for every length shown (the scarf's rolling counter uses the same steps)
export function fmtLen(cm) {
  if (cm >= 100000) { const km = cm / 100000; return `${km >= 100 ? Math.round(km).toLocaleString('en-US') : km.toFixed(2)} km`; }
  if (cm >= 100) { const m = cm / 100; return `${m.toLocaleString('en-US', { minimumFractionDigits: m >= 100 ? 1 : 2, maximumFractionDigits: m >= 100 ? 1 : 2 })} m`; }
  return `${Math.floor(cm)} cm`;
}
