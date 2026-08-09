export type IngredientCategory = '육류/해산물' | '채소/과일' | '계란/유제품' | '곡류/구황작물' | '양념/기타';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
  expireDate?: string; // YYYY-MM-DD
  isSelected: boolean; // whether selected for recipe search
  addedAt: string;
  isPending?: boolean; // true if in draft/pending list before confirmation
  estimatedPrice?: number; // estimated purchase price
  recipeTitle?: string; // origin recipe title
}

export interface RecipeIngredientItem {
  name: string;
  quantity: string;
  deductAmount?: number; // numeric amount to deduct if matched in fridge
  deductUnit?: string;
  isAvailable?: boolean; // matched in user's fridge
  estimatedPrice?: string;
}

export type DietType = '전체' | '고단백' | '저탄고지' | '15분초간단' | '클린채식' | '균형식단';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  calories: number; // kcal
  carbs: number; // g
  protein: number; // g
  fat: number; // g
  prepTimeMinutes: number;
  difficulty: '쉬움' | '보통' | '어려움';
  dietType: DietType;
  usedIngredients: RecipeIngredientItem[];
  neededIngredients: RecipeIngredientItem[];
  steps: string[];
  chefTip?: string;
  isAiGenerated?: boolean;
  matchScore?: number; // 0-100%
}

export type MealType = '아침' | '점심' | '저녁' | '간식';

export interface MealLog {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  mealType: MealType;
  recipeId?: string;
  recipeTitle: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  deductedIngredientsSummary?: string[];
}

export interface UserTarget {
  targetCalories: number;
  targetCarbs: number;
  targetProtein: number;
  targetFat: number;
}

export interface UserProfile {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'low' | 'moderate' | 'high';
  bmr?: number;
  tdee?: number;
  dailyTargetCalories?: number;
  perMealCalories?: number;
  perMealCarbs?: number;
  perMealProtein?: number;
  perMealFat?: number;
}

export interface WeeklyBudgetConfig {
  weeklyBudget: number; // e.g. 50000
  preferFridgeFirst: boolean; // prioritize using existing fridge ingredients
  weeklySpent: number; // total KRW spent in current week
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  recipeTitle?: string;
  estimatedPrice?: number; // e.g. 3200
  purchasedAt?: string; // YYYY-MM-DD
}
