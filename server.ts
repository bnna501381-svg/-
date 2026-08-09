import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  syncToGoogleSheets,
  loadFromGoogleSheets,
  getGoogleUserInfo,
} from './googleService.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Google Auth User Info
app.post('/api/auth/userinfo', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }
    const userInfo = await getGoogleUserInfo(accessToken);
    res.json({ userInfo });
  } catch (error: any) {
    res.status(401).json({ error: 'EXPIRED_TOKEN', message: error.message || 'Unauthorized token' });
  }
});

// Google Sheets Sync Endpoint
app.post('/api/sheets/sync', async (req, res) => {
  try {
    const { accessToken, data } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required for Google Sheets sync' });
    }
    const result = await syncToGoogleSheets(accessToken, data);
    res.json({ success: true, ...result });
  } catch (error: any) {
    const isAuthError =
      error.code === 401 ||
      error.status === 401 ||
      error.response?.status === 401 ||
      (error.message && (
        error.message.includes('invalid authentication credentials') ||
        error.message.includes('Invalid Credentials') ||
        error.message.includes('Unauthenticated') ||
        error.message.includes('token') ||
        error.message.includes('OAuth 2 access token')
      ));

    if (isAuthError) {
      console.warn('Sheets Sync: Auth token expired or invalid.');
      return res.status(401).json({
        error: 'EXPIRED_TOKEN',
        message: 'Google 계정 인증이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.',
      });
    }

    console.error('Sheets Sync Error:', error?.message || error);
    res.status(500).json({ error: error.message || 'Failed to sync to Google Sheets' });
  }
});

// Google Sheets Load Endpoint
app.post('/api/sheets/load', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required for Google Sheets load' });
    }
    const result = await loadFromGoogleSheets(accessToken);
    res.json({ success: true, ...result });
  } catch (error: any) {
    const isAuthError =
      error.code === 401 ||
      error.status === 401 ||
      error.response?.status === 401 ||
      (error.message && (
        error.message.includes('invalid authentication credentials') ||
        error.message.includes('Invalid Credentials') ||
        error.message.includes('Unauthenticated') ||
        error.message.includes('token') ||
        error.message.includes('OAuth 2 access token')
      ));

    if (isAuthError) {
      console.warn('Sheets Load: Auth token expired or invalid.');
      return res.status(401).json({
        error: 'EXPIRED_TOKEN',
        message: 'Google 계정 인증이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.',
      });
    }

    console.error('Sheets Load Error:', error?.message || error);
    res.status(500).json({ error: error.message || 'Failed to load from Google Sheets' });
  }
});

// Initialize Gemini SDK if API Key is available
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!apiKey });
});

