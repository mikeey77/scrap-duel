// Installable app: registers the service worker and offers an "Install app" button in the menu.
const Install = {
  prompt: null,
  installed: false,
  init() {
    if (typeof navigator === 'undefined') return;
    try {
      if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost'))
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    } catch (e) {}
    this.installed =
      matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
    addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.prompt = e;
      this.render();
    });
    addEventListener('appinstalled', () => {
      this.installed = true;
      this.prompt = null;
      this.render();
      window.__toast && window.__toast('Scrap Duel is installed. Find it on your home screen.', true);
    });
  },
  /** iPhone/iPad Safari has no install prompt: we explain the Share → Add to Home Screen route instead. */
  ios() {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !this.installed;
  },
  available() {
    return !this.installed && (!!this.prompt || this.ios());
  },
  render() {
    const b = $('#mInstall');
    if (b) b.hidden = !this.available();
  },
  async run() {
    sfx('ui');
    if (this.prompt) {
      this.prompt.prompt();
      try {
        await this.prompt.userChoice;
      } catch (e) {}
      this.prompt = null;
      this.render();
    } else if (this.ios()) window.__toast('On iPhone: tap the Share button, then "Add to Home Screen".', true);
  }
};
