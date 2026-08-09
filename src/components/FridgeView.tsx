import React, { useState, useRef } from 'react';
import { Ingredient, IngredientCategory } from '../types';
import {
  Plus,
  Trash2,
  Sparkles,
  Search,
  Calendar,
  Layers,
  ChevronRight,
  AlertCircle,
  Wand2,
  Clock,
  X,
  Camera,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  PackageCheck,
  Edit3,
  Info,
} from 'lucide-react';

interface FridgeViewProps {
  ingredients: Ingredient[];
  onAddIngredient: (item: Omit<Ingredient, 'id' | 'addedAt'>) => void;
  onConfirmPending?: (id: string) => void;
  onConfirmAllPending?: () => void;
  onUpdateIngredientDetails?: (id: string, updates: Partial<Ingredient>) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (selected: boolean) => void;
  onDeleteIngredient: (id: string) => void;
  onGoToRecipes: () => void;
  onParseAiText: (text: string) => Promise<void>;
  onParseReceiptImage?: (imageBase64: string, mimeType?: string) => Promise<void>;
}

const CATEGORIES: ('전체' | IngredientCategory)[] = [
  '전체',
  '육류/해산물',
  '채소/과일',
  '계란/유제품',
  '곡류/구황작물',
  '양념/기타',
];

