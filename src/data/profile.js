// Single edit point for your identity. Everything here is a placeholder —
// replace the strings before you ship. Nothing in this file is fabricated
// biography; it's a fill-in-the-blank template rendered as terminal output.
export const profile = {
  handle: 'guest', // shown as `guest@terminal:~$` in the nav prompt
  hostname: 'terminal',
  name: 'Your Name',
  role: 'software engineer',
  location: '<city, country>',
  bioLines: [
    '一名還在寫這份自我介紹的工程師。',
    '喜歡 <你的興趣>、<你在用的技術>,目前正在 <正在做的事>。',
  ],
  skills: ['vue', 'javascript', 'node', 'css', '<add your own>'],
  now: '<現在在忙的一件事>',
  links: [
    { label: 'github', href: 'https://github.com/your-handle' },
    { label: 'email', href: 'mailto:you@example.com' },
  ],
}
