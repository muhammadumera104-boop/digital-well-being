// Run with: node --test test/core.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8');
const coreSrc = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const sandbox = { module: { exports: {} } };
vm.runInNewContext(coreSrc, sandbox);
const MB = sandbox.module.exports;
const content = JSON.parse(html.match(/<script type="application\/json" id="content">([\s\S]*?)<\/script>/)[1]);

const MIN = 60000;
const T0 = new Date(2026, 10, 9, 10, 0, 0).getTime();

test('timer: warning fires once, at 5 minutes remaining', () => {
  const st = MB.defaultState();
  const s = MB.startSession(st, { type: 'gaming', minutes: 30 }, T0);
  assert.equal(MB.shouldWarn(s, T0 + 24 * MIN), false);
  assert.equal(MB.shouldWarn(s, T0 + 25 * MIN), true);
  s.warned = true;
  assert.equal(MB.shouldWarn(s, T0 + 26 * MIN), false, 'no second warning');
  assert.equal(MB.isOver(s, T0 + 29 * MIN), false);
  assert.equal(MB.isOver(s, T0 + 30 * MIN), true);
});

test('timer: sessions of 5 minutes or less get no warning', () => {
  const st = MB.defaultState();
  const s = MB.startSession(st, { type: 'chats', minutes: 5 }, T0);
  assert.equal(MB.shouldWarn(s, T0 + 1 * MIN), false);
});

test('timer: only one 5-minute extension, starting from now when time is up', () => {
  const st = MB.defaultState();
  MB.startSession(st, { type: 'watching', minutes: 20 }, T0);
  const late = T0 + 22 * MIN;
  assert.equal(MB.extendActive(st, late), true);
  assert.equal(MB.remainingMs(st.active, late), 5 * MIN);
  assert.equal(MB.extendActive(st, late + MIN), false, 'second extension refused');
  assert.equal(MB.remainingMs(st.active, late + MIN), 4 * MIN);
});

test('timer: cannot start a second session while one is running; minutes are clamped', () => {
  const st = MB.defaultState();
  assert.ok(MB.startSession(st, { type: 'study', minutes: 9999 }, T0));
  assert.equal(st.active.plannedMin, 240);
  assert.equal(MB.startSession(st, { type: 'gaming', minutes: 30 }, T0), null);
  assert.equal(MB.clampMin('abc', 25), 25);
  assert.equal(MB.clampMin(0), 1);
});

test('study first, then play: window unlocks only after the study session ends', () => {
  const st = MB.defaultState();
  const study = MB.startSession(st, { type: 'study', minutes: 45, pair: { type: 'gaming', minutes: 30 } }, T0);
  assert.equal(MB.pairStatus(st).unlocked, false);
  assert.equal(MB.startPaired(st, T0 + MIN), null, 'locked while studying');
  MB.endActive(st, T0 + 46 * MIN, 'good');
  assert.equal(MB.pairStatus(st).unlocked, true);
  const play = MB.startPaired(st, T0 + 47 * MIN);
  assert.equal(play.type, 'gaming');
  assert.equal(play.plannedMin, 30);
  assert.equal(st.pair, null, 'pairing is used up');
  assert.equal(study.id, st.sessions[0].id);
});

test('study first, then play: pairing is ignored for non-study sessions', () => {
  const st = MB.defaultState();
  MB.startSession(st, { type: 'gaming', minutes: 30, pair: { type: 'watching', minutes: 20 } }, T0);
  assert.equal(st.pair, null);
});

test('heavy-days nudge: two heavy check-ins within three days', () => {
  const today = '2026-11-09';
  const heavyMood = { date: '2026-11-08', mood: 2, sleepHours: 7 };
  const heavySleep = { date: '2026-11-09', mood: 3, sleepHours: 4 };
  const fine = { date: '2026-11-09', mood: 4, sleepHours: 7 };
  assert.equal(MB.heavyNudge([heavyMood, heavySleep], today), true);
  assert.equal(MB.heavyNudge([heavyMood, fine], today), false, 'only one heavy day');
  assert.equal(MB.heavyNudge([{ date: '2026-11-05', mood: 1, sleepHours: 3 }, heavySleep], today), false, 'too old');
  assert.equal(MB.heavyNudge([{ date: '2026-11-09', mood: 1, sleepHours: 3 }], today), false, 'one day cannot count twice');
});

