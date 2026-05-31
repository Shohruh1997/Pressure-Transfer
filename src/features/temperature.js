import {
    escapeHtmlAttribute,
    formatCurrencyInputDraft,
    formatNumber,
    parseCurrencyNumber
} from '../utils/formatters.js';

export function getDefaultTemperatureUnitsOrder(category) {
    return category.units.map(unit => unit.id);
}

export function ensureTemperaturePreviewState(state, category) {
    state.temperatureUnitsOrder = normalizeTemperatureUnitsOrder(state.temperatureUnitsOrder, category);

    if (!category.units.some(unit => unit.id === state.temperatureLastActiveUnitId)) {
        state.temperatureLastActiveUnitId = category.defaultSourceUnit;
        state.temperatureDraftValue = null;
    }

    if (typeof state.temperatureBaseCelsiusAmount !== 'number' && state.temperatureBaseCelsiusAmount !== null) {
        state.temperatureBaseCelsiusAmount = getInitialTemperatureBaseAmount(state, category);
    }

    if (state.temperatureBaseCelsiusAmount === null) {
        const initialBaseAmount = getInitialTemperatureBaseAmount(state, category);
        if (initialBaseAmount !== null) {
            state.temperatureBaseCelsiusAmount = initialBaseAmount;
        }
    }
}

export function renderTemperaturePreviewPanel(state, category) {
    const activeUnits = getActiveTemperatureUnits(state, category);

    return `
        <section class="currency-preview temperature-preview">
            <div class="currency-preview-header">
                <div class="currency-preview-controls">
                    <button type="button" class="currency-help" data-action="open-temperature-settings" aria-label="Выбор единиц температуры">⚙</button>
                </div>
            </div>

            <div class="currency-preview-list">
                ${activeUnits.map(unit => renderTemperaturePreviewRow(state, category, unit)).join('')}
            </div>

            <button type="button" class="currency-settings-btn" data-action="open-temperature-settings">
                <span aria-hidden="true">+</span>
                <span>Настройки</span>
            </button>
        </section>
    `;
}

export function renderTemperatureSettingsOptions(state, category) {
    return getTemperatureSettingsItems(state, category).map(unit => {
        const isActive = state.temperatureUnitsOrder.includes(unit.id);

        return `
            <div class="settings-option ${isActive ? 'is-draggable' : ''}" data-currency-code="${unit.id}" data-active-currency="${isActive}" draggable="${isActive}">
                <label class="settings-option-main">
                    <input type="checkbox" data-currency-code="${unit.id}" ${isActive ? 'checked' : ''}>
                    <span class="currency-flag" aria-hidden="true">${getTemperatureUnitBadge(unit)}</span>
                    <span>
                        <span class="settings-option-code">${unit.shortLabel}</span>
                        <span class="settings-option-name">${unit.label}</span>
                    </span>
                </label>
                <span class="settings-drag-handle ${isActive ? '' : 'is-disabled'}" aria-hidden="true">::::</span>
            </div>
        `;
    }).join('');
}

export function getTemperatureInputDisplayValue(state, category, unitId) {
    if (unitId === state.temperatureLastActiveUnitId && state.temperatureDraftValue !== null) {
        return state.temperatureDraftValue;
    }

    const amount = getTemperatureAmount(state, category, unitId);
    return amount === null ? '' : formatNumber(amount).replace(/[\s\u00A0\u202F]/g, ' ');
}

export function handleTemperatureInput(state, category, unitId, rawValue) {
    state.temperatureLastActiveUnitId = unitId;
    state.temperatureDraftValue = formatCurrencyInputDraft(rawValue);
    state.sourceUnits[category.id] = unitId;
    state.values[category.id] = state.temperatureDraftValue;

    if (!rawValue.trim()) {
        state.temperatureBaseCelsiusAmount = null;
        return state.temperatureDraftValue;
    }

    const parsedValue = parseCurrencyNumber(rawValue);
    if (Number.isNaN(parsedValue)) {
        return state.temperatureDraftValue;
    }

    state.temperatureBaseCelsiusAmount = toCelsius(parsedValue, unitId);
    return state.temperatureDraftValue;
}

export function finalizeTemperatureInput(state, category) {
    state.temperatureDraftValue = null;
    state.sourceUnits[category.id] = state.temperatureLastActiveUnitId;
    state.values[category.id] = getTemperatureInputDisplayValue(state, category, state.temperatureLastActiveUnitId);
}

export function toggleTemperatureUnitSelection(state, category, unitId, isEnabled) {
    const unitExists = category.units.some(unit => unit.id === unitId);
    if (!unitExists) {
        return { changed: false };
    }

    if (isEnabled) {
        if (!state.temperatureUnitsOrder.includes(unitId)) {
            state.temperatureUnitsOrder.push(unitId);
            return { changed: true };
        }

        return { changed: false };
    }

    if (state.temperatureUnitsOrder.length === 1) {
        return { changed: false, error: 'Оставьте хотя бы одну единицу' };
    }

    state.temperatureUnitsOrder = state.temperatureUnitsOrder.filter(activeUnitId => activeUnitId !== unitId);

    if (state.temperatureLastActiveUnitId === unitId) {
        state.temperatureLastActiveUnitId = state.temperatureUnitsOrder[0];
        state.temperatureDraftValue = null;
        state.sourceUnits[category.id] = state.temperatureLastActiveUnitId;
    }

    return { changed: true };
}

