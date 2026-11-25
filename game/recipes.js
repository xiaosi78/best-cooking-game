// recipes.js — the menu: every ingredient and every dish Rush Hour Kitchen serves.
// An ingredient knows its colour, its emoji-free canvas glyph, whether it needs
// chopping or cooking, and how long that step takes. A recipe is a list of
// finished ingredient steps in assembly order.

// Ingredient ids are stable strings used by orders, the kitchen and the renderer.
export const INGREDIENTS = {
  bun:     { name: 'Bun',     color: '#e8b06a', dark: '#b97f3a', glyph: 'B', chop: 0, cook: 0 },
  patty:   { name: 'Patty',   color: '#a05a3c', dark: '#6e3520', glyph: 'P', chop: 0, cook: 3.0 },
  lettuce: { name: 'Lettuce', color: '#7ec850', dark: '#4a8f2e', glyph: 'L', chop: 1.6, cook: 0 },
  tomato:  { name: 'Tomato',  color: '#e8443a', dark: '#a81f18', glyph: 'T', chop: 1.6, cook: 0 },
  cheese:  { name: 'Cheese',  color: '#ffc93c', dark: '#d99a12', glyph: 'C', chop: 0, cook: 0 },
  egg:     { name: 'Egg',     color: '#fff3c4', dark: '#d9b45a', glyph: 'E', chop: 0, cook: 2.4 },
  dough:   { name: 'Dough',   color: '#f2e3c0', dark: '#c9a86a', glyph: 'D', chop: 0, cook: 3.2 },
  bacon:   { name: 'Bacon',   color: '#d96a5f', dark: '#96332b', glyph: 'Ba', chop: 0, cook: 2.6 },
};

// A finished step is the ingredient id plus the prep it went through:
// 'raw' (ready as-is), 'chopped', 'cooked'. Recipes list finished steps.
export const RECIPES = [
  {
    id: 'burger', name: 'Sunny Burger', price: 14, color: '#e8b06a',
    steps: [
      { ing: 'bun', prep: 'raw' },
      { ing: 'patty', prep: 'cooked' },
      { ing: 'lettuce', prep: 'chopped' },
      { ing: 'tomato', prep: 'chopped' },
    ],
  },
  {
    id: 'salad', name: 'Garden Salad', price: 10, color: '#7ec850',
    steps: [
      { ing: 'lettuce', prep: 'chopped' },
      { ing: 'tomato', prep: 'chopped' },
      { ing: 'cheese', prep: 'raw' },
    ],
  },
  {
    id: 'pizza', name: 'Cheesy Flatbread', price: 16, color: '#ffc93c',
    steps: [
      { ing: 'dough', prep: 'cooked' },
      { ing: 'tomato', prep: 'chopped' },
      { ing: 'cheese', prep: 'raw' },
    ],
  },
  {
    id: 'breakfast', name: 'Sunrise Plate', price: 12, color: '#fff3c4',
    steps: [
      { ing: 'egg', prep: 'cooked' },
      { ing: 'bacon', prep: 'cooked' },
      { ing: 'tomato', prep: 'chopped' },
    ],
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || RECIPES[0];
}

// Human label for a finished step, e.g. "Chopped Tomato".
export function stepLabel(step) {
  const ing = INGREDIENTS[step.ing];
  if (step.prep === 'chopped') return `Chopped ${ing.name}`;
  if (step.prep === 'cooked') return `Cooked ${ing.name}`;
  return ing.name;
}

// Does a carried finished item satisfy the next missing step of a recipe?
export function stepMatches(step, carried) {
  return carried && carried.ing === step.ing && carried.prep === step.prep;
}
