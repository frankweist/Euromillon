import { $, escapeHtml } from './utils.js';

export const modal = {
  el: $('#modal'),
  title: $('#modalTitle'),
  body: $('#modalBody'),
  footer: $('#modalFooter'),
  open(title, bodyHtml, footerButtons = []) {
    this.title.textContent = title;
    this.body.innerHTML = bodyHtml;
    this.footer.innerHTML = '';
    footerButtons.forEach((b) => this.footer.appendChild(b));
    this.el.classList.add('show');
  },
  close() {
    this.el.classList.remove('show');
  },
};

export function mkBtn(text, cls, onClick) {
  const b = document.createElement('button');
  b.className = `btn ${cls || ''}`.trim();
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

export function showAlert(message, title = 'Aviso') {
  modal.open(title, `<p>${escapeHtml(message)}</p>`, [
    mkBtn('Cerrar', 'btn-ghost', () => modal.close()),
  ]);
}

export function showConfirm(message, title = 'Confirmar') {
  return new Promise((resolve) => {
    const btnCancel = mkBtn('Cancelar', 'btn-ghost', () => {
      modal.close();
      resolve(false);
    });
    const btnOk = mkBtn('Confirmar', 'btn-primary', () => {
      modal.close();
      resolve(true);
    });
    modal.open(title, `<p>${escapeHtml(message)}</p>`, [btnCancel, btnOk]);
  });
}
