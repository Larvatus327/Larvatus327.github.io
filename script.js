document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu: the button only exists visually below 760px.
const nav = document.querySelector('.nav');
const toggle = document.querySelector('.menu-toggle');
toggle.addEventListener('click', () => {
  const open = nav.toggleAttribute('data-open');
  toggle.setAttribute('aria-expanded', open);
});

// Reveal once on scroll. Content stays visible without JS, observers, or with reduced motion.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      entry.target.animate(
        [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 500, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
      );
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
}
