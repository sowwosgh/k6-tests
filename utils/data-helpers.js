/**
 * Вспомогательные функции для работы с тестовыми данными
 */

/**
 * Возвращает случайный элемент из массива
 */
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Возвращает случайное целое число в диапазоне [min, max]
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Возвращает случайный город из списка
 */
export function randomCity() {
  const cities = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Чебоксары', 'Саратов'];
  return randomItem(cities);
}

/**
 * Возвращает случайную специализацию
 */
export function randomSpecialization() {
  const specs = ['сварщик', 'электрик', 'сантехник', 'плиточник', 'маляр', 'прораб', 'инженер'];
  return randomItem(specs);
}
