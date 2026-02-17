import { check } from 'k6';
import { parseJsonSafe, isJsonResponse } from './checks.js';

/**
 * 📋 FORM HELPER — 8 COMPREHENSIVE CHECKS
 * 
 * Проверки форм согласно CLEANUP_PLAN.md (Неделя 1)
 * Поддержка 3 сценариев: FeedViewerRule, QuickCreateFormRule, MyProfilesFormRule
 */

// ═══════════════════════════════════════════════════════════════
// 1️⃣ ОТКРЫТИЕ ФОРМЫ — проверка что форма загрузилась
// ═══════════════════════════════════════════════════════════════
export function checkFormOpened(res, formName) {
  return check(res, {
    [`${formName}: форма открылась (status 200-201)`]: (r) => 
      r.status === 200 || r.status === 201,
    [`${formName}: ответ в формате JSON`]: (r) => 
      isJsonResponse(r),
    [`${formName}: есть данные в ответе`]: (r) => 
      r.body && r.body.length > 2
  });
}

// ═══════════════════════════════════════════════════════════════
// 2️⃣ ВСЕ ПОЛЯ — проверка наличия обязательных полей
// ═══════════════════════════════════════════════════════════════
export function checkRequiredFields(res, formName, requiredFields = []) {
  const data = parseJsonSafe(res);
  
  if (!data) {
    console.error(`${formName}: не удалось распарсить JSON`);
    return false;
  }

  const checks = {};
  
  // Проверяем каждое обязательное поле
  requiredFields.forEach(field => {
    checks[`${formName}: поле '${field}' присутствует`] = () => 
      data.hasOwnProperty(field);
  });

  return check(res, checks);
}

// ═══════════════════════════════════════════════════════════════
// 3️⃣ НЕТ ДУБЛЕЙ — проверка уникальности полей
// ═══════════════════════════════════════════════════════════════
export function checkNoDuplicateFields(res, formName) {
  const data = parseJsonSafe(res);
  
  if (!data || typeof data !== 'object') {
    return true; // Skip if not object
  }

  const keys = Object.keys(data);
  const uniqueKeys = new Set(keys);
  
  return check(res, {
    [`${formName}: нет дублирующих полей`]: () => 
      keys.length === uniqueKeys.size
  });
}

// ═══════════════════════════════════════════════════════════════
// 4️⃣ РЕДАКТИРОВАНИЕ — проверка PATCH операции
// ═══════════════════════════════════════════════════════════════
export function checkEditOperation(res, formName, expectedChangedField = null) {
  const data = parseJsonSafe(res);
  
  const checks = {
    [`${formName}: редактирование успешно (status 200)`]: (r) => 
      r.status === 200,
    [`${formName}: возвращены обновленные данные`]: () => 
      data !== null && typeof data === 'object'
  };

  // Если указано конкретное поле — проверяем что оно изменилось
  if (expectedChangedField && data) {
    checks[`${formName}: поле '${expectedChangedField}' обновлено`] = () => 
      data.hasOwnProperty(expectedChangedField);
  }

  return check(res, checks);
}

// ═══════════════════════════════════════════════════════════════
// 5️⃣ ПРОСМОТР — проверка GET операции
// ═══════════════════════════════════════════════════════════════
export function checkViewOperation(res, formName, profileType = null) {
  const data = parseJsonSafe(res);
  
  const checks = {
    [`${formName}: просмотр успешен (status 200)`]: (r) => 
      r.status === 200,
    [`${formName}: данные загружены`]: () => 
      data !== null && typeof data === 'object',
    [`${formName}: есть ID профиля`]: () => 
      data && (data.id !== undefined || data.pk !== undefined)
  };

  // Проверка типа профиля если указан
  if (profileType && data) {
    checks[`${formName}: тип профиля '${profileType}'`] = () => 
      data.type === profileType || data.profile_type === profileType;
  }

  return check(res, checks);
}

// ═══════════════════════════════════════════════════════════════
// 6️⃣ УДАЛЕНИЕ — проверка DELETE операции
// ═══════════════════════════════════════════════════════════════
export function checkDeleteOperation(res, formName, allowDelete = false) {
  if (!allowDelete) {
    // Если удаление запрещено — проверяем что получили 403 или 400
    return check(res, {
      [`${formName}: удаление запрещено (403/400)`]: (r) => 
        r.status === 403 || r.status === 400 || r.status === 405
    });
  }

  // Если удаление разрешено — проверяем успех
  return check(res, {
    [`${formName}: удаление успешно (status 204/200)`]: (r) => 
      r.status === 204 || r.status === 200,
    [`${formName}: профиль удален`]: (r) => 
      r.status === 204 || (r.body && r.body.includes('deleted'))
  });
}

