/**
 * Modal Dialog System for RinaWarp Terminal
 * Replaces native window.prompt() with custom styled modals
 */

class ModalSystem {
  constructor() {
    this.activeModals = new Set();
    this.modalCounter = 0;

    // Create modal overlay container
    this.createOverlayContainer();

    // Handle ESC key to close modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.activeModals.size > 0) {
        this.closeTopModal();
      }
    });
  }

  /**
   * Create the modal overlay container
   */
  createOverlayContainer() {
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay-container';
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
        `;
    document.body.appendChild(overlay);
  }

  /**
   * Show input modal (replacement for window.prompt)
   */
  showInputModal(title, message, defaultValue = '', type = 'text') {
    return new Promise((resolve, reject) => {
      const modalId = `modal-${++this.modalCounter}`;
      const modal = this.createModal(modalId, title, 'input');

      // Create modal content
      modal.innerHTML = `
                <div class="modal-header">
                    <h3 style="margin: 0; color: #FFD700; font-size: 18px;">${this.escapeHTML(title)}</h3>
                    <button class="modal-close" onclick="modalSystem.closeModal('${modalId}', false)">×</button>
                </div>
                <div class="modal-body">
                    <p style="color: #fff; margin-bottom: 15px;">${this.escapeHTML(message)}</p>
                    <input 
                        type="${type}" 
                        id="${modalId}-input" 
                        value="${this.escapeHTML(defaultValue)}"
                        placeholder="Enter your input..."
                        style="
                            width: 100%;
                            padding: 10px;
                            border: 2px solid #FFD700;
                            border-radius: 8px;
                            background: rgba(0, 0, 0, 0.3);
                            color: #fff;
                            font-size: 14px;
                            outline: none;
                        "
                    />
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-cancel" onclick="modalSystem.closeModal('${modalId}', null)">
                        Cancel
                    </button>
                    <button class="modal-btn modal-btn-primary" onclick="modalSystem.submitModal('${modalId}')">
                        OK
                    </button>
                </div>
            `;

      // Store resolve/reject functions
      modal.dataset.resolve = 'resolve';
      modal.dataset.reject = 'reject';
      modal._resolve = resolve;
      modal._reject = reject;

      // Show modal
      this.showModal(modal);

      // Focus input field
      setTimeout(() => {
        const input = document.getElementById(`${modalId}-input`);
        if (input) {
          input.focus();
          input.select();

          // Handle Enter key
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
              this.submitModal(modalId);
            }
          });
        }
      }, 100);
    });
  }

  /**
   * Show confirmation modal (replacement for window.confirm)
   */
  showConfirmModal(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise(resolve => {
      const modalId = `modal-${++this.modalCounter}`;
      const modal = this.createModal(modalId, title, 'confirm');

      modal.innerHTML = `
                <div class="modal-header">
                    <h3 style="margin: 0; color: #FFD700; font-size: 18px;">${this.escapeHTML(title)}</h3>
                    <button class="modal-close" onclick="modalSystem.closeModal('${modalId}', false)">×</button>
                </div>
                <div class="modal-body">
                    <p style="color: #fff; margin-bottom: 20px; line-height: 1.5;">${this.escapeHTML(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-cancel" onclick="modalSystem.closeModal('${modalId}', false)">
                        ${this.escapeHTML(cancelText)}
                    </button>
                    <button class="modal-btn modal-btn-primary" onclick="modalSystem.closeModal('${modalId}', true)">
                        ${this.escapeHTML(confirmText)}
                    </button>
                </div>
            `;

      modal._resolve = resolve;
      this.showModal(modal);
    });
  }

  /**
   * Show alert modal (replacement for window.alert)
   */
  showAlertModal(title, message, buttonText = 'OK') {
    return new Promise(resolve => {
      const modalId = `modal-${++this.modalCounter}`;
      const modal = this.createModal(modalId, title, 'alert');

      modal.innerHTML = `
                <div class="modal-header">
                    <h3 style="margin: 0; color: #FFD700; font-size: 18px;">${this.escapeHTML(title)}</h3>
                    <button class="modal-close" onclick="modalSystem.closeModal('${modalId}', true)">×</button>
                </div>
                <div class="modal-body">
                    <p style="color: #fff; margin-bottom: 20px; line-height: 1.5;">${this.escapeHTML(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-primary" onclick="modalSystem.closeModal('${modalId}', true)">
                        ${this.escapeHTML(buttonText)}
                    </button>
                </div>
            `;

      modal._resolve = resolve;
      this.showModal(modal);
    });
  }

  /**
   * Create modal element with base styling
   */
  createModal(modalId, title, type) {
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = `modal modal-${type}`;
    modal.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            border: 2px solid #FFD700;
            border-radius: 15px;
            padding: 0;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(255, 215, 0, 0.3);
            animation: modalSlideIn 0.3s ease-out;
        `;

    // Add CSS animations
    if (!document.getElementById('modal-styles')) {
      const style = document.createElement('style');
      style.id = 'modal-styles';
      style.textContent = `
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid rgba(255, 215, 0, 0.3);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    color: #FFD700;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s;
                }
                
                .modal-close:hover {
                    background: rgba(255, 215, 0, 0.2);
                    transform: scale(1.1);
                }
                
                .modal-body {
                    padding: 20px;
                }
                
                .modal-footer {
                    padding: 20px;
                    border-top: 1px solid rgba(255, 215, 0, 0.3);
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                
                .modal-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                
                .modal-btn-primary {
                    background: linear-gradient(45deg, #FFD700, #FFA500);
                    color: #000;
                }
                
                .modal-btn-primary:hover {
                    background: linear-gradient(45deg, #FFA500, #FFD700);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
                }
                
                .modal-btn-cancel {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
                
                .modal-btn-cancel:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: translateY(-1px);
                }
            `;
      document.head.appendChild(style);
    }

    return modal;
  }

  /**
   * Show a modal
   */
  showModal(modal) {
    const overlay = document.getElementById('modal-overlay-container');
    overlay.appendChild(modal);
    overlay.style.display = 'flex';

    this.activeModals.add(modal.id);

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
  }

  /**
   * Submit modal (for input modals)
   */
  submitModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const input = document.getElementById(`${modalId}-input`);
    const value = input ? input.value : null;

    if (modal._resolve) {
      modal._resolve(value);
    }

    this.closeModal(modalId, value);
  }

  /**
   * Close a specific modal
   */
  closeModal(modalId, result) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Resolve with result if available
    if (modal._resolve && result !== undefined) {
      modal._resolve(result);
    }

    // Remove from active modals
    this.activeModals.delete(modalId);

    // Remove modal element
    modal.remove();

    // Hide overlay if no more modals
    if (this.activeModals.size === 0) {
      const overlay = document.getElementById('modal-overlay-container');
      overlay.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  /**
   * Close the top-most modal
   */
  closeTopModal() {
    if (this.activeModals.size > 0) {
      const lastModal = Array.from(this.activeModals).pop();
      this.closeModal(lastModal, null);
    }
  }

  /**
   * Close all modals
   */
  closeAllModals() {
    const modalIds = Array.from(this.activeModals);
    modalIds.forEach(modalId => this.closeModal(modalId, null));
  }

  /**
   * Escape HTML to prevent injection
   */
  escapeHTML(text) {
    if (typeof text !== 'string') return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if any modals are open
   */
  hasActiveModals() {
    return this.activeModals.size > 0;
  }

  /**
   * Get count of active modals
   */
  getActiveModalCount() {
    return this.activeModals.size;
  }
}

// Create global instance
window.ModalSystem = ModalSystem;
window.modalSystem = new ModalSystem();

// Provide convenient global functions to replace window.prompt/confirm/alert
window.showInput = (title, message, defaultValue) =>
  modalSystem.showInputModal(title, message, defaultValue);
window.showConfirm = (title, message) => modalSystem.showConfirmModal(title, message);
window.showAlert = (title, message) => modalSystem.showAlertModal(title, message);
