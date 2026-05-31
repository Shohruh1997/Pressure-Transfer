import {
    escapeHtmlAttribute,
    formatCurrencyInputDraft,
    formatNumber,
    parseCurrencyNumber
} from '../utils/formatters.js';

export function getDefaultUnitsOrder(category) {
    const sourceId = category.defaultSourceUnit;
    const preferred = category.defaultActiveUnits.length > 0
        ? category.defaultActiveUnits
        : category.units.map(unit => unit.id);
    const ordered = [sourceId, ...preferred.filter(unitId => unitId !== sourceId)];
    const allIds = category.units.map(unit => unit.id);

    return [...ordered, ...allIds.filter(unitId => !ordered.includes(unitId))];
}

export function getCategoryPreview(state, category) {
    if (!state.categoryPreviews[category.id]) {
        state.categoryPreviews[category.id] = {
            unitsOrder: getStoredUnitsOrder(state, category),
            baseAmount: null,
            lastActiveUnitId: category.defaultSourceUnit,
            draftValue: null
        };
    }

    return state.categoryPreviews[category.id];
}

export function ensureFactorPreviewState(state, category) {
    const preview = getCategoryPreview(state, category);
    preview.unitsOrder = normalizeUnitsOrder(preview.unitsOrder, category);

    if (!category.units.some(unit => unit.id === preview.lastActiveUnitId)) {
        preview.lastActiveUnitId = category.defaultSourceUnit;
        preview.draftValue = null;
    }

    if (preview.baseAmount === null) {
        const initialBaseAmount = getInitialBaseAmount(state, category, preview);
        if (initialBaseAmount !== null) {
            preview.baseAmount = initialBaseAmount;
        }
    }
}

export function renderFactorPreviewPanel(state, category) {
    const preview = getCategoryPreview(state, category);
    const activeUnits = getActiveUnits(state, category);

    return `
        <section class="currency-preview factor-preview" data-category-id="${category.id}">
            <div class="currency-preview-header">
                <div class="currency-preview-controls">
                    <button type="button" class="currency-help" data-action="open-factor-settings" aria-label="Выбор единиц: ${category.name}">⚙</button>
                </div>
            </div>

            <div class="currency-preview-list">
                ${activeUnits.map(unit => renderFactorPreviewRow(state, category, unit)).join('')}
            </div>

            <button type="button" class="currency-settings-btn" data-action="open-factor-settings">
                <span aria-hidden="true">+</span>
                <span>Настройки</span>
            </button>
        </section>
    `;
}

