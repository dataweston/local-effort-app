export default function initCardTilt() {
  if (typeof window === 'undefined') return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  document.querySelectorAll('.card.tilt').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `
        rotateX(${(-py * 6).toFixed(1)}deg)
        rotateY(${(px * 8).toFixed(1)}deg)
      `;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}