// API: Parse Receipt Image into Fridge Ingredients
app.post('/api/parse-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    if (!ai) {
      // Mock fallback if API key is not present
      return res.json({
        ingredients: [
          { name: '서울우유', category: '계란/유제품', quantity: 1, unit: 'L' },
          { name: '달걀', category: '계란/유제품', quantity: 1, unit: '판' },
          { name: '두부', category: '곡류/구황작물', quantity: 2, unit: '모' },
          { name: '양배추', category: '채소/과일', quantity: 1, unit: '통' },
        ],
      });
    }

    // Clean base64 string if data URL prefix exists
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const actualMimeType = mimeType || (imageBase64.match(/^data:(image\/\w+);base64,/) || [])[1] || 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: actualMimeType,
          },
        },
        '이 영수증 사진을 분석하여 구매한 식재료 품목(이름, 카테고리, 수량, 단위)을 추출해 JSON 배열로 반환하세요. 비식물/공산품(비닐봉투, 세제, 휴지 등)은 식재료가 아니므로 반드시 제외하세요. 만약 영수증에 단위나 용량이 구체적으로 명시되어 있지 않고 품목명/가격만 적혀있는 경우(예: 우유, 두부, 달걀 등), 가격과 상품명을 바탕으로 가장 표준적이고 합리적인 수량과 단위(예: 우유 1L/1병, 달걀 30개/1판, 두부 1모 등)를 지능적으로 추론하세요.',
      ],
      config: {
        systemInstruction: `당신은 영수증 이미지 OCR 및 식재료 분석 전문 AI입니다. 영수증 이미지에서 식재료 목록을 정확히 인식하고 자동 정제하세요.
category는 다음 중 하나로 지정하세요: '육류/해산물', '채소/과일', '계란/유제품', '곡류/구황작물', '양념/기타'.
unit은 'g', 'kg', '개', '모', '통', '송이', '팩', '병', 'L', '판' 등 현실적인 단위를 지정하세요.
quantity는 숫자로 지정하세요.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
            },
            required: ['name', 'category', 'quantity', 'unit'],
          },
        },
      },
    });

    if (response.text) {
      const items = JSON.parse(response.text.trim());
      return res.json({ ingredients: items });
    }

    return res.json({ ingredients: [] });
  } catch (error) {
    console.error('Error parsing receipt image:', error);
    return res.status(500).json({ error: '영수증 이미지 분석 중 오류가 발생했습니다.' });
  }
});

// API: Parse Natural Language Text into Fridge Ingredients
app.post('/api/parse-ingredients', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required.' });
    }

    if (!ai) {
      // Fallback simple keyword parser
      const parsed = simpleParseIngredients(text);
      return res.json({ ingredients: parsed });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `다음 문장에서 냉장고에 등록할 식재료 목록을 추출해서 JSON으로 반환해줘: "${text}"`,
      config: {
        systemInstruction: `당신은 냉장고 재료 파싱 AI입니다. 사용자가 입력한 자연어 문장(예: "닭가슴살 2팩, 양배추 반통, 방울토마토 500g 샀음")을 정제된 식재료 객체 배열로 변환하세요.
category는 다음 중 하나로 지정하세요: '육류/해산물', '채소/과일', '계란/유제품', '곡류/구황작물', '양념/기타'.
unit은 'g', 'kg', '개', '모', '통', '송이', '팩', '병' 등 현실적인 단위를 지정하세요.
quantity는 숫자로 지정하세요.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
            },
            required: ['name', 'category', 'quantity', 'unit'],
          },
        },
      },
    });

    if (response.text) {
      const items = JSON.parse(response.text.trim());
      return res.json({ ingredients: items });
    }

    return res.json({ ingredients: simpleParseIngredients(text) });
  } catch (error) {
    console.error('Error parsing ingredients:', error);
    return res.json({ ingredients: simpleParseIngredients(req.body.text || '') });
  }
});

