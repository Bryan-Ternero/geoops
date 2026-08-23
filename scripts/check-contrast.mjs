const hex = (h) => {
  const n = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const [r, g, b] = hex(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const mix = (fg, bg, pct) => {
  const f = hex(fg).map((v) => v * 255);
  const b = hex(bg).map((v) => v * 255);
  return (
    '#' +
    f
      .map((v, i) => Math.round(v * pct + b[i] * (1 - pct)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
};

const T = { bg0: '#141619', bg1: '#1b1e22', bg2: '#24282d' };
const pairs = [
  ['ink / bg0', '#f3f2ee', T.bg0, 4.5],
  ['ink / bg1', '#f3f2ee', T.bg1, 4.5],
  ['ink / bg2', '#f3f2ee', T.bg2, 4.5],
  ['ink-muted / bg1', '#d6d5ce', T.bg1, 4.5],
  ['muted / bg0', '#b4b7af', T.bg0, 4.5],
  ['muted / bg1', '#b4b7af', T.bg1, 4.5],
  ['muted / bg2', '#b4b7af', T.bg2, 4.5],
  ['ink-low (rotulos) / bg0', '#848881', T.bg0, 4.5],
  ['ink-low (rotulos) / bg1', '#848881', T.bg1, 4.5],
  ['copper texto / bg0', '#d98e55', T.bg0, 4.5],
  ['copper texto / bg1', '#d98e55', T.bg1, 4.5],
  ['copper texto / bg2', '#d98e55', T.bg2, 4.5],
  ['copper-ink / botón cobre', '#211507', '#d98e55', 4.5],
  ['ok / bg1', '#63bb8b', T.bg1, 4.5],
  ['aviso / bg1', '#dba84a', T.bg1, 4.5],
  ['riesgo / bg1', '#ea6e34', T.bg1, 4.5],
  ['bloqueo / bg1', '#ea6666', T.bg1, 4.5],
  ['taller / bg1', '#5faeb2', T.bg1, 4.5],
  ['neutro / bg1', '#9aa09b', T.bg1, 4.5],
  ['ok / chip dim', '#63bb8b', mix('#63bb8b', T.bg1, 0.13), 4.5],
  ['aviso / chip dim', '#dba84a', mix('#dba84a', T.bg1, 0.13), 4.5],
  ['riesgo / chip dim', '#ea6e34', mix('#ea6e34', T.bg1, 0.09), 4.5],
  ['bloqueo / chip dim', '#ea6666', mix('#ea6666', T.bg1, 0.09), 4.5],
  ['taller / chip dim', '#5faeb2', mix('#5faeb2', T.bg1, 0.13), 4.5],
  ['neutro / chip dim', '#9aa09b', mix('#9aa09b', T.bg1, 0.13), 4.5],
  ['tick gauge (cobre) vs bg1 (UI)', '#d98e55', T.bg1, 3],
  ['focus cobre vs bg0 (UI)', '#d98e55', T.bg0, 3],
];

let fail = 0;
for (const [name, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)} : 1  (min ${min})  ${name}  ${fg} sobre ${bg}`,
  );
}
console.log(fail === 0 ? '\nTODO OK — AA cumplido en todos los pares.' : `\n${fail} PAR(ES) FALLAN`);
process.exit(fail === 0 ? 0 : 1);
