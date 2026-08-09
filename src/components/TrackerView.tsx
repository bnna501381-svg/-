import React, { useState } from 'react';
import { MealLog, UserTarget, MealType } from '../types';
import {
  Flame,
  Target,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface TrackerViewProps {
  logs: MealLog[];
  target: UserTarget;
  onUpdateTarget: (target: UserTarget) => void;
  onAddManualLog: (log: Omit<MealLog, 'id'>) => void;
  onDeleteLog: (id: string) => void;
}

export const TrackerView: React.FC<TrackerViewProps> = ({
  logs,
  target,
  onUpdateTarget,
  onAddManualLog,
  onDeleteLog,
}) => {
  // Date State (default to today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);

  // Target Edit state
  const [editTargetCal, setEditTargetCal] = useState(target.targetCalories);
  const [editTargetCarbs, setEditTargetCarbs] = useState(target.targetCarbs);
  const [editTargetProtein, setEditTargetProtein] = useState(target.targetProtein);
  const [editTargetFat, setEditTargetFat] = useState(target.targetFat);

  // Manual log state
  const [manualTitle, setManualTitle] = useState('');
  const [manualMealType, setManualMealType] = useState<MealType>('점심');
  const [manualCal, setManualCal] = useState(300);
  const [manualCarbs, setManualCarbs] = useState(25);
  const [manualProtein, setManualProtein] = useState(30);
  const [manualFat, setManualFat] = useState(10);

  // Logs for selected date
  const dayLogs = logs.filter((l) => l.date === selectedDate);

  // Daily totals
  const totalCal = dayLogs.reduce((acc, l) => acc + l.calories, 0);
  const totalCarbs = dayLogs.reduce((acc, l) => acc + l.carbs, 0);
  const totalProtein = dayLogs.reduce((acc, l) => acc + l.protein, 0);
  const totalFat = dayLogs.reduce((acc, l) => acc + l.fat, 0);

  const calPercent = Math.min(Math.round((totalCal / target.targetCalories) * 100), 100);

  // Prepare past 7 days chart data
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;

    const dLogs = logs.filter((l) => l.date === dateStr);
    const dCal = dLogs.reduce((acc, l) => acc + l.calories, 0);

    chartData.push({
      date: dateStr,
      label: i === 0 ? '오늘' : monthDay,
      calories: dCal,
      target: target.targetCalories,
    });
  }

  const handleDateShift = (deltaDays: number) => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() + deltaDays);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTarget({
      targetCalories: Number(editTargetCal) || 1800,
      targetCarbs: Number(editTargetCarbs) || 180,
      targetProtein: Number(editTargetProtein) || 130,
      targetFat: Number(editTargetFat) || 50,
    });
    setIsSettingsOpen(false);
  };

  const handleManualLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    onAddManualLog({
      date: selectedDate,
      time: timeStr,
      mealType: manualMealType,
      recipeTitle: manualTitle.trim(),
      calories: Number(manualCal) || 0,
      carbs: Number(manualCarbs) || 0,
      protein: Number(manualProtein) || 0,
      fat: Number(manualFat) || 0,
    });

    setManualTitle('');
    setIsManualLogOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Controls & Date Selector */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleDateShift(-1)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="font-bold text-slate-800 text-base sm:text-lg focus:outline-none bg-transparent cursor-pointer"
            />
            {selectedDate === new Date().toISOString().split('T')[0] && (
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                오늘
              </span>
            )}
          </div>

          <button
            onClick={() => handleDateShift(1)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsManualLogOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>식단 직접 추가</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>목표 설정</span>
          </button>
        </div>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Calorie Goal Gauge */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-500" /> 일일 칼로리 달성도
            </span>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {calPercent}%
            </span>
          </div>

          <div className="my-5 text-center">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalCal} <span className="text-sm font-semibold text-slate-500">/ {target.targetCalories} kcal</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {target.targetCalories - totalCal > 0
                ? `목표 칼로리까지 ${target.targetCalories - totalCal} kcal 남았습니다.`
                : '오늘 목표 칼로리를 채웠습니다!'}
            </p>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-3 rounded-full transition-all duration-500"
              style={{ width: `${calPercent}%` }}
            />
          </div>
        </div>

        {/* Card 2: Macros Balance */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-600" /> 탄단지(탄수화물 · 단백질 · 지방) 권장 섭취량
            </h3>
            <span className="text-xs text-slate-400">섭취 / 목표</span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Carbs */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">🌾 탄수화물</span>
                <span className="text-slate-900">
                  <strong>{totalCarbs}g</strong> / {target.targetCarbs}g
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-sky-400 h-2.5 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((totalCarbs / target.targetCarbs) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Protein */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-800">🍗 단백질 (핵심)</span>
                <span className="text-emerald-900">
                  <strong className="text-emerald-700">{totalProtein}g</strong> / {target.targetProtein}g
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((totalProtein / target.targetProtein) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Fat */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">🥑 지방</span>
                <span className="text-slate-900">
                  <strong>{totalFat}g</strong> / {target.targetFat}g
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-2.5 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((totalFat / target.targetFat) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Calorie Intake Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> 주간 칼로리 섭취 추이
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">지난 7일간의 칼로리 기록과 일일 목표 기준선</p>
          </div>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`${val} kcal`, '섭취 칼로리']}
              />
              <ReferenceLine y={target.targetCalories} stroke="#10b981" strokeDasharray="3 3" label={{ value: '목표선', fill: '#059669', fontSize: 10 }} />
              <Bar dataKey="calories" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.date === selectedDate ? '#10b981' : '#cbd5e1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Today's Meal Logs Timeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            📅 {selectedDate === new Date().toISOString().split('T')[0] ? '오늘' : selectedDate} 섭취 식단 목록
          </h3>
          <span className="text-xs font-semibold text-slate-500">총 {dayLogs.length}건 기록</span>
        </div>

        {dayLogs.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Award className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">이 날짜에 기록된 식단이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">
              레시피 탭에서 만들어 먹거나 '식단 직접 추가'를 눌러 기록해보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start space-x-3">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    {log.mealType}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">{log.recipeTitle}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">기록 시간: {log.time}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-amber-600 flex items-center justify-end">
                      <Flame className="w-3.5 h-3.5 mr-0.5 text-amber-500" />
                      {log.calories} kcal
                    </span>
                    <span className="text-[11px] text-slate-500">
                      탄 {log.carbs}g · 단 {log.protein}g · 지 {log.fat}g
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteLog(log.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Target Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              🎯 다이어트 영양 목표 설정
            </h3>

            <form onSubmit={handleSaveTarget} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  목표 칼로리 (kcal)
                </label>
                <input
                  type="number"
                  required
                  value={editTargetCal}
                  onChange={(e) => setEditTargetCal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">탄수화물(g)</label>
                  <input
                    type="number"
                    required
                    value={editTargetCarbs}
                    onChange={(e) => setEditTargetCarbs(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">단백질(g)</label>
                  <input
                    type="number"
                    required
                    value={editTargetProtein}
                    onChange={(e) => setEditTargetProtein(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">지방(g)</label>
                  <input
                    type="number"
                    required
                    value={editTargetFat}
                    onChange={(e) => setEditTargetFat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Meal Log Modal */}
      {isManualLogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              ➕ 식단 직접 기록 추가
            </h3>

            <form onSubmit={handleManualLogSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">식사 메뉴명</label>
                <input
                  type="text"
                  required
                  placeholder="예: 닭가슴살 샐러드, 아이스 아메리카노"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">식사 구분</label>
                <select
                  value={manualMealType}
                  onChange={(e) => setManualMealType(e.target.value as MealType)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="아침">🌅 아침</option>
                  <option value="점심">☀️ 점심</option>
                  <option value="저녁">🌙 저녁</option>
                  <option value="간식">🍏 간식</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">칼로리 (kcal)</label>
                  <input
                    type="number"
                    value={manualCal}
                    onChange={(e) => setManualCal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">단백질 (g)</label>
                  <input
                    type="number"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">탄수화물 (g)</label>
                  <input
                    type="number"
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">지방 (g)</label>
                  <input
                    type="number"
                    value={manualFat}
                    onChange={(e) => setManualFat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsManualLogOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
                >
                  기록 추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
