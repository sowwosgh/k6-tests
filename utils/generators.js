/**
 * 🎲 Test Data Generators
 * 
 * Генераторы уникальных данных для тестирования
 */

/**
 * Генерирует уникальный ИНН (10 цифр) на основе текущего времени
 * @returns {string} ИНН формата 77XXXXXXXX
 */
export function generateINN() {
  const timestamp = Date.now().toString();
  const last8 = timestamp.slice(-8);
  return `77${last8}`;
}

/**
 * Генерирует уникальный номер телефона
 * @returns {string} Телефон формата +7 (9XX) XXX-XX-XX
 */
export function generatePhone() {
  const timestamp = Date.now().toString();
  const last10 = timestamp.slice(-10);
  return `+7 (9${last10.slice(0, 2)}) ${last10.slice(2, 5)}-${last10.slice(5, 7)}-${last10.slice(7, 9)}`;
}

/**
 * Генерирует уникальный email
 * @param {string} prefix - Префикс email
 * @returns {string} Email формата prefix-timestamp@k6test.com
 */
export function generateEmail(prefix = 'test') {
  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}-${timestamp}@k6test.com`;
}

/**
 * Генерирует уникальное название компании
 * @param {string} type - Тип компании
 * @returns {string} Название формата "ООО Type-XXXXXXXX"
 */
export function generateCompanyName(type = 'Test') {
  const timestamp = Date.now().toString().slice(-8);
  return `ООО ${type}-${timestamp}`;
}

/**
 * Генерирует случайное число в диапазоне
 * @param {number} min - Минимум
 * @param {number} max - Максимум
 * @returns {number} Случайное число
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Добавляет задержку к timestamp для предотвращения коллизий
 * @param {number} ms - Миллисекунды задержки
 * @returns {void}
 */
export function pause(ms = 10) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait
  }
}
