/**
 * Модуль конвертации давления.
 * Для упрощения логики и предотвращения ошибок (которые были в оригинальном C++ коде),
 * все величины сначала переводятся в базовую единицу измерения (Паскаль),
 * а затем конвертируются в целевые единицы.
 */

// Определение поддерживаемых единиц измерения и их отношения к 1 Паскалю
const UNTIS = {
    pa:   { id: 'pa',   name: 'Па (Паскаль)',       factor: 1 },
    kpa:  { id: 'kpa',  name: 'кПа (Килопаскаль)',  factor: 1000 },
    mpa:  { id: 'mpa',  name: 'МПа (Мегапаскаль)',  factor: 1000000 },
    bar:  { id: 'bar',  name: 'Бар',                factor: 100000 },
    kgf:  { id: 'kgf',  name: 'кгс/см² (Тех. атм.)', factor: 98066.5 },
    atm:  { id: 'atm',  name: 'атм (Физ. атм.)',    factor: 101325.0 },
    mmhg: { id: 'mmhg', name: 'мм рт. ст.',         factor: 133.322368 }
};

// Ссылки на элементы DOM
const elements = {
    inputValue: document.getElementById('inputValue'),
    inputUnit: document.getElementById('inputUnit'),
    resultsGrid: document.getElementById('resultsGrid')
};

/**
 * Инициализация приложения
 */
function initApp() {
    // Заполняем выпадающий список
    Object.values(UNTIS).forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.id;
        option.textContent = unit.name;
        elements.inputUnit.appendChild(option);
    });

    // Устанавливаем Паскаль (pa) по умолчанию (соответствует pres == 0 в C++)
    elements.inputUnit.value = 'pa';

    // Слушатели событий
    elements.inputValue.addEventListener('input', handleConversion);
    elements.inputUnit.addEventListener('change', handleConversion);

    // Первичный расчет при загрузке
    handleConversion();
}

/**
 * Форматирование чисел для красивого вывода
 */
function formatNumber(num) {
    if (num === 0) return "0";
    
    const absNum = Math.abs(num);
    // Если число слишком маленькое или большое, используем экспоненциальную запись
    if (absNum < 0.00001 || absNum > 10000000) {
        return num.toExponential(4);
    }
    
    // В остальных случаях оставляем до 7 значащих цифр, отбрасывая лишние нули
    return parseFloat(num.toPrecision(7)).toString();
}

/**
 * Основная логика конвертации и обновления интерфейса
 */
function handleConversion() {
    const valueStr = elements.inputValue.value;
    const value = parseFloat(valueStr);
    const sourceUnitId = elements.inputUnit.value;

    // Если введено не число
    if (isNaN(value)) {
        elements.resultsGrid.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-4 font-medium">
                Пожалуйста, введите корректное число.
            </div>
        `;
        return;
    }

    // 1. Конвертируем исходное значение в Паскали (Базовая единица)
    const sourceFactor = UNTIS[sourceUnitId].factor;
    const valueInPascals = value * sourceFactor;

    // Очищаем предыдущие результаты
    elements.resultsGrid.innerHTML = '';

    // 2. Генерируем результаты для всех остальных единиц измерения
    Object.values(UNTIS).forEach(targetUnit => {
        // Пропускаем вывод для той же единицы, которая выбрана как исходная
        if (targetUnit.id === sourceUnitId) return;

        // Конвертируем из Паскалей в целевую единицу
        const convertedValue = valueInPascals / targetUnit.factor;
        
        // Создаем DOM-элемент карточки
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center hover:shadow-md transition-shadow duration-200';
        
        card.innerHTML = `
            <span class="text-slate-600 font-medium">${targetUnit.name}</span>
            <span class="text-lg font-bold text-blue-600 truncate ml-2" title="${convertedValue}">
                ${formatNumber(convertedValue)}
            </span>
        `;
        
        elements.resultsGrid.appendChild(card);
    });
}

// Запускаем инициализацию, когда DOM полностью загружен
document.addEventListener('DOMContentLoaded', initApp);