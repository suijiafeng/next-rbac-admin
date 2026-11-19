/** 图表序列色回到原来的品牌蓝和分类色，坐标轴仍用中性灰。 */
export function readChartInk() {
  const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
  return {
    ink: '#1677ff',
    rank: '#69b1ff',
    grid: dark ? 'rgba(128,128,128,0.2)' : 'rgba(128,128,128,0.15)',
    muted: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    surface: dark ? '#1f2128' : '#ffffff',
    text: dark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)',
    ramp: ['#ff7875', '#ffc53d', '#95de64'],
  };
}
