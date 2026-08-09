import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Settings, X, Calculator, Sparkles, Check, Scale, Ruler, User, Table, LogOut, RefreshCw, UserCheck } from 'lucide-react';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  googleUser?: { email: string; name: string; picture?: string } | null;
  sheetUrl?: string | null;
  onManualSync?: () => void;
  onLogout?: () => void;
  isSyncing?: boolean;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSaveProfile,
  googleUser,
  sheetUrl,
  onManualSync,
  onLogout,
  isSyncing,
}) => {
  const [height, setHeight] = useState<number | ''>(userProfile.height || 170);
  const [weight, setWeight] = useState<number | ''>(userProfile.weight || 65);
  const [age, setAge] = useState<number | ''>(userProfile.age || 28);
  const [gender, setGender] = useState<'male' | 'female'>(userProfile.gender || 'female');
  const [activityLevel, setActivityLevel] = useState<'low' | 'moderate' | 'high'>(
    userProfile.activityLevel || 'moderate'
  );

  if (!isOpen) return null;

  const validHeight = typeof height === 'number' && height > 0 ? height : 170;
  const validWeight = typeof weight === 'number' && weight > 0 ? weight : 65;
  const validAge = typeof age === 'number' && age > 0 ? age : 28;

  // Calculate BMR (Mifflin-St Jeor)
  const bmr = Math.round(
    gender === 'male'
      ? 10 * validWeight + 6.25 * validHeight - 5 * validAge + 5
      : 10 * validWeight + 6.25 * validHeight - 5 * validAge - 161
  );

  // Activity Multiplier
  const activityMultiplier = activityLevel === 'low' ? 1.2 : activityLevel === 'high' ? 1.725 : 1.4;
  const tdee = Math.round(bmr * activityMultiplier);

  // Diet Daily Target (15-20% deficit)
  const dailyTargetCalories = Math.round(tdee * 0.82);

  // Per Meal Target (1/3 of daily)
  const perMealCalories = Math.round(dailyTargetCalories / 3);

  // Macro Ratio (40% Carbs : 35% Protein : 25% Fat for Diet)
  const perMealCarbs = Math.round((perMealCalories * 0.4) / 4);
  const perMealProtein = Math.round((perMealCalories * 0.35) / 4);
  const perMealFat = Math.round((perMealCalories * 0.25) / 9);

  const handleSave = () => {
    onSaveProfile({
      height: validHeight,
      weight: validWeight,
      age: validAge,
      gender,
      activityLevel,
      bmr,
      tdee,
      dailyTargetCalories,
      perMealCalories,
      perMealCarbs,
      perMealProtein,
      perMealFat,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                신체 스펙 & 1끼 영양 설정
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                키, 몸무게 기반 맞춤 다이어트 칼로리 자동 산출
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* Gender & Age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">성별</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                    gender === 'female'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  여성
                </button>
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                    gender === 'male'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  남성
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">나이 (세)</label>
              <div className="relative">
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={() => {
                    if (age === '' || age < 10) setAge(10);
                    else if (age > 100) setAge(100);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">세</span>
              </div>
            </div>
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                <span>신장 (키)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={() => {
                    if (height === '' || height < 100) setHeight(100);
                    else if (height > 230) setHeight(230);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">cm</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                <span>체중 (몸무게)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={() => {
                    if (weight === '' || weight < 30) setWeight(30);
                    else if (weight > 200) setWeight(200);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">kg</span>
              </div>
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">일상 활동량</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl text-center">
              <button
                type="button"
                onClick={() => setActivityLevel('low')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                  activityLevel === 'low'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                적음 (좌식)
              </button>
              <button
                type="button"
                onClick={() => setActivityLevel('moderate')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                  activityLevel === 'moderate'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                보통 (주2~3회)
              </button>
              <button
                type="button"
                onClick={() => setActivityLevel('high')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                  activityLevel === 'high'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                활동적 (주5회+)
              </button>
            </div>
          </div>

          {/* Live Calculation Results Box */}
          <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>자동 산출 1끼 다이어트 권장량</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                AI 프롬프트 즉시 연동
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-slate-500 block">기초대사량 (BMR)</span>
                <span className="text-sm font-extrabold text-slate-800">{bmr.toLocaleString()} kcal</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-slate-500 block">하루 감량 목표</span>
                <span className="text-sm font-extrabold text-emerald-700">{dailyTargetCalories.toLocaleString()} kcal</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900">🥗 1끼(한 끼) 맞춤 목표 칼로리</span>
                <span className="text-sm font-black text-emerald-600">약 {perMealCalories} kcal</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                <span>탄수화물 <strong>{perMealCarbs}g</strong></span>
                <span>단백질 <strong>{perMealProtein}g</strong></span>
                <span>지방 <strong>{perMealFat}g</strong></span>
              </div>
            </div>
          </div>

          {/* Google Account & Sheets Synchronization Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>구글 계정 및 Google Sheets 연동</span>
              </span>
              {googleUser ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  연동 중
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                  미연동
                </span>
              )}
            </div>

            {googleUser ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="truncate max-w-[200px]">
                    <span className="text-[10px] text-slate-400 block font-medium">연동된 구글 이메일</span>
                    <span className="font-bold text-slate-800 text-xs">{googleUser.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onLogout) onLogout();
                    }}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[11px] transition-colors border border-red-200 flex items-center gap-1 shrink-0"
                    title="구글 계정 로그아웃"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>로그아웃</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {sheetUrl ? (
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
                      title="Google Drive 엑셀 파일 열기"
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Google Sheets 엑셀 보기</span>
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={onManualSync}
                    disabled={isSyncing}
                    className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs transition-all border border-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? '동기화 중...' : 'Sheets 수동 동기화'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                구글 계정에 로그인하면 냉장고 및 식단 데이터가 Google Sheets 엑셀로 자동 백업됩니다.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center space-x-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>설정 저장 & 레시피 AI 반영</span>
          </button>
        </div>
      </div>
    </div>
  );
};
