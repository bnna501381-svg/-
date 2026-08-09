export interface SyncDataPayload {
  fridgeItems: any[];
  recipes: any[];
  logs: any[];
  shoppingList: any[];
  userProfile: any;
  userTarget: any;
}

// Get user profile from Google OAuth2 token
export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const errText = await response.text();
    const err: any = new Error(`Failed to fetch user info (${response.status}): ${errText}`);
    err.status = response.status;
    throw err;
  }
  const data = await response.json();
  return {
    email: data.email,
    name: data.name || data.email,
    picture: data.picture,
  };
}

const SPREADSHEET_NAME = '[다이어트 식단 매니저] 식단_냉장고_데이터';

// Find or Create Spreadsheet on Google Drive via REST API
export async function getOrCreateSpreadsheet(accessToken: string) {
  const query = encodeURIComponent(`name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    const err: any = new Error(`Google Drive API error (${listRes.status}): ${errText}`);
    err.status = listRes.status;
    throw err;
  }

  const listData = await listRes.json();

  if (listData.files && listData.files.length > 0) {
    const file = listData.files[0];
    return {
      spreadsheetId: file.id as string,
      webViewLink: (file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`) as string,
    };
  }

  // Create new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_NAME,
      },
      sheets: [
        { properties: { title: '냉장고 재료' } },
        { properties: { title: '추천 레시피' } },
        { properties: { title: '식사 기록' } },
        { properties: { title: '지출 내역' } },
        { properties: { title: '사용자 프로필' } },
      ],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    const err: any = new Error(`Google Sheets Create API error (${createRes.status}): ${errText}`);
    err.status = createRes.status;
    throw err;
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId as string;
  const webViewLink = (createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`) as string;

  // Format Header Rows
  await initializeSheetsHeader(accessToken, spreadsheetId);

  return { spreadsheetId, webViewLink };
}

async function initializeSheetsHeader(accessToken: string, spreadsheetId: string) {
  const headers = [
    {
      range: '냉장고 재료!A1:I1',
      values: [['아이디', '재료명', '카테고리', '수량', '단위', '보관장소', '소비기한(D-Day)', '상태', '등록일']],
    },
    {
      range: '추천 레시피!A1:N1',
      values: [['아이디', '레시피명', '설명', '칼로리(kcal)', '탄수화물(g)', '단백질(g)', '지방(g)', '다이어트유형', '난이도', '조리시간(분)', '사용재료', '필요부재료', '조리순서', '상태']],
    },
    {
      range: '식사 기록!A1:H1',
      values: [['아이디', '날짜', '식사유형', '메뉴명', '칼로리(kcal)', '탄수화물(g)', '단백질(g)', '지방(g)']],
    },
    {
      range: '지출 내역!A1:F1',
      values: [['아이디', '품목명', '카테고리', '예상가격(원)', '구매상태', '등록일']],
    },
    {
      range: '사용자 프로필!A1:J1',
      values: [['키(cm)', '체중(kg)', '나이', '성별', '기초대사량(BMR)', '하루목표칼로리', '1끼목표칼로리', '1끼탄수화물(g)', '1끼단백질(g)', '1끼지방(g)']],
    },
  ];

  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headers,
    }),
  });

  if (!batchRes.ok) {
    console.warn('Header init batch update warning:', await batchRes.text());
  }
}

// Sync all app data into Google Sheets
export async function syncToGoogleSheets(accessToken: string, data: SyncDataPayload) {
  const { spreadsheetId, webViewLink } = await getOrCreateSpreadsheet(accessToken);

  const fridgeRows = [
    ['아이디', '재료명', '카테고리', '수량', '단위', '보관장소', '소비기한', '상태', '등록일'],
    ...(data.fridgeItems || []).map((item) => [
      item.id || '',
      item.name || '',
      item.category || '',
      item.quantity || 1,
      item.unit || '',
      item.location || '냉장',
      item.expiryDate || '',
      item.status || '싱싱함',
      item.addedDate || '',
    ]),
  ];

  const recipeRows = [
    ['아이디', '레시피명', '설명', '칼로리(kcal)', '탄수화물(g)', '단백질(g)', '지방(g)', '다이어트유형', '난이도', '조리시간(분)', '사용재료', '필요부재료', '조리순서', '상태'],
    ...(data.recipes || []).map((recipe) => [
      recipe.id || '',
      recipe.title || '',
      recipe.description || '',
      recipe.calories || 0,
      recipe.carbs || 0,
      recipe.protein || 0,
      recipe.fat || 0,
      recipe.dietType || '',
      recipe.difficulty || '',
      recipe.prepTimeMinutes || 0,
      JSON.stringify(recipe.usedIngredients || []),
      JSON.stringify(recipe.neededIngredients || []),
      JSON.stringify(recipe.steps || []),
      recipe.isDeleted ? '삭제됨' : '사용중',
    ]),
  ];

  const logRows = [
    ['아이디', '날짜', '식사유형', '메뉴명', '칼로리(kcal)', '탄수화물(g)', '단백질(g)', '지방(g)'],
    ...(data.logs || []).map((log) => [
      log.id || '',
      log.date || '',
      log.type || '',
      log.name || '',
      log.calories || 0,
      log.carbs || 0,
      log.protein || 0,
      log.fat || 0,
    ]),
  ];

  const shoppingRows = [
    ['아이디', '품목명', '카테고리', '예상가격(원)', '구매상태', '등록일'],
    ...(data.shoppingList || []).map((item) => [
      item.id || '',
      item.name || '',
      item.category || '',
      item.estimatedPrice || '0원',
      item.purchased ? '구매완료' : '미구매',
      item.addedDate || '',
    ]),
  ];

  const p = data.userProfile || {};
  const t = data.userTarget || {};
  const profileRows = [
    ['키(cm)', '체중(kg)', '나이', '성별', '기초대사량(BMR)', '하루목표칼로리', '1끼목표칼로리', '1끼탄수화물(g)', '1끼단백질(g)', '1끼지방(g)'],
    [
      p.height || 170,
      p.weight || 65,
      p.age || 28,
      p.gender === 'male' ? '남성' : '여성',
      p.bmr || 1350,
      t.targetCalories || p.dailyTargetCalories || 1800,
      p.perMealCalories || 500,
      p.perMealCarbs || 50,
      p.perMealProtein || 40,
      p.perMealFat || 12,
    ],
  ];

  const syncRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: '냉장고 재료!A1:I500', values: fridgeRows },
        { range: '추천 레시피!A1:N500', values: recipeRows },
        { range: '식사 기록!A1:H500', values: logRows },
        { range: '지출 내역!A1:F500', values: shoppingRows },
        { range: '사용자 프로필!A1:J10', values: profileRows },
      ],
    }),
  });

  if (!syncRes.ok) {
    const errText = await syncRes.text();
    const err: any = new Error(`Google Sheets Batch Sync API error (${syncRes.status}): ${errText}`);
    err.status = syncRes.status;
    throw err;
  }

  return { spreadsheetId, webViewLink, updatedSheetsCount: 5 };
}

// Load all data from Google Sheets into Application
export async function loadFromGoogleSheets(accessToken: string) {
  const { spreadsheetId, webViewLink } = await getOrCreateSpreadsheet(accessToken);

  const ranges = [
    '냉장고 재료!A2:I500',
    '추천 레시피!A2:N500',
    '식사 기록!A2:H500',
    '지출 내역!A2:F500',
    '사용자 프로필!A2:J10',
  ];

  const queryParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const loadRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!loadRes.ok) {
    const errText = await loadRes.text();
    const err: any = new Error(`Google Sheets Batch Get API error (${loadRes.status}): ${errText}`);
    err.status = loadRes.status;
    throw err;
  }

  const resData = await loadRes.json();
  const valueRanges = resData.valueRanges || [];

  // Parse Fridge Items
  const fridgeRows = valueRanges[0]?.values || [];
  const fridgeItems = fridgeRows.map((r: any) => ({
    id: r[0] || `f-${Math.random().toString(36).substr(2, 9)}`,
    name: r[1] || '',
    category: r[2] || '기타',
    quantity: Number(r[3]) || 1,
    unit: r[4] || '개',
    location: r[5] || '냉장',
    expiryDate: r[6] || '',
    status: r[7] || '싱싱함',
    addedDate: r[8] || new Date().toISOString().split('T')[0],
  }));

  // Parse Recipes
  const recipeRows = valueRanges[1]?.values || [];
  const parseJsonSafe = (str: string, fallback: any) => {
    try {
      return str ? JSON.parse(str) : fallback;
    } catch {
      return fallback;
    }
  };
  const recipes = recipeRows.map((r: any) => ({
    id: r[0] || `r-${Math.random().toString(36).substr(2, 9)}`,
    title: r[1] || '',
    description: r[2] || '',
    calories: Number(r[3]) || 0,
    carbs: Number(r[4]) || 0,
    protein: Number(r[5]) || 0,
    fat: Number(r[6]) || 0,
    dietType: r[7] || '전체',
    difficulty: r[8] || '보통',
    prepTimeMinutes: Number(r[9]) || 15,
    usedIngredients: parseJsonSafe(r[10], []),
    neededIngredients: parseJsonSafe(r[11], []),
    steps: parseJsonSafe(r[12], []),
    chefTip: 'Google Sheets 동기화 레시피',
    isAiGenerated: true,
    isDeleted: r[13] === '삭제됨' || r[13] === '삭제',
  }));

  // Parse Logs
  const logRows = valueRanges[2]?.values || [];
  const logs = logRows.map((r: any) => ({
    id: r[0] || `l-${Math.random().toString(36).substr(2, 9)}`,
    date: r[1] || new Date().toISOString().split('T')[0],
    type: r[2] || '점심',
    name: r[3] || '',
    calories: Number(r[4]) || 0,
    carbs: Number(r[5]) || 0,
    protein: Number(r[6]) || 0,
    fat: Number(r[7]) || 0,
  }));

  // Parse Shopping Items
  const shoppingRows = valueRanges[3]?.values || [];
  const shoppingList = shoppingRows.map((r: any) => ({
    id: r[0] || `s-${Math.random().toString(36).substr(2, 9)}`,
    name: r[1] || '',
    category: r[2] || '기타',
    estimatedPrice: r[3] || '0원',
    purchased: r[4] === '구매완료',
    addedDate: r[5] || new Date().toISOString().split('T')[0],
  }));

  // Parse User Profile
  const profileRows = valueRanges[4]?.values || [];
  let userProfile = null;
  if (profileRows.length > 0 && profileRows[0].length >= 4) {
    const p = profileRows[0];
    userProfile = {
      height: Number(p[0]) || 170,
      weight: Number(p[1]) || 65,
      age: Number(p[2]) || 28,
      gender: p[3] === '남성' ? 'male' : 'female',
      activityLevel: 'moderate',
      bmr: Number(p[4]) || 1350,
      dailyTargetCalories: Number(p[5]) || 1800,
      perMealCalories: Number(p[6]) || 500,
      perMealCarbs: Number(p[7]) || 50,
      perMealProtein: Number(p[8]) || 40,
      perMealFat: Number(p[9]) || 12,
    };
  }

  return {
    spreadsheetId,
    webViewLink,
    data: {
      fridgeItems,
      recipes,
      logs,
      shoppingList,
      userProfile,
    },
  };
}
