// kitchen.js — the kitchen itself: stations, the chef's movement, and every
// interaction (pick, chop, cook, assemble, serve, trash). The game loop calls
// movePlayer and update each frame and interact when the player presses E,
// Space, or clicks a station.
import { INGREDIENTS, stepMatches } from './recipes.js';
import { sfx } from './audio.js';

// Walkable floor: stations line the walls around it.
export const FLOOR = { x: 215, y: 205, w: 885, h: 425 };
export const PLAYER_SPEED = 280;
export const PLAYER_R = 22;

// Station rectangles (canvas coordinates, 1280x800). Each has an id, a label,
// and a rect the chef stands beside.
export const STATIONS = {
  pantry: { id: 'pantry', label: 'PANTRY', x: 24, y: 150, w: 176, h: 480 },
  board: { id: 'board', label: 'CHOPPING BOARD', x: 420, y: 128, w: 220, h: 62 },
  stove: { id: 'stove', label: 'STOVE', x: 700, y: 128, w: 260, h: 62 },
  assembly: { id: 'assembly', label: 'ASSEMBLY COUNTER', x: 420, y: 648, w: 440, h: 66 },
  window: { id: 'window', label: 'SERVING WINDOW', x: 1120, y: 300, w: 136, h: 220 },
  trash: { id: 'trash', label: 'TRASH', x: 24, y: 648, w: 176, h: 66 },
};

// Pantry bins: one per ingredient, stacked down the left wall.
export const PANTRY_BINS = Object.keys(INGREDIENTS).map((ing, i) => ({
  ing,
  x: 36,
  y: 196 + i * 52,
  w: 152,
  h: 44,
}));

export function freshKitchen() {
  return {
    player: { x: 640, y: 430, face: 1 },
    carrying: null, // { ing, prep } or { plated: true, orderId, recipeId }
    board: { item: null, progress: 0, duration: 0 }, // chopping slot
    stove: [
      { item: null, progress: 0, duration: 0 },
      { item: null, progress: 0, duration: 0 },
    ],
    plate: { orderId: null, steps: [] }, // dish mid-assembly on the counter
  };
}

export function movePlayer(kitchen, vec, dt) {
  const p = kitchen.player;
  p.x = Math.min(FLOOR.x + FLOOR.w - PLAYER_R, Math.max(FLOOR.x + PLAYER_R, p.x + vec.x * PLAYER_SPEED * dt));
  p.y = Math.min(FLOOR.y + FLOOR.h - PLAYER_R, Math.max(FLOOR.y + PLAYER_R, p.y + vec.y * PLAYER_SPEED * dt));
  if (vec.x !== 0) p.face = vec.x > 0 ? 1 : -1;
}

function distToRect(px, py, r) {
  const cx = Math.min(Math.max(px, r.x), r.x + r.w);
  const cy = Math.min(Math.max(py, r.y), r.y + r.h);
  return Math.hypot(px - cx, py - cy);
}

export function nearestStation(kitchen, px, py) {
  let best = null;
  let bestD = 110;
  for (const st of Object.values(STATIONS)) {
    const d = distToRect(px, py, st);
    if (d < bestD) { bestD = d; best = st; }
  }
  return best;
}

function pantryBinAt(px, py) {
  for (const bin of PANTRY_BINS) {
    if (px >= bin.x - 40 && px <= bin.x + bin.w + 40 && py >= bin.y - 20 && py <= bin.y + bin.h + 20) return bin;
  }
  return null;
}

function prepDuration(ing, kind) {
  return kind === 'chop' ? INGREDIENTS[ing].chop : INGREDIENTS[ing].cook;
}

function finishPrep(item, kind) {
  return { ing: item.ing, prep: kind === 'chop' ? 'chopped' : 'cooked' };
}

// Advance chopping and cooking jobs; a finished job dings once.
export function updateKitchen(kitchen, state, dt) {
  const b = kitchen.board;
  if (b.item && b.progress < b.duration) {
    b.progress += dt;
    if (b.progress >= b.duration) { b.progress = b.duration; sfx.done(); }
  }
  for (const burner of kitchen.stove) {
    if (burner.item && burner.progress < burner.duration) {
      burner.progress += dt;
      if (burner.progress >= burner.duration) { burner.progress = burner.duration; sfx.done(); }
    }
  }
}

function setMessage(state, text) {
  state.message = text;
  state.messageT = 2.2;
}

