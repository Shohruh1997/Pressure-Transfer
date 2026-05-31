import { STORAGE_KEYS, categoriesById, categoryRegistry } from './config/app-config.js';
import { elements } from './dom/elements.js';
import {
    applyCurrencyCalculatorAction,
    finalizeCurrencyInput,
    getCurrencyInputDisplayValue,
    handleCurrencyCalculatorInput,
    handleCurrencyInput,
    moveCurrencyByDrop,
    moveCurrencyToTop,
    renderCurrencyCalculatorPanel,
    renderCurrencyPreviewPanel,
    renderCurrencySettingsOptions,
    setCurrencyCalculatorVisibility,
    toggleCurrencySelection
} from './features/currency.js';
import {
    ensureFactorPreviewState,
    finalizeFactorInput,
    getFactorInputDisplayValue,
    handleFactorInput,
    moveFactorUnitByDrop,
    moveFactorUnitToTop,
    persistFactorUnitsOrder,
    renderFactorPreviewPanel,
    renderFactorSettingsOptions,
    toggleFactorUnitSelection
} from './features/factor-preview.js';
import {
    ensureTemperaturePreviewState,
    finalizeTemperatureInput,
    getTemperatureInputDisplayValue,
    handleTemperatureInput,
    moveTemperatureUnitByDrop,
    moveTemperatureUnitToTop,
    renderTemperaturePreviewPanel,
    renderTemperatureSettingsOptions,
    toggleTemperatureUnitSelection
} from './features/temperature.js';
import {
    createInitialState,
    ensureCategoryState,
    ensureCurrencyState,
    ensureTemperatureState,
    getActiveCategory
} from './state/app-state.js';
import { copyValue } from './utils/formatters.js';

const state = createInitialState();
const temperatureCategory = categoriesById.get('temperature');
let toastTimeout;
let isInitialized = false;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
    initApp();
}

function initApp() {
    if (isInitialized) {
        return;
    }

    isInitialized = true;
    applyStoredTheme();
    ensureCurrencyState(state);
    categoryRegistry
        .filter(category => category.adapter === 'factor')
        .forEach(category => {
            ensureCategoryState(state, category);
            ensureFactorPreviewState(state, category);
        });

    if (temperatureCategory) {
        ensureCategoryState(state, temperatureCategory);
        ensureTemperatureState(state, temperatureCategory);
        ensureTemperaturePreviewState(state, temperatureCategory);
    }
    renderCategoryNavigation();
    renderCurrencySettingsModal();
    ensureCategoryState(state, getActiveCategory(state));
    attachEventListeners();
    renderActiveCategory();
}