export const FridgeView: React.FC<FridgeViewProps> = ({
  ingredients,
  onAddIngredient,
  onConfirmPending,
  onConfirmAllPending,
  onUpdateIngredientDetails,
  onUpdateQuantity,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteIngredient,
  onGoToRecipes,
  onParseAiText,
  onParseReceiptImage,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'전체' | IngredientCategory>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'receipt' | 'text'>('receipt');
  const [aiInputText, setAiInputText] = useState('');
  const [receiptImage, setReceiptImage] = useState<{ file: File; preview: string } | null>(null);
  const [isParsingAi, setIsParsingAi] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<IngredientCategory>('채소/과일');
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newUnit, setNewUnit] = useState('개');
  const [newExpireDate, setNewExpireDate] = useState('');

  // Filtered ingredients
  const filtered = ingredients.filter((item) => {
    const matchesCategory = selectedCategory === '전체' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingIngredients = filtered.filter((item) => item.isPending);
  const activeIngredients = filtered.filter((item) => !item.isPending);

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onAddIngredient({
      name: newName.trim(),
      category: newCategory,
      quantity: Number(newQuantity) || 1,
      unit: newUnit,
      expireDate: newExpireDate || undefined,
      isSelected: true,
    });

    // Reset Form
    setNewName('');
    setNewQuantity(1);
    setNewExpireDate('');
    setIsAddModalOpen(false);
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImage({
        file,
        preview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAiParseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (aiMode === 'receipt') {
      if (!receiptImage) return;
      setIsParsingAi(true);
      if (onParseReceiptImage) {
        await onParseReceiptImage(receiptImage.preview, receiptImage.file.type);
      }
      setIsParsingAi(false);
      setReceiptImage(null);
      setIsAiModalOpen(false);
    } else {
      if (!aiInputText.trim()) return;
      setIsParsingAi(true);
      await onParseAiText(aiInputText);
      setIsParsingAi(false);
      setAiInputText('');
      setIsAiModalOpen(false);
    }
  };

  // Compute D-Day helper
  const getDDayBadge = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(dateStr);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          유통기한 만료
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 mr-1" />
          D-{diffDays} 임박
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          D-{diffDays}
        </span>
      );
    }
  };

  const getCategoryBg = (cat: IngredientCategory) => {
    switch (cat) {
      case '육류/해산물':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case '채소/과일':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case '계란/유제품':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case '곡류/구황작물':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Action Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            id="btn-ai-quick-add"
            onClick={() => setIsAiModalOpen(true)}
            className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs whitespace-nowrap"
          >
            <Wand2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>AI 자동 등록</span>
          </button>

          <button
            id="btn-manual-add"
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>재료 직접 추가</span>
          </button>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="재료 검색"
            className={`relative p-2.5 sm:px-3.5 h-10 inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs shrink-0 ${
              isSearchOpen || searchQuery || selectedCategory !== '전체'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Search className="w-4 h-4 text-slate-700 shrink-0" />
            {(searchQuery || selectedCategory !== '전체') && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white" />
            )}
          </button>
        </div>

        {/* Search & Category Filter Panel (Appears when Search is clicked or active) */}
        {(isSearchOpen || searchQuery || selectedCategory !== '전체') && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
            {/* Search Input Bar */}
            <div className="relative w-full flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="재료 이름으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                {(searchQuery || selectedCategory !== '전체') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('전체');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded-md hover:bg-slate-200"
                  >
                    초기화
                  </button>
                )}
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Filter Pills inside Search */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1단계: 입고 대기 (예비 리스트) SECTION */}
      {pendingIngredients.length > 0 && (
        <div className="bg-amber-50/70 rounded-3xl p-5 border border-amber-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/70 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-black text-amber-950">
                    📥 입고 대기 (예비 리스트 1단계)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300">
                    {pendingIngredients.length}개 대기 중
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  장보기 완료 또는 요리 선택으로 리스트업된 재료입니다. 수량/유통기한을 수정하고 [확정]을 누르면 메뉴 추천 및 정식 재료 카드에 노출됩니다.
                </p>
              </div>
            </div>

            {onConfirmAllPending && (
              <button
                id="btn-confirm-all-pending"
                onClick={onConfirmAllPending}
                className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm transition-all flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>전체 확정 입고 (2단계)</span>
              </button>
            )}
          </div>

          {/* Pending Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingIngredients.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-amber-300 shadow-2xs hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-base">{item.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryBg(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-extrabold rounded-md">
                      ⚠️ 대기 상태 (메뉴 구성 노출 안 됨)
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteIngredient(item.id)}
                    className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Edits */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">수량 / 단위:</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-slate-900 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200"
                      >
                        +
                      </button>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          onUpdateIngredientDetails &&
                          onUpdateIngredientDetails(item.id, { unit: e.target.value })
                        }
                        className="w-12 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">유통기한:</span>
                    <input
                      type="date"
                      value={item.expireDate || ''}
                      onChange={(e) =>
                        onUpdateIngredientDetails &&
                        onUpdateIngredientDetails(item.id, { expireDate: e.target.value })
                      }
                      className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">구매 지출액:</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={item.estimatedPrice || ''}
                        placeholder="0"
                        onChange={(e) =>
                          onUpdateIngredientDetails &&
                          onUpdateIngredientDetails(item.id, {
                            estimatedPrice: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-20 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-right text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-slate-500 text-[11px]">원</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Button */}
                {onConfirmPending && (
                  <button
                    onClick={() => onConfirmPending(item.id)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>확정 입고 (장바구니 구매 내역 자동 등록)</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2단계: 나의 냉장고 정식 보유 재료 SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            🧊 나의 냉장고 보유 재료 ({activeIngredients.length}개)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            (메뉴 추천 & AI 레시피 생성에 사용되는 재료)
          </span>
        </div>

        {activeIngredients.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">확정 등록된 보유 재료가 없습니다</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {pendingIngredients.length > 0
                ? '상단 예비 리스트에 대기 중인 재료의 [확정 등록]을 눌러주시면 이 곳에 표시되고 메뉴 구성에 활용됩니다!'
                : "상단의 '재료 직접 추가' 또는 'AI 자동 등록'을 통해 냉장고 식재료를 등록해 보세요."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeIngredients.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-300 transition-all relative shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-800 text-base">{item.name}</h4>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryBg(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center space-x-2 text-xs text-slate-500">
                      {getDDayBadge(item.expireDate)}
                      {item.expireDate && (
                        <span className="flex items-center text-slate-400">
                          <Calendar className="w-3 h-3 mr-0.5" />
                          {item.expireDate.slice(5)}까지
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteIngredient(item.id)}
                    className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">잔여 수량:</span>
                  <div className="flex items-center space-x-2 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-slate-800 min-w-[3rem] text-center">
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Manual Add Ingredient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                🧊 재료 직접 추가
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  재료명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 닭가슴살, 두부, 브로콜리"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">카테고리</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as IngredientCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="육류/해산물">🥩 육류/해산물</option>
                  <option value="채소/과일">🥦 채소/과일</option>
                  <option value="계란/유제품">🥚 계란/유제품</option>
                  <option value="곡류/구황작물">🍚 곡류/구황작물</option>
                  <option value="양념/기타">🥫 양념/기타</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">수량</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">단위</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="개">개</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="모">모</option>
                    <option value="통">통</option>
                    <option value="송이">송이</option>
                    <option value="팩">팩</option>
                    <option value="병">병</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  유통기한 (선택)
                </label>
                <input
                  type="date"
                  value={newExpireDate}
                  onChange={(e) => setNewExpireDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Quick Add Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  AI 스마트 재료 한 번에 등록
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAiModalOpen(false);
                  setReceiptImage(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* AI Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-xl text-xs sm:text-sm font-bold">
              <button
                type="button"
                onClick={() => setAiMode('receipt')}
                className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  aiMode === 'receipt'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>📸 영수증 사진 인식</span>
              </button>
              <button
                type="button"
                onClick={() => setAiMode('text')}
                className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  aiMode === 'text'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>✍️ 문장·음성 입력</span>
              </button>
            </div>

            <form onSubmit={handleAiParseSubmit} className="mt-4 space-y-4">
              {aiMode === 'receipt' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    마트/시장에서 받은 장본 영수증 사진을 올려주세요. Gemini AI가 이미지 속 식재료 품목과 수량을 자동으로 분류합니다.
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleReceiptFileChange}
                    className="hidden"
                  />

                  {receiptImage ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 max-h-56 flex items-center justify-center group">
                      <img
                        src={receiptImage.preview}
                        alt="영수증 미리보기"
                        className="object-contain max-h-56 w-full rounded-2xl"
                      />
                      <button
                        type="button"
                        onClick={() => setReceiptImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        영수증 사진 선택 또는 촬영하기
                      </p>
                      <p className="text-[11px] text-slate-400">
                        클릭하여 갤러리/카메라에서 사진을 첨부하세요 (JPG, PNG)
                      </p>
                    </div>
                  )}

                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                    <span className="font-bold flex items-center text-emerald-800">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      스마트 용량 추론 안내:
                    </span>
                    <p className="leading-relaxed text-[11px]">
                      영수증에 용량이나 수량이 적혀있지 않고 상품명/가격만 기재되어 있어도, Gemini AI가 가격대를 기반으로 규격(예: 우유 1L, 계란 1판 등)을 지능 추론해 드립니다!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    구입한 식재료 문장을 자유롭게 입력하시면 Gemini AI가 카테고리와 수량을 자동으로 분류해 냉장고에 추가해 드립니다.
                  </p>

                  <div>
                    <textarea
                      required={aiMode === 'text'}
                      rows={4}
                      placeholder="예: 오늘 장본 것들 - 닭가슴살 3팩, 양배추 반통, 방울토마토 500g, 계란 1판, 진간장 1병"
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                    />
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
                    <span className="font-semibold block">💡 입력 예시:</span>
                    <p>• "두부 2모, 브로콜리 1송이, 파프리카 3개 샀어"</p>
                    <p>• "닭가슴살 500g, 고구마 1박스, 오트밀 추가해줘"</p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAiModalOpen(false);
                    setReceiptImage(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isParsingAi || (aiMode === 'receipt' && !receiptImage)}
                  className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-600/20"
                >
                  {isParsingAi ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Gemini 분석 중...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>
                        {aiMode === 'receipt' ? '영수증 분석 & 재료 추가' : 'AI 한 번에 추출 & 추가'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