export function renderFactorSettingsOptions(state, category) {
    return getFactorSettingsItems(state, category).map(unit => {
        const preview = getCategoryPreview(state, category);
        const isActive = preview.unitsOrder.includes(unit.id);

        return `
            <div class="settings-option ${isActive ? 'is-draggable' : ''}" data-currency-code="${unit.id}" data-active-currency="${isActive}" draggable="${isActive}">
                <label class="settings-option-main">
                    <input type="checkbox" data-currency-code="${unit.id}" ${isActive ? 'checked' : ''}>
                    <span class="currency-flag" aria-hidden="true">${getUnitBadge(unit)}</span>
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

export function getFactorInputDisplayValue(state, category, unitId) {
    const preview = getCategoryPreview(state, category);

    if (unitId === preview.lastActiveUnitId && preview.draftValue !== null) {
        return preview.draftValue;
    }

    const amount = getFactorAmount(state, category, unitId);
    return amount === null ? '' : formatNumber(amount).replace(/[\s\u00A0\u202F]/g, ' ');
}

export function handleFactorInput(state, category, unitId, rawValue) {
    const preview = getCategoryPreview(state, category);

    preview.lastActiveUnitId = unitId;
    preview.draftValue = formatCurrencyInputDraft(rawValue);
    state.sourceUnits[category.id] = unitId;
    state.values[category.id] = preview.draftValue;

    if (!rawValue.trim()) {
        preview.baseAmount = null;
        return preview.draftValue;
    }

    const parsedValue = parseCurrencyNumber(rawValue);
    if (Number.isNaN(parsedValue)) {
        return preview.draftValue;
    }

    const unit = category.units.find(categoryUnit => categoryUnit.id === unitId);
    if (!unit || !unit.factor) {
        return preview.draftValue;
    }

    preview.baseAmount = parsedValue * unit.factor;
    return preview.draftValue;
}

export function finalizeFactorInput(state, category) {
    const preview = getCategoryPreview(state, category);

    preview.draftValue = null;
    state.sourceUnits[category.id] = preview.lastActiveUnitId;
    state.values[category.id] = getFactorInputDisplayValue(state, category, preview.lastActiveUnitId);
}

export function toggleFactorUnitSelection(state, category, unitId, isEnabled) {
    const preview = getCategoryPreview(state, category);
    const unitExists = category.units.some(unit => unit.id === unitId);

    if (!unitExists) {
        return { changed: false };
    }

    if (isEnabled) {
        if (!preview.unitsOrder.includes(unitId)) {
            preview.unitsOrder.push(unitId);
            return { changed: true };
        }

        return { changed: false };
    }

    if (preview.unitsOrder.length === 1) {
        return { changed: false, error: 'Оставьте хотя бы одну единицу' };
    }

    preview.unitsOrder = preview.unitsOrder.filter(activeUnitId => activeUnitId !== unitId);

    if (preview.lastActiveUnitId === unitId) {
        preview.lastActiveUnitId = preview.unitsOrder[0];
        preview.draftValue = null;
        state.sourceUnits[category.id] = preview.lastActiveUnitId;
    }

    return { changed: true };
}

export function moveFactorUnitToTop(state, category, unitId) {
    const preview = getCategoryPreview(state, category);

    if (!preview.unitsOrder.includes(unitId) || preview.unitsOrder[0] === unitId) {
        return false;
    }

    preview.unitsOrder = preview.unitsOrder.filter(activeUnitId => activeUnitId !== unitId);
    preview.unitsOrder.unshift(unitId);
    return true;
}

export function moveFactorUnitByDrop(state, category, dragUnitId, targetUnitId, position) {
    const preview = getCategoryPreview(state, category);

    if (!preview.unitsOrder.includes(dragUnitId) || !preview.unitsOrder.includes(targetUnitId) || dragUnitId === targetUnitId) {
        return false;
    }

    const nextOrder = preview.unitsOrder.filter(unitId => unitId !== dragUnitId);
    const targetIndex = nextOrder.indexOf(targetUnitId);
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;

    nextOrder.splice(insertIndex, 0, dragUnitId);
    preview.unitsOrder = nextOrder;
    return true;
}

export function persistFactorUnitsOrder(state, category) {
    state.categoryUnitsOrders[category.id] = getCategoryPreview(state, category).unitsOrder;
}

function getStoredUnitsOrder(state, category) {
    const storedOrder = state.categoryUnitsOrders[category.id];
    return normalizeUnitsOrder(storedOrder, category);
}

function normalizeUnitsOrder(order, category) {
    const unitIds = category.units.map(unit => unit.id);
    const uniqueOrder = Array.isArray(order)
        ? order.filter((unitId, index) => unitIds.includes(unitId) && order.indexOf(unitId) === index)
        : [];

    return uniqueOrder.length > 0 ? uniqueOrder : getDefaultUnitsOrder(category);
}

function getInitialBaseAmount(state, category, preview) {
    const rawValue = state.values[category.id] || category.defaultValue || '';
    const parsedValue = parseCurrencyNumber(rawValue);

    if (Number.isNaN(parsedValue)) {
        return null;
    }

    const sourceUnitId = state.sourceUnits[category.id] || preview.lastActiveUnitId || category.defaultSourceUnit;
    const sourceUnit = category.units.find(unit => unit.id === sourceUnitId);

    if (!sourceUnit || !sourceUnit.factor) {
        return null;
    }

    preview.lastActiveUnitId = sourceUnitId;
    return parsedValue * sourceUnit.factor;
}

function getFactorAmount(state, category, unitId) {
    const preview = getCategoryPreview(state, category);

    if (preview.baseAmount === null) {
        return null;
    }

    const unit = category.units.find(categoryUnit => categoryUnit.id === unitId);
    if (!unit || !unit.factor) {
        return null;
    }

    return preview.baseAmount / unit.factor;
}

function getActiveUnits(state, category) {
    const preview = getCategoryPreview(state, category);

    return preview.unitsOrder
        .map(unitId => category.units.find(unit => unit.id === unitId))
        .filter(Boolean);
}

function getFactorSettingsItems(state, category) {
    const activeUnits = getActiveUnits(state, category);
    const preview = getCategoryPreview(state, category);
    const inactiveUnits = category.units.filter(unit => !preview.unitsOrder.includes(unit.id));

    return [...activeUnits, ...inactiveUnits];
}

function renderFactorPreviewRow(state, category, unit) {
    const displayValue = escapeHtmlAttribute(getFactorInputDisplayValue(state, category, unit.id));
    const hasDisplayValue = displayValue.length > 0;

    return `
        <article class="currency-preview-row factor-preview-row">
            <div class="currency-row-label" title="${unit.label}">
                <span class="currency-flag" aria-hidden="true">${getUnitBadge(unit)}</span>
                <span class="currency-row-code">${unit.shortLabel}</span>
                <span class="currency-row-name">${unit.label}</span>
            </div>
            <input
                type="text"
                inputmode="decimal"
                autocomplete="off"
                spellcheck="false"
                class="currency-row-input factor-input"
                data-factor-unit-id="${unit.id}"
                value="${displayValue}"
                placeholder="0"
                aria-label="${category.name}: ${unit.label}"
            >
            <div class="currency-row-actions">
                <button
                    type="button"
                    class="currency-row-clear ${hasDisplayValue ? 'is-visible' : ''}"
                    data-action="clear-factor-input"
                    data-factor-unit-id="${unit.id}"
                    aria-label="Очистить ${unit.label}"
                    title="Очистить"
                    ${hasDisplayValue ? '' : 'disabled aria-hidden="true"'}
                >&times;</button>
                <button type="button" class="currency-row-action" data-action="move-factor-unit-top" data-factor-unit-id="${unit.id}" aria-label="Поднять ${unit.shortLabel} наверх" title="Поднять наверх">↑</button>
            </div>
        </article>
    `;
}

function getUnitBadge(unit) {
    return unit.shortLabel.replace(/[^a-z0-9°]/gi, '').toUpperCase().slice(0, 4) || unit.id.toUpperCase().slice(0, 4);
}