function attachEventListeners() {
    elements.inputValue.addEventListener('input', () => {
        const category = getActiveCategory(state);
        if (usesMultiUnitPanel(category)) {
            return;
        }

        state.values[category.id] = elements.inputValue.value;
        renderResults();
    });

    elements.inputUnit.addEventListener('change', () => {
        const category = getActiveCategory(state);
        if (usesMultiUnitPanel(category)) {
            return;
        }

        state.sourceUnits[category.id] = elements.inputUnit.value;
        renderResults();
    });

    elements.calculatorToggleButton.addEventListener('click', () => {
        if (getActiveCategory(state).id !== 'currency') {
            return;
        }

        setCurrencyCalculatorVisibility(state, !state.isCurrencyCalculatorOpen);
        renderResults();

        if (state.isCurrencyCalculatorOpen) {
            focusCurrencyCalculatorInput();
        }
    });

    elements.categoryNav.addEventListener('change', event => {
        const select = event.target.closest('[data-category-select]');
        if (!select) {
            return;
        }

        activateCategory(select.value);
    });

    elements.resultsGrid.addEventListener('pointerdown', event => {
        const calculatorButton = event.target.closest('[data-calculator-action]');
        if (!calculatorButton) {
            return;
        }

        event.preventDefault();
        applyCurrencyCalculatorAction(state, calculatorButton.dataset.calculatorAction, showToast);
        renderResults();
        focusCurrencyCalculatorInput();
    });

    elements.resultsGrid.addEventListener('input', event => {
        const input = event.target.closest('.currency-calculator-input');
        if (!input) {
            return;
        }

        input.value = handleCurrencyCalculatorInput(state, input.value);
    });

    elements.resultsGrid.addEventListener('click', event => {
        const calculatorToggle = event.target.closest('[data-action="show-currency-calculator"], [data-action="hide-currency-calculator"]');
        if (calculatorToggle) {
            setCurrencyCalculatorVisibility(state, calculatorToggle.dataset.action === 'show-currency-calculator');
            renderResults();
            return;
        }

        const button = event.target.closest('[data-copy-value]');
        if (!button) {
            return;
        }

        copyValue(button.dataset.copyValue, button.dataset.copyLabel || 'Скопировано в буфер', showToast);
    });

    elements.inputPanel.addEventListener('click', event => {
        const copyButton = event.target.closest('[data-copy-value]');
        if (copyButton) {
            copyValue(copyButton.dataset.copyValue, copyButton.dataset.copyLabel || 'Скопировано в буфер', showToast);
            return;
        }

        const clearFactorButton = event.target.closest('[data-action="clear-factor-input"]');
        if (clearFactorButton) {
            const category = getActiveCategory(state);
            const unitId = clearFactorButton.dataset.factorUnitId;
            if (!unitId || category.adapter !== 'factor') {
                return;
            }

            handleFactorInput(state, category, unitId, '');
            finalizeFactorInput(state, category);
            refreshFactorInputs(category, unitId);
            focusFactorInput(unitId);
            return;
        }

        const clearTemperatureButton = event.target.closest('[data-action="clear-temperature-input"]');
        if (clearTemperatureButton && temperatureCategory) {
            const unitId = clearTemperatureButton.dataset.temperatureUnitId;
            if (!unitId) {
                return;
            }

            handleTemperatureInput(state, temperatureCategory, unitId, '');
            finalizeTemperatureInput(state, temperatureCategory);
            refreshTemperatureInputs(unitId);
            focusTemperatureInput(unitId);
            return;
        }

        const clearButton = event.target.closest('[data-action="clear-currency-input"]');
        if (clearButton) {
            const currencyCode = clearButton.dataset.currencyCode;
            if (!currencyCode) {
                return;
            }

            handleCurrencyInput(state, currencyCode, '');
            finalizeCurrencyInput(state);
            refreshCurrencyInputs();
            focusCurrencyInput(currencyCode);
            return;
        }

        const factorSettingsButton = event.target.closest('[data-action="open-factor-settings"]');
        if (factorSettingsButton) {
            openCurrencySettings();
            return;
        }

        const temperatureSettingsButton = event.target.closest('[data-action="open-temperature-settings"]');
        if (temperatureSettingsButton) {
            openCurrencySettings();
            return;
        }

        const openButton = event.target.closest('[data-action="open-currency-settings"]');
        if (openButton) {
            openCurrencySettings();
            return;
        }

        const moveFactorButton = event.target.closest('[data-action="move-factor-unit-top"]');
        if (moveFactorButton) {
            const category = getActiveCategory(state);
            if (category.adapter === 'factor' && moveFactorUnitToTop(state, category, moveFactorButton.dataset.factorUnitId)) {
                persistFactorPreviewState(category);
            }
            return;
        }

        const moveTemperatureButton = event.target.closest('[data-action="move-temperature-unit-top"]');
        if (moveTemperatureButton) {
            if (moveTemperatureUnitToTop(moveTemperatureButton.dataset.temperatureUnitId)) {
                persistTemperatureState();
            }
            return;
        }

        const moveButton = event.target.closest('[data-action="move-currency-top"]');
        if (!moveButton) {
            return;
        }

        if (moveCurrencyToTop(state, moveButton.dataset.currencyCode)) {
            persistCurrencyState();
        }
    });

    elements.categoryCustomContent.addEventListener('focusin', event => {
        const factorInput = event.target.closest('.factor-input[data-factor-unit-id]');
        if (factorInput) {
            const category = getActiveCategory(state);
            if (category.adapter !== 'factor') {
                return;
            }

            const preview = state.categoryPreviews[category.id];
            if (preview) {
                preview.lastActiveUnitId = factorInput.dataset.factorUnitId;
                preview.draftValue = factorInput.value;
            }

            selectTextInputValue(factorInput);
            return;
        }

        const temperatureInput = event.target.closest('.temperature-input[data-temperature-unit-id]');
        if (temperatureInput) {
            state.temperatureLastActiveUnitId = temperatureInput.dataset.temperatureUnitId;
            state.temperatureDraftValue = temperatureInput.value;
            selectTextInputValue(temperatureInput);
            return;
        }

        const input = event.target.closest('.currency-input[data-currency-code]');
        if (!input) {
            return;
        }

        state.currencyLastActiveCode = input.dataset.currencyCode;
        state.currencyDraftValue = input.value;
        selectTextInputValue(input);
    });

    elements.categoryCustomContent.addEventListener('input', event => {
        const factorInput = event.target.closest('.factor-input[data-factor-unit-id]');
        if (factorInput) {
            const category = getActiveCategory(state);
            if (category.adapter !== 'factor') {
                return;
            }

            factorInput.value = handleFactorInput(state, category, factorInput.dataset.factorUnitId, factorInput.value);
            refreshFactorInputs(category, factorInput.dataset.factorUnitId);
            return;
        }

        const temperatureInput = event.target.closest('.temperature-input[data-temperature-unit-id]');
        if (temperatureInput && temperatureCategory) {
            temperatureInput.value = handleTemperatureInput(state, temperatureCategory, temperatureInput.dataset.temperatureUnitId, temperatureInput.value);
            refreshTemperatureInputs(temperatureInput.dataset.temperatureUnitId);
            return;
        }

        const input = event.target.closest('.currency-input[data-currency-code]');
        if (!input) {
            return;
        }

        input.value = handleCurrencyInput(state, input.dataset.currencyCode, input.value);
        refreshCurrencyInputs(input.dataset.currencyCode);
    });

    elements.categoryCustomContent.addEventListener('focusout', event => {
        const factorInput = event.target.closest('.factor-input[data-factor-unit-id]');
        if (factorInput) {
            const category = getActiveCategory(state);
            if (category.adapter === 'factor') {
                finalizeFactorInput(state, category);
                refreshFactorInputs(category);
            }
            return;
        }

        const temperatureInput = event.target.closest('.temperature-input[data-temperature-unit-id]');
        if (temperatureInput && temperatureCategory) {
            finalizeTemperatureInput(state, temperatureCategory);
            refreshTemperatureInputs();
            return;
        }

        const input = event.target.closest('.currency-input[data-currency-code]');
        if (!input) {
            return;
        }

        finalizeCurrencyInput(state);
        refreshCurrencyInputs();
    });

    elements.currencySettingsModal.addEventListener('click', event => {
        if (event.target === elements.currencySettingsModal || event.target.closest('[data-action="close-currency-settings"]')) {
            closeCurrencySettings();
        }
    });

    elements.currencySettingsBody.addEventListener('change', event => {
        const checkbox = event.target.closest('input[data-currency-code]');
        if (!checkbox) {
            return;
        }

        if (getActiveCategory(state).id === 'temperature' && temperatureCategory) {
            const result = toggleTemperatureUnitSelection(state, temperatureCategory, checkbox.dataset.currencyCode, checkbox.checked);
            if (result.error) {
                showToast(result.error);
                renderCurrencySettingsModal();
                return;
            }

            if (result.changed) {
                persistTemperatureState();
            }
            return;
        }

        const activeCategory = getActiveCategory(state);
        if (activeCategory.adapter === 'factor') {
            const result = toggleFactorUnitSelection(state, activeCategory, checkbox.dataset.currencyCode, checkbox.checked);
            if (result.error) {
                showToast(result.error);
                renderCurrencySettingsModal();
                return;
            }

            if (result.changed) {
                persistFactorPreviewState(activeCategory);
            }
            return;
        }

        const result = toggleCurrencySelection(state, checkbox.dataset.currencyCode, checkbox.checked);
        if (result.error) {
            showToast(result.error);
            renderCurrencySettingsModal();
            return;
        }

        if (result.changed) {
            persistCurrencyState();
        }
    });

    elements.currencySettingsBody.addEventListener('dragstart', event => {
        const option = event.target.closest('.settings-option[data-currency-code]');
        if (!option || option.dataset.activeCurrency !== 'true') {
            event.preventDefault();
            return;
        }

        state.dragCurrencyCode = option.dataset.currencyCode;
        state.dragTargetCode = null;
        state.dragTargetPosition = null;

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', state.dragCurrencyCode);
        }

        requestAnimationFrame(() => {
            option.classList.add('is-dragging');
        });
    });

    elements.currencySettingsBody.addEventListener('dragover', event => {
        const option = event.target.closest('.settings-option[data-currency-code]');
        if (!option || option.dataset.activeCurrency !== 'true' || !state.dragCurrencyCode) {
            return;
        }

        if (option.dataset.currencyCode === state.dragCurrencyCode) {
            clearCurrencyDropTarget();
            return;
        }

        event.preventDefault();

        const optionBounds = option.getBoundingClientRect();
        const position = event.clientY < optionBounds.top + optionBounds.height / 2 ? 'before' : 'after';

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }

        setCurrencyDropTarget(option.dataset.currencyCode, position);
    });

    elements.currencySettingsBody.addEventListener('drop', event => {
        const option = event.target.closest('.settings-option[data-currency-code]');
        if (!option || option.dataset.activeCurrency !== 'true' || !state.dragCurrencyCode) {
            return;
        }

        if (option.dataset.currencyCode === state.dragCurrencyCode) {
            resetCurrencyDragState();
            return;
        }

        event.preventDefault();
        const activeCategory = getActiveCategory(state);
        if (activeCategory.id === 'temperature') {
            if (moveTemperatureUnitByDrop(state, state.dragCurrencyCode, option.dataset.currencyCode, state.dragTargetPosition || 'before')) {
                persistTemperatureState();
            }
        } else if (activeCategory.adapter === 'factor') {
            if (moveFactorUnitByDrop(state, activeCategory, state.dragCurrencyCode, option.dataset.currencyCode, state.dragTargetPosition || 'before')) {
                persistFactorPreviewState(activeCategory);
            }
        } else if (moveCurrencyByDrop(state, state.dragCurrencyCode, option.dataset.currencyCode, state.dragTargetPosition || 'before')) {
            persistCurrencyState();
        }
        resetCurrencyDragState();
    });

    elements.currencySettingsBody.addEventListener('dragend', () => {
        resetCurrencyDragState();
    });

    elements.currencySettingsBody.addEventListener('dragleave', event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            clearCurrencyDropTarget();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && state.isCurrencySettingsOpen) {
            closeCurrencySettings();
        }
    });

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }
}