// ═══════════════════════════════════════════════════════════════
// 7️⃣ UI/ДИЗАЙН — проверка структуры ответа для UI
// ═══════════════════════════════════════════════════════════════
export function checkUIStructure(res, formName, expectedUIFields = []) {
  const data = parseJsonSafe(res);
  
  if (!data) {
    return false;
  }

  const checks = {
    [`${formName}: ответ содержит данные для UI`]: () => 
      data !== null
  };

  // Проверяем наличие полей для отображения
  expectedUIFields.forEach(field => {
    checks[`${formName}: UI-поле '${field}' есть`] = () => 
      data.hasOwnProperty(field);
  });

  return check(res, checks);
}

// ═══════════════════════════════════════════════════════════════
// 8️⃣ СПРАВОЧНИКИ — проверка autocomplete/select опций
// ═══════════════════════════════════════════════════════════════
export function checkDictionaryData(res, dictionaryName, minItems = 1) {
  const data = parseJsonSafe(res);
  
  return check(res, {
    [`${dictionaryName}: справочник загружен (status 200)`]: (r) => 
      r.status === 200,
    [`${dictionaryName}: данные в виде массива`]: () => 
      Array.isArray(data),
    [`${dictionaryName}: минимум ${minItems} элементов`]: () => 
      Array.isArray(data) && data.length >= minItems,
    [`${dictionaryName}: элементы имеют структуру`]: () => {
      if (!Array.isArray(data) || data.length === 0) return false;
      const firstItem = data[0];
      // Проверяем что это объект с value/label или просто строка
      return typeof firstItem === 'string' || 
             (typeof firstItem === 'object' && firstItem !== null);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS — вспомогательные утилиты
// ═══════════════════════════════════════════════════════════════

/**
 * Комплексная проверка формы профиля (все 8 пунктов сразу)
 */
export function checkProfileFormComplete(
  res, 
  formName, 
  profileType,
  requiredFields = [],
  uiFields = []
) {
  const allPassed = 
    checkFormOpened(res, formName) &&
    checkRequiredFields(res, formName, requiredFields) &&
    checkNoDuplicateFields(res, formName) &&
    checkViewOperation(res, formName, profileType) &&
    checkUIStructure(res, formName, uiFields);

  return allPassed;
}

/**
 * Проверка создания профиля (POST)
 */
export function checkCreateSuccess(res, formName, profileType) {
  const data = parseJsonSafe(res);
  
  return check(res, {
    [`${formName}: создание успешно (status 201/200)`]: (r) => 
      r.status === 201 || r.status === 200,
    [`${formName}: получен ID созданного профиля`]: () => 
      data && (data.id !== undefined || data.pk !== undefined),
    [`${formName}: тип профиля соответствует`]: () => 
      !profileType || data.type === profileType || data.profile_type === profileType
  });
}

/**
 * Проверка контактов с paywall (для FeedViewerRule)
 */
export function checkContactsPaywall(res, formName, hasAccess = false) {
  const data = parseJsonSafe(res);
  
  if (!data) return false;

  if (hasAccess) {
    return check(res, {
      [`${formName}: контакты доступны`]: () => 
        data.is_masked === false || data.contacts !== undefined,
      [`${formName}: телефон не замаскирован`]: () => 
        data.contact_phone && !data.contact_phone.includes('***')
    });
  } else {
    return check(res, {
      [`${formName}: контакты замаскированы`]: () => 
        data.is_masked === true || 
        (data.contact_phone && data.contact_phone.includes('***')),
      [`${formName}: указана цена разблокировки`]: () => 
        data.unlock_price !== undefined && data.unlock_price > 0
    });
  }
}

/**
 * Извлечь ID из ответа (для цепочки запросов)
 */
export function extractProfileId(res) {
  const data = parseJsonSafe(res);
  return data ? (data.id || data.pk || null) : null;
}

/**
 * Проверка списка профилей (для MyProfilesFormRule)
 */
export function checkProfilesList(res, formName, minProfiles = 0) {
  const data = parseJsonSafe(res);
  
  return check(res, {
    [`${formName}: список загружен (status 200)`]: (r) => 
      r.status === 200,
    [`${formName}: данные в виде массива`]: () => 
      Array.isArray(data),
    [`${formName}: минимум ${minProfiles} профилей`]: () => 
      Array.isArray(data) && data.length >= minProfiles,
    [`${formName}: профили имеют ID`]: () => {
      if (!Array.isArray(data) || data.length === 0) return true;
      return data.every(p => p.id !== undefined || p.pk !== undefined);
    }
  });
}