// API: AI Diet Recipe Recommendation based on Fridge Ingredients
app.post('/api/recommend-recipes', async (req, res) => {
  try {
    const { selectedIngredients, allIngredients, dietType, weeklyBudget, preferFridgeFirst, userProfile } = req.body;

    const availableList = (selectedIngredients && selectedIngredients.length > 0)
      ? selectedIngredients
      : (allIngredients || []);

    const budgetText = weeklyBudget ? `${Number(weeklyBudget).toLocaleString()}원` : '50,000원';
    const isFridgeFirst = preferFridgeFirst !== false;

    const userBodyText = (userProfile && userProfile.height && userProfile.weight)
      ? `\n\n[사용자 맞춤 신체 스펙 및 1끼(한 끼) 영양 목표]\n- 신체 스펙: 키 ${userProfile.height}cm, 체중 ${userProfile.weight}kg (${userProfile.gender === 'male' ? '남성' : '여성'}, ${userProfile.age || 28}세)\n- 1끼(한 끼) 맞춤 목표 칼로리: 약 ${userProfile.perMealCalories || 500} kcal\n- 1끼 목표 영양소 배율: 탄수화물 약 ${userProfile.perMealCarbs || 50}g / 단백질 약 ${userProfile.perMealProtein || 40}g / 지방 약 ${userProfile.perMealFat || 12}g\n★ [최우선 적용 사항]: 생성하는 모든 레시피의 칼로리(calories)와 영양소(carbs/protein/fat)는 위 사용자의 1끼 맞춤 목표(${userProfile.perMealCalories || 500} kcal, 탄단지 비율)에 최대한 정밀하게 맞춰서 조절하세요.`
      : '';

    let prompt = '';
    if (availableList.length > 0) {
      prompt = `사용자의 냉장고에 보유 중인 재료: [${availableList.join(', ')}].
선호 다이어트 유형: ${dietType || '전체'}.
주간 식비 예산 제한: ${budgetText}.
냉장고 재료 최우선 활용 모드(냉장고 파먹기): ${isFridgeFirst ? '적용 중 (추가 지출 0원/최소화 최우선)' : '보통'}.${userBodyText}

위 보유 재료를 100% 최우선 활용하여 알뜰하고 건강한 다이어트 레시피 3개를 추천해주세요.

★ [매우 중요: usedIngredients vs neededIngredients 구분 원칙]:
1. usedIngredients에는 반드시 위 사용자의 보유 재료 목록 [${availableList.join(', ')}]에 실제로 포함되어 있는 품목만 넣으세요!
2. 레시피에 필요한 재료 중 사용자의 냉장고 보유 목록에 없는 모든 재료(예: 계란, 밥, 참치, 두부, 양념, 오일 등)는 절대로 usedIngredients에 넣지 말고, 100% 무조건 neededIngredients(필요 부재료)에 넣고 실제 마트 구매 가격을 작성하세요!
3. 절대 보유하지 않은 재료(예: 계란, 밥 등)를 usedIngredients에 무단으로 넣는 오류를 범하지 마세요.`;
    } else {
      prompt = `사용자의 냉장고에 보유 중인 재료가 없습니다 (0개).
선호 다이어트 유형: ${dietType || '전체'}.
설정된 주간 식비 예산 제한: ${budgetText}.${userBodyText}

냉장고에 재료가 없으므로, 설정된 예산(${budgetText}) 범위 내에서 실제 마트에서 장봐서 바로 만들 수 있는 가성비 최고 다이어트 레시피 3개를 추천해주세요.

각 레시피에는:
1. 칼로리(kcal)와 탄수화물/단백질/지방(g) 함량을 사용자의 1끼 맞춤 목표에 맞게 정밀히 포함할 것.
2. 보유 재료가 없으므로 usedIngredients는 빈 배열([])로 두고, 장봐야 하는 재료들을 neededIngredients에 명시할 것.
3. **[중요] 장보기 수량 및 가격 책정 기준**: 낱개/1회용 분량(예: 계란 1개 400원, 간장 1스푼 500원)이 아니라, **실제 대형마트/슈퍼에서 판매하는 정규 포장 단위 및 실제 마트 구매 가격**(예: 계란 10구 1팩 3,800원, 진간장 500ml 1병 3,500원, 부침두부 1모 1,800원, 냉동 닭가슴살 1kg 8,900원 등)으로 수량과 estimatedPrice를 작성할 것.
4. 레시피 3개의 마트 장보기 총액이 설정된 주간 예산(${budgetText})을 초과하지 않도록 알뜰한 재료 세트로 제안할 것.
5. 구체적인 단계별 요리 순서(steps)와 다이어트 셰프 꿀팁(chefTip)을 작성할 것.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: `당신은 한국의 저명한 다이어트 영양사이자 알뜰 식단 셰프입니다. 
냉장고에 실제로 존재하는 재료를 최우선 활용(냉장고 파먹기)하여 장보기 지출을 최소화하는 현실적이고 맛있는 다이어트 레시피를 만들어냅니다.
영양성분(칼로리, 탄단지)은 실체감 있게 계산하고, 추가 지출을 극소화하도록 부재료 구매 필요 목록을 최소로 줄이세요.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              prepTimeMinutes: { type: Type.NUMBER },
              difficulty: { type: Type.STRING, enum: ['쉬움', '보통', '어려움'] },
              dietType: { type: Type.STRING },
              usedIngredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    deductAmount: { type: Type.NUMBER },
                    deductUnit: { type: Type.STRING },
                  },
                  required: ['name', 'quantity'],
                },
              },
              neededIngredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    estimatedPrice: { type: Type.STRING },
                  },
                  required: ['name', 'quantity'],
                },
              },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              chefTip: { type: Type.STRING },
            },
            required: [
              'id',
              'title',
              'description',
              'calories',
              'carbs',
              'protein',
              'fat',
              'prepTimeMinutes',
              'difficulty',
              'dietType',
              'usedIngredients',
              'neededIngredients',
              'steps',
            ],
          },
        },
      },
    });

    if (response.text) {
      const recipes = JSON.parse(response.text.trim());
      // mark as AI generated
      const formatted = recipes.map((r: any, idx: number) => ({
        ...r,
        id: `ai-gen-${Date.now()}-${idx}`,
        isAiGenerated: true,
      }));
      return res.json({ recipes: formatted });
    }

    return res.json({ recipes: getFallbackAiRecipes(availableList, dietType) });
  } catch (error) {
    console.error('Error generating recipes:', error);
    return res.json({ recipes: getFallbackAiRecipes(req.body.selectedIngredients || [], req.body.dietType) });
  }
});