function renderCategoryNavigation() {
    elements.categoryNav.innerHTML = `
        <label class="category-select-label" for="categorySelect">
            <span class="category-select-caption">Раздел величины</span>
            <div class="category-select-wrap">
                <select id="categorySelect" class="category-select select-control" data-category-select aria-label="Выбор раздела величин">
                    ${categoryRegistry.map(category => `
                        <option value="${category.id}" ${category.id === state.activeCategoryId ? 'selected' : ''}>
                            ${category.name} - ${category.shortName}
                        </option>
                    `).join('')}
                </select>
                <span class="category-select-icon" aria-hidden="true">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </div>
        </label>
    `;
}

function activateCategory(nextCategoryId) {
    if (!nextCategoryId || nextCategoryId === state.activeCategoryId) {
        return;
    }

    state.activeCategoryId = nextCategoryId;
    if (nextCategoryId !== 'currency') {
        state.isCurrencyCalculatorOpen = false;
    }

    state.isCurrencySettingsOpen = false;
    resetCurrencyDragState();

    localStorage.setItem(STORAGE_KEYS.activeCategory, nextCategoryId);
    syncCategoryUrl(nextCategoryId);

    const category = getActiveCategory(state);
    ensureCategoryState(state, category);
    if (category.adapter === 'factor') {
        ensureFactorPreviewState(state, category);
    } else if (category.id === 'temperature' && temperatureCategory) {
        ensureTemperaturePreviewState(state, temperatureCategory);
    }

    renderActiveCategory();
}

