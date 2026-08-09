import React from 'react';
import { Utensils, Refrigerator, BarChart3, ShoppingBag, Settings, Table, LogOut, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: 'fridge' | 'recipes' | 'tracker' | 'shopping';
  setActiveTab: (tab: 'fridge' | 'recipes' | 'tracker' | 'shopping') => void;
  fridgeCount: number;
  selectedCount: number;
  todayCalories: number;
  targetCalories: number;
  onOpenSettings?: () => void;
  googleUser?: { email: string; name: string; picture?: string } | null;
  sheetUrl?: string | null;
  onManualSync?: () => void;
  onLogout?: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  fridgeCount,
  onOpenSettings,
  googleUser,
  sheetUrl,
  onManualSync,
  onLogout,
  isSyncing,
}) => {
  return (
    <>
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-2xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & Title */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer group"
              onClick={() => setActiveTab('recipes')}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  냉털식사
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                  맞춤 다이어트 식단 & 레시피
                </p>
              </div>
            </div>

            {/* Header Right Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Google Sheets View Button */}
              {sheetUrl ? (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center gap-1.5 border border-emerald-500 shrink-0"
                  title="연동된 Google Sheets 엑셀 파일 열기"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Google Sheets 엑셀 보기</span>
                  <span className="sm:hidden">시트 보기</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-2xl text-xs transition-all border border-emerald-200/80 flex items-center gap-1.5 shrink-0"
                  title="Google 계정 및 Sheets 연동하기"
                >
                  <Table className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Google Sheets 연동 / 보기</span>
                  <span className="sm:hidden">시트 연동</span>
                </button>
              )}

              <button
                id="btn-header-open-settings"
                onClick={onOpenSettings}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all border border-slate-200/80 shadow-2xs flex items-center justify-center"
                title="신체 스펙 및 1끼 다이어트 영양 설정"
              >
                <Settings className="w-4 h-4 text-emerald-600" />
              </button>

              {/* Desktop Navigation Tabs */}
              <nav className="hidden md:flex items-center space-x-1.5">
                <button
                  id="nav-tab-recipes"
                  onClick={() => setActiveTab('recipes')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === 'recipes'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>레시피</span>
                </button>

                <button
                  id="nav-tab-fridge"
                  onClick={() => setActiveTab('fridge')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === 'fridge'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Refrigerator className="w-4 h-4" />
                  <span>냉장고</span>
                  {fridgeCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeTab === 'fridge' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {fridgeCount}
                    </span>
                  )}
                </button>

                <button
                  id="nav-tab-tracker"
                  onClick={() => setActiveTab('tracker')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === 'tracker'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>식단기록</span>
                </button>

                <button
                  id="nav-tab-shopping"
                  onClick={() => setActiveTab('shopping')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === 'shopping'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>장바구니</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 shadow-lg px-2 py-1.5 flex justify-around items-center">
        <button
          id="mobile-nav-recipes"
          onClick={() => setActiveTab('recipes')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'recipes'
              ? 'text-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Utensils className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">레시피</span>
        </button>

        <button
          id="mobile-nav-fridge"
          onClick={() => setActiveTab('fridge')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
            activeTab === 'fridge'
              ? 'text-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <Refrigerator className="w-5 h-5 mb-0.5" />
            {fridgeCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 rounded-full min-w-[14px] text-center">
                {fridgeCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">냉장고</span>
        </button>

        <button
          id="mobile-nav-tracker"
          onClick={() => setActiveTab('tracker')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'tracker'
              ? 'text-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">식단기록</span>
        </button>

        <button
          id="mobile-nav-shopping"
          onClick={() => setActiveTab('shopping')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'shopping'
              ? 'text-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">장바구니</span>
        </button>
      </div>
    </>
  );
};

