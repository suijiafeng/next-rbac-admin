/** 图表只用一种墨色，明暗主题各取可读的一档。 */
export function readChartInk() {
  const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
  return {
    ink: dark ? '#e4e4e7' : '#18181b',
    grid: dark ? 'rgba(255,255,255,0.08)' : '#e4e4e7',
    muted: dark ? 'rgba(255,255,255,0.45)' : '#71717a',
    surface: dark ? '#27272a' : '#ffffff',
    text: dark ? 'rgba(255,255,255,0.92)' : '#18181b',
    ramp: dark
      ? ['#fafafa', '#d4d4d8', '#a1a1aa', '#71717a']
      : ['#18181b', '#52525b', '#a1a1aa', '#d4d4d8'],
  };
}
