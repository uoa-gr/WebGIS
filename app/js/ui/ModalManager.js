/**
 * ModalManager - Builds and shows record-detail modals from config.detailModal fields.
 */

import { escapeHtml } from '../utils/helpers.js';

class ModalManager {
    constructor(eventBus, config) {
        this.eventBus = eventBus;
        this.config = config;
        this.overlay = null;
        this.modal = null;
        this.setupDOM();
    }

    setupDOM() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.overlay.style.display = 'none';
        this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });

        this.modal = document.createElement('div');
        this.modal.className = 'modal';

        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);

        document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    }

    show(record) {
        if (!record) return;
        const fields = this.config.detailModal || [];

        let html = '<button class="modal-close">&times;</button>';
        html += `<h2 class="modal-title">${escapeHtml(this.config.project.title)} — Record Details</h2>`;
        html += '<div class="modal-body">';

        for (const field of fields) {
            const label = field.label || field.column;
            let value = record[field.column];

            if (value == null || value === '') { value = 'N/A'; }
            else if (field.type === 'link') {
                const escaped = escapeHtml(String(value));
                value = `<a href="${escaped}" target="_blank" rel="noopener noreferrer">${escaped}</a>`;
            } else if (field.type === 'image') {
                const escaped = escapeHtml(String(value));
                value = `<img src="${escaped}" alt="${escapeHtml(label)}" class="modal-image" loading="lazy">`;
            } else if (field.type === 'coordinates') {
                value = escapeHtml(String(value));
            } else {
                value = escapeHtml(String(value));
            }

            html += `<div class="modal-field">
                <div class="modal-field-label">${escapeHtml(label)}</div>
                <div class="modal-field-value">${value}</div>
            </div>`;
        }

        html += '</div>';
        this.modal.innerHTML = html;
        this.modal.querySelector('.modal-close').addEventListener('click', () => this.close());
        this.overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    close() {
        this.overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
        this.eventBus.emit('modal:closed');
    }
}

export default ModalManager;
