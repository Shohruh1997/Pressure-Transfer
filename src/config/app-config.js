export const STORAGE_KEYS = {
    theme: 'universal-converter-theme',
    activeCategory: 'universal-converter-active-category',
    activeCurrencies: 'universal-converter-active-currencies',
    categoryUnitsOrders: 'universal-converter-category-units-orders',
    pressureUnitsOrder: 'universal-converter-pressure-units-order',
    temperatureUnitsOrder: 'universal-converter-temperature-units-order'
};

export const DEFAULT_ACTIVE_CURRENCIES = ['RUB', 'UZS', 'USD', 'EUR'];

export const CURRENCY_PREVIEW_ITEMS = [
    { badge: 'RU', code: 'RUB', name: 'Российский рубль', rate: 91.24 },
    { badge: 'UZ', code: 'UZS', name: 'Узбекский сум', rate: 11542.10 },
    { badge: 'KZ', code: 'KZT', name: 'Казахский тенге', rate: 446.71 },
    { badge: 'US', code: 'USD', name: 'Доллар США', rate: 1 },
    { badge: 'EU', code: 'EUR', name: 'Евро', rate: 0.92 },
    { badge: 'GB', code: 'GBP', name: 'Фунт стерлингов', rate: 0.79 },
    { badge: 'TR', code: 'TRY', name: 'Турецкая лира', rate: 32.18 },
    { badge: 'CN', code: 'CNY', name: 'Китайский юань', rate: 7.24 },
    { badge: 'JP', code: 'JPY', name: 'Японская иена', rate: 155.67 },
    { badge: 'AE', code: 'AED', name: 'Дирхам ОАЭ', rate: 3.67 }
];

export const currencyItemsByCode = new Map(CURRENCY_PREVIEW_ITEMS.map(item => [item.code, item]));

export const DEFAULT_CURRENCY_RATES = Object.fromEntries(
    CURRENCY_PREVIEW_ITEMS.map(item => [item.code, item.rate])
);