test('quiet hours handle overnight ranges', () => {
  const at = (h, m) => new Date(2026, 10, 9, h, m);
  assert.equal(MB.quietNow('22:30', '07:00', at(23, 0)), true);
  assert.equal(MB.quietNow('22:30', '07:00', at(6, 59)), true);
  assert.equal(MB.quietNow('22:30', '07:00', at(12, 0)), false);
  assert.equal(MB.quietNow('13:00', '15:00', at(14, 0)), true);
});

test('weekly summary: totals by type, group, averages; empty week reports no data', () => {
  const st = MB.defaultState();
  assert.equal(MB.weekSummary(st, '2026-11-09').hasData, false);
  MB.startSession(st, { type: 'study', minutes: 60 }, T0); MB.endActive(st, T0 + 60 * MIN);
  MB.startSession(st, { type: 'gaming', minutes: 30 }, T0 + 2 * 60 * MIN); MB.endActive(st, T0 + 3 * 60 * MIN);
  st.checkins.push({ date: '2026-11-09', mood: 4, sleepHours: 7 }, { date: '2026-11-08', mood: 2, sleepHours: 5 });
  const w = MB.weekSummary(st, '2026-11-09');
  assert.equal(w.hasData, true);
  assert.equal(w.byType.study, 60);
  assert.equal(w.groups.fun, 30);
  assert.equal(w.avgSleep, 6);
  assert.equal(w.avgMood, 3);
  assert.equal(w.days.length, 7);
  assert.equal(MB.sampleWeek('2026-11-09').sample, true);
});

test('delete all: storage key is removed and state is fresh', () => {
  const store = new Map([['mindbridge.v1', '{"secret":1}']]);
  const storage = { removeItem: k => store.delete(k) };
  const st = MB.deleteAll(storage, 'mindbridge.v1');
  assert.equal(store.has('mindbridge.v1'), false);
  assert.equal(st.profile.consentAt, null);
  assert.equal(st.checkins.length, 0);
  assert.doesNotThrow(() => MB.deleteAll({ removeItem() { throw new Error('blocked'); } }, 'x'));
});

test('migrate: versions stored data, drops unknown keys and bad rows', () => {
  const m = MB.migrate({ version: 0, evil: 'x', profile: { focusAreas: ['sleep', 'nope', 'control', 'mood', 'help', 'connection'], consentAt: 5 }, checkins: [{ date: '2026-11-09', mood: 3 }, { bad: true }], settings: { theme: 'neon' } });
  assert.equal(m.version, MB.SCHEMA_VERSION);
  assert.equal('evil' in m, false);
  assert.deepEqual(m.profile.focusAreas, ['sleep', 'control', 'mood', 'help']);
  assert.equal(m.checkins.length, 1);
  assert.equal(m.settings.theme, 'auto');
  assert.deepEqual(MB.migrate(null), MB.defaultState());
});

test('safety: only 1122, 15 and 1799 are hard-coded; Umang is unverified, not invented', () => {
  const nums = Object.entries(content.helplines).map(([k, v]) => [k, v.number]);
  assert.deepEqual(Object.fromEntries(nums), { umang: '', nccia: '1799', rescue: '1122', police: '15' });
  assert.equal(content.helplines.umang.verify, true);
});

test('safety: no network calls, no third-party hosts, no cookies, no analytics', () => {
  const code = html.replace(/<script type="application\/json"[\s\S]*?<\/script>/, '');
  for (const bad of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'document.cookie', 'gtag', 'analytics']) {
    assert.equal(code.includes(bad), false, 'found ' + bad);
  }
  const external = [...code.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(external, [], 'static markup must not load external resources');
  assert.equal(/<script[^>]+src=/.test(code), false, 'no external scripts');
});

test('safety: no shaming mechanics (streaks, scores, leaderboards)', () => {
  const lower = html.toLowerCase();
  for (const bad of ['streak', 'leaderboard', 'you failed', 'bad habit']) assert.equal(lower.includes(bad), false, bad);
});
