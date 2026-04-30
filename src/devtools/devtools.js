/**
 * DevTools Extension Entry Point
 *
 * Registers the WSS Recorder panel in Chrome DevTools.
 */

chrome.devtools.panels.create(
  '行为录制回放',         // Panel title
  'src/icons/icon-16.png', // Panel icon
  'src/devtools/panel.html', // Panel page
  function(panel) {
    // Panel created callback
    console.log('[WSS Recorder] DevTools panel created');

    panel.onShown.addListener(function(panelWindow) {
      console.log('[WSS Recorder] Panel shown');
    });

    panel.onHidden.addListener(function() {
      console.log('[WSS Recorder] Panel hidden');
    });

    panel.onSearch.addListener(function(action, query) {
      console.log('[WSS Recorder] Search:', action, query);
    });
  }
);
