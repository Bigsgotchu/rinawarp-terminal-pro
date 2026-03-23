import type { SettingsShellModel } from './settingsShellModel.js'

export function renderSettingsShell(model: SettingsShellModel): string {
  return `
    <div class="rw-settings-shell" data-settings-shell="true">
      <div class="rw-settings-rail" id="rw-settings-rail" aria-label="Settings sections">
        ${model.railItems
          .map(
            (item) => `
              <button
                type="button"
                id="rw-settings-tab-${item.id}"
                data-settings-tab="${item.id}"
                data-settings-shell-item="true"
                role="tab"
                aria-selected="false"
                class="rw-tab"
              >
                <span class="rw-tab-ico" aria-hidden="true">${item.icon}</span>
                <span class="rw-tab-label">${item.label}</span>
              </button>
            `
          )
          .join('')}
      </div>
      <div class="rw-settings-body">
        <div class="rw-settings-top">
          <div class="rw-settings-title">${model.title}</div>
          <button type="button" class="rw-btn rw-btn-ghost" id="rw-settings-close">${model.closeLabel}</button>
        </div>
        <div class="rw-settings-content" id="rw-settings-content"></div>
      </div>
    </div>
  `
}