function syncCategoryUrl(categoryId) {
    const url = new URL(window.location.href);
    const isDefaultCategory = categoryId === categoryRegistry[0]?.id;

    if (isDefaultCategory) {
        url.searchParams.delete('category');
    } else {
        url.searchParams.set('category', categoryId);
    }

    url.hash = categoryId || '';
    window.history.replaceState({}, '', url);
}

function usesMultiUnitPanel(category) {
    return category.id === 'currency' || category.adapter === 'factor' || category.adapter === 'temperature';
}

function renderActiveCategory() {
    const category = getActiveCategory(state);
    ensureCategoryState(state, category);
    ensureCurrencyState(state);

    if (category.adapter === 'factor') {
        ensureFactorPreviewState(state, category);
    } else if (category.id === 'temperature' && temperatureCategory) {
        ensureTemperatureState(state, category);
        ensureTemperaturePreviewState(state, category);
    }

    renderCategoryNavigation();
    renderCurrencySettingsModal();
    applyCategorySurface(category);
    updateResultsHeaderState(category);

    elements.categorySummary.textContent = category.description || '';
    elements.categorySummary.classList.toggle('is-hidden', !category.description);
    elements.panelTitle.textContent = category.name;
    elements.categoryMeta.textContent = category.meta || '';
    elements.categoryMeta.classList.toggle('is-hidden', !category.meta || category.id === 'currency');

    if (!usesMultiUnitPanel(category)) {
        elements.inputValue.value = state.values[category.id];
        populateSourceUnits(category);
    }

    renderResults();
}

