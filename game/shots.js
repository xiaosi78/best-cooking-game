// shots.js — staged game states for screenshots, driven by ?shot=.
// The game reads the query string on load; each preset pre-places orders, a
// dish mid-assembly, a finished plate, or a low timer so the four screenshots
// together show the whole game. Normal play (?shot absent) is unaffected.
import { makeOrder } from './orders.js';
import { recipeById } from './recipes.js';

function orderWith(state, recipeId, left, patience) {
  const o = makeOrder(0.4, 0);
  const recipe = recipeById(recipeId);
  o.recipeId = recipe.id;
  o.name = recipe.name;
  o.price = recipe.price;
  o.color = recipe.color;
  o.steps = recipe.steps.map((s) => ({ ...s }));
  o.patience = patience;
  o.left = left;
  return o;
}

export function applyShot(state, kitchen, shot) {
  state.screen = 'playing';
  // No fresh spawns while a screenshot is staged: the preset orders are the shot.
  state.spawnT = 999;
  if (shot === 'start') {
    // Fresh shift: two orders on the board, chef by the pantry, full timer.
    state.timeLeft = 150;
    state.orders = [
      orderWith(state, 'burger', 38, 42),
      orderWith(state, 'salad', 30, 40),
    ];
    kitchen.player.x = 300;
    kitchen.player.y = 300;
    kitchen.carrying = { ing: 'tomato', prep: 'raw' };
    state.message = 'Grab ingredients, chop & cook, plate, serve!';
    state.messageT = 9;
    return;
  }
  if (shot === 'assembly') {
    // A burger mid-assembly: bun + cooked patty already on the plate.
    state.timeLeft = 118;
    state.score = 24;
    state.coins = 24;
    state.served = 1;
    state.orders = [
      orderWith(state, 'burger', 30, 42),
      orderWith(state, 'pizza', 34, 40),
      orderWith(state, 'salad', 18, 38),
    ];
    kitchen.plate = {
      orderId: state.orders[0].id,
      steps: [
        { ing: 'bun', prep: 'raw' },
        { ing: 'patty', prep: 'cooked' },
      ],
    };
    kitchen.carrying = { ing: 'lettuce', prep: 'chopped' };
    kitchen.player.x = 640;
    kitchen.player.y = 600;
    kitchen.board = { item: { ing: 'tomato', prep: 'raw' }, progress: 1.1, duration: 1.6 };
    state.message = 'Burger: 2/4 on the plate — add chopped lettuce!';
    state.messageT = 9;
    return;
  }
  if (shot === 'serve') {
    // A finished plate in hand at the window, order nearly done.
    state.timeLeft = 96;
    state.score = 52;
    state.coins = 52;
    state.served = 3;
    state.combo = 3;
    state.orders = [
      orderWith(state, 'salad', 26, 40),
      orderWith(state, 'breakfast', 32, 40),
    ];
    kitchen.carrying = { plated: true, orderId: state.orders[0].id, recipeId: 'salad' };
    kitchen.player.x = 1060;
    kitchen.player.y = 410;
    kitchen.stove[0] = { item: { ing: 'egg', prep: 'raw' }, progress: 2.0, duration: 2.4 };
    state.message = 'Garden Salad plated — serve it at the window!';
    state.messageT = 9;
    return;
  }
  if (shot === 'rush') {
    // The rush: timer nearly out, four orders, one almost expired, plate ready.
    state.timeLeft = 24;
    state.score = 88;
    state.coins = 88;
    state.served = 5;
    state.combo = 2;
    state.orders = [
      orderWith(state, 'burger', 6, 42),
      orderWith(state, 'pizza', 14, 40),
      orderWith(state, 'salad', 22, 38),
      orderWith(state, 'breakfast', 28, 40),
    ];
    kitchen.plate = {
      orderId: state.orders[1].id,
      steps: [
        { ing: 'dough', prep: 'cooked' },
        { ing: 'tomato', prep: 'chopped' },
        { ing: 'cheese', prep: 'raw' },
      ],
    };
    kitchen.player.x = 640;
    kitchen.player.y = 600;
    kitchen.board = { item: { ing: 'lettuce', prep: 'raw' }, progress: 0.7, duration: 1.6 };
    kitchen.stove[1] = { item: { ing: 'bacon', prep: 'raw' }, progress: 1.4, duration: 2.6 };
    state.message = 'RUSH! 24 seconds left — serve the flatbread!';
    state.messageT = 9;
  }
}
