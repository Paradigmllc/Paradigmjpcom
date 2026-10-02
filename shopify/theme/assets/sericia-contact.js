(() => {
  const form = document.getElementById('ContactForm');
  if (!form || form.dataset.sericiaReady) return;
  form.dataset.sericiaReady = 'true';
  const topic = form.querySelector('#ContactForm-topic');
  const requested = new URLSearchParams(window.location.search).get('topic');
  if (topic && Array.from(topic.options).some((option) => option.value === requested)) topic.value = requested;
  const context = form.querySelector('#ContactForm-product');
  const product = new URLSearchParams(window.location.search).get('product');
  if (context && product && !context.value) context.value = product.slice(0, 180);
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector('#ContactForm-progress');
  if (!button || !status) return;
  const label = button.textContent;
  let timer;
  const reset = () => {
    clearTimeout(timer);
    button.disabled = false;
    button.textContent = label;
    form.removeAttribute('aria-busy');
    status.textContent = '';
  };
  window.addEventListener('pageshow', reset);
  form.addEventListener('submit', (event) => {
    if (!form.checkValidity()) return;
    if (button.disabled) { event.preventDefault(); return; }
    button.disabled = true;
    button.textContent = button.dataset.sending;
    status.textContent = button.dataset.sending;
    form.setAttribute('aria-busy', 'true');
    timer = setTimeout(() => { reset(); status.textContent = status.dataset.slow; }, 20000);
  });
})();