export const categoryRegistry = [
    {
        id: 'currency',
        name: 'Валюта',
        shortName: 'Currency',
        description: 'Мультивалютный пересчет с настраиваемым списком валют и отдельным калькулятором.',
        meta: '',
        adapter: 'planned',
        defaultValue: '1',
        defaultSourceUnit: '',
        defaultActiveUnits: [],
        units: []
    },
    {
        id: 'pressure',
        name: 'Давление',
        shortName: 'Pressure',
        description: 'Пересчет инженерных единиц давления через базовую единицу Па.',
        meta: 'Факторный адаптер, мгновенный пересчет и копирование результатов.',
        adapter: 'factor',
        defaultValue: '1',
        defaultSourceUnit: 'pa',
        defaultActiveUnits: ['kpa', 'mpa', 'bar', 'kgfcm2', 'atm', 'mmhg'],
        units: [
            { id: 'pa', label: 'Паскаль', shortLabel: 'Па', factor: 1 },
            { id: 'kpa', label: 'Килопаскаль', shortLabel: 'кПа', factor: 1000 },
            { id: 'mpa', label: 'Мегапаскаль', shortLabel: 'МПа', factor: 1000000 },
            { id: 'bar', label: 'Бар', shortLabel: 'бар', factor: 100000 },
            { id: 'kgfcm2', label: 'кгс/см²', shortLabel: 'кгс/см²', factor: 98066.5 },
            { id: 'atm', label: 'Атмосфера', shortLabel: 'атм', factor: 101325 },
            { id: 'mmhg', label: 'Миллиметр ртутного столба', shortLabel: 'мм рт. ст.', factor: 133.322368 }
        ]
    },
    {
        id: 'temperature',
        name: 'Температура',
        shortName: 'Temperature',
        description: 'Формульный пересчет между шкалами Цельсия, Фаренгейта и Кельвина.',
        meta: 'Температурный адаптер со смещением и мгновенным пересчетом.',
        adapter: 'temperature',
        defaultValue: '0',
        defaultSourceUnit: 'c',
        defaultActiveUnits: ['c', 'f', 'k'],
        units: [
            { id: 'c', label: 'Цельсий', shortLabel: '°C' },
            { id: 'f', label: 'Фаренгейт', shortLabel: '°F' },
            { id: 'k', label: 'Кельвин', shortLabel: 'K' }
        ]
    },
    {
        id: 'length',
        name: 'Длина',
        shortName: 'Length',
        description: 'Пересчет длины между метрическими, имперскими и морскими единицами.',
        meta: 'Факторный адаптер через базовую единицу метр.',
        adapter: 'factor',
        defaultValue: '1',
        defaultSourceUnit: 'm',
        defaultActiveUnits: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi', 'nmi'],
        units: [
            { id: 'mm', label: 'Миллиметр', shortLabel: 'мм', factor: 0.001 },
            { id: 'cm', label: 'Сантиметр', shortLabel: 'см', factor: 0.01 },
            { id: 'm', label: 'Метр', shortLabel: 'м', factor: 1 },
            { id: 'km', label: 'Километр', shortLabel: 'км', factor: 1000 },
            { id: 'in', label: 'Дюйм', shortLabel: 'in', factor: 0.0254 },
            { id: 'ft', label: 'Фут', shortLabel: 'ft', factor: 0.3048 },
            { id: 'yd', label: 'Ярд', shortLabel: 'yd', factor: 0.9144 },
            { id: 'mi', label: 'Миля', shortLabel: 'mi', factor: 1609.344 },
            { id: 'nmi', label: 'Морская миля', shortLabel: 'nmi', factor: 1852 }
        ]
    },
    {
        id: 'weight',
        name: 'Вес',
        shortName: 'Weight',
        description: 'Пересчет массы и веса между метрическими и имперскими единицами.',
        meta: 'Факторный адаптер через базовую единицу килограмм.',
        adapter: 'factor',
        defaultValue: '1',
        defaultSourceUnit: 'kg',
        defaultActiveUnits: ['mg', 'g', 'kg', 't', 'oz', 'lb', 'st'],
        units: [
            { id: 'mg', label: 'Миллиграмм', shortLabel: 'мг', factor: 0.000001 },
            { id: 'g', label: 'Грамм', shortLabel: 'г', factor: 0.001 },
            { id: 'kg', label: 'Килограмм', shortLabel: 'кг', factor: 1 },
            { id: 't', label: 'Тонна', shortLabel: 'т', factor: 1000 },
            { id: 'oz', label: 'Унция', shortLabel: 'oz', factor: 0.028349523125 },
            { id: 'lb', label: 'Фунт', shortLabel: 'lb', factor: 0.45359237 },
            { id: 'st', label: 'Стоун', shortLabel: 'st', factor: 6.35029318 }
        ]
    },
    {
        id: 'area',
        name: 'Площадь',
        shortName: 'Area',
        description: 'Пересчет площади между метрическими, земельными и имперскими единицами.',
        meta: 'Факторный адаптер через базовую единицу квадратный метр.',
        adapter: 'factor',
        defaultValue: '1',
        defaultSourceUnit: 'm2',
        defaultActiveUnits: ['cm2', 'm2', 'a', 'ha', 'km2', 'ft2', 'yd2', 'acre'],
        units: [
            { id: 'cm2', label: 'Квадратный сантиметр', shortLabel: 'см²', factor: 0.0001 },
            { id: 'm2', label: 'Квадратный метр', shortLabel: 'м²', factor: 1 },
            { id: 'a', label: 'Ар', shortLabel: 'а', factor: 100 },
            { id: 'ha', label: 'Гектар', shortLabel: 'га', factor: 10000 },
            { id: 'km2', label: 'Квадратный километр', shortLabel: 'км²', factor: 1000000 },
            { id: 'ft2', label: 'Квадратный фут', shortLabel: 'ft²', factor: 0.09290304 },
            { id: 'yd2', label: 'Квадратный ярд', shortLabel: 'yd²', factor: 0.83612736 },
            { id: 'acre', label: 'Акр', shortLabel: 'ac', factor: 4046.8564224 }
        ]
    },
    {
        id: 'volume',
        name: 'Объем',
        shortName: 'Volume',
        description: 'Пересчет объема между бытовыми, метрическими и имперскими единицами.',
        meta: 'Факторный адаптер через базовую единицу литр.',
        adapter: 'factor',
        defaultValue: '1',
        defaultSourceUnit: 'l',
        defaultActiveUnits: ['ml', 'cl', 'l', 'm3', 'cup', 'pt', 'qt', 'gal'],
        units: [
            { id: 'ml', label: 'Миллилитр', shortLabel: 'мл', factor: 0.001 },
            { id: 'cl', label: 'Сантилитр', shortLabel: 'сл', factor: 0.01 },
            { id: 'l', label: 'Литр', shortLabel: 'л', factor: 1 },
            { id: 'm3', label: 'Кубический метр', shortLabel: 'м³', factor: 1000 },
            { id: 'cup', label: 'Чашка (US)', shortLabel: 'cup', factor: 0.2365882365 },
            { id: 'pt', label: 'Пинта (US)', shortLabel: 'pt', factor: 0.473176473 },
            { id: 'qt', label: 'Кварта (US)', shortLabel: 'qt', factor: 0.946352946 },
            { id: 'gal', label: 'Галлон (US)', shortLabel: 'gal', factor: 3.785411784 }
        ]
    },
    {
        id: 'speed',
        name: 'Скорость',
        shortName: 'Speed',
        description: 'Пересчет скорости между транспортными, морскими и инженерными единицами.',
        meta: 'Факторный адаптер через базовую единицу метр в секунду.',
        adapter: 'factor',
        defaultValue: '1',
        defaultSourceUnit: 'mps',
        defaultActiveUnits: ['mps', 'kph', 'mph', 'knot', 'fps'],
        units: [
            { id: 'mps', label: 'Метр в секунду', shortLabel: 'м/с', factor: 1 },
            { id: 'kph', label: 'Километр в час', shortLabel: 'км/ч', factor: 0.2777777778 },
            { id: 'mph', label: 'Миля в час', shortLabel: 'mph', factor: 0.44704 },
            { id: 'knot', label: 'Узел', shortLabel: 'kn', factor: 0.5144444444 },
            { id: 'fps', label: 'Фут в секунду', shortLabel: 'ft/s', factor: 0.3048 }
        ]
    },
    {
        id: 'time',
        name: 'Время',
        shortName: 'Time',
        description: 'Пересчет временных интервалов от миллисекунд до недель.',
        meta: 'Факторный адаптер через базовую единицу секунда.',
        adapter: 'factor',
        defaultValue: '1',
        defaultSourceUnit: 's',
        defaultActiveUnits: ['ms', 's', 'min', 'h', 'day', 'week'],
        units: [
            { id: 'ms', label: 'Миллисекунда', shortLabel: 'мс', factor: 0.001 },
            { id: 's', label: 'Секунда', shortLabel: 'с', factor: 1 },
            { id: 'min', label: 'Минута', shortLabel: 'мин', factor: 60 },
            { id: 'h', label: 'Час', shortLabel: 'ч', factor: 3600 },
            { id: 'day', label: 'Сутки', shortLabel: 'сут', factor: 86400 },
            { id: 'week', label: 'Неделя', shortLabel: 'нед', factor: 604800 }
        ]
    },
    {
        id: 'energy',
        name: 'Энергия',
        shortName: 'Energy',
        description: 'Пересчет энергии между джоулями, калориями и электротехническими единицами.',
        meta: 'Факторный адаптер через базовую единицу джоуль.',
        adapter: 'factor',
        defaultValue: '1',
        defaultSourceUnit: 'j',
        defaultActiveUnits: ['j', 'kj', 'mj', 'cal', 'kcal', 'wh', 'kwh'],
        units: [
            { id: 'j', label: 'Джоуль', shortLabel: 'Дж', factor: 1 },
            { id: 'kj', label: 'Килоджоуль', shortLabel: 'кДж', factor: 1000 },
            { id: 'mj', label: 'Мегаджоуль', shortLabel: 'МДж', factor: 1000000 },
            { id: 'cal', label: 'Калория', shortLabel: 'cal', factor: 4.1868 },
            { id: 'kcal', label: 'Килокалория', shortLabel: 'kcal', factor: 4186.8 },
            { id: 'wh', label: 'Ватт-час', shortLabel: 'Wh', factor: 3600 },
            { id: 'kwh', label: 'Киловатт-час', shortLabel: 'kWh', factor: 3600000 }
        ]
    }
];

export const categoriesById = new Map(categoryRegistry.map(category => [category.id, category]));