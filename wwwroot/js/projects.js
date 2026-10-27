// Tag filter enhancement. Project lists are pre-rendered at build time;
// this only shows the filter and toggles cards by their data-tags.
// German count words come from the status element's data-* attributes
// (rendered by the build from data/strings.json), never hard-coded here.

function parseTags(card) {
  try {
    const tags = JSON.parse(card.dataset.tags ?? '[]');
    return Array.isArray(tags) ? tags : [];
  } catch {
    return [];
  }
}

// Host attributes: data-tag-filter="<list-id>"; status: [data-filter-status="<list-id>"].
export function initTagFilter(host) {
  const list = document.getElementById(host.dataset.tagFilter);
  if (!list) return;
  const cards = [...list.querySelectorAll('[data-tags]')].map((card) => ({ card, tags: parseTags(card) }));
  const buttons = [...host.querySelectorAll('button[data-tag]')];
  if (cards.length === 0 || buttons.length === 0) return;

  const status = document.querySelector(`[data-filter-status="${CSS.escape(host.dataset.tagFilter)}"]`);

  const countLabel = (count) => {
    const word = count === 1 ? status?.dataset.countSingular : status?.dataset.countPlural;
    return word ? `${count} ${word}` : String(count);
  };

  host.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-tag]');
    if (!button) return;
    const tag = button.dataset.tag;
    buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    let visible = 0;
    cards.forEach((entry) => {
      const show = tag === '' || entry.tags.includes(tag);
      entry.card.hidden = !show;
      if (show) visible += 1;
    });
    if (status) {
      status.textContent = tag
        ? `${countLabel(visible)} ${status.dataset.withTag ?? ''} ${status.dataset.quoteOpen ?? ''}${tag}${status.dataset.quoteClose ?? ''}`
        : countLabel(visible);
    }
  });

  host.hidden = false;
}
