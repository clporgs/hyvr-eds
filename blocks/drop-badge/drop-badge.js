/*
 * HYVR drop-badge — a limited-drop countdown band to drive launch buzz/urgency.
 * Author pattern: row1 = headline, row2 = ISO end datetime, row3 = CTA link.
 * Countdown updates once/second; degrades gracefully with reduced motion.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const headline = rows[0]?.textContent?.trim() || 'Limited drop';
  const iso = rows[1]?.textContent?.trim();
  const cta = rows[2]?.querySelector('a');

  block.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'drop-badge-inner';
  wrap.innerHTML = `<span class="badge drop">Drop</span><strong>${headline}</strong>
    <span class="drop-badge-timer mono" role="timer" aria-live="off">--:--:--</span>`;
  if (cta) { cta.className = 'button primary'; wrap.append(cta); }
  block.append(wrap);

  const timer = wrap.querySelector('.drop-badge-timer');
  const end = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(end)) { timer.textContent = 'Live now'; return; }
  const pad = (n) => String(n).padStart(2, '0');
  const update = () => {
    const diff = end - Date.now();
    if (diff <= 0) { timer.textContent = 'Live now'; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    timer.textContent = `${d > 0 ? `${d}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`;
    setTimeout(update, 1000);
  };
  update();
}
