import {
    categoriesById,
    categoryRegistry,
    DEFAULT_ACTIVE_CURRENCIES,
    DEFAULT_CURRENCY_RATES,
    STORAGE_KEYS,
    currencyItemsByCode
} from '../config/app-config.js';
import { parseCurrencyNumber } from '../utils/formatters.js';

export function createInitialState() {
    return {
        activeCategoryId: getInitialCategoryId(),
        activeCurrencies: getInitialCurrencySelection(),
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
        pressureBasePaAmount: null,
        pressureDraftValue: null,
        pressureLastActiveUnitId: 'pa',
        pressureUnitsOrder: getInitialPressureUnitsOrder(),
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

export function ensurePressureState(state, category) {
    state.pressureUnitsOrder = getNormalizedPressureUnitsOrder(state.pressureUnitsOrder, category);

    const sourceUnit = category.units.find(unit => unit.id === state.sourceUnits[category.id])
        || category.units.find(unit => unit.id === category.defaultSourceUnit)
        || category.units[0]
        || null;

    if (!category.units.some(unit => unit.id === state.pressureLastActiveUnitId)) {
        state.pressureLastActiveUnitId = sourceUnit?.id || category.defaultSourceUnit;
        state.pressureDraftValue = null;
    }

    if (typeof state.pressureBasePaAmount !== 'number' && state.pressureBasePaAmount !== null) {
        state.pressureBasePaAmount = getInitialPressureBaseAmount(state, category, sourceUnit);
    }

    if (state.pressureBasePaAmount === null && state.values[category.id]) {
        const initialBaseAmount = getInitialPressureBaseAmount(state, category, sourceUnit);
        if (initialBaseAmount !== null) {
            state.pressureBasePaAmount = initialBaseAmount;
        }
    }
}

export function ensureTemperatureState(state, category) {
    state.temperatureUnitsOrder = getNormalizedTemperatureUnitsOrder(state.temperatureUnitsOrder, category);

    const sourceUnit = category.units.find(unit => unit.id === state.sourceUnits[category.id])
        || category.units.find(unit => unit.id === category.defaultSourceUnit)
        || category.units[0]
        || null;

    if (!category.units.some(unit => unit.id === state.temperatureLastActiveUnitId)) {
        state.temperatureLastActiveUnitId = sourceUnit?.id || category.defaultSourceUnit;
        state.temperatureDraftValue = null;
    }

    if (typeof state.temperatureBaseCelsiusAmount !== 'number' && state.temperatureBaseCelsiusAmount !== null) {
        state.temperatureBaseCelsiusAmount = getInitialTemperatureBaseAmount(state, category, sourceUnit);
    }

    if (state.temperatureBaseCelsiusAmount === null && state.values[category.id]) {
        const initialBaseAmount = getInitialTemperatureBaseAmount(state, category, sourceUnit);
        if (initialBaseAmount !== null) {
            state.temperatureBaseCelsiusAmount = initialBaseAmount;
        }
    }
}

function getInitialPressureBaseAmount(state, category, sourceUnit) {
    if (!sourceUnit) {
        return null;
    }

    const parsedValue = parseCurrencyNumber(state.values[category.id] || '');
    if (Number.isNaN(parsedValue)) {
        return null;
    }

    return parsedValue * sourceUnit.factor;
}

function getInitialPressureUnitsOrder() {
    const pressureCategory = categoriesById.get('pressure');
    const fallbackOrder = getDefaultPressureUnitsOrder(pressureCategory);
    const storedValue = localStorage.getItem(STORAGE_KEYS.pressureUnitsOrder);

    if (!storedValue) {
        return fallbackOrder;
    }

    try {
        const parsedValue = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue)) {
            return fallbackOrder;
        }

        return getNormalizedPressureUnitsOrder(parsedValue, pressureCategory);
    } catch (error) {
        console.error('Ошибка чтения порядка единиц давления:', error);
        return fallbackOrder;
    }
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

function getNormalizedPressureUnitsOrder(order, category) {
    if (!category) {
        return [];
    }

    const unitIds = category.units.map(unit => unit.id);
    const uniqueOrder = Array.isArray(order)
        ? order.filter((unitId, index) => unitIds.includes(unitId) && order.indexOf(unitId) === index)
        : [];

    return uniqueOrder.length > 0
        ? uniqueOrder
        : getDefaultPressureUnitsOrder(category);
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

function getDefaultPressureUnitsOrder(category) {
    if (!category) {
        return [];
    }

    return category.units.map(unit => unit.id);
}

function getDefaultTemperatureUnitsOrder(category) {
    if (!category) {
        return [];
    }

    return category.units.map(unit => unit.id);
}

function getInitialTemperatureBaseAmount(state, category, sourceUnit) {
    if (!sourceUnit) {
        return null;
    }

    const parsedValue = parseCurrencyNumber(state.values[category.id] || '');
    if (Number.isNaN(parsedValue)) {
        return null;
    }

    if (sourceUnit.id === 'c') {
        return parsedValue;
    }

    if (sourceUnit.id === 'f') {
        return (parsedValue - 32) * 5 / 9;
    }

    if (sourceUnit.id === 'k') {
        return parsedValue - 273.15;
    }

    return null;
}

function getInitialCategoryId() {
    const storedCategory = localStorage.getItem(STORAGE_KEYS.activeCategory);
    return categoriesById.has(storedCategory) ? storedCategory : categoryRegistry[0].id;
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