// Fallback helper for simple ingredient parsing
function simpleParseIngredients(text: string) {
  const parts = text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  const results = [];

  for (const part of parts) {
    let category = '양념/기타';
    if (part.includes('닭') || part.includes('고기') || part.includes('돼지') || part.includes('소') || part.includes('생선') || part.includes('새우')) {
      category = '육류/해산물';
    } else if (part.includes('배추') || part.includes('토마토') || part.includes('양파') || part.includes('파') || part.includes('채소') || part.includes('야채') || part.includes('사과')) {
      category = '채소/과일';
    } else if (part.includes('계란') || part.includes('달걀') || part.includes('두부') || part.includes('우유') || part.includes('치즈')) {
      category = '계란/유제품';
    } else if (part.includes('고구마') || part.includes('감자') || part.includes('밥') || part.includes('오트밀') || part.includes('면')) {
      category = '곡류/구황작물';
    }

    // Extract quantity numbers
    const numMatch = part.match(/(\d+(\.\d+)?)/);
    const quantity = numMatch ? parseFloat(numMatch[1]) : 1;

    let unit = '개';
    if (part.includes('g') || part.includes('그램')) unit = 'g';
    else if (part.includes('kg')) unit = 'kg';
    else if (part.includes('모')) unit = '모';
    else if (part.includes('통')) unit = '통';
    else if (part.includes('송이')) unit = '송이';
    else if (part.includes('팩')) unit = '팩';
    else if (part.includes('병')) unit = '병';

    // Clean name
    const cleanName = part.replace(/(\d+(\.\d+)?)/g, '').replace(/(g|kg|개|모|통|송이|팩|병|샀어|샀음|등록|추가)/g, '').trim() || part;

    results.push({
      name: cleanName,
      category,
      quantity,
      unit,
    });
  }

  return results.length > 0 ? results : [{ name: text, category: '양념/기타', quantity: 1, unit: '개' }];
}

