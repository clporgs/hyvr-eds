/*
 * HYVR stats — animated KPI counters for brand-discovery social proof.
 * Author pattern: rows of value | label. Counts up when scrolled into view, but
 * respects prefers-reduced-motion (renders final value immediately).
 */
export default function decorate(block) {
  const items = [...block.children].map((row) => ({
    value: row.children[0]?.textContent?.trim() || '',
    label: row.children[1]?.textContent?.trim() || '',
  }));
  block.innerHTML = '';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  items.forEach((it) => {
    const fig = document.createElement('div'); fig.className = 'stat';
    const num = document.createElement('span'); num.className = 'stat-value';
    const lab = document.createElement('span'); lab.className = 'stat-label'; lab.textContent = it.label;
    fig.append(num, lab); block.append(fig);

    // prefix | numeric (may contain thousands commas / decimals) | suffix
    const match = it.value.match(/^([^\d]*)([\d.,]+)(.*)$/);
    if (!match || reduce) { num.textContent = it.value; return; }
    const [, pre, targetRaw, suf] = match;
    const grouped = targetRaw.includes(',');
    const end = parseFloat(targetRaw.replace(/,/g, ''));
    const dec = (targetRaw.split('.')[1] || '').length;
    const fmt = (n) => {
      const v = n.toFixed(dec);
      return grouped ? Number(v).toLocaleString('en-US', { minimumFractionDigits: dec }) : v;
    };
    num.textContent = `${pre}${fmt(0)}${suf}`;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        const start = performance.now(); const dur = 1200;
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - (1 - p) ** 3;
          num.textContent = `${pre}${fmt(end * eased)}${suf}`;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    obs.observe(fig);
  });
}
