/**
 * Shared sidebar hover & mobile toggle logic.
 * Both NavHader (logo strip) and SideBar (menu area) use this
 * so moving the mouse between the two won't cause a flicker-close.
 *
 * Mobile/touch devices: hover is disabled — sidebar opens/closes via
 * the mobile toggle button and auto-closes on route click or content tap.
 */

let closeTimer = null;

/** Returns true if the device is a mobile device. */
export function isMobile() {
  return window.innerWidth <= 768;
}

/** Open sidebar immediately (remove menu-toggle). Desktop only. */
export function openSidebar() {
  // On mobile devices, do nothing — toggle button handles it
  if (isMobile()) return;

  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  const el = document.querySelector('#main-wrapper');
  if (el) el.classList.remove('menu-toggle');
}

/** Schedule sidebar close after a short delay (cancel if mouse re-enters). Desktop only. */
export function scheduleSidebarClose(delay = 250) {
  // On mobile devices, do nothing — toggle button handles it
  if (isMobile()) return;

  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    const el = document.querySelector('#main-wrapper');
    if (el) el.classList.add('menu-toggle');
    closeTimer = null;
  }, delay);
}

/** Toggle mobile sidebar open/closed. */
export function toggleSidebarMobile() {
  if (!isMobile()) return;

  const el = document.querySelector('#main-wrapper');
  const hamburger = document.querySelector('.hamburger');
  if (!el) return;

  if (el.classList.contains('menu-toggle')) {
    // Currently open on mobile (overlay mode) -> close it
    el.classList.remove('menu-toggle');
    if (hamburger) hamburger.classList.remove('is-active');
  } else {
    // Currently closed on mobile -> open it
    el.classList.add('menu-toggle');
    if (hamburger) hamburger.classList.add('is-active');
  }
}

/** Close mobile sidebar. */
export function closeSidebarMobile() {
  if (!isMobile()) return;

  const el = document.querySelector('#main-wrapper');
  const hamburger = document.querySelector('.hamburger');
  if (el) el.classList.remove('menu-toggle');
  if (hamburger) hamburger.classList.remove('is-active');
}