function applyCategorySurface(category) {
    const hideGenericInput = usesMultiUnitPanel(category);
    elements.appShell.dataset.activeCategory = category.id;
    elements.genericInputControls.classList.toggle('is-hidden', hideGenericInput);
    elements.resultsCount.classList.toggle('is-hidden', hideGenericInput);
    elements.categoryCustomContent.innerHTML = '';
}

function populateSourceUnits(category) {
    if (category.units.length === 0) {
        elements.inputUnit.innerHTML = '<option value="">Будет подключено позже</option>';
        elements.inputUnit.disabled = true;
        elements.inputValue.disabled = true;
        return;
    }

    elements.inputUnit.disabled = false;
    elements.inputValue.disabled = false;

    elements.inputUnit.innerHTML = category.units.map(unit => `
        <option value="${unit.id}">${unit.shortLabel} · ${unit.label}</option>
    `).join('');

    const sourceUnitId = state.sourceUnits[category.id];
    elements.inputUnit.value = category.units.some(unit => unit.id === sourceUnitId)
        ? sourceUnitId
        : category.defaultSourceUnit;
}

function renderResults() {
    const category = getActiveCategory(state);
    updateCurrencyLayoutState(category);
    updateResultsHeaderState(category);

    if (category.id === 'currency' && state.isCurrencyCalculatorOpen) {
        elements.resultsCount.textContent = '';
        elements.resultsGrid.innerHTML = renderCurrencyCalculatorPanel(state);
    } else {
        elements.resultsGrid.innerHTML = '';
    }

    if (category.id === 'currency') {
        elements.resultsCount.textContent = '';
        elements.categoryCustomContent.innerHTML = renderCurrencyPreviewPanel(state);
        return;
    }

    if (category.adapter === 'factor') {
        elements.resultsCount.textContent = '';
        elements.categoryCustomContent.innerHTML = renderFactorPreviewPanel(state, category);
        return;
    }

    if (category.id === 'temperature') {
        elements.resultsCount.textContent = '';
        elements.categoryCustomContent.innerHTML = renderTemperaturePreviewPanel(state, category);
    }
}

function updateCurrencyLayoutState(category = getActiveCategory(state)) {
    const isCollapsed = category.id !== 'currency' || !state.isCurrencyCalculatorOpen;
    elements.categoryLayout.classList.toggle('is-currency-collapsed', isCollapsed);
}

function updateResultsHeaderState(category = getActiveCategory(state)) {
    const isCurrencyCategory = category.id === 'currency';

    elements.resultsTitle.textContent = state.isCurrencyCalculatorOpen
        ? 'Калькулятор'
        : isCurrencyCategory
            ? 'Калькулятор'
            : `${category.name}: мгновенный пересчет`;

    elements.resultsCount.classList.toggle('is-hidden', usesMultiUnitPanel(category) || state.isCurrencyCalculatorOpen);
    elements.calculatorToggleButton.classList.toggle('is-hidden', !isCurrencyCategory);
    elements.calculatorToggleLabel.textContent = state.isCurrencyCalculatorOpen ? 'Скрыть калькулятор' : 'Калькулятор';
    elements.calculatorToggleButton.setAttribute('aria-pressed', String(state.isCurrencyCalculatorOpen));
}

