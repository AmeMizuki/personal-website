# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## ASCII background

`src/components/AsciiBackground.vue` renders an abstract flowing ASCII field in a single `<pre>` at up to 20 FPS. Hover locally brightens the characters; clicking launches a circular ripple that fades over 1.6 seconds. Each click replaces the previous ripple. Foreground controls remain clickable. `SiteBackground.vue` retains the persistent Astro mount and pauses animation and pointer effects for reduced motion. No WebGL dependency is required.

For the deterministic browser check, run `npm run dev`, open the site, and execute in its browser console:

```js
await (await import('/scripts/check-ascii-background.mjs')).checkAsciiBackground()
```

The check covers the density ramp, frame cap, hover, click ripples and expiry, emulated tab visibility, pause/resume, deterministic frames, resize, and unmount cleanup.
