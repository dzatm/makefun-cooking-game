// Sizzle & Serve — Dapur Kilat. Every tuning number, colour and recipe in one place.
// The kitchen is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One work shift lasts this long; when it hits zero the shift is over. */
export const SHIFT_SECONDS = 150;

/** Missed (expired) orders cost a heart; three missed orders end the shift early. */
export const HEARTS = 3;

/** Score target shown on the end screen: reach it and the shift is a triumph. */
export const TARGET_SCORE = 900;

export const CHEF = {
  speed: 430,
  minX: 48,
  maxX: 1232,
  /** Hands hold at most this many loose ingredients at once. */
  hands: 2,
  /** How close the chef must stand to a station to use it. */
  reach: 96,
};

/** Chopping: each press of the action key adds this much progress. */
export const CHOP_PER_PRESS = 0.34;
/** Grilling: seconds for a raw patty to cook, and when it burns after that. */
export const GRILL_COOK_SECONDS = 5;
export const GRILL_BURN_SECONDS = 9.5;

/** Order patience and how often a new ticket appears. */
export const ORDER = {
  patience: 55,
  firstDelay: 4,
  interval: 14,
  intervalMin: 9,
  intervalStep: 0.92,
  maxActive: 3,
};

/** Scoring: a served dish pays its base plus a tip for the patience left on its ticket. */
export const SCORE = {
  base: 100,
  tipMax: 50,
  comboBonus: 15,
};

/**
 * Every ingredient the kitchen knows, keyed by id. `prep` names the station that turns
 * the raw form into the served form: chop for the board, grill for the grill.
 * An ingredient with no prep goes straight from its bin onto the plate.
 */
export const ITEMS = {
  bun: { name: 'Roti', colour: '#e8b06a', dark: '#b97f3e', prep: null, servesAs: 'bun' },
  tomato: { name: 'Tomat', colour: '#e84a3a', dark: '#a92c20', prep: 'chop', servesAs: 'tomatoChopped' },
  lettuce: { name: 'Selada', colour: '#5fbf4a', dark: '#3a8a2e', prep: 'chop', servesAs: 'lettuceChopped' },
  cheese: { name: 'Keju', colour: '#f6c945', dark: '#c99a17', prep: null, servesAs: 'cheese' },
  pattyRaw: { name: 'Daging Mentah', colour: '#d97b8f', dark: '#a34a5e', prep: 'grill', servesAs: 'pattyCooked' },
  tomatoChopped: { name: 'Tomat Iris', colour: '#ef6a55', dark: '#a92c20', prep: null, servesAs: 'tomatoChopped' },
  lettuceChopped: { name: 'Selada Iris', colour: '#7ed465', dark: '#3a8a2e', prep: null, servesAs: 'lettuceChopped' },
  pattyCooked: { name: 'Daging Panggang', colour: '#8a5a33', dark: '#5e3a1e', prep: null, servesAs: 'pattyCooked' },
  pattyBurnt: { name: 'Daging Gosong', colour: '#2e2a28', dark: '#171412', prep: null, servesAs: 'pattyBurnt' },
};

/** The menu: each dish is a name, the ticket's colour, and the plate it needs. */
export const RECIPES = [
  { key: 'burgerKilat', name: 'Burger Kilat', colour: '#f6a93c', items: ['bun', 'pattyCooked', 'lettuceChopped'] },
  { key: 'saladPelangi', name: 'Salad Pelangi', colour: '#58b368', items: ['tomatoChopped', 'lettuceChopped', 'cheese'] },
  { key: 'kejuLeleh', name: 'Keju Leleh', colour: '#f6c945', items: ['bun', 'pattyCooked', 'cheese'] },
  { key: 'veggieDelight', name: 'Veggie Delight', colour: '#7ed465', items: ['bun', 'tomatoChopped', 'lettuceChopped', 'cheese'] },
  { key: 'doubleSizzle', name: 'Double Sizzle', colour: '#e84a3a', items: ['bun', 'pattyCooked', 'pattyCooked', 'cheese'] },
];

/**
 * The back counter, left to right. A bin hands out one ingredient; the board chops;
 * the grill cooks (two slots); the plate is where a dish is assembled; the window
 * is where a finished plate is served. `x` is the station's centre on the counter.
 */
export const STATIONS = [
  { id: 'bin-bun', kind: 'bin', item: 'bun', x: 96, label: 'Roti' },
  { id: 'bin-tomato', kind: 'bin', item: 'tomato', x: 176, label: 'Tomat' },
  { id: 'bin-lettuce', kind: 'bin', item: 'lettuce', x: 256, label: 'Selada' },
  { id: 'bin-cheese', kind: 'bin', item: 'cheese', x: 336, label: 'Keju' },
  { id: 'bin-patty', kind: 'bin', item: 'pattyRaw', x: 416, label: 'Daging' },
  { id: 'board', kind: 'board', x: 556, label: 'Talenan' },
  { id: 'grill', kind: 'grill', x: 748, label: 'Panggangan' },
  { id: 'plate', kind: 'plate', x: 956, label: 'Piring Saji' },
  { id: 'serve', kind: 'serve', x: 1152, label: 'Jendela Saji' },
];

export const PALETTE = {
  wall: '#f3d9a4',
  wallStripe: '#eec887',
  floor: '#c98d5f',
  floorTile: '#b57a4e',
  counter: '#8a5a33',
  counterTop: '#a9743f',
  counterEdge: '#6e4525',
  steel: '#c8ccd4',
  steelDark: '#9aa0ab',
  board: '#2b2f38',
  text: '#2b2118',
  cream: '#fff6e3',
  panel: '#fff1d0',
  ticket: '#fffdf5',
  danger: '#d63c2f',
  good: '#2f9e44',
  accent: '#e8590c',
  gold: '#f6c945',
  shadow: 'rgba(43, 33, 24, 0.25)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best shift score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