function renderCurrencySettingsModal() {
    const settingsConfig = getSettingsModalConfig();
    const isOpen = state.isCurrencySettingsOpen && Boolean(settingsConfig);

    elements.currencySettingsModal.classList.toggle('hidden', !isOpen);
    elements.currencySettingsModal.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('modal-open', isOpen);

    if (!settingsConfig) {
        elements.currencySettingsTitle.textContent = 'Настройки';
        elements.currencySettingsBody.innerHTML = '';
        return;
    }

    elements.currencySettingsTitle.textContent = settingsConfig.title;
    elements.currencySettingsBody.innerHTML = settingsConfig.body;
}

function openCurrencySettings() {
    const category = getActiveCategory(state);
    if (category.id !== 'currency' && category.adapter !== 'factor' && category.id !== 'temperature') {
        return;
    }

    state.isCurrencySettingsOpen = true;
    renderCurrencySettingsModal();
}

function closeCurrencySettings() {
    state.isCurrencySettingsOpen = false;
    resetCurrencyDragState();
    renderCurrencySettingsModal();
}

function persistCurrencyState() {
    ensureCurrencyState(state);
    localStorage.setItem(STORAGE_KEYS.activeCurrencies, JSON.stringify(state.activeCurrencies));

    if (getActiveCategory(state).id === 'currency') {
        applyCategorySurface(getActiveCategory(state));
        renderResults();
    }

    renderCurrencySettingsModal();
}

function persistFactorPreviewState(category = getActiveCategory(state)) {
    if (category.adapter !== 'factor') {
        return;
    }

    ensureFactorPreviewState(state, category);
    persistFactorUnitsOrder(state, category);
    localStorage.setItem(STORAGE_KEYS.categoryUnitsOrders, JSON.stringify(state.categoryUnitsOrders));

    if (getActiveCategory(state).id === category.id) {
        renderResults();
    }

    renderCurrencySettingsModal();
}

function persistTemperatureState() {
    if (!temperatureCategory) {
        return;
    }

    ensureTemperatureState(state, temperatureCategory);
    ensureTemperaturePreviewState(state, temperatureCategory);
    localStorage.setItem(STORAGE_KEYS.temperatureUnitsOrder, JSON.stringify(state.temperatureUnitsOrder));

    if (getActiveCategory(state).id === 'temperature') {
        renderResults();
    }

    renderCurrencySettingsModal();
}

function getSettingsModalConfig(category = getActiveCategory(state)) {
    if (category.id === 'currency') {
        return {
            title: 'Выбор валют',
            body: renderCurrencySettingsOptions(state)
        };
    }

    if (category.adapter === 'factor') {
        return {
            title: `Единицы: ${category.name}`,
            body: renderFactorSettingsOptions(state, category)
        };
    }

    if (category.id === 'temperature') {
        return {
            title: 'Единицы температуры',
            body: renderTemperatureSettingsOptions(state, category)
        };
    }

    return null;
}

function showToast(label) {
    elements.toastLabel.textContent = label;
    elements.toast.classList.add('toast-visible');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('toast-visible');
    }, 1800);
}

