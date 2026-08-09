import React, { useState } from 'react';
import { ShoppingItem, WeeklyBudgetConfig } from '../types';
import {
  ShoppingBag,
  Trash2,
  Wallet,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Calendar,
  Receipt,
  Tag,
} from 'lucide-react';

interface ShoppingViewProps {
  shoppingItems: ShoppingItem[];
  budgetConfig: WeeklyBudgetConfig;
  onUpdateBudgetConfig: (config: Partial<WeeklyBudgetConfig>) => void;
  onDeleteShoppingItem: (id: string) => void;
  onClearAllHistory?: () => void;
}

export const ShoppingView: React.FC<ShoppingViewProps> = ({
  shoppingItems,
  budgetConfig,
  onUpdateBudgetConfig,
  onDeleteShoppingItem,
  onClearAllHistory,
}) => {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [customBudgetInput, setCustomBudgetInput] = useState(
    String(budgetConfig.weeklyBudget)
  );

  const totalSpent = budgetConfig.weeklySpent;
  const remainingBudget = budgetConfig.weeklyBudget - totalSpent;
  const spentPercent = Math.min(
    100,
    Math.max(0, Math.round((totalSpent / budgetConfig.weeklyBudget) * 100))
  );

  const handleSaveBudget = (amount: number) => {
    onUpdateBudgetConfig({ weeklyBudget: amount });
    setIsEditingBudget(false);
  };

  return (
    <div className="space-y-5 pb-20">
      {/* 1. WEEKLY BUDGET & EXPENSE DASHBOARD CARD */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  주간 식비 예산 & 구매 지출 관리
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  매주 제한
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                냉장고 확정 입고 완료된 식재료 지출 내역 및 예산 현황
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-toggle-fridge-first"
              onClick={() =>
                onUpdateBudgetConfig({
                  preferFridgeFirst: !budgetConfig.preferFridgeFirst,
                })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                budgetConfig.preferFridgeFirst
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>냉장고 파먹기 우선 {budgetConfig.preferFridgeFirst ? 'ON' : 'OFF'}</span>
            </button>

            <button
              id="btn-edit-budget"
              onClick={() => setIsEditingBudget(!isEditingBudget)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="예산 금액 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Budget Edit Drawer/Modal */}
        {isEditingBudget && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                🎯 주간 예산 목표 설정
              </span>
              <button
                onClick={() => onUpdateBudgetConfig({ weeklySpent: 0 })}
                className="text-[11px] font-semibold text-slate-500 hover:text-red-500 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>누적 지출 초기화</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[30000, 50000, 70000, 100000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSaveBudget(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    budgetConfig.weeklyBudget === preset
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {(preset / 10000).toLocaleString()}만원
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="number"
                value={customBudgetInput}
                onChange={(e) => setCustomBudgetInput(e.target.value)}
                placeholder="직접 입력 (원)"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                onClick={() => handleSaveBudget(Number(customBudgetInput) || 50000)}
                className="px-4 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700"
              >
                저장
              </button>
            </div>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">
              주간 목표 예산
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900">
              {budgetConfig.weeklyBudget.toLocaleString()}원
            </span>
          </div>

          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">
              이번 주 누적 지출
            </span>
            <span className="text-sm sm:text-base font-extrabold text-amber-700">
              {totalSpent.toLocaleString()}원
            </span>
          </div>

          <div
            className={`p-3 rounded-2xl border ${
              remainingBudget < 0
                ? 'bg-red-50 border-red-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <span className="text-[11px] font-medium block text-slate-600">
              잔여 예산
            </span>
            <span
              className={`text-sm sm:text-base font-black ${
                remainingBudget < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {remainingBudget.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* Progress Bar & Status Text */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600">예산 소진율 ({spentPercent}%)</span>
            {remainingBudget < 0 ? (
              <span className="text-red-600 font-extrabold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                예산 {Math.abs(remainingBudget).toLocaleString()}원 초과!
              </span>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                목표 예산 범위 내 안정 관리 중
              </span>
            )}
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/80">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                spentPercent >= 100
                  ? 'bg-red-500'
                  : spentPercent > 75
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${spentPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. PURCHASED ITEMS HISTORY LIST (구매 식재료 카드 리스트) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>구매한 식재료 및 지출 카드 ({shoppingItems.length}건)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              냉장고 탭에서 [확정 입고]를 완료하면 구매 품목과 지출 내역이 여기에 자동으로 기록됩니다.
            </p>
          </div>

          {shoppingItems.length > 0 && onClearAllHistory && (
            <button
              onClick={onClearAllHistory}
              className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
            >
              내역 전체 삭제
            </button>
          )}
        </div>

        {shoppingItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-700">확정 등록된 구매 내역이 없습니다</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              레시피에서 <strong className="text-emerald-700">[만들어 먹기]</strong>를 누르면 부족한 부재료가 냉장고 예비 리스트에 담깁니다.
              냉장고 탭에서 수량 확인 후 <strong className="text-emerald-700">[확정 입고]</strong>를 마치면 이 곳에 구매 내역이 카드 형태로 자동 기록됩니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shoppingItems.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/90 transition-all flex items-start justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-slate-900 text-sm sm:text-base">
                      {item.name}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                      {item.quantity}
                    </span>
                  </div>

                  {item.recipeTitle && (
                    <div className="flex items-center space-x-1 text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 w-fit font-medium">
                      <Tag className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>{item.recipeTitle} 레시피 출처</span>
                    </div>
                  )}

                  {item.purchasedAt && (
                    <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>입고 및 구매일: {item.purchasedAt}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">구매 금액</span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      {item.estimatedPrice ? `${item.estimatedPrice.toLocaleString()}원` : '0원'}
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteShoppingItem(item.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="기록 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
