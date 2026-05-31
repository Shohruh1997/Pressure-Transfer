import {
    categoriesById,
    categoryRegistry,
    DEFAULT_ACTIVE_CURRENCIES,
    DEFAULT_CURRENCY_RATES,
    STORAGE_KEYS,
    currencyItemsByCode
} from '../config/app-config.js';
import { getDefaultUnitsOrder } from '../features/factor-preview.js';
import { getDefaultTemperatureUnitsOrder } from '../features/temperature.js';

export function createInitialState() {
    return {
        activeCategoryId: getInitialCategoryId(),
        activeCurrencies: getInitialCurrencySelection(),
        categoryPreviews: {},
        categoryUnitsOrders: loadCategoryUnitsOrders(),
        currencyBaseUsdAmount: 1,
        currencyDraftValue: null,
        currencyCalculatorExpression: '',
        currencyCalculatorLastOperand: null,
        currencyCalculatorLastOperator: null,
        currencyCalculatorPendingOperator: null,
        currencyCalculatorShouldResetDisplay: false,
        currencyCalculatorStoredValue: null,
        currencyCalculatorValue: '0',
        currencyLastActiveCode: 'USD',
        currencyRates: { ...DEFAULT_CURRENCY_RATES },
        dragCurrencyCode: null,
        dragTargetCode: null,
        dragTargetPosition: null,
        isCurrencyCalculatorOpen: false,
        isCurrencySettingsOpen: false,
        temperatureBaseCelsiusAmount: null,
        temperatureDraftValue: null,
        temperatureLastActiveUnitId: 'c',
        temperatureUnitsOrder: getInitialTemperatureUnitsOrder(),
        values: {},
        sourceUnits: {}
    };
}

export function ensureCategoryState(state, category) {
    if (!Object.prototype.hasOwnProperty.call(state.values, category.id)) {
        state.values[category.id] = category.defaultValue;
    }

    if (!Object.prototype.hasOwnProperty.call(state.sourceUnits, category.id)) {
        state.sourceUnits[category.id] = category.defaultSourceUnit;
    }
}

export function getActiveCategory(state) {
    return categoriesById.get(state.activeCategoryId) || categoryRegistry[0];
}

export function ensureCurrencyState(state) {
    const availableCodes = state.activeCurrencies.filter(code => currencyItemsByCode.has(code));
    const fallbackCode = availableCodes.includes('USD') ? 'USD' : availableCodes[0] || 'USD';

    if (!availableCodes.includes(state.currencyLastActiveCode)) {
        state.currencyLastActiveCode = fallbackCode;
        state.currencyDraftValue = null;
    }

    if (typeof state.currencyBaseUsdAmount === 'undefined') {
        state.currencyBaseUsdAmount = 1;
    }
}

export function ensureTemperatureState(state, category) {
    state.temperatureUnitsOrder = getNormalizedTemperatureUnitsOrder(state.temperatureUnitsOrder, category);
}

function loadCategoryUnitsOrders() {
    const orders = {};

    try {
        const storedValue = localStorage.getItem(STORAGE_KEYS.categoryUnitsOrders);
        if (storedValue) {
            const parsedValue = JSON.parse(storedValue);
            if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
                Object.assign(orders, parsedValue);
            }
        }
    } catch (error) {
        console.error('Ошибка чтения порядка единиц категорий:', error);
    }

    const legacyPressure = localStorage.getItem(STORAGE_KEYS.pressureUnitsOrder);
    if (legacyPressure && !orders.pressure) {
        try {
            orders.pressure = JSON.parse(legacyPressure);
        } catch (error) {
            console.error('Ошибка чтения legacy-порядка давления:', error);
        }
    }

    categoryRegistry
        .filter(category => category.adapter === 'factor')
        .forEach(category => {
            if (!orders[category.id]) {
                orders[category.id] = getDefaultUnitsOrder(category);
            }
        });

    return orders;
}

function getInitialTemperatureUnitsOrder() {
    const temperatureCategory = categoriesById.get('temperature');
    const fallbackOrder = getDefaultTemperatureUnitsOrder(temperatureCategory);
    const storedValue = localStorage.getItem(STORAGE_KEYS.temperatureUnitsOrder);

    if (!storedValue) {
        return fallbackOrder;
    }

    try {
        const parsedValue = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue)) {
            return fallbackOrder;
        }

        return getNormalizedTemperatureUnitsOrder(parsedValue, temperatureCategory);
    } catch (error) {
        console.error('Ошибка чтения порядка температурных единиц:', error);
        return fallbackOrder;
    }
}

function getNormalizedTemperatureUnitsOrder(order, category) {
    if (!category) {
        return [];
    }

    const unitIds = category.units.map(unit => unit.id);
    const uniqueOrder = Array.isArray(order)
        ? order.filter((unitId, index) => unitIds.includes(unitId) && order.indexOf(unitId) === index)
        : [];

    return uniqueOrder.length > 0
        ? uniqueOrder
        : getDefaultTemperatureUnitsOrder(category);
}

function getInitialCategoryId() {
    const categoryFromUrl = getCategoryIdFromUrl();
    if (categoryFromUrl) {
        return categoryFromUrl;
    }

    const storedCategory = localStorage.getItem(STORAGE_KEYS.activeCategory);
    return categoriesById.has(storedCategory) ? storedCategory : categoryRegistry[0].id;
}

function getCategoryIdFromUrl() {
    const { location } = window;
    const url = new URL(location.href);
    const categoryParam = url.searchParams.get('category');
    if (categoriesById.has(categoryParam)) {
        return categoryParam;
    }

    const hashCategory = location.hash.replace(/^#/, '').trim();
    if (categoriesById.has(hashCategory)) {
        return hashCategory;
    }

    return null;
}

function getInitialCurrencySelection() {
    const fallbackSelection = DEFAULT_ACTIVE_CURRENCIES.filter(code => currencyItemsByCode.has(code));
    const storedValue = localStorage.getItem(STORAGE_KEYS.activeCurrencies);
    if (!storedValue) {
        return fallbackSelection;
    }

    try {
        const parsedValue = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue)) {
            return fallbackSelection;
        }

        const filteredCodes = parsedValue.filter(code => currencyItemsByCode.has(code));
        return filteredCodes.length > 0 ? filteredCodes : fallbackSelection;
    } catch (error) {
        console.error('Ошибка чтения выбранных валют:', error);
        return fallbackSelection;
    }
}