function applyStoredTheme() {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    updateThemeToggle(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
    updateThemeToggle(nextTheme);
}

function updateThemeToggle(theme) {
    if (!elements.themeToggle || !elements.themeToggleIcon) {
        return;
    }

    elements.themeToggleIcon.textContent = theme === 'dark' ? '☀' : '◐';
    elements.themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Светлая тема' : 'Темная тема');
}

function refreshCurrencyInputs(activeCode = null) {
    const inputs = elements.categoryCustomContent.querySelectorAll('.currency-input[data-currency-code]');

    inputs.forEach(input => {
        const code = input.dataset.currencyCode;
        if (activeCode && code === activeCode) {
            updateCurrencyClearButtonVisibility(code, input.value);
            return;
        }

        input.value = getCurrencyInputDisplayValue(state, code);
        updateCurrencyClearButtonVisibility(code, input.value);
    });
}

function refreshFactorInputs(category, activeUnitId = null) {
    const inputs = elements.categoryCustomContent.querySelectorAll('.factor-input[data-factor-unit-id]');

    inputs.forEach(input => {
        const unitId = input.dataset.factorUnitId;
        if (activeUnitId && unitId === activeUnitId) {
            updateFactorClearButtonVisibility(unitId, input.value);
            return;
        }

        input.value = getFactorInputDisplayValue(state, category, unitId);
        updateFactorClearButtonVisibility(unitId, input.value);
    });
}

function updateFactorClearButtonVisibility(unitId, value) {
    const clearButton = elements.categoryCustomContent.querySelector(`.currency-row-clear[data-factor-unit-id="${unitId}"]`);
    if (!clearButton) {
        return;
    }

    const hasValue = Boolean(value);
    clearButton.classList.toggle('is-visible', hasValue);
    clearButton.disabled = !hasValue;
    clearButton.setAttribute('aria-hidden', String(!hasValue));
}

function refreshTemperatureInputs(activeUnitId = null) {
    const inputs = elements.categoryCustomContent.querySelectorAll('.temperature-input[data-temperature-unit-id]');

    inputs.forEach(input => {
        const unitId = input.dataset.temperatureUnitId;
        if (activeUnitId && unitId === activeUnitId) {
            updateTemperatureClearButtonVisibility(unitId, input.value);
            return;
        }

        input.value = getTemperatureInputDisplayValue(state, temperatureCategory, unitId);
        updateTemperatureClearButtonVisibility(unitId, input.value);
    });
}

function updateTemperatureClearButtonVisibility(unitId, value) {
    const clearButton = elements.categoryCustomContent.querySelector(`.currency-row-clear[data-temperature-unit-id="${unitId}"]`);
    if (!clearButton) {
        return;
    }

    const hasValue = Boolean(value);
    clearButton.classList.toggle('is-visible', hasValue);
    clearButton.disabled = !hasValue;
    clearButton.setAttribute('aria-hidden', String(!hasValue));
}

function focusFactorInput(unitId) {
    const input = elements.categoryCustomContent.querySelector(`.factor-input[data-factor-unit-id="${unitId}"]`);
    if (!input) {
        return;
    }

    input.focus({ preventScroll: true });
    selectTextInputValue(input);
}

function focusTemperatureInput(unitId) {
    const input = elements.categoryCustomContent.querySelector(`.temperature-input[data-temperature-unit-id="${unitId}"]`);
    if (!input) {
        return;
    }

    input.focus({ preventScroll: true });
    selectTextInputValue(input);
}

function updateCurrencyClearButtonVisibility(code, value) {
    const clearButton = elements.categoryCustomContent.querySelector(`.currency-row-clear[data-currency-code="${code}"]`);
    if (!clearButton) {
        return;
    }

    const hasValue = Boolean(value);
    clearButton.classList.toggle('is-visible', hasValue);
    clearButton.disabled = !hasValue;
    clearButton.setAttribute('aria-hidden', String(!hasValue));
}

function setCurrencyDropTarget(code, position) {
    if (state.dragTargetCode === code && state.dragTargetPosition === position) {
        return;
    }

    clearCurrencyDropTarget();
    state.dragTargetCode = code;
    state.dragTargetPosition = position;

    const targetOption = elements.currencySettingsBody.querySelector(`.settings-option[data-currency-code="${code}"]`);
    if (!targetOption) {
        return;
    }

    targetOption.classList.add(position === 'after' ? 'is-drop-after' : 'is-drop-before');
}

function clearCurrencyDropTarget() {
    state.dragTargetCode = null;
    state.dragTargetPosition = null;

    elements.currencySettingsBody
        .querySelectorAll('.settings-option.is-drop-before, .settings-option.is-drop-after')
        .forEach(option => option.classList.remove('is-drop-before', 'is-drop-after'));
}

function resetCurrencyDragState() {
    state.dragCurrencyCode = null;
    clearCurrencyDropTarget();

    elements.currencySettingsBody
        .querySelectorAll('.settings-option.is-dragging')
        .forEach(option => option.classList.remove('is-dragging'));
}

function focusCurrencyCalculatorInput() {
    const input = elements.resultsGrid.querySelector('.currency-calculator-input');
    if (!input) {
        return;
    }

    input.focus({ preventScroll: true });
    const caretPosition = input.value.length;
    input.setSelectionRange(caretPosition, caretPosition);
}

function focusCurrencyInput(code) {
    const input = elements.categoryCustomContent.querySelector(`.currency-input[data-currency-code="${code}"]`);
    if (!input) {
        return;
    }

    input.focus({ preventScroll: true });
    selectTextInputValue(input);
}

function selectTextInputValue(input) {
    requestAnimationFrame(() => {
        if (document.activeElement !== input) {
            return;
        }

        input.setSelectionRange(0, input.value.length);
    });
}