// Fallback AI Recipe generator
function getFallbackAiRecipes(ingredients: string[], dietType?: string) {
  const hasChicken = ingredients.some((i) => i.includes('닭가슴살') || i.includes('닭'));
  const hasEgg = ingredients.some((i) => i.includes('계란') || i.includes('달걀'));
  const hasCabbage = ingredients.some((i) => i.includes('양배추'));
  const hasTofu = ingredients.some((i) => i.includes('두부'));
  const hasSweetPotato = ingredients.some((i) => i.includes('고구마'));

  const recipes = [];

  if (hasChicken && hasCabbage) {
    recipes.push({
      id: `ai-fall-1-${Date.now()}`,
      title: '스피드 닭가슴살 양배추 볶음밥 (곤약밥)',
      description: '양배추의 아삭한 식이섬유와 닭가슴살의 단백질이 듬뿍 들어간 든든한 볶음밥입니다.',
      calories: 360,
      carbs: 25,
      protein: 40,
      fat: 10,
      prepTimeMinutes: 12,
      difficulty: '쉬움',
      dietType: '고단백',
      usedIngredients: [
        { name: '닭가슴살', quantity: '150g', deductAmount: 150, deductUnit: 'g' },
        { name: '양배추', quantity: '100g', deductAmount: 0.1, deductUnit: '통' },
        { name: '계란', quantity: '1개', deductAmount: 1, deductUnit: '개' },
      ],
      neededIngredients: [
        { name: '곤약 현미밥', quantity: '1햇반(150g)', estimatedPrice: '1,800원' },
        { name: '굴소스', quantity: '1큰술', estimatedPrice: '3,200원' },
      ],
      steps: [
        '양배추를 가늘게 송송 채썹니다.',
        '팬에 기름을 살짝 두르고 양배추와 닭가슴살을 넣어 볶습니다.',
        '곤약 현미밥 1공기와 굴소스 1스푼을 넣고 센 불로 볶아냅니다.',
        '마지막에 계란 하나를 터뜨려 스크램블하여 함께 섞어줍니다.',
      ],
      chefTip: '일반 쌀밥 대신 곤약현미밥을 사용하면 탄수화물과 칼로리를 절반 이하로 줄일 수 있습니다.',
      isAiGenerated: true,
    });
  }

  if (hasTofu) {
    recipes.push({
      id: `ai-fall-2-${Date.now()}`,
      title: '고소한 두부 계란부침 & 스리라차 소스',
      description: '노릇하게 구워낸 두부에 부드러운 달걀 옷을 입혀 스리라차 소스를 찍어먹는 담백 고단백 저탄수 식단.',
      calories: 290,
      carbs: 8,
      protein: 26,
      fat: 16,
      prepTimeMinutes: 10,
      difficulty: '쉬움',
      dietType: '저탄고지',
      usedIngredients: [
        { name: '두부', quantity: '1모', deductAmount: 1, deductUnit: '모' },
        { name: '계란', quantity: '2개', deductAmount: 2, deductUnit: '개' },
      ],
      neededIngredients: [
        { name: '스리라차 소스', quantity: '1큰술', estimatedPrice: '4,200원' },
      ],
      steps: [
        '두부를 먹기 좋은 크기로 썰어 소금을 약간 뿌린 뒤 키친타올로 물기를 뺍니다.',
        '계란 2개를 소금 한 꼬집 넣고 잘 풉니다.',
        '물기 뺀 두부를 계란물에 적신 뒤 달군 팬에 노릇하게 구워줍니다.',
        '스리라차 소스를 곁들여 맛있게 즐깁니다.',
      ],
      chefTip: '스리라차 소스는 0kcal에 가까운 다이어터 필수 구원 양념입니다.',
      isAiGenerated: true,
    });
  }

  if (hasSweetPotato || hasEgg) {
    recipes.push({
      id: `ai-fall-3-${Date.now()}`,
      title: '촉촉한 고구마 에그 수플레 오믈렛',
      description: '푹 익힌 달콤한 고구마와 폭신폭신한 계란의 부드러운 만남.',
      calories: 310,
      carbs: 38,
      protein: 15,
      fat: 8,
      prepTimeMinutes: 15,
      difficulty: '쉬움',
      dietType: '15분초간단',
      usedIngredients: [
        { name: '고구마', quantity: '1개', deductAmount: 1, deductUnit: '개' },
        { name: '계란', quantity: '2개', deductAmount: 2, deductUnit: '개' },
      ],
      neededIngredients: [
        { name: '아몬드유 또는 저지방 우유', quantity: '50ml', estimatedPrice: '1,200원' },
      ],
      steps: [
        '삶은 고구마를 볼에 넣고 아몬드유 50ml와 함께 부드럽게 으깹니다.',
        '계란 흰자와 노른자를 분리하여 흰자는 폼이 날 때까지 거품기로 칩니다.',
        '으깬 고구마에 노른자와 흰자 거품을 살살 섞어줍니다.',
        '약불의 약한 팬에 부어 뚜껑을 덮고 은은하게 구워냅니다.',
      ],
      chefTip: '아침 식사로 섭취하기에 부담 없고 속을 부드럽게 달래줍니다.',
      isAiGenerated: true,
    });
  }

  if (recipes.length === 0) {
    recipes.push(
      {
        id: `ai-fall-budget-1-${Date.now()}`,
        title: '알뜰 고단백 닭가슴살 야채 볶음',
        description: '마트 장보기 예산 내에서 닭가슴살 팩과 채소 봉지를 구매해 바로 조리하는 고단백 가성비 식단.',
        calories: 320,
        carbs: 15,
        protein: 38,
        fat: 8,
        prepTimeMinutes: 10,
        difficulty: '쉬움',
        dietType: '고단백',
        usedIngredients: [],
        neededIngredients: [
          { name: '냉동 닭가슴살 1팩(500g)', quantity: '1팩', estimatedPrice: '5,900원' },
          { name: '모둠 볶음 채소', quantity: '1봉지', estimatedPrice: '2,200원' },
          { name: '양념용 진간장(500ml)', quantity: '1병', estimatedPrice: '3,500원' },
        ],
        steps: [
          '닭가슴살을 해동 후 먹기 좋은 크기로 슬라이스합니다.',
          '달군 팬에 올리브유를 두르고 닭가슴살과 채소를 함께 볶습니다.',
          '간장 1작은술을 둘러 풍미를 더하고 센 불에서 바싹 구워냅니다.',
        ],
        chefTip: '닭가슴살 1팩과 간장 1병은 이번 한 끼 후에도 여러 번 재활용할 수 있어 실질 장보기 비용이 매우 알뜰합니다.',
        isAiGenerated: true,
      },
      {
        id: `ai-fall-budget-2-${Date.now()}`,
        title: '담백 두부 계란 스크램블 덮밥',
        description: '마트에서 계란 1팩과 두부 1모를 구매해 신선하게 요리하는 10분 초간단 식단.',
        calories: 280,
        carbs: 18,
        protein: 22,
        fat: 12,
        prepTimeMinutes: 10,
        difficulty: '쉬움',
        dietType: '15분초간단',
        usedIngredients: [],
        neededIngredients: [
          { name: '부침용 두부', quantity: '1모', estimatedPrice: '1,800원' },
          { name: '계란 1팩(10구)', quantity: '10개', estimatedPrice: '3,800원' },
          { name: '곤약 현미밥(3개입)', quantity: '3개', estimatedPrice: '3,900원' },
        ],
        steps: [
          '두부는 수분을 제거하고 칼등으로 부드럽게 으깹니다.',
          '팬에 계란과 으깬 두부를 함께 넣고 스크램블하듯 저어줍니다.',
          '곤약밥 위에 올리고 진간장 약간을 곁들여 먹습니다.',
        ],
        chefTip: '남은 계란과 곤약밥은 주간 다른 끼니에 연속 활용할 수 있어 주간 예산 절약에 효과적입니다.',
        isAiGenerated: true,
      },
      {
        id: `ai-fall-budget-3-${Date.now()}`,
        title: '포만감 가득 고구마 & 삶은 계란 다이어트 세트',
        description: '고구마 1봉지와 계란 1팩을 장봐서 일주일간 간편하게 즐기는 클린 식단.',
        calories: 310,
        carbs: 42,
        protein: 16,
        fat: 7,
        prepTimeMinutes: 12,
        difficulty: '쉬움',
        dietType: '저탄고지',
        usedIngredients: [],
        neededIngredients: [
          { name: '달콤 한끼 고구마', quantity: '1봉지', estimatedPrice: '4,500원' },
          { name: '계란 1팩(10구)', quantity: '10개', estimatedPrice: '3,800원' },
          { name: '팩 방울토마토', quantity: '1팩', estimatedPrice: '4,200원' },
        ],
        steps: [
          '고구마는 전자레인지용 용기에 담아 4~5분간 촉촉하게 찝니다.',
          '계란 2개를 완숙 또는 반숙으로 삶아 껍질을 깝니다.',
          '방울토마토와 함께 그릇에 세팅하여 간단히 즐깁니다.',
        ],
        chefTip: '고구마 1봉지와 계란 1팩으로 4~5회 이상의 다이어트 한 끼를 해결할 수 있습니다.',
        isAiGenerated: true,
      }
    );
  }

  return recipes;
}

// Vite Server / Express Listen Logic
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