export function moveTemperatureUnitToTop(state, unitId) {
    if (!state.temperatureUnitsOrder.includes(unitId) || state.temperatureUnitsOrder[0] === unitId) {
        return false;
    }

    state.temperatureUnitsOrder = state.temperatureUnitsOrder.filter(activeUnitId => activeUnitId !== unitId);
    state.temperatureUnitsOrder.unshift(unitId);
    return true;
}

export function moveTemperatureUnitByDrop(state, dragUnitId, targetUnitId, position) {
    if (!state.temperatureUnitsOrder.includes(dragUnitId) || !state.temperatureUnitsOrder.includes(targetUnitId) || dragUnitId === targetUnitId) {
        return false;
    }

    const nextOrder = state.temperatureUnitsOrder.filter(unitId => unitId !== dragUnitId);
    const targetIndex = nextOrder.indexOf(targetUnitId);
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;

    nextOrder.splice(insertIndex, 0, dragUnitId);
    state.temperatureUnitsOrder = nextOrder;
    return true;
}

function getInitialTemperatureBaseAmount(state, category) {
    const rawValue = state.values[category.id] || category.defaultValue || '';
    const parsedValue = parseCurrencyNumber(rawValue);

    if (Number.isNaN(parsedValue)) {
        return null;
    }

    const sourceUnitId = state.sourceUnits[category.id] || state.temperatureLastActiveUnitId || category.defaultSourceUnit;
    state.temperatureLastActiveUnitId = sourceUnitId;
    return toCelsius(parsedValue, sourceUnitId);
}

function getTemperatureAmount(state, category, unitId) {
    if (state.temperatureBaseCelsiusAmount === null) {
        return null;
    }

    if (!category.units.some(unit => unit.id === unitId)) {
        return null;
    }

    return fromCelsius(state.temperatureBaseCelsiusAmount, unitId);
}

function getActiveTemperatureUnits(state, category) {
    return state.temperatureUnitsOrder
        .map(unitId => category.units.find(unit => unit.id === unitId))
        .filter(Boolean);
}

function getTemperatureSettingsItems(state, category) {
    const activeUnits = getActiveTemperatureUnits(state, category);
    const inactiveUnits = category.units.filter(unit => !state.temperatureUnitsOrder.includes(unit.id));
    return [...activeUnits, ...inactiveUnits];
}

function normalizeTemperatureUnitsOrder(order, category) {
    const unitIds = category.units.map(unit => unit.id);
    const uniqueOrder = Array.isArray(order)
        ? order.filter((unitId, index) => unitIds.includes(unitId) && order.indexOf(unitId) === index)
        : [];

    return uniqueOrder.length > 0 ? uniqueOrder : getDefaultTemperatureUnitsOrder(category);
}

function renderTemperaturePreviewRow(state, category, unit) {
    const displayValue = escapeHtmlAttribute(getTemperatureInputDisplayValue(state, category, unit.id));
    const hasDisplayValue = displayValue.length > 0;

    return `
        <article class="currency-preview-row temperature-preview-row">
            <div class="currency-row-label" title="${unit.label}">
                <span class="currency-flag" aria-hidden="true">${getTemperatureUnitBadge(unit)}</span>
                <span class="currency-row-code">${unit.shortLabel}</span>
                <span class="currency-row-name">${unit.label}</span>
            </div>
            <input
                type="text"
                inputmode="decimal"
                autocomplete="off"
                spellcheck="false"
                class="currency-row-input temperature-input"
                data-temperature-unit-id="${unit.id}"
                value="${displayValue}"
                placeholder="0"
                aria-label="Температура в ${unit.label}"
            >
            <div class="currency-row-actions">
                <button
                    type="button"
                    class="currency-row-clear ${hasDisplayValue ? 'is-visible' : ''}"
                    data-action="clear-temperature-input"
                    data-temperature-unit-id="${unit.id}"
                    aria-label="Очистить температуру в ${unit.label}"
                    title="Очистить"
                    ${hasDisplayValue ? '' : 'disabled aria-hidden="true"'}
                >&times;</button>
                <button type="button" class="currency-row-action" data-action="move-temperature-unit-top" data-temperature-unit-id="${unit.id}" aria-label="Поднять ${unit.shortLabel} наверх" title="Поднять наверх">↑</button>
            </div>
        </article>
    `;
}

function getTemperatureUnitBadge(unit) {
    const cleanedShortLabel = unit.shortLabel.replace(/[^a-z0-9]/gi, '').toUpperCase();
    return cleanedShortLabel || unit.id.toUpperCase();
}

function toCelsius(value, unitId) {
    if (unitId === 'c') {
        return value;
    }

    if (unitId === 'f') {
        return (value - 32) * 5 / 9;
    }

    if (unitId === 'k') {
        return value - 273.15;
    }

    return value;
}

function fromCelsius(value, unitId) {
    if (unitId === 'c') {
        return value;
    }

    if (unitId === 'f') {
        return value * 9 / 5 + 32;
    }

    if (unitId === 'k') {
        return value + 273.15;
    }

    return value;
}
