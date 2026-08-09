import { IngredientCategory } from '../types';

export interface ParsedFridgeIngredient {
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
}

export function formatIngredientForFridge(
  rawName: string,
  rawQuantityStr?: string | number,
  fallbackUnit?: string
): ParsedFridgeIngredient {
  const strName = (rawName || '').trim();
  const quantityStr = typeof rawQuantityStr === 'number' ? String(rawQuantityStr) : (rawQuantityStr || '').trim();
  const combinedText = `${strName} ${quantityStr}`.trim();

  // 1. Egg (계란 / 달걀) special handling
  if (/계란|달걀/i.test(combinedText)) {
    let eggQty = 10; // Default count for a pack of eggs
    const countMatch = combinedText.match(/(\d+)\s*(구|개|알)/);
    if (countMatch) {
      eggQty = parseInt(countMatch[1], 10);
    } else {
      const numMatch = quantityStr.match(/^(\d+)$/);
      if (numMatch) {
        const parsed = parseInt(numMatch[1], 10);
        if (parsed > 1) eggQty = parsed;
      }
    }
    return {
      name: '계란',
      category: '계란/유제품',
      quantity: eggQty > 0 ? eggQty : 10,
      unit: '개',
    };
  }

  // 2. Chicken / Meat
  if (/닭가슴살|닭고기/i.test(combinedText)) {
    let qty = 1;
    let unit = '팩';
    const pieceMatch = combinedText.match(/(\d+)\s*(개|알|구)/) || combinedText.match(/\((\d+)\s*개\)/);
    if (pieceMatch) {
      qty = parseInt(pieceMatch[1], 10);
      unit = '개';
    } else {
      const gMatch = combinedText.match(/(\d+)\s*g/i);
      if (gMatch) {
        qty = parseInt(gMatch[1], 10);
        unit = 'g';
      } else {
        const numMatch = quantityStr.match(/^(\d+)$/);
        if (numMatch) qty = parseInt(numMatch[1], 10);
      }
    }
    return {
      name: '닭가슴살',
      category: '육류/해산물',
      quantity: qty,
      unit: unit,
    };
  }

  // 3. Piece count in parentheses or text e.g. "(10개)", "(5개입)", "10구"
  let parsedQty = 1;
  let parsedUnit = fallbackUnit || '개';

  const pieceMatch = combinedText.match(/\((\d+)\s*(개|알|구|개입)\)/) || combinedText.match(/(\d+)\s*(구|개|알)/);
  if (pieceMatch) {
    parsedQty = parseInt(pieceMatch[1], 10);
    parsedUnit = '개';
  } else {
    const numMatch = quantityStr.match(/(\d+)\s*([a-zA-Z가-힣]+)?/);
    if (numMatch) {
      parsedQty = parseInt(numMatch[1], 10) || 1;
      if (numMatch[2]) parsedUnit = numMatch[2];
    } else if (typeof rawQuantityStr === 'number') {
      parsedQty = rawQuantityStr;
    }
  }

  // Clean brand / descriptive clutter from item name
  let cleanName = strName
    .replace(/^(신선|유기농|국산|국내산|알뜰|인기|냉동|무농약|특|상)\s+/, '')
    .replace(/\s*\d+\s*(팩|봉|통|박스|상자|개|구|알|g|kg|ml|L)(\([^)]*\))?/gi, '')
    .replace(/\([^)]*\)/g, '')
    .trim();

  // Category matching
  let category: IngredientCategory = '양념/기타';
  if (/채소|야채|양배추|양파|대파|당근|마늘|토마토|버섯|상추|고추|오이/i.test(cleanName)) {
    category = '채소/과일';
  } else if (/두부|콩|음료|우유|치즈|버터|요거트/i.test(cleanName)) {
    category = '계란/유제품';
  } else if (/돼지|소고기|닭|삼겹살|목살|한우|소세지|햄|차돌|생선|오징어|새우/i.test(cleanName)) {
    category = '육류/해산물';
  } else if (/밥|현미밥|곤약밥|면|파스타|떡|빵|고구마|감자/i.test(cleanName)) {
    category = '곡류/구황작물';
  } else if (/간장|굴소스|고추장|된장|식초|소금|설탕|올리브유|참기름/i.test(cleanName)) {
    category = '양념/기타';
  }

  return {
    name: cleanName || strName,
    category,
    quantity: parsedQty,
    unit: parsedUnit,
  };
}
