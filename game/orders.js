// orders.js — the order board: spawning orders, their patience timers, and
// scoring when a dish is served on time, late, or never.
import { RECIPES } from './recipes.js';

let nextOrderId = 1;

export function makeOrder(difficulty, now) {
  // Difficulty 0..1 unlocks the wider menu as the shift heats up.
  const pool = RECIPES.slice(0, difficulty < 0.25 ? 2 : difficulty < 0.55 ? 3 : 4);
  const recipe = pool[Math.floor(Math.random() * pool.length)];
  const patience = Math.max(22, 42 - difficulty * 16);
  return {
    id: nextOrderId++,
    recipeId: recipe.id,
    name: recipe.name,
    price: recipe.price,
    color: recipe.color,
    steps: recipe.steps.map((s) => ({ ...s })),
    patience,
    left: patience,
    born: now,
  };
}

// Spawn interval shrinks as difficulty rises: 14s early, ~7s in the rush.
export function spawnInterval(difficulty) {
  return Math.max(7, 14 - difficulty * 7);
}

export function tickOrders(state, dt) {
  for (const order of state.orders) order.left -= dt;
  const expired = state.orders.filter((o) => o.left <= 0);
  for (const o of expired) {
    state.orders = state.orders.filter((x) => x.id !== o.id);
    state.missed += 1;
    state.combo = 0;
    state.message = `${o.name} walked out! -5`;
    state.messageT = 2;
    state.score = Math.max(0, state.score - 5);
  }
}

// Serving a finished plate: tip scales with patience left and the combo streak.
export function serveOrder(state, order) {
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.combo += 1;
  const tip = Math.round((order.left / order.patience) * 6) + Math.min(state.combo - 1, 5);
  const earned = order.price + tip;
  state.score += earned;
  state.coins += earned;
  state.served += 1;
  state.message = `Served ${order.name}! +$${earned} (combo x${state.combo})`;
  state.messageT = 2;
  return earned;
}
