import React, { useState, useEffect } from 'react';
import {
  Ingredient,
  Recipe,
  MealLog,
  UserTarget,
  UserProfile,
  ShoppingItem,
  DietType,
  MealType,
  WeeklyBudgetConfig,
} from './types';
import { INITIAL_INGREDIENTS } from './data/initialIngredients';
import { DEFAULT_RECIPES } from './data/defaultRecipes';
import { formatIngredientForFridge } from './utils/ingredientParser';
import { Header } from './components/Header';
import { FridgeView } from './components/FridgeView';
import { RecipeView } from './components/RecipeView';
import { CookConfirmModal } from './components/CookConfirmModal';
import { TrackerView } from './components/TrackerView';
import { ShoppingView } from './components/ShoppingView';
import { UserSettingsModal } from './components/UserSettingsModal';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'fridge' | 'recipes' | 'tracker' | 'shopping'>(
    'recipes'
  );

  // Persistence Key States
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    // Purge old v1 cached mock items
    localStorage.removeItem('fridge_ingredients_v1');
    const saved = localStorage.getItem('fridge_ingredients_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Filter out legacy mock items if still present
      return parsed.filter((item: Ingredient) => !/^ing-[1-9]$|^ing-1[0-2]$/.test(item.id));
    }
    return INITIAL_INGREDIENTS;
  });

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    localStorage.removeItem('fridge_recipes_v1');
    const saved = localStorage.getItem('fridge_recipes_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.filter((item: Recipe) => !/^rec-[1-5]$/.test(item.id));
    }
    return DEFAULT_RECIPES;
  });

  const [logs, setLogs] = useState<MealLog[]>(() => {
    const saved = localStorage.getItem('diet_logs_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('diet_user_profile_v1');
    return saved
      ? JSON.parse(saved)
      : {
          height: 168,
          weight: 60,
          age: 28,
          gender: 'female',
          activityLevel: 'moderate',
          bmr: 1350,
          tdee: 1890,
          dailyTargetCalories: 1550,
          perMealCalories: 510,
          perMealCarbs: 51,
          perMealProtein: 44,
          perMealFat: 14,
        };
  });

  const [userTarget, setUserTarget] = useState<UserTarget>(() => {
    const saved = localStorage.getItem('diet_user_target_v1');
    return saved
      ? JSON.parse(saved)
      : {
          targetCalories: 1550,
          targetCarbs: 155,
          targetProtein: 130,
          targetFat: 45,
        };
  });

  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem('shopping_items_v1');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'shop-1',
            name: '스리라차 소스',
            quantity: '1병',
            isChecked: false,
            recipeTitle: '두부 계란부침',
          },
        ];
  });

  const [budgetConfig, setBudgetConfig] = useState<WeeklyBudgetConfig>(() => {
    const saved = localStorage.getItem('budget_config_v1');
    return saved
      ? JSON.parse(saved)
      : {
          weeklyBudget: 50000,
          preferFridgeFirst: true,
          weeklySpent: 12000,
        };
  });

  // Modal State for Settings & Cooking & Google Login
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGoogleLoginOpen, setIsGoogleLoginOpen] = useState(false);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);

  // Google OAuth & Sheets Sync State
  const [googleUser, setGoogleUser] = useState<{
    email: string;
    name: string;
    picture?: string;
    accessToken: string;
  } | null>(() => {
    const saved = localStorage.getItem('google_user_v1');
    return saved ? JSON.parse(saved) : null;
  });
  const [sheetUrl, setSheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('google_sheet_url_v1');
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // AI Loading & Toast States
  const [isGeneratingAiRecipes, setIsGeneratingAiRecipes] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const handleLoginSuccess = async (user: { email: string; name: string; picture?: string; accessToken: string }) => {
    setGoogleUser(user);
    localStorage.setItem('google_user_v1', JSON.stringify(user));

    try {
      setIsSyncing(true);
      showToast('Google Sheets에서 데이터를 동기화하는 중...', 'info');
      const res = await fetch('/api/sheets/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: user.accessToken }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.webViewLink) {
          setSheetUrl(result.webViewLink);
          localStorage.setItem('google_sheet_url_v1', result.webViewLink);
        }

        if (result.data) {
          if (result.data.fridgeItems && result.data.fridgeItems.length > 0) {
            setIngredients(result.data.fridgeItems);
          }
          if (result.data.recipes && result.data.recipes.length > 0) {
            setRecipes(result.data.recipes);
          }
          if (result.data.logs && result.data.logs.length > 0) {
            setLogs(result.data.logs);
          }
          if (result.data.userProfile) {
            setUserProfile(result.data.userProfile);
          }
        }
        showToast('Google Sheets 데이터 불러오기 완료! 모든 기기에서 연속 사용 가능합니다.', 'success');
      } else if (res.status === 401) {
        showToast('구글 계정 인증이 만료되었습니다. 다시 로그인해 주세요.', 'error');
        setGoogleUser(null);
        localStorage.removeItem('google_user_v1');
        setIsSettingsOpen(true);
      }
    } catch (err) {
      console.error(err);
      showToast('구글 로그인 완료. 실시간 동기화가 활성화되었습니다.', 'success');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    setGoogleUser(null);
    setSheetUrl(null);
    localStorage.removeItem('google_user_v1');
    localStorage.removeItem('google_sheet_url_v1');
    showToast('로그아웃 되었습니다.', 'info');
  };

  const handleManualSync = async () => {
    if (!googleUser || !googleUser.accessToken) {
      setIsGoogleLoginOpen(true);
      return;
    }
    try {
      setIsSyncing(true);
      showToast('Google Sheets 동기화 중...', 'info');
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: googleUser.accessToken,
          data: {
            fridgeItems: ingredients,
            recipes,
            logs,
            shoppingList: shoppingItems,
            userProfile,
            userTarget,
          },
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.webViewLink) {
          setSheetUrl(result.webViewLink);
          localStorage.setItem('google_sheet_url_v1', result.webViewLink);
          window.open(result.webViewLink, '_blank');
        }
        showToast('Google Sheets에 모든 데이터가 동기화되었습니다.', 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401 || errData.error === 'EXPIRED_TOKEN') {
          showToast('구글 인증이 만료되었습니다. 다시 로그인해 주세요.', 'error');
          setGoogleUser(null);
          localStorage.removeItem('google_user_v1');
          setIsSettingsOpen(true);
        } else {
          showToast(errData.message || '동기화 중 오류가 발생했습니다.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('동기화 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync data to Google Sheets on changes
  useEffect(() => {
    if (!googleUser || !googleUser.accessToken) return;

    const timer = setTimeout(async () => {
      try {
        setIsSyncing(true);
        const res = await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: googleUser.accessToken,
            data: {
              fridgeItems: ingredients,
              recipes,
              logs,
              shoppingList: shoppingItems,
              userProfile,
              userTarget,
            },
          }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.webViewLink) {
            setSheetUrl(result.webViewLink);
            localStorage.setItem('google_sheet_url_v1', result.webViewLink);
          }
        } else if (res.status === 401) {
          setGoogleUser(null);
          localStorage.removeItem('google_user_v1');
        }
      } catch (err) {
        console.error('Auto sync error:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [ingredients, recipes, logs, shoppingItems, userProfile, userTarget, googleUser]);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('fridge_ingredients_v2', JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(() => {
    localStorage.setItem('fridge_recipes_v2', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('diet_logs_v1', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('diet_user_profile_v1', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('diet_user_target_v1', JSON.stringify(userTarget));
  }, [userTarget]);

  useEffect(() => {
    localStorage.setItem('shopping_items_v1', JSON.stringify(shoppingItems));
  }, [shoppingItems]);

  useEffect(() => {
    localStorage.setItem('budget_config_v1', JSON.stringify(budgetConfig));
  }, [budgetConfig]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --- Fridge Handlers ---
  const handleAddIngredient = (item: Omit<Ingredient, 'id' | 'addedAt'>) => {
    const formatted = formatIngredientForFridge(item.name, item.quantity, item.unit);
    const newItem: Ingredient = {
      ...item,
      name: formatted.name,
      category: item.category && item.category !== '양념/기타' ? item.category : formatted.category,
      quantity: formatted.quantity,
      unit: formatted.unit,
      id: `ing-${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0],
      isPending: false, // direct add is active
    };
    setIngredients((prev) => [newItem, ...prev]);
    showToast(`'${newItem.name}' (${newItem.quantity}${newItem.unit}) 재료가 냉장고에 등록되었습니다.`, 'success');
  };

  const handleConfirmPendingIngredient = (id: string) => {
    const itemToConfirm = ingredients.find((item) => item.id === id);
    if (!itemToConfirm) return;

    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isPending: false } : item))
    );

    const priceNum = itemToConfirm.estimatedPrice || 0;

    const newPurchasedCard: ShoppingItem = {
      id: `shop-${Date.now()}`,
      name: itemToConfirm.name,
      quantity: `${itemToConfirm.quantity}${itemToConfirm.unit}`,
      recipeTitle: itemToConfirm.recipeTitle || '냉장고 식재료 입고',
      estimatedPrice: priceNum,
      purchasedAt: new Date().toISOString().split('T')[0],
    };

    setShoppingItems((prev) => [newPurchasedCard, ...prev]);

    if (priceNum > 0) {
      setBudgetConfig((prev) => ({
        ...prev,
        weeklySpent: prev.weeklySpent + priceNum,
      }));
    }

    showToast(
      `'${itemToConfirm.name}' 재료가 나의 냉장고에 확정 입고되고, 장바구니 탭(구매 내역)에 지출 내역이 기록되었습니다! (+${priceNum.toLocaleString()}원)`,
      'success'
    );
  };

  const handleConfirmAllPendingIngredients = () => {
    const pendingList = ingredients.filter((item) => item.isPending);
    if (pendingList.length === 0) return;

    setIngredients((prev) =>
      prev.map((item) => (item.isPending ? { ...item, isPending: false } : item))
    );

    let totalCost = 0;
    const newPurchasedCards: ShoppingItem[] = pendingList.map((item, idx) => {
      const priceNum = item.estimatedPrice || 0;
      totalCost += priceNum;
      return {
        id: `shop-${Date.now()}-${idx}`,
        name: item.name,
        quantity: `${item.quantity}${item.unit}`,
        recipeTitle: item.recipeTitle || '냉장고 식재료 입고',
        estimatedPrice: priceNum,
        purchasedAt: new Date().toISOString().split('T')[0],
      };
    });

    setShoppingItems((prev) => [...newPurchasedCards, ...prev]);

    if (totalCost > 0) {
      setBudgetConfig((prev) => ({
        ...prev,
        weeklySpent: prev.weeklySpent + totalCost,
      }));
    }

    showToast(
      `입고 대기 재료 ${pendingList.length}개가 모두 나의 냉장고에 확정 입고되고, 장바구니 탭(구매 내역)에 기록되었습니다! (+${totalCost.toLocaleString()}원)`,
      'success'
    );
  };

  const handleUpdateIngredientDetails = (id: string, updates: Partial<Ingredient>) => {
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setIngredients((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(0, Math.round((item.quantity + delta) * 10) / 10);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleToggleSelectIngredient = (id: string) => {
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isSelected: !item.isSelected } : item))
    );
  };

  const handleToggleSelectAllIngredients = (selected: boolean) => {
    setIngredients((prev) => prev.map((item) => ({ ...item, isSelected: selected })));
  };

  const handleDeleteIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  // AI Parse Natural Language Text for Fridge
  const handleParseAiText = async (text: string) => {
    try {
      const res = await fetch('/api/parse-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (data.ingredients && data.ingredients.length > 0) {
        const parsedItems: Ingredient[] = data.ingredients.map((item: any, idx: number) => {
          const formatted = formatIngredientForFridge(item.name, item.quantity, item.unit);
          return {
            id: `ing-ai-${Date.now()}-${idx}`,
            name: formatted.name,
            category: formatted.category || item.category || '양념/기타',
            quantity: formatted.quantity,
            unit: formatted.unit,
            isSelected: true,
            addedAt: new Date().toISOString().split('T')[0],
            isPending: true, // 1단계 예비 리스트에 추가
          };
        });

        setIngredients((prev) => [...parsedItems, ...prev]);
        showToast(
          `AI가 추출한 ${parsedItems.length}개 재료가 냉장고 '입고 대기(예비) 리스트'에 추가되었습니다. 확인 후 확정 입고하세요!`,
          'info'
        );
      }
    } catch (e) {
      console.error(e);
      showToast('재료 추출 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    }
  };

  // AI Parse Receipt Image for Fridge
  const handleParseReceiptImage = async (imageBase64: string, mimeType?: string) => {
    try {
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      const data = await res.json();
      if (data.ingredients && data.ingredients.length > 0) {
        const parsedItems: Ingredient[] = data.ingredients.map((item: any, idx: number) => {
          const formatted = formatIngredientForFridge(item.name, item.quantity, item.unit);
          return {
            id: `ing-receipt-${Date.now()}-${idx}`,
            name: formatted.name,
            category: formatted.category || item.category || '양념/기타',
            quantity: formatted.quantity,
            unit: formatted.unit,
            isSelected: true,
            addedAt: new Date().toISOString().split('T')[0],
            isPending: true, // 1단계 예비 리스트에 추가
          };
        });

        setIngredients((prev) => [...parsedItems, ...prev]);
        showToast(
          `📸 영수증에서 추출한 ${parsedItems.length}개 품목이 '입고 대기(예비) 리스트'에 수록되었습니다.`,
          'info'
        );
      } else {
        showToast('영수증에서 식재료 항목을 찾을 수 없거나 추출에 실패했습니다.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('영수증 이미지 분석 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    }
  };

  // --- AI Recipe Generator ---
  const handleGenerateAiRecipes = async (dietType?: DietType) => {
    setIsGeneratingAiRecipes(true);
    // Ignore pending ingredients for recipe recommendation! Only use active ones.
    const activeIngredients = ingredients.filter((i) => !i.isPending);
    const selectedList = activeIngredients.filter((i) => i.isSelected).map((i) => i.name);
    const allList = activeIngredients.map((i) => i.name);

    try {
      const res = await fetch('/api/recommend-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedIngredients: selectedList,
          allIngredients: allList,
          dietType: dietType || '전체',
          weeklyBudget: budgetConfig.weeklyBudget,
          preferFridgeFirst: budgetConfig.preferFridgeFirst,
          userProfile,
        }),
      });

      const data = await res.json();
      if (data.recipes && data.recipes.length > 0) {
        setRecipes((prev) => {
          // Prepend new AI generated recipes
          const existingIds = new Set(data.recipes.map((r: Recipe) => r.id));
          return [...data.recipes, ...prev.filter((r) => !existingIds.has(r.id))];
        });
        if (activeIngredients.length === 0) {
          showToast(
            `냉장고 재료가 없어 주간 예산(${budgetConfig.weeklyBudget.toLocaleString()}원) 내 가성비 맞춤 레시피 ${data.recipes.length}개를 생성했습니다!`,
            'success'
          );
        } else {
          showToast(
            `AI가 냉장고 재료 맞춤 다이어트 레시피 ${data.recipes.length}개를 생성했습니다!`,
            'success'
          );
        }
      }
    } catch (e) {
      console.error(e);
      showToast('레시피 추천 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsGeneratingAiRecipes(false);
    }
  };

  // --- Cook & Auto Deduct Handler ---
  const handleStartCookRecipe = (recipe: Recipe) => {
    // Automatically add any needed extra ingredients to the fridge pending list (1단계 예비 리스트)
    if (recipe.neededIngredients && recipe.neededIngredients.length > 0) {
      const newPendingItems: Ingredient[] = recipe.neededIngredients.map((ing, idx) => {
        let priceNum = 3000;
        if (ing.estimatedPrice) {
          const parsed = parseInt(ing.estimatedPrice.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(parsed) && parsed > 0) priceNum = parsed;
        }

        const formatted = formatIngredientForFridge(ing.name, ing.quantity);

        return {
          id: `ing-pending-${Date.now()}-${idx}`,
          name: formatted.name,
          category: formatted.category,
          quantity: formatted.quantity,
          unit: formatted.unit,
          isSelected: true,
          addedAt: new Date().toISOString().split('T')[0],
          isPending: true, // 1단계 예비 리스트
          estimatedPrice: priceNum,
          recipeTitle: recipe.title,
        };
      });

      setIngredients((prev) => [...newPendingItems, ...prev]);
      showToast(
        `👨‍🍳 '${recipe.title}'에 필요한 부재료 ${newPendingItems.length}개가 냉장고 [입고 대기(예비)] 리스트에 추가되었습니다!`,
        'info'
      );
    }

    setCookingRecipe(recipe);
  };

  const handleCookConfirm = (data: {
    recipe: Recipe;
    mealType: MealType;
    deductions: { id: string; deductQty: number }[];
  }) => {
    const { recipe, mealType, deductions } = data;

    // 1. Deduct ingredients from fridge inventory
    const deductedNames: string[] = [];
    setIngredients((prev) => {
      let updated = [...prev];
      deductions.forEach(({ id, deductQty }) => {
        const idx = updated.findIndex((item) => item.id === id);
        if (idx !== -1) {
          const item = updated[idx];
          const newQty = Math.max(0, Math.round((item.quantity - deductQty) * 10) / 10);
          deductedNames.push(`${item.name} (-${deductQty}${item.unit})`);
          if (newQty <= 0) {
            updated = updated.filter((_, i) => i !== idx);
          } else {
            updated[idx] = { ...item, quantity: newQty };
          }
        }
      });
      return updated;
    });

    // 2. Add meal entry to diet log
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newLog: MealLog = {
      id: `log-${Date.now()}`,
      date: todayStr,
      time: timeStr,
      mealType,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      calories: recipe.calories,
      carbs: recipe.carbs,
      protein: recipe.protein,
      fat: recipe.fat,
      deductedIngredientsSummary: deductedNames,
    };

    setLogs((prev) => [newLog, ...prev]);
    setCookingRecipe(null);

    showToast(
      `🎉 '${recipe.title}' 요리 완료! 재료가 자동 차감되고 ${mealType} 식단으로 기록되었습니다.`,
      'success'
    );
  };

  // --- Shopping List Handlers ---
  const handleDeleteShoppingItem = (id: string) => {
    setShoppingItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllShoppingHistory = () => {
    setShoppingItems([]);
    showToast('구매 지출 내역 기록이 모두 삭제되었습니다.', 'info');
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    if (newProfile.dailyTargetCalories) {
      setUserTarget((prev) => ({
        ...prev,
        targetCalories: newProfile.dailyTargetCalories || prev.targetCalories,
        targetCarbs: Math.round(((newProfile.dailyTargetCalories || 1800) * 0.4) / 4),
        targetProtein: Math.round(((newProfile.dailyTargetCalories || 1800) * 0.35) / 4),
        targetFat: Math.round(((newProfile.dailyTargetCalories || 1800) * 0.25) / 9),
      }));
    }
    showToast('신체 프로필 및 1끼 다이어트 목표가 저장되었습니다.', 'success');
  };

  // Compute Today Calories
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCalories = logs
    .filter((l) => l.date === todayStr)
    .reduce((acc, l) => acc + l.calories, 0);

  const selectedCount = ingredients.filter((i) => i.isSelected).length;

  return (
    <>
      {/* Google Login Overlay Modal */}
      <GoogleLoginModal isOpen={!googleUser} onLoginSuccess={handleLoginSuccess} />

      <div
        className={`min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-slate-900 font-sans antialiased selection:bg-emerald-200 pb-24 md:pb-12 transition-all duration-500 ${
          !googleUser ? 'filter blur-md pointer-events-none select-none opacity-40' : ''
        }`}
      >
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-4 duration-200">
            <div
              className={`p-3.5 sm:p-4 rounded-2xl shadow-xl border flex items-center space-x-3 text-xs sm:text-sm font-bold ${
                toastMessage.type === 'success'
                  ? 'bg-slate-900 text-white border-emerald-500/30'
                  : 'bg-red-900 text-white border-red-500/30'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span className="leading-snug">{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Main Navigation Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          fridgeCount={ingredients.length}
          selectedCount={selectedCount}
          todayCalories={todayCalories}
          targetCalories={userTarget.targetCalories}
          onOpenSettings={() => setIsSettingsOpen(true)}
          googleUser={googleUser}
          sheetUrl={sheetUrl}
          onManualSync={handleManualSync}
          onLogout={handleLogout}
          isSyncing={isSyncing}
        />

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {activeTab === 'fridge' && (
          <FridgeView
            ingredients={ingredients}
            onAddIngredient={handleAddIngredient}
            onConfirmPending={handleConfirmPendingIngredient}
            onConfirmAllPending={handleConfirmAllPendingIngredients}
            onUpdateIngredientDetails={handleUpdateIngredientDetails}
            onUpdateQuantity={handleUpdateQuantity}
            onToggleSelect={handleToggleSelectIngredient}
            onToggleSelectAll={handleToggleSelectAllIngredients}
            onDeleteIngredient={handleDeleteIngredient}
            onGoToRecipes={() => setActiveTab('recipes')}
            onParseAiText={handleParseAiText}
            onParseReceiptImage={handleParseReceiptImage}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipeView
            recipes={recipes}
            ingredients={ingredients}
            onGenerateAiRecipes={handleGenerateAiRecipes}
            onCookRecipe={handleStartCookRecipe}
            onToggleIngredient={handleToggleSelectIngredient}
            isGenerating={isGeneratingAiRecipes}
          />
        )}

        {activeTab === 'tracker' && (
          <TrackerView
            logs={logs}
            target={userTarget}
            onUpdateTarget={setUserTarget}
            onAddManualLog={(log) => {
              const newLog: MealLog = { ...log, id: `log-${Date.now()}` };
              setLogs((prev) => [newLog, ...prev]);
              showToast('식단 기록이 저장되었습니다.', 'success');
            }}
            onDeleteLog={(id) => {
              setLogs((prev) => prev.filter((l) => l.id !== id));
              showToast('식단 기록이 삭제되었습니다.', 'info');
            }}
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingView
            shoppingItems={shoppingItems}
            budgetConfig={budgetConfig}
            onUpdateBudgetConfig={(cfg) => setBudgetConfig((prev) => ({ ...prev, ...cfg }))}
            onDeleteShoppingItem={handleDeleteShoppingItem}
            onClearAllHistory={handleClearAllShoppingHistory}
          />
        )}
      </main>

      {/* User Body Settings Modal */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userProfile={userProfile}
        onSaveProfile={handleSaveProfile}
        googleUser={googleUser}
        sheetUrl={sheetUrl}
        onManualSync={handleManualSync}
        onLogout={handleLogout}
        onOpenGoogleLogin={() => setIsGoogleLoginOpen(true)}
        isSyncing={isSyncing}
      />

      {/* Google OAuth Login & Sheet Setup Modal */}
      <GoogleLoginModal
        isOpen={isGoogleLoginOpen}
        onClose={() => setIsGoogleLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Cooking Confirmation & Deduction Modal */}
      {cookingRecipe && (
        <CookConfirmModal
          recipe={cookingRecipe}
          fridgeIngredients={ingredients}
          onClose={() => setCookingRecipe(null)}
          onConfirmCook={handleCookConfirm}
        />
      )}
    </div>
  </>
  );
}
