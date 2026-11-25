// render.js — everything the player sees, drawn on one canvas: the kitchen,
// the order board, the timer, the chef, the stations, and the title / game-over
// screens. All art is drawn shapes and text — no image files.
import { INGREDIENTS, recipeById, stepLabel } from './recipes.js';
import { FLOOR, STATIONS, PANTRY_BINS } from './kitchen.js';

const W = 1280;
const H = 800;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function progressBar(ctx, x, y, w, h, frac, color) {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  if (frac > 0) {
    rr(ctx, x + 2, y + 2, Math.max(4, (w - 4) * frac), h - 4, (h - 4) / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawIngredient(ctx, ing, prep, x, y, r) {
  const def = INGREDIENTS[ing];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = def.dark;
  ctx.stroke();
  text(ctx, def.glyph, x, y + 1, Math.round(r * 0.9), def.dark, 'center');
  if (prep === 'chopped') {
    // One diagonal slice mark: reads as "cut", never as a fail cross.
    ctx.strokeStyle = def.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.4);
    ctx.lineTo(x + r * 0.5, y + r * 0.4);
    ctx.stroke();
  }
  if (prep === 'cooked') {
    ctx.fillStyle = 'rgba(120,60,20,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlate(ctx, steps, x, y, scale = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, 46 * scale, 34 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f4f1e6';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#b9b2a0';
  ctx.stroke();
  steps.forEach((s, i) => {
    drawIngredient(ctx, s.ing, s.prep, x - (steps.length - 1) * 16 * scale + i * 32 * scale, y, 15 * scale);
  });
}

function drawOrderCard(ctx, order, x, y, w) {
  const frac = Math.max(0, order.left / order.patience);
  const urgent = frac < 0.3;
  rr(ctx, x, y, w, 92, 12);
  ctx.fillStyle = urgent ? '#5a2320' : '#2e2118';
  ctx.fill();
  ctx.lineWidth = urgent ? 3 : 2;
  ctx.strokeStyle = urgent ? '#ff5a4e' : order.color;
  ctx.stroke();
  text(ctx, order.name, x + 12, y + 18, 17, '#fff');
  text(ctx, `$${order.price}`, x + w - 12, y + 18, 17, '#ffd34d', 'right');
  const recipe = recipeById(order.recipeId);
  recipe.steps.forEach((s, i) => {
    const done = false;
    drawIngredient(ctx, s.ing, s.prep, x + 26 + i * 44, y + 52, 14);
    void done;
  });
  text(ctx, recipe.steps.map((s) => INGREDIENTS[s.ing].name).join(' + '), x + 12, y + 76, 11, '#d8cbb8', 'left', false);
  progressBar(ctx, x + 12, y + 84, w - 24, 6, frac, urgent ? '#ff5a4e' : '#7ec850');
  text(ctx, `${Math.ceil(order.left)}s`, x + w - 12, y + 52, 14, urgent ? '#ff8a80' : '#fff', 'right');
}

export function render(ctx, state, kitchen, hoverStation) {
  // Floor and walls.
  ctx.fillStyle = '#241a12';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3d2c1c';
  ctx.fillRect(0, 110, W, 10);
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(FLOOR.x - 8, FLOOR.y - 8, FLOOR.w + 16, FLOOR.h + 16);
  ctx.fillStyle = '#c9a06a';
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  // Floor tiles.
  ctx.strokeStyle = 'rgba(90,60,30,0.25)';
  ctx.lineWidth = 1;
  for (let x = FLOOR.x; x <= FLOOR.x + FLOOR.w; x += 55) {
    ctx.beginPath(); ctx.moveTo(x, FLOOR.y); ctx.lineTo(x, FLOOR.y + FLOOR.h); ctx.stroke();
  }
  for (let y = FLOOR.y; y <= FLOOR.y + FLOOR.h; y += 55) {
    ctx.beginPath(); ctx.moveTo(FLOOR.x, y); ctx.lineTo(FLOOR.x + FLOOR.w, y); ctx.stroke();
  }

  drawStations(ctx, state, kitchen, hoverStation);
  drawChef(ctx, kitchen);
  drawOrderBoard(ctx, state);
  drawHud(ctx, state, kitchen);

  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'over') drawGameOver(ctx, state);
}

function drawStations(ctx, state, kitchen, hoverStation) {
  // Pantry with ingredient bins.
  rr(ctx, STATIONS.pantry.x, STATIONS.pantry.y, STATIONS.pantry.w, STATIONS.pantry.h, 10);
  ctx.fillStyle = '#4a3421';
  ctx.fill();
  text(ctx, 'PANTRY', STATIONS.pantry.x + 88, STATIONS.pantry.y + 16, 15, '#ffd34d', 'center');
  for (const bin of PANTRY_BINS) {
    rr(ctx, bin.x, bin.y, bin.w, bin.h, 8);
    ctx.fillStyle = '#2e2118';
    ctx.fill();
    ctx.strokeStyle = INGREDIENTS[bin.ing].dark;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIngredient(ctx, bin.ing, 'raw', bin.x + 24, bin.y + 22, 13);
    text(ctx, INGREDIENTS[bin.ing].name, bin.x + 44, bin.y + 22, 14, '#fff');
    const tag = INGREDIENTS[bin.ing].chop ? 'chop' : INGREDIENTS[bin.ing].cook ? 'cook' : 'ready';
    text(ctx, tag, bin.x + bin.w - 8, bin.y + 22, 11, '#d8cbb8', 'right', false);
  }

  // Chopping board.
  const b = STATIONS.board;
  rr(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fillStyle = hoverStation === b ? '#7a5a35' : '#5a4028';
  ctx.fill();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = hoverStation === b ? 3 : 1;
  ctx.stroke();
  text(ctx, 'CHOPPING BOARD', b.x + 110, b.y + 14, 13, '#ffd34d', 'center');
  if (kitchen.board.item) {
    drawIngredient(ctx, kitchen.board.item.ing, 'raw', b.x + 40, b.y + 38, 13);
    progressBar(ctx, b.x + 62, b.y + 30, 130, 14, kitchen.board.progress / kitchen.board.duration,
      kitchen.board.progress >= kitchen.board.duration ? '#7ec850' : '#ffb03a');
    text(ctx, kitchen.board.progress >= kitchen.board.duration ? 'CHOPPED!' : 'chopping…',
      b.x + 62, b.y + 52, 11, '#fff', 'left', false);
  } else {
    text(ctx, 'bring lettuce / tomato', b.x + 110, b.y + 38, 12, '#d8cbb8', 'center', false);
  }

  // Stove with two burners.
  const s = STATIONS.stove;
  rr(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.fillStyle = hoverStation === s ? '#6e3a2e' : '#542e26';
  ctx.fill();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = hoverStation === s ? 3 : 1;
  ctx.stroke();
  text(ctx, 'STOVE', s.x + 130, s.y + 14, 13, '#ffd34d', 'center');
  kitchen.stove.forEach((burner, i) => {
    const cx = s.x + 62 + i * 130;
    ctx.beginPath();
    ctx.arc(cx, s.y + 40, 20, 0, Math.PI * 2);
    ctx.fillStyle = burner.item ? '#c0392b' : '#333';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#999';
    ctx.stroke();
    if (burner.item) {
      drawIngredient(ctx, burner.item.ing, 'raw', cx, s.y + 40, 13);
      progressBar(ctx, cx - 26, s.y + 56, 52, 5,
        burner.progress / burner.duration,
        burner.progress >= burner.duration ? '#7ec850' : '#ff5a4e');
    }
  });

  // Assembly counter with the plate.
  const a = STATIONS.assembly;
  rr(ctx, a.x, a.y, a.w, a.h, 10);
  ctx.fillStyle = hoverStation === a ? '#7a5a35' : '#5a4028';
  ctx.fill();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = hoverStation === a ? 3 : 1;
  ctx.stroke();
  text(ctx, 'ASSEMBLY COUNTER', a.x + 110, a.y + 14, 13, '#ffd34d', 'center');
  if (kitchen.plate.orderId) {
    const order = state.orders.find((o) => o.id === kitchen.plate.orderId);
    drawPlate(ctx, kitchen.plate.steps, a.x + 190, a.y + 40, 0.9);
    if (order) {
      const done = kitchen.plate.steps.length >= order.steps.length;
      text(ctx, `${order.name}: ${kitchen.plate.steps.length}/${order.steps.length}${done ? ' — READY!' : ''}`,
        a.x + 320, a.y + 40, 15, done ? '#7ec850' : '#fff');
    }
  } else {
    text(ctx, 'build dishes here — plate in order', a.x + 220, a.y + 40, 13, '#d8cbb8', 'center', false);
  }

  // Serving window.
  const w = STATIONS.window;
  rr(ctx, w.x, w.y, w.w, w.h, 10);
  ctx.fillStyle = hoverStation === w ? '#3a5a2e' : '#2e4a24';
  ctx.fill();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = hoverStation === w ? 3 : 1;
  ctx.stroke();
  text(ctx, 'SERVE', w.x + 68, w.y + 22, 17, '#ffd34d', 'center');
  text(ctx, 'WINDOW', w.x + 68, w.y + 44, 17, '#ffd34d', 'center');
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('→', w.x + 68, w.y + 110);
  text(ctx, 'bring finished', w.x + 68, w.y + 150, 12, '#d8cbb8', 'center', false);
  text(ctx, 'plates here', w.x + 68, w.y + 168, 12, '#d8cbb8', 'center', false);

  // Trash.
  const t = STATIONS.trash;
  rr(ctx, t.x, t.y, t.w, t.h, 10);
  ctx.fillStyle = '#333';
  ctx.fill();
  text(ctx, 'TRASH — drop mistakes', t.x + 88, t.y + 33, 13, '#bbb', 'center', false);
}

function drawChef(ctx, kitchen) {
  const p = kitchen.player;
  // Shadow.
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 20, 20, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  // Body (apron) and head.
  ctx.beginPath();
  ctx.arc(p.x, p.y + 8, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#f4f1e6';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(p.x, p.y - 14, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c8a0';
  ctx.fill();
  // Chef hat.
  ctx.beginPath();
  ctx.arc(p.x - 7, p.y - 24, 8, 0, Math.PI * 2);
  ctx.arc(p.x + 7, p.y - 24, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.fillRect(p.x - 14, p.y - 28, 28, 8);
  // Eyes look in facing direction.
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(p.x - 5 + p.face * 2, p.y - 14, 2, 0, Math.PI * 2);
  ctx.arc(p.x + 5 + p.face * 2, p.y - 14, 2, 0, Math.PI * 2);
  ctx.fill();
  // Carried item above the head.
  const c = kitchen.carrying;
  if (c) {
    if (c.plated) {
      drawPlate(ctx, recipeById(c.recipeId).steps, p.x, p.y - 52, 0.75);
    } else {
      drawIngredient(ctx, c.ing, c.prep, p.x, p.y - 50, 14);
    }
  }
}

function drawOrderBoard(ctx, state) {
  ctx.fillStyle = '#1a120b';
  ctx.fillRect(0, 0, W, 110);
  text(ctx, 'ORDER BOARD', 24, 26, 20, '#ffd34d');
  if (state.orders.length === 0) {
    text(ctx, 'No orders yet — the lunch rush is coming…', 200, 30, 16, '#d8cbb8', 'left', false);
  }
  state.orders.slice(0, 3).forEach((o, i) => drawOrderCard(ctx, o, 180 + i * 250, 10, 240));
  if (state.orders.length > 3) text(ctx, `+${state.orders.length - 3} more`, 930, 56, 15, '#fff');
}

function drawHud(ctx, state, kitchen) {
  // Shift timer — big, top right is taken by the board, so put it bottom-left of the board row.
  const frac = Math.max(0, state.timeLeft / 150);
  const mins = Math.floor(state.timeLeft / 60);
  const secs = Math.floor(state.timeLeft % 60);
  const low = state.timeLeft <= 30;
  text(ctx, 'SHIFT', 24, 58, 13, '#d8cbb8');
  text(ctx, `${mins}:${String(secs).padStart(2, '0')}`, 24, 88, 30, low ? '#ff5a4e' : '#fff');
  progressBar(ctx, 110, 78, 60, 10, frac, low ? '#ff5a4e' : '#ffd34d');

  // Score, coins, served — right-aligned at the canvas edge, clear of the cards.
  text(ctx, `SCORE  ${state.score}`, 1260, 26, 20, '#fff', 'right');
  text(ctx, `COINS  $${state.coins}`, 1260, 52, 16, '#ffd34d', 'right');
  text(ctx, `SERVED ${state.served}   MISSED ${state.missed}   COMBO x${state.combo}`,
    1260, 78, 14, '#d8cbb8', 'right', false);

  // Controls hint along the bottom.
  text(ctx, 'WASD / Arrows move  •  E / Space / Click: use station  •  R: restart  •  M: mute',
    640, 788, 13, '#cbb98f', 'center', false);

  // Carried item label.
  const c = kitchen.carrying;
  if (c) {
    const label = c.plated ? `Carrying: ${recipeById(c.recipeId).name} (serve it!)` : `Carrying: ${stepLabel(c)}`;
    rr(ctx, 480, 740, 320, 34, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    text(ctx, label, 640, 758, 15, '#fff', 'center');
  }

  // Toast message.
  // Toast message — just below the station row, clear of the board and stove.
  if (state.message && state.messageT > 0) {
    ctx.globalAlpha = Math.min(1, state.messageT);
    rr(ctx, 340, 204, 600, 32, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    text(ctx, state.message, 640, 221, 16, '#ffd34d', 'center');
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(20,12,6,0.82)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'RUSH HOUR KITCHEN', 640, 220, 64, '#ffd34d', 'center');
  text(ctx, 'The lunch rush is on. Cook every order before the shift ends!', 640, 290, 22, '#fff', 'center', false);
  text(ctx, '1. Grab ingredients from the PANTRY', 640, 360, 20, '#d8cbb8', 'center', false);
  text(ctx, '2. Chop veg on the BOARD, cook on the STOVE', 640, 395, 20, '#d8cbb8', 'center', false);
  text(ctx, '3. Build the dish on the ASSEMBLY COUNTER, in order', 640, 430, 20, '#d8cbb8', 'center', false);
  text(ctx, '4. Serve finished plates at the WINDOW before orders expire', 640, 465, 20, '#d8cbb8', 'center', false);
  text(ctx, 'Move: WASD / Arrows    •    Use station: E / Space / Click', 640, 530, 18, '#fff', 'center');
  text(ctx, 'Press ENTER or click to start the shift', 640, 590, 24, '#7ec850', 'center');
  text(ctx, 'Orders get faster and hungrier as the rush builds. Tips grow with your combo!', 640, 640, 15, '#cbb98f', 'center', false);
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(20,12,6,0.85)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'SHIFT OVER!', 640, 260, 56, '#ffd34d', 'center');
  text(ctx, `Score: ${state.score}    •    Dishes served: ${state.served}    •    Orders missed: ${state.missed}`,
    640, 340, 22, '#fff', 'center');
  text(ctx, state.served >= 8 ? 'Head chef material — the crowd loved it!'
    : state.served >= 4 ? 'A solid shift. The rush will be back tomorrow.'
    : 'A tough shift… practise the route: pantry → board → stove → plate → window.',
    640, 400, 19, '#d8cbb8', 'center', false);
  text(ctx, 'Press R or click to cook again', 640, 480, 24, '#7ec850', 'center');
}
