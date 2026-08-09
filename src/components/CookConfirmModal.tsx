import React, { useState } from 'react';
import { Recipe, Ingredient, MealType } from '../types';
import { ChefHat, MinusCircle, Flame, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DeductionItem {
  ingredientId: string;
  name: string;
  currentQty: number;
  unit: string;
  deductQty: number;
}

interface CookConfirmModalProps {
  recipe: Recipe;
  fridgeIngredients: Ingredient[];
  onClose: () => void;
  onConfirmCook: (data: {
    recipe: Recipe;
    mealType: MealType;
    deductions: { id: string; deductQty: number }[];
  }) => void;
}

const MEAL_TYPES: { type: MealType; label: string; icon: string }[] = [
  { type: '아침', label: '아침 식단', icon: '🌅' },
  { type: '점심', label: '점심 식단', icon: '☀️' },
  { type: '저녁', label: '저녁 식단', icon: '🌙' },
  { type: '간식', label: '간식/스낵', icon: '🍏' },
];

export const CookConfirmModal: React.FC<CookConfirmModalProps> = ({
  recipe,
  fridgeIngredients,
  onClose,
  onConfirmCook,
}) => {
  const [mealType, setMealType] = useState<MealType>('점심');

  // Match recipe ingredients with fridge items to build default deduction list
  const initialDeductions: DeductionItem[] = recipe.usedIngredients.map((used) => {
    const matched = fridgeIngredients.find(
      (f) => f.name.toLowerCase().includes(used.name.toLowerCase()) || used.name.toLowerCase().includes(f.name.toLowerCase())
    );

    return {
      ingredientId: matched ? matched.id : '',
      name: matched ? matched.name : used.name,
      currentQty: matched ? matched.quantity : 0,
      unit: matched ? matched.unit : used.deductUnit || '개',
      deductQty: used.deductAmount ?? 1,
    };
  });

  const [deductions, setDeductions] = useState<DeductionItem[]>(initialDeductions);

  const handleQtyChange = (idx: number, val: number) => {
    const updated = [...deductions];
    updated[idx].deductQty = Math.max(0, val);
    setDeductions(updated);
  };

  const handleConfirm = () => {
    // Fire festive confetti effect!
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    const payloadDeductions = deductions
      .filter((d) => d.ingredientId && d.deductQty > 0)
      .map((d) => ({
        id: d.ingredientId,
        deductQty: d.deductQty,
      }));

    onConfirmCook({
      recipe,
      mealType,
      deductions: payloadDeductions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex items-center space-x-3 pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">요리 완료 & 재료 자동 차감</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              오늘의 식단으로 기록되고 사용된 재료가 냉장고 수량에서 자동 감소합니다.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          {/* Recipe Summary */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">{recipe.title}</h4>
              <span className="text-xs font-bold text-amber-600 flex items-center shrink-0">
                <Flame className="w-3.5 h-3.5 mr-0.5 text-amber-500" />
                {recipe.calories} kcal
              </span>
            </div>
            <div className="mt-1.5 text-xs text-slate-600 flex space-x-2.5">
              <span>탄수화물 {recipe.carbs}g</span>
              <span>·</span>
              <span className="text-emerald-700 font-bold">단백질 {recipe.protein}g</span>
              <span>·</span>
              <span>지방 {recipe.fat}g</span>
            </div>
          </div>

          {/* Meal Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              식사 구분 선택:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => setMealType(m.type)}
                  className={`p-2 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 ${
                    mealType === m.type
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span className="text-[11px]">{m.type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Deduction Breakdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              차감될 냉장고 재료 수량 확인:
            </label>
            <div className="space-y-2">
              {deductions.map((item, idx) => {
                const remaining = Math.max(0, item.currentQty - item.deductQty);

                return (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm">{item.name}</span>
                      {item.ingredientId ? (
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          보유량: <strong className="text-slate-700">{item.currentQty}{item.unit}</strong> →{' '}
                          <span className="text-emerald-700 font-bold">
                            차감 후 {remaining}{item.unit}
                          </span>
                        </div>
                      ) : (
                        <div className="text-amber-600 font-medium text-[11px] mt-0.5 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          미등록 (차감 제외)
                        </div>
                      )}
                    </div>

                    {item.ingredientId && (
                      <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl p-1 shrink-0">
                        <span className="text-slate-400 font-semibold px-1">-</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.deductQty}
                          onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-12 px-1 py-0.5 text-center font-bold text-emerald-800 focus:outline-none text-xs"
                        />
                        <span className="text-slate-600 text-[10px] pr-1">{item.unit}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-2xl text-xs sm:text-sm hover:bg-slate-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center space-x-1.5 px-4 sm:px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-2xl text-xs sm:text-sm hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>식단 기록 & 재료 차감</span>
          </button>
        </div>
      </div>
    </div>
  );
};
