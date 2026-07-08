/**
 * Shared sidebar hover logic.
 * Both NavHader (logo strip) and SideBar (menu area) use this
 * so moving the mouse between the two won't cause a flicker-close.
 */

let closeTimer = null;

/** Open sidebar immediately (remove menu-toggle). */
export function openSidebar() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  const el = document.querySelector('#main-wrapper');
  if (el) el.classList.remove('menu-toggle');
}

/** Schedule sidebar close after a short delay (cancel if mouse re-enters). */
export function scheduleSidebarClose(delay = 250) {
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    const el = document.querySelector('#main-wrapper');
    if (el) el.classList.add('menu-toggle');
    closeTimer = null;
  }, delay);
}
