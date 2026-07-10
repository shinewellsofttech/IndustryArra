/**
 * Shared sidebar hover logic.
 * Both NavHader (logo strip) and SideBar (menu area) use this
 * so moving the mouse between the two won't cause a flicker-close.
 *
 * Mobile/touch devices: hover is disabled — sidebar only opens via
 * the header toggle button.
 */

let closeTimer = null;

/** Returns true if the device is a touch/mobile device. */
function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

/** Open sidebar immediately (remove menu-toggle). Desktop only. */
export function openSidebar() {
  // On mobile/touch devices, do nothing — toggle button handles it
  if (isTouchDevice()) return;

  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  const el = document.querySelector('#main-wrapper');
  if (el) el.classList.remove('menu-toggle');
}

/** Schedule sidebar close after a short delay (cancel if mouse re-enters). Desktop only. */
export function scheduleSidebarClose(delay = 250) {
  // On mobile/touch devices, do nothing — toggle button handles it
  if (isTouchDevice()) return;

  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    const el = document.querySelector('#main-wrapper');
    if (el) el.classList.add('menu-toggle');
    closeTimer = null;
  }, delay);
}
