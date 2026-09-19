// Warm downloads only: never execute a hidden garden or start a second audio scene.
(() => {
 if (window.top !== window || document.documentElement.dataset.gardenPreload) return;
 const resources = [
  "garden.html",
  "garden-data.js",
  "garden.css?v=world1",
  "navigation.css?v=1",
  "clay-interaction.css?v=world2",
  "garden-world.css?v=6",
  "garden.js?v=world1",
  "garden-world.js?v=3",
  "navigator-voice.js",
  "clay-grab.js?v=attached4",
  "clay-ocean.js",
  "clay-tools.js",
  "clay-contacts.js",
  "octopus-control.js",
  "site-navigation.js?v=flow2",
  "site-navigation.css?v=3",
  "music.js?v=claypods1",
  "https://unpkg.com/three@0.184.0/build/three.webgpu.js",
  "https://unpkg.com/three@0.184.0/build/three.tsl.js",
  "https://unpkg.com/three@0.184.0/examples/jsm/controls/OrbitControls.js",
  "clay-agent.js?swim=2",
  "fidelity.js?swim=2",
  "clay-texture.js",
  "research-store.js",
  "water-audio.js?v=2",
  "https://unpkg.com/three@0.184.0/build/three.core.js"
];
 let running;
 function warm() {
  if (running) return running;
  document.documentElement.dataset.gardenPreload = 'loading';
  running = (async () => {
   let cursor = 0, failed = false;
   // Keep the first scene responsive; at most two low-priority downloads at once.
   async function worker() {
    while (cursor < resources.length) {
     const url = resources[cursor++];
     try {
      const response = await fetch(url, {priority:'low', credentials:'same-origin', cache:'default', signal:AbortSignal.timeout(20000)});
      if (!response.ok) { failed = true; continue; }
      await response.arrayBuffer();
     } catch { failed = true; }
    }
   }
   await Promise.all([worker(), worker()]);
   document.documentElement.dataset.gardenPreload = failed ? 'partial' : 'ready';
  })();
  return running;
 }
 // Start alongside the landing scene, without waiting for its images or first render.
 const constrained = navigator.connection?.saveData || /(^|-)2g$/.test(navigator.connection?.effectiveType || '');
 if (!constrained) warm();
 // On a data-saving connection, wait for explicit interest in the Garden button.
 document.querySelectorAll('a[href="garden.html"]').forEach(link => {
  link.addEventListener('pointerenter', warm, {once:true});
  link.addEventListener('focus', warm, {once:true});
 });
})();