// The one interaction: what happens depends on the station and what's in hand.
export function interact(kitchen, state) {
  const p = kitchen.player;
  const st = nearestStation(kitchen, p.x, p.y);
  if (!st) { setMessage(state, 'Walk up to a station first!'); return; }
  const carry = kitchen.carrying;

  if (st.id === 'pantry') {
    if (carry) { setMessage(state, 'Hands full — serve or trash it first!'); return; }
    const bin = pantryBinAt(p.x, p.y);
    const ing = bin ? bin.ing : 'tomato';
    kitchen.carrying = { ing, prep: 'raw' };
    sfx.pickup();
    setMessage(state, `Picked up ${INGREDIENTS[ing].name}`);
    return;
  }

  if (st.id === 'board') {
    const b = kitchen.board;
    if (b.item && b.progress >= b.duration) {
      if (carry) { setMessage(state, 'Hands full!'); return; }
      kitchen.carrying = finishPrep(b.item, 'chop');
      b.item = null; b.progress = 0; sfx.pickup();
      setMessage(state, `Picked up ${INGREDIENTS[kitchen.carrying.ing].name} (chopped)`);
      return;
    }
    if (b.item) { setMessage(state, 'Still chopping…'); return; }
    if (!carry || carry.plated || INGREDIENTS[carry.ing].chop === 0) {
      setMessage(state, 'The board only chops raw veg — lettuce & tomato!');
      return;
    }
    b.item = carry; b.duration = prepDuration(carry.ing, 'chop'); b.progress = 0;
    kitchen.carrying = null; sfx.chop();
    setMessage(state, `Chopping ${INGREDIENTS[b.item.ing].name}…`);
    return;
  }

  if (st.id === 'stove') {
    const burner = kitchen.stove.find((s) => s.item && s.progress >= s.duration)
      || kitchen.stove.find((s) => !s.item);
    if (!burner) { setMessage(state, 'Both burners are busy!'); return; }
    if (burner.item) {
      if (carry) { setMessage(state, 'Hands full!'); return; }
      kitchen.carrying = finishPrep(burner.item, 'cook');
      burner.item = null; burner.progress = 0; sfx.pickup();
      setMessage(state, `Picked up ${INGREDIENTS[kitchen.carrying.ing].name} (cooked)`);
      return;
    }
    if (!carry || carry.plated || INGREDIENTS[carry.ing].cook === 0) {
      setMessage(state, 'The stove cooks patties, eggs, dough & bacon!');
      return;
    }
    burner.item = carry; burner.duration = prepDuration(carry.ing, 'cook'); burner.progress = 0;
    kitchen.carrying = null; sfx.sizzle();
    setMessage(state, `Cooking ${INGREDIENTS[burner.item.ing].name}…`);
    return;
  }

  if (st.id === 'assembly') {
    const plate = kitchen.plate;
    if (carry && carry.plated) { setMessage(state, 'That plate is ready — take it to the window!'); return; }
    if (carry) {
      // Find the open order whose next missing step this item completes.
      const target = state.orders.find((o) => {
        if (plate.orderId && o.id !== plate.orderId) return false;
        const done = plate.steps.length;
        return done < o.steps.length && stepMatches(o.steps[done], carry);
      });
      if (!target) { setMessage(state, 'No order needs that next — check the board!'); sfx.fail(); return; }
      plate.orderId = target.id;
      plate.steps.push({ ...carry });
      kitchen.carrying = null;
      sfx.pickup();
      const done = plate.steps.length;
      setMessage(state, done >= target.steps.length
        ? `${target.name} is plated — serve it at the window!`
        : `${target.name}: ${done}/${target.steps.length} on the plate`);
      return;
    }
    // Empty hands: pick up a finished plate.
    if (plate.orderId && plate.steps.length > 0) {
      const order = state.orders.find((o) => o.id === plate.orderId);
      if (order && plate.steps.length >= order.steps.length) {
        kitchen.carrying = { plated: true, orderId: order.id, recipeId: order.recipeId };
        kitchen.plate = { orderId: null, steps: [] };
        sfx.pickup();
        setMessage(state, `${order.name} ready to serve!`);
        return;
      }
      setMessage(state, 'Plate not finished yet — add the next ingredient!');
      return;
    }
    setMessage(state, 'Bring a finished ingredient here to build a dish.');
    return;
  }

  if (st.id === 'window') {
    if (!carry || !carry.plated) { setMessage(state, 'Bring a finished plate to the window!'); return; }
    const order = state.orders.find((o) => o.id === carry.orderId);
    if (!order) { kitchen.carrying = null; setMessage(state, 'Too late — that order walked out!'); sfx.fail(); return; }
    kitchen.carrying = null;
    return { serve: order };
  }

  if (st.id === 'trash') {
    if (!carry) { setMessage(state, 'Nothing to throw away.'); return; }
    kitchen.carrying = null;
    kitchen.plate = { orderId: null, steps: [] };
    setMessage(state, 'Tossed it. Fresh start!');
    return;
  }
  return null;
}
