import {
    escapeHtmlAttribute,
    formatCurrencyInputDraft,
    formatNumber,
    parseCurrencyNumber
} from '../utils/formatters.js';

export function renderPressurePreviewPanel(state, category) {
    const activeUnits = getActivePressureUnits(state, category);
    const activeUnitsLabel = `${activeUnits.length} ед.`;

    return `
        <section class="currency-preview pressure-preview">
            <div class="currency-preview-header">
                <div class="currency-preview-controls">
                    <span class="currency-chip">${activeUnitsLabel}</span>
                    <span class="currency-chip is-muted">Па</span>
                    <button type="button" class="currency-help" data-action="open-pressure-settings" aria-label="Выбор единиц давления">⚙</button>
                </div>
            </div>

            <div class="currency-preview-list">
                ${activeUnits.map(unit => renderPressurePreviewRow(state, category, unit)).join('')}
            </div>

            <button type="button" class="currency-settings-btn" data-action="open-pressure-settings">
                <span aria-hidden="true">+</span>
                <span>Настройки</span>
            </button>
        </section>
    `;
}

export function renderPressureSettingsOptions(state, category) {
    return getPressureSettingsItems(state, category).map(unit => {
        const isActive = state.pressureUnitsOrder.includes(unit.id);

        return `
            <div class="settings-option ${isActive ? 'is-draggable' : ''}" data-currency-code="${unit.id}" data-active-currency="${isActive}" draggable="${isActive}">
                <label class="settings-option-main">
                    <input type="checkbox" data-currency-code="${unit.id}" ${isActive ? 'checked' : ''}>
                    <span class="currency-flag" aria-hidden="true">${getPressureUnitBadge(unit.id)}</span>
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

export function getPressureInputDisplayValue(state, category, unitId) {
    if (unitId === state.pressureLastActiveUnitId && state.pressureDraftValue !== null) {
        return state.pressureDraftValue;
    }

    const amount = getPressureAmount(state, category, unitId);
    return amount === null ? '' : formatNumber(amount).replace(/[\s\u00A0\u202F]/g, ' ');
}

export function handlePressureInput(state, category, unitId, rawValue) {
    state.pressureLastActiveUnitId = unitId;
    state.pressureDraftValue = formatCurrencyInputDraft(rawValue);
    state.sourceUnits[category.id] = unitId;
    state.values[category.id] = state.pressureDraftValue;

    if (!rawValue.trim()) {
        state.pressureBasePaAmount = null;
        return state.pressureDraftValue;
    }

    const parsedValue = parseCurrencyNumber(rawValue);
    if (Number.isNaN(parsedValue)) {
        return state.pressureDraftValue;
    }

    const unit = category.units.find(categoryUnit => categoryUnit.id === unitId);
    if (!unit || !unit.factor) {
        return state.pressureDraftValue;
    }

    state.pressureBasePaAmount = parsedValue * unit.factor;
    return state.pressureDraftValue;
}

export function finalizePressureInput(state, category) {
    state.pressureDraftValue = null;
    state.sourceUnits[category.id] = state.pressureLastActiveUnitId;
    state.values[category.id] = getPressureInputDisplayValue(state, category, state.pressureLastActiveUnitId);
}

export function togglePressureUnitSelection(state, category, unitId, isEnabled) {
    const unitExists = category.units.some(unit => unit.id === unitId);
    if (!unitExists) {
        return { changed: false };
    }

    if (isEnabled) {
        if (!state.pressureUnitsOrder.includes(unitId)) {
            state.pressureUnitsOrder.push(unitId);
            return { changed: true };
        }

        return { changed: false };
    }

    if (state.pressureUnitsOrder.length === 1) {
        return { changed: false, error: 'Оставьте хотя бы одну единицу' };
    }

    state.pressureUnitsOrder = state.pressureUnitsOrder.filter(activeUnitId => activeUnitId !== unitId);

    if (state.pressureLastActiveUnitId === unitId) {
        state.pressureLastActiveUnitId = state.pressureUnitsOrder[0];
        state.sourceUnits[category.id] = state.pressureLastActiveUnitId;
        state.pressureDraftValue = null;
    }

    return { changed: true };
}

export function movePressureUnitToTop(state, unitId) {
    if (!state.pressureUnitsOrder.includes(unitId) || state.pressureUnitsOrder[0] === unitId) {
        return false;
    }

    state.pressureUnitsOrder = state.pressureUnitsOrder.filter(activeUnitId => activeUnitId !== unitId);
    state.pressureUnitsOrder.unshift(unitId);
    return true;
}

export function movePressureUnitByDrop(state, dragUnitId, targetUnitId, position) {
    if (!state.pressureUnitsOrder.includes(dragUnitId) || !state.pressureUnitsOrder.includes(targetUnitId) || dragUnitId === targetUnitId) {
        return false;
    }

    const nextOrder = state.pressureUnitsOrder.filter(unitId => unitId !== dragUnitId);
    const targetIndex = nextOrder.indexOf(targetUnitId);
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;

    nextOrder.splice(insertIndex, 0, dragUnitId);
    state.pressureUnitsOrder = nextOrder;
    return true;
}

function getPressureAmount(state, category, unitId) {
    if (state.pressureBasePaAmount === null) {
        return null;
    }

    const unit = category.units.find(categoryUnit => categoryUnit.id === unitId);
    if (!unit || !unit.factor) {
        return null;
    }

    return state.pressureBasePaAmount / unit.factor;
}

function getActivePressureUnits(state, category) {
    return state.pressureUnitsOrder
        .map(unitId => category.units.find(unit => unit.id === unitId))
        .filter(Boolean);
}

function getPressureSettingsItems(state, category) {
    const activeUnits = getActivePressureUnits(state, category);
    const inactiveUnits = category.units.filter(unit => !state.pressureUnitsOrder.includes(unit.id));
    return [...activeUnits, ...inactiveUnits];
}

function renderPressurePreviewRow(state, category, unit) {
    const displayValue = escapeHtmlAttribute(getPressureInputDisplayValue(state, category, unit.id));
    const hasDisplayValue = displayValue.length > 0;

    return `
        <article class="currency-preview-row pressure-preview-row">
            <div class="currency-row-label" title="${unit.label}">
                <span class="currency-flag" aria-hidden="true">${getPressureUnitBadge(unit.id)}</span>
                <span class="currency-row-code">${unit.shortLabel}</span>
                <span class="currency-row-name">${unit.label}</span>
            </div>
            <input
                type="text"
                inputmode="decimal"
                autocomplete="off"
                spellcheck="false"
                class="currency-row-input pressure-input"
                data-pressure-unit-id="${unit.id}"
                value="${displayValue}"
                placeholder="0"
                aria-label="Давление в ${unit.label}"
            >
            <div class="currency-row-actions">
                <button
                    type="button"
                    class="currency-row-clear ${hasDisplayValue ? 'is-visible' : ''}"
                    data-action="clear-pressure-input"
                    data-pressure-unit-id="${unit.id}"
                    aria-label="Очистить давление в ${unit.label}"
                    title="Очистить"
                    ${hasDisplayValue ? '' : 'disabled aria-hidden="true"'}
                >&times;</button>
                <button type="button" class="currency-row-action" data-action="move-pressure-unit-top" data-pressure-unit-id="${unit.id}" aria-label="Поднять ${unit.shortLabel} наверх" title="Поднять наверх">↑</button>
            </div>
        </article>
    `;
}

function getPressureUnitBadge(unitId) {
    return unitId.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4);
}