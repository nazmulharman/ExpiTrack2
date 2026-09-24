import React from 'react';
import { ExpiryItem } from '../types';

interface RecipeModalProps {
  item: ExpiryItem | null;
  onClose: () => void;
  onMarkConsumed: (item: ExpiryItem) => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ item, onClose, onMarkConsumed }) => {
  if (!item) return null;

  const isYogurt = item.name.toLowerCase().includes('yogurt');
  const isMilk = item.name.toLowerCase().includes('milk');

  const recipes = isYogurt
    ? [
        {
          name: 'Berry & Honey Greek Yogurt Parfait',
          time: '5 mins',
          difficulty: 'Easy',
          description: 'Layer remaining Greek yogurt with chia seeds, honey, and fresh or frozen berries for a zero-waste protein breakfast.',
          ingredients: ['Greek Yogurt', 'Honey / Maple Syrup', 'Berries', 'Granola / Nuts'],
        },
        {
          name: 'Mediterranean Garlic Tzatziki Dip',
          time: '10 mins',
          difficulty: 'Easy',
          description: 'Grate cucumber, squeeze out excess liquid, stir into Greek yogurt with garlic, lemon juice, dill, and olive oil.',
          ingredients: ['Greek Yogurt', 'Cucumber', 'Garlic', 'Lemon Juice', 'Dill'],
        },
      ]
    : isMilk
    ? [
        {
          name: 'Overnight Cinnamon Oats',
          time: '5 mins prep',
          difficulty: 'Easy',
          description: 'Combine oat milk with rolled oats, cinnamon, chia seeds, and banana slices in a mason jar. Chill overnight.',
          ingredients: ['Oat Milk', 'Rolled Oats', 'Cinnamon', 'Chia Seeds'],
        },
        {
          name: 'Golden Turmeric Latte',
          time: '7 mins',
          difficulty: 'Easy',
          description: 'Warm oat milk in a small saucepan with turmeric, ginger, a pinch of black pepper, and honey.',
          ingredients: ['Oat Milk', 'Turmeric', 'Ground Ginger', 'Honey'],
        },
      ]
    : [
        {
          name: 'Pantry Rescue Stir-Fry / Stew',
          time: '15 mins',
          difficulty: 'Medium',
          description: 'Quickly sauté or stew perishable ingredients before their expiration date with garlic and soy sauce.',
          ingredients: [item.name, 'Garlic', 'Olive Oil', 'Seasonings'],
        },
      ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#131b2e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#eaedff] dark:border-[#283044] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#005c55] to-[#0f766e] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-[#6df5e1]">
              <span className="material-symbols-outlined text-[24px]">restaurant_menu</span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#a3faef]">Zero-Waste Pantry</span>
              <h2 className="text-base font-bold">Quick Recipes for {item.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6]">
            Use this item before it expires on <strong>{item.expiryDate}</strong> to save money and prevent food waste.
          </p>

          <div className="space-y-3">
            {recipes.map((recipe, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-[#f2f3ff] dark:bg-[#283044] border border-[#eaedff] dark:border-[#283044] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#131b2e] dark:text-white">{recipe.name}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#005c55] dark:text-[#6df5e1] bg-white dark:bg-[#131b2e] px-2 py-0.5 rounded-full">
                    <span>{recipe.time}</span>
                    <span>•</span>
                    <span>{recipe.difficulty}</span>
                  </div>
                </div>

                <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6] leading-relaxed">
                  {recipe.description}
                </p>

                <div className="flex flex-wrap gap-1 pt-1">
                  {recipe.ingredients.map((ing, j) => (
                    <span
                      key={j}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-[#131b2e] text-[10px] text-[#3e4947] dark:text-[#bdc9c6] border border-[#eaedff] dark:border-[#283044]"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f2f3ff] dark:bg-[#283044] border-t border-[#eaedff] dark:border-[#283044] flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3e4947] dark:text-[#bdc9c6]"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              onMarkConsumed(item);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#005c55] text-white text-xs font-bold hover:bg-[#0f766e] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Mark Item as Consumed
          </button>
        </div>
      </div>
    </div>
  );
};
