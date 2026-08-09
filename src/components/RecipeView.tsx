import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Recipe, DietType, Ingredient } from '../types';
import {
  Sparkles,
  Clock,
  Flame,
  ChefHat,
  ShoppingBag,
  BookOpen,
  Search,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Refrigerator,
  CheckCircle2,
  PlusCircle,
  Check,
  CheckSquare,
  Square,
  Zap,
  Trash2,
} from 'lucide-react';

interface RecipeViewProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  onGenerateAiRecipes: (dietType?: DietType) => Promise<void>;
  onCookRecipe: (recipe: Recipe) => void;
  onDeleteRecipe?: (recipeId: string) => void;
  onToggleIngredient?: (id: string) => void;
  isGenerating: boolean;
}

const DIET_TYPES: DietType[] = ['전체', '고단백', '저탄고지', '15분초간단', '클린채식', '균형식단'];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0.2,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0.2,
    scale: 0.97,
  }),
};

export const RecipeView: React.FC<RecipeViewProps> = ({
  recipes,
  ingredients,
  onGenerateAiRecipes,
  onCookRecipe,
  onDeleteRecipe,
  onToggleIngredient,
  isGenerating,
}) => {
  const [selectedType, setSelectedType] = useState<DietType>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [activeRecipeDetail, setActiveRecipeDetail] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

  // Touch Swipe Gesture State
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Filter active recipes (exclude deleted) based on category and search query
  const activeRecipes = recipes.filter((r) => !r.isDeleted);
  const filteredRecipes = activeRecipes.filter((r) => {
    const matchesType = selectedType === '전체' || r.dietType === selectedType;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Adjust current index if out of bounds on filter change
  useEffect(() => {
    if (currentIndex >= filteredRecipes.length) {
      setCurrentIndex(Math.max(0, filteredRecipes.length - 1));
    }
  }, [filteredRecipes.length, currentIndex]);

  // Filter out pending draft ingredients - only active confirmed ingredients are used in Recipe tab
  const activeIngredients = ingredients.filter((i) => !i.isPending);

  // Helper to dynamically normalize recipe used/needed ingredients against user's actual fridge
  const normalizeRecipe = (recipe: Recipe | null): Recipe | null => {
    if (!recipe) return null;

    const activeFridgeNames = activeIngredients.map((f) => f.name.toLowerCase().trim());

    const realUsed: Recipe['usedIngredients'] = [];
    const missingFromFridgeNeeded: Recipe['neededIngredients'] = [];

    (recipe.usedIngredients || []).forEach((used) => {
      const usedNameLower = used.name.toLowerCase().trim();
      const isPresentInFridge = activeFridgeNames.some(
        (fName) => fName.includes(usedNameLower) || usedNameLower.includes(fName)
      );

      if (isPresentInFridge) {
        realUsed.push(used);
      } else {
        // Missing from fridge! Dynamically move to neededIngredients
        let defaultPrice = '2,500원';
        if (usedNameLower.includes('계란') || usedNameLower.includes('달걀')) defaultPrice = '3,800원 (10구 1팩)';
        else if (usedNameLower.includes('밥') || usedNameLower.includes('햇반') || usedNameLower.includes('곤약밥')) defaultPrice = '1,800원 (1개)';
        else if (usedNameLower.includes('참치')) defaultPrice = '5,500원 (1캔)';
        else if (usedNameLower.includes('두부')) defaultPrice = '2,400원 (1모)';
        else if (usedNameLower.includes('닭가슴살') || usedNameLower.includes('닭')) defaultPrice = '6,500원 (1팩)';
        else if (usedNameLower.includes('양배추')) defaultPrice = '3,000원 (1통)';

        missingFromFridgeNeeded.push({
          name: used.name,
          quantity: used.quantity || '1개',
          estimatedPrice: defaultPrice,
        });
      }
    });

    // Combine original neededIngredients with missingFromFridgeNeeded
    const existingNeededNames = (recipe.neededIngredients || []).map((n) => n.name.toLowerCase().trim());
    const combinedNeeded = [...(recipe.neededIngredients || [])];

    missingFromFridgeNeeded.forEach((missing) => {
      const missingNameLower = missing.name.toLowerCase().trim();
      const alreadyInNeeded = existingNeededNames.some(
        (nName) => nName.includes(missingNameLower) || missingNameLower.includes(nName)
      );
      if (!alreadyInNeeded) {
        combinedNeeded.push(missing);
      }
    });

    // Fallback: If combinedNeeded is empty AND realUsed is empty (e.g. lost in sync or empty fridge), infer from recipe title/description
    if (combinedNeeded.length === 0 && realUsed.length === 0) {
      const textToSearch = (recipe.title + ' ' + recipe.description).toLowerCase();
      const keywords = [
        { key: '닭가슴살', name: '닭가슴살 1팩', price: '5,900원' },
        { key: '야채', name: '모둠 볶음 채소 1봉지', price: '2,200원' },
        { key: '채소', name: '모둠 볶음 채소 1봉지', price: '2,200원' },
        { key: '두부', name: '부침용 두부 1모', price: '1,800원' },
        { key: '계란', name: '신선 계란 1팩(10구)', price: '3,800원' },
        { key: '달걀', name: '신선 계란 1팩(10구)', price: '3,800원' },
        { key: '양배추', name: '양배추 1/2통', price: '2,500원' },
        { key: '참치', name: '살코기 참치 1캔', price: '2,800원' },
        { key: '토마토', name: '방울토마토 1팩', price: '4,500원' },
        { key: '간장', name: '양념용 진간장 1병', price: '3,500원' },
        { key: '김치', name: '맛김치 1봉', price: '4,200원' },
        { key: '밥', name: '즉석밥 1개', price: '1,800원' },
      ];
      keywords.forEach((item) => {
        if (textToSearch.includes(item.key)) {
          if (!combinedNeeded.some((n) => n.name.includes(item.key))) {
            combinedNeeded.push({
              name: item.name,
              quantity: '1개',
              estimatedPrice: item.price,
            });
          }
        }
      });
      if (combinedNeeded.length === 0 && activeIngredients.length === 0) {
        combinedNeeded.push({
          name: '주요 요리 재료 (장보기 필요)',
          quantity: '1세트',
          estimatedPrice: '약 5,000원~8,000원',
        });
      }
    }

    return {
      ...recipe,
      usedIngredients: realUsed,
      neededIngredients: combinedNeeded,
    };
  };

  const rawCurrentRecipe = filteredRecipes[currentIndex] || null;
  const currentRecipe = normalizeRecipe(rawCurrentRecipe);

  // Helper: Check if a given fridge ingredient is needed/used by the current active carousel recipe
  const isNeededByCurrentRecipe = (ingName: string) => {
    if (!currentRecipe) return false;
    const targetName = ingName.toLowerCase().trim();

    const usedMatch = currentRecipe.usedIngredients?.some((item) => {
      const name = item.name.toLowerCase().trim();
      return name.includes(targetName) || targetName.includes(name);
    });

    if (usedMatch) return true;

    const neededMatch = currentRecipe.neededIngredients?.some((item) => {
      const name = item.name.toLowerCase().trim();
      return name.includes(targetName) || targetName.includes(name);
    });

    return !!neededMatch;
  };

  // Carousel Controls
  const handlePrev = () => {
    if (filteredRecipes.length === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredRecipes.length - 1));
  };

  const handleNext = () => {
    if (filteredRecipes.length === 0) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev < filteredRecipes.length - 1 ? prev + 1 : 0));
  };

  // Touch & Mouse Drag Swipe Handlers
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 30;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    touchStartX.current = e.clientX;
    touchEndX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    touchEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    handleTouchEnd();
  };

  const handleMouseLeave = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    handleTouchEnd();
  };

  const selectedFridgeNames = activeIngredients
    .filter((i) => i.isSelected)
    .map((i) => i.name.toLowerCase());

  const getRecipeExtraCost = (recipe: Recipe) => {
    if (!recipe.neededIngredients || recipe.neededIngredients.length === 0) {
      if (activeIngredients.length === 0) return 5000;
      return 0;
    }
    const cost = recipe.neededIngredients.reduce((sum, ing) => {
      const priceStr = ing.estimatedPrice;
      if (!priceStr) return sum;
      const parsed = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
    return cost === 0 && activeIngredients.length === 0 ? 5000 : cost;
  };

  const getMatchScore = (recipe: Recipe) => {
    if (!recipe.usedIngredients || recipe.usedIngredients.length === 0) return 0;
    let matchedCount = 0;
    recipe.usedIngredients.forEach((ing) => {
      const name = ing.name.toLowerCase();
      if (selectedFridgeNames.some((fName) => fName.includes(name) || name.includes(fName))) {
        matchedCount++;
      }
    });
    return Math.round((matchedCount / recipe.usedIngredients.length) * 100);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-85px)] sm:h-[calc(100vh-95px)] max-w-4xl mx-auto space-y-3 pb-2 select-none overflow-hidden">
      {/* CARD 1: 냉장고 재료 토글 칩 카드 */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/80 shadow-xs shrink-0 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Refrigerator className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight">
              냉장고 재료
            </h2>
          </div>
          <button
            id="btn-generate-ai-recipes"
            onClick={() => onGenerateAiRecipes()}
            disabled={isGenerating}
            title="AI 레시피 새로고침"
            className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-xs transition-all shadow-2xs shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-bold">AI 레시피 추천</span>
          </button>
        </div>

        {/* Ingredients Chips List (Flex Wrap naturally - No scroll) */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {activeIngredients.length === 0 ? (
            <p className="text-xs text-slate-400 py-0.5 font-medium">
              확정 등록된 냉장고 보유 재료가 없습니다. [냉장고] 탭 예비 리스트에서 확정하거나 직접 등록해 보세요.
            </p>
          ) : (
            activeIngredients.map((ing) => {
              const isLighted = isNeededByCurrentRecipe(ing.name);

              return (
                <button
                  key={ing.id}
                  onClick={() => onToggleIngredient?.(ing.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isLighted
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 ring-2 ring-emerald-400 font-extrabold'
                      : 'bg-slate-100/80 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-80 grayscale'
                  }`}
                >
                  <span className="text-[11px]">{ing.icon || '🥦'}</span>
                  <span>{ing.name}</span>
                  {isLighted && <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CARD 2: 레시피 스와이프 캐러셀 카드 */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between">
        {filteredRecipes.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 border border-white/90 shadow-md h-full flex flex-col items-center justify-center text-center space-y-3">
            <ChefHat className="w-12 h-12 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">
              조건에 맞는 레시피가 없습니다.
            </p>
            <button
              onClick={() => {
                setSelectedType('전체');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              전체 보기
            </button>
          </div>
        ) : (
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentRecipe.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/90 shadow-md flex flex-col space-y-3 sm:space-y-3.5 cursor-grab active:cursor-grabbing select-none w-full"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {/* Main Recipe Info */}
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900 text-white">
                        {currentRecipe.dietType}
                      </span>

                      {getRecipeExtraCost(currentRecipe) === 0 && activeIngredients.length > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300/80 shadow-2xs flex items-center gap-1">
                          🎉 추가 지출 0원! (냉장고 재료 100% 파먹기)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 flex items-center gap-1">
                          🛒 추가 예상 비용: ~{getRecipeExtraCost(currentRecipe).toLocaleString()}원 (장보기 필요)
                        </span>
                      )}
                    </div>

                    {onDeleteRecipe && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecipeToDelete(currentRecipe);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0 ml-1"
                        title="레시피 삭제 (휴지통 이동)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {currentRecipe.title}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                  {currentRecipe.description}
                </p>

                {/* Calories & Macros Row */}
                <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <div className="flex items-center text-amber-600">
                      <Flame className="w-4 h-4 mr-1 text-amber-500 fill-amber-500" />
                      <span>{currentRecipe.calories} kcal</span>
                    </div>
                    <div className="flex space-x-2 text-slate-600">
                      <span>탄 {currentRecipe.carbs}g</span>
                      <span>·</span>
                      <span className="text-emerald-700">단 {currentRecipe.protein}g</span>
                      <span>·</span>
                      <span>지 {currentRecipe.fat}g</span>
                    </div>
                  </div>

                  {/* Macro Ratio Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 flex overflow-hidden">
                    <div
                      className="bg-sky-400 h-2"
                      style={{
                        width: `${(currentRecipe.carbs * 4 / currentRecipe.calories) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-emerald-500 h-2"
                      style={{
                        width: `${(currentRecipe.protein * 4 / currentRecipe.calories) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-amber-400 h-2"
                      style={{
                        width: `${(currentRecipe.fat * 9 / currentRecipe.calories) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Ingredients Usage Summary */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="font-bold text-slate-700 mr-1 shrink-0">💡 필요 부재료:</span>
                    {currentRecipe.neededIngredients && currentRecipe.neededIngredients.length > 0 ? (
                      currentRecipe.neededIngredients.map((ing, idx) => (
                        <span
                          key={`needed-${idx}`}
                          className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
                        >
                          <PlusCircle className="w-3 h-3 text-amber-600 mr-1 shrink-0" />
                          {ing.name} ({ing.estimatedPrice || ing.quantity})
                        </span>
                      ))
                    ) : activeIngredients.length === 0 ? (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                        🛒 전체 재료 장보기 필요 (냉장고 비어있음)
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        모든 재료 보유 중 (추가 지출 0원)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions & Swipe Dots */}
              <div className="shrink-0 space-y-2 pt-1">
                {/* Swipe Indicator Dots */}
                <div className="flex items-center justify-center space-x-1.5 py-1">
                  {filteredRecipes.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDirection(idx > currentIndex ? 1 : -1);
                        setCurrentIndex(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentIndex
                          ? 'w-6 bg-emerald-500'
                          : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => setActiveRecipeDetail(currentRecipe)}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-1.5"
                  >
                    <BookOpen className="w-4 h-4 text-slate-600" />
                    <span>조리법 보기</span>
                  </button>

                  <button
                    id={`btn-cook-${currentRecipe.id}`}
                    onClick={() => onCookRecipe(currentRecipe)}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>만들어 먹기</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Recipe Detail Modal */}
      {activeRecipeDetail && (() => {
        const modalRecipe = normalizeRecipe(activeRecipeDetail);
        if (!modalRecipe) return null;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {modalRecipe.dietType}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                    {modalRecipe.title}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  {onDeleteRecipe && (
                    <button
                      onClick={() => {
                        setRecipeToDelete(modalRecipe);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center space-x-1 text-xs font-bold"
                      title="레시피 삭제 (휴지통 이동)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setActiveRecipeDetail(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 text-xl font-bold rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-4 overflow-y-auto pr-1">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {modalRecipe.description}
                </p>

                {/* Nutrition Summary Box */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-emerald-900 border-b border-emerald-200/60 pb-2 mb-2">
                    <span>칼로리 & 탄단지 영양 정보</span>
                    <span className="text-amber-600 flex items-center">
                      <Flame className="w-4 h-4 mr-1 text-amber-500" />
                      {modalRecipe.calories} kcal
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block">탄수화물</span>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm">
                        {modalRecipe.carbs}g
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block">단백질</span>
                      <span className="font-bold text-emerald-700 text-xs sm:text-sm">
                        {modalRecipe.protein}g
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block">지방</span>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm">
                        {modalRecipe.fat}g
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ingredients Breakdown Box */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 text-xs">
                  <div>
                    <span className="font-bold text-emerald-800 block mb-1">🥦 내 냉장고 사용 재료:</span>
                    {modalRecipe.usedIngredients && modalRecipe.usedIngredients.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {modalRecipe.usedIngredients.map((ing, idx) => (
                          <span key={idx} className="bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            {ing.name} ({ing.quantity})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">냉장고 사용 재료 없음 (전량 마트 구매 필요)</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="font-bold text-amber-800 block mb-1">🛒 필요 부재료 (장보기 필요):</span>
                    {modalRecipe.neededIngredients && modalRecipe.neededIngredients.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {modalRecipe.neededIngredients.map((ing, idx) => (
                          <span key={idx} className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            {ing.name} ({ing.estimatedPrice || ing.quantity})
                          </span>
                        ))}
                      </div>
                    ) : activeIngredients.length === 0 ? (
                      <span className="text-amber-800 font-bold text-[11px]">전체 재료 장보기 필요 (냉장고 비어있음)</span>
                    ) : (
                      <span className="text-emerald-700 font-bold text-[11px]">추가 구매 필요한 재료 없음 (100% 보유 중)</span>
                    )}
                  </div>
                </div>

                {/* Steps */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-2 flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4 text-emerald-600" />
                    단계별 조리 순서
                  </h4>
                  <div className="space-y-2">
                    {modalRecipe.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-2.5 text-xs sm:text-sm">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-slate-700 leading-relaxed pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chef Tip */}
                {modalRecipe.chefTip && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900">
                    <span className="font-bold block text-amber-800 mb-1">💡 레시피 팁:</span>
                    <p className="leading-relaxed">{modalRecipe.chefTip}</p>
                  </div>
                )}
              </div>

              {/* Modal Bottom CTA */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5 shrink-0">
                <button
                  onClick={() => setActiveRecipeDetail(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-2xl text-xs sm:text-sm hover:bg-slate-200"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    setActiveRecipeDetail(null);
                    onCookRecipe(modalRecipe);
                  }}
                  className="px-4 sm:px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-2xl text-xs sm:text-sm hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center space-x-1.5"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>만들어 먹기</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {recipeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">레시피 삭제</h3>
              <p className="text-xs text-slate-600 mt-1">
                '<span className="font-bold text-slate-900">{recipeToDelete.title}</span>' 레시피를 삭제하시겠습니까?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                ([식단기록] 탭의 휴지통에서 언제든 복구할 수 있습니다.)
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setRecipeToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (onDeleteRecipe && recipeToDelete) {
                    onDeleteRecipe(recipeToDelete.id);
                  }
                  if (activeRecipeDetail?.id === recipeToDelete?.id) {
                    setActiveRecipeDetail(null);
                  }
                  setRecipeToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all"
              >
                휴지통 이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

