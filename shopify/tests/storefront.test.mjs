import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
const theme = resolve(import.meta.dirname, '../theme');
const source = (name) => readFileSync(resolve(theme, name), 'utf8');
const json = (name) => JSON.parse(source(name).replace(/\/\*[\s\S]*?\*\//g, ''));
function contactHarness(search, valid = true) {
  const events = {};
  const windowEvents = {};
  const topic = { options: ['general', 'product', 'order', 'disclosure'].map(value => ({ value })), value: 'general' };
  const context = { value: '' };
  const button = { disabled: false, textContent: 'Send', dataset: { sending: 'Sending…' } };
  const status = { textContent: '', dataset: { slow: 'Check your connection' } };
  let timer;
  const form = {
    dataset: {}, attrs: {}, checkValidity: () => valid,
    querySelector: selector => ({ '#ContactForm-topic': topic, '#ContactForm-product': context, '[type="submit"]': button, '#ContactForm-progress': status })[selector],
    addEventListener: (name, fn) => events[name] = fn,
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
  };
  runInNewContext(source('assets/sericia-contact.js'), {
    document: { getElementById: () => form },
    window: { location: { search }, addEventListener: (name, fn) => windowEvents[name] = fn },
    URLSearchParams, setTimeout: fn => { timer = fn; return 1; }, clearTimeout: () => {},
  });
  return { topic, context, button, status, form, submit: (event = {}) => events.submit(event), restore: () => windowEvents.pageshow(), timeout: () => timer() };
}
test('disclosure deep link selects the dedicated request topic', () => {
  assert.equal(contactHarness('?topic=disclosure').topic.value, 'disclosure');
});
test('untrusted query values cannot create new form options or HTML', () => {
  assert.equal(contactHarness('?topic=%3Cscript%3E').topic.value, 'general');
});
test('invalid forms remain editable without a false sending state', () => {
  const h = contactHarness('', false); h.submit();
  assert.equal(h.button.disabled, false); assert.equal(h.status.textContent, '');
});
test('valid native submission reports progress and rejects duplicate submission', () => {
  const h = contactHarness(''); h.submit(); let prevented = false;
  h.submit({ preventDefault: () => prevented = true });
  assert.equal(prevented, true); assert.equal(h.form.attrs['aria-busy'], 'true');
  assert.equal(h.status.textContent, 'Sending…');
});
test('back navigation and timeout both restore an editable form', () => {
  const h = contactHarness(''); h.submit(); h.restore();
  assert.equal(h.button.disabled, false); assert.equal(h.button.textContent, 'Send');
  h.submit(); h.timeout();
  assert.equal(h.button.disabled, false); assert.equal(h.status.textContent, 'Check your connection');
});
test('predictive search keyboard navigation tolerates zero suggestions', () => {
  let Search;
  runInNewContext(source('assets/predictive-search.js'), {
    SearchForm: class {}, customElements: { define: (_, cls) => { Search = cls; } },
  });
  const instance = Object.create(Search.prototype);
  Object.assign(instance, { getAttribute: () => true, querySelector: () => null, querySelectorAll: () => [], statusElement: { textContent: '' } });
  assert.doesNotThrow(() => instance.switchOption('down'));
});
test('all service translation keys resolve for every bundled locale', () => {
  const expected = Object.keys(json('locales/en.default.json').sericia).sort();
  for (const name of readdirSync(resolve(theme, 'locales')).filter(name => name.endsWith('.json') && !name.includes('.schema.'))) {
    assert.deepEqual(Object.keys(json(`locales/${name}`).sericia).sort(), expected, name);
  }
});
test('service page and footer route to the existing native contact resource', () => {
  assert.deepEqual(json('templates/page.contact.json').order, ['services', 'form']);
  assert.equal(json('sections/footer-group.json').order[0], 'services');
  const services = source('sections/sericia-client-services.liquid');
  for (const id of ['about', 'faq', 'delivery', 'returns', 'legal']) assert.ok(services.includes(`id="${id}"`));
  assert.ok(services.includes('?topic=disclosure#ContactForm'));
  assert.ok(source('sections/contact-form.liquid').includes("form 'contact'"));
});
test('custom service components never render merchant private contact fields', () => {
  for (const path of ['sections/sericia-client-services.liquid', 'sections/sericia-service-footer.liquid']) {
    assert.doesNotMatch(source(path), /shop\.(address|phone|owner)|customer\.(address|phone)/);
  }
  assert.doesNotMatch(source('sections/contact-form.liquid'), /type="tel"/);
});
test('preview and indexing gates stay enabled until real launch evidence exists', () => {
  const settings = json('config/settings_data.json').current;
  const defaults = Object.fromEntries(json('config/settings_schema.json').flatMap(group => group.settings ?? []).filter(item => item.id).map(item => [item.id, item.default]));
  assert.equal(settings.sericia_preview_mode ?? defaults.sericia_preview_mode, true);
  assert.equal(settings.sericia_search_indexing_ready ?? defaults.sericia_search_indexing_ready, false);
});
test('failed predictive search presents a readable fallback and removes loading', async () => {
  let Search;
  let visibleNotice;
  let logged = false;
  runInNewContext(source('assets/predictive-search.js'), {
    SearchForm: class {}, customElements: { define: (_, cls) => { Search = cls; } },
    routes: { predictive_search_url: '/search/suggest' },
    fetch: async () => { throw new Error('offline'); },
    console: { error: () => { logged = true; } },
    window: { sericiaStrings: { searchError: 'Press Enter to search the full store.' } },
    document: { createElement: () => ({ setAttribute() {} }) },
  });
  const instance = Object.create(Search.prototype);
  Object.assign(instance, {
    attrs: { loading: true }, searchTerm: 'cup', cachedResults: {}, abortController: { signal: {} },
    setLiveRegionLoadingState() {}, dispatchSearchUpdateEvent: () => null,
    predictiveSearchResults: { replaceChildren: notice => { visibleNotice = notice; } },
    removeAttribute(name) { delete this.attrs[name]; }, setAttribute(name, value) { this.attrs[name] = value; },
    open() { this.opened = true; }, setLiveRegionText(text) { this.announcement = text; },
  });
  instance.getSearchResults('cup');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(logged, true);
  assert.equal(visibleNotice.textContent, 'Press Enter to search the full store.');
  assert.equal(instance.attrs.loading, undefined);
  assert.equal(instance.opened, true);
});

test('product enquiries carry bounded plain text without HTML insertion', () => {
  const h = contactHarness('?topic=product&product=%3Cscript%3Ebad%3C%2Fscript%3E');
  assert.equal(h.context.value, '<script>bad</script>');
  assert.equal(contactHarness('?product=' + 'a'.repeat(200)).context.value.length, 180);
});
