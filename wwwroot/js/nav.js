// Mobile navigation toggle. Without JS the nav stays visible.

export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const navId = toggle?.getAttribute('aria-controls');
  const nav = navId ? document.getElementById(navId) : null;
  if (!toggle || !nav) return;

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-collapsed', !open);
  };

  setOpen(false);
  toggle.hidden = false;

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });
}
