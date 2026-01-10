class UIHelper {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
    this.tooltip = null;
    this.hideTimeout = null;
    this.activeAnchor = null;
    this.tooltipId = 'uiHelperTooltip';
  }

  init() {
    if (!this.enabled) {
      return;
    }

    this.ensureTooltip();
    this.bindHelpTargets();

    window.addEventListener('scroll', () => this.hide(), true);
    window.addEventListener('resize', () => this.hide());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hide();
      }
    });
    document.addEventListener('click', (event) => {
      if (!this.tooltip) {
        return;
      }
      const clickedHelp = event.target.closest('[data-ui-help]');
      if (clickedHelp) {
        return;
      }
      if (!this.tooltip.contains(event.target)) {
        this.hide();
      }
    });
  }

  ensureTooltip() {
    if (this.tooltip) {
      return;
    }
    const tooltip = document.createElement('div');
    tooltip.className = 'ui-helper-tooltip ui-helper-tooltip--info';
    tooltip.id = this.tooltipId;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.setAttribute('data-open', 'false');
    document.body.appendChild(tooltip);
    this.tooltip = tooltip;
  }

  bindHelpTargets(root = document) {
    const elements = root.querySelectorAll('[data-ui-help]');
    elements.forEach((element) => {
      if (element.dataset.uiHelpBound) {
        return;
      }
      element.dataset.uiHelpBound = 'true';
      if (!this.isFocusable(element)) {
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
      }
      element.setAttribute('aria-haspopup', 'true');

      const showHandler = () => {
        const message = element.dataset.uiHelp || 'Informazioni non disponibili.';
        const severity = element.dataset.uiSeverity || 'info';
        this.show(element, message, severity);
      };

      element.addEventListener('mouseenter', showHandler);
      element.addEventListener('focus', showHandler);
      element.addEventListener('mouseleave', () => this.hide());
      element.addEventListener('blur', () => this.hide());
    });
  }

  isFocusable(element) {
    const focusableTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    if (focusableTags.includes(element.tagName)) {
      return true;
    }
    return element.hasAttribute('tabindex');
  }

  show(anchor, message, severity = 'info') {
    if (!this.enabled || !anchor || !this.tooltip) {
      return;
    }
    const safeSeverity = ['info', 'warn', 'error'].includes(severity) ? severity : 'info';

    this.tooltip.className = `ui-helper-tooltip ui-helper-tooltip--${safeSeverity}`;
    this.tooltip.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'ui-helper-tooltip__header';
    const dot = document.createElement('span');
    dot.className = 'ui-helper-tooltip__dot';
    const label = document.createElement('span');
    label.textContent = safeSeverity === 'info' ? 'Info' : safeSeverity === 'warn' ? 'Attenzione' : 'Errore';
    header.appendChild(dot);
    header.appendChild(label);

    const body = document.createElement('div');
    body.textContent = message;

    this.tooltip.appendChild(header);
    this.tooltip.appendChild(body);

    const live = safeSeverity === 'error' ? 'assertive' : 'polite';
    this.tooltip.setAttribute('aria-live', live);

    this.activeAnchor = anchor;
    anchor.setAttribute('aria-describedby', this.tooltipId);

    this.positionTooltip(anchor);

    this.tooltip.setAttribute('aria-hidden', 'false');
    this.tooltip.setAttribute('data-open', 'true');
  }

  positionTooltip(anchor) {
    const rect = anchor.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const offset = 8;

    let top = rect.bottom + offset + window.scrollY;
    let left = rect.left + window.scrollX;

    if (left + tooltipRect.width > window.scrollX + window.innerWidth - 12) {
      left = window.scrollX + window.innerWidth - tooltipRect.width - 12;
    }

    if (top + tooltipRect.height > window.scrollY + window.innerHeight - 12) {
      top = rect.top + window.scrollY - tooltipRect.height - offset;
    }

    if (left < 12) {
      left = 12;
    }

    if (top < 12) {
      top = rect.bottom + offset + window.scrollY;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }

  hide() {
    if (!this.tooltip) {
      return;
    }
    this.tooltip.setAttribute('aria-hidden', 'true');
    this.tooltip.setAttribute('data-open', 'false');
    if (this.activeAnchor) {
      this.activeAnchor.removeAttribute('aria-describedby');
    }
    this.activeAnchor = null;
  }

  notify({ anchor, message, severity = 'info', duration = 4000 } = {}) {
    if (!this.enabled) {
      return;
    }
    const target = anchor || document.body;
    this.show(target, message, severity);
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    if (duration) {
      this.hideTimeout = setTimeout(() => this.hide(), duration);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const enabledAttr = document.body?.dataset?.uiHelpEnabled;
  const enabled = enabledAttr !== 'false';
  const helper = new UIHelper({ enabled });
  helper.init();
  window.uiHelper = helper;
});
