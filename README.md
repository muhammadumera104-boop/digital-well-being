# MindBridge: working prototype

A private phone companion for male university students (18-24). It helps them use their phones on purpose: decide before opening the phone, get a gentle warning before time is up, wind down at night, look back privately, and always know where a real person is.

Built from the evidence in the Design Thinking midterm report (8 interviews, 6 ranked problems, 15 ideas scored, 10 kept).

## Run it

No install, no build, no server code. It is one HTML file.

```bash
cd MindBridge_App
python -m http.server 8123
```

Open http://localhost:8123 (use a phone on the same Wi-Fi for the best view: `http://<your-pc-ip>:8123`). Opening `index.html` directly also works, but the install/offline features need `http://` or `https://`.

Run the tests:

```bash
node --test test/core.test.mjs
```

Deploy: upload the folder to Netlify, GitHub Pages or any static host. Nothing else is needed.

## What is inside

| Tab | What it does | Idea (report) |
|---|---|---|
| Today | Daily plan from chosen focus areas, **Pause and choose**, daily check-in, gentle nudge after two heavy days in three | I1, I9 |
| Session | Typed timers, 5-minute warning, one 5-minute extension, **study first then play**, reframe card after social sessions | I2, I3, I4, I7 |
| Unwind | Evening checklist (editable), quiet hours, who can still call, Do Not Disturb / Focus steps, offline swaps, plan it with a friend | I5, I8 |
| My week | Planned time by type, study vs entertainment, sleep and mood charts, example data until you have your own, JSON export | I6 |
| Get help | Counselor and trusted person (yours), helplines, harassment steps | I10 |
| Settings | Focus areas, reminders, quiet hours, theme, export, **delete all** | Privacy rule |

## Safety by design

- **No account, no tracking.** No login, name, email or phone number. No cookies, no analytics, no external scripts, fonts or images. A unit test fails if any network call or third-party link is added.
- **Data stays on the device.** Everything lives in the browser's `localStorage`. There is no backend that could receive it.
- **Consent first.** Nothing is saved until the student accepts the privacy note on the welcome screen.
- **Delete all.** One button in Settings, with a confirmation, removes everything.
- **No monitoring.** No dashboard for teachers, wardens or parents. The app never reads messages, notifications, photos, contacts or location.
- **No shaming.** No streaks, scores, leaderboards or red warnings. One optional 5-minute extension, no penalty. Warnings are amber, copy is kind.
- **A real person is always one tap away.** Get help is a main tab. MindBridge is not a counselor and has no chatbot.
- **Not built, on purpose:** app blocker, friends leaderboard, parent/warden dashboard, AI counselor, notification reading, real screen-time tracking.

## Honest limits

A website cannot read real screen time or silence other apps. Sessions are planned and logged by the student, and quiet hours explain how to set Do Not Disturb / Focus on the phone. The 5-minute warning needs the page open (or installed as an app); phone browsers may pause a closed tab.

## Before you submit or launch

1. **Umang helpline number.** It is left empty on purpose (students see "Number not added yet") (`content` block in `index.html`, `helplines.umang.number`, `verify: true`). Verify the real number and type it in. Only 1122, 15 and 1799 are hard-coded.
2. Check the campus counselor details with your department; students add their own on-device.

## Editing content

All shared text (reasons and default minutes, reframe cards, offline ideas, wind-down list, helplines, harassment steps) is in the `<script id="content" type="application/json">` block near the top of `index.html`. Edit the JSON; no code changes needed. Interface labels are in the `T` object in the script, ready for an Urdu translation.

## Files

- `index.html`: the whole app (styles, content, logic)
- `manifest.webmanifest`, `sw.js`, `icon*.png/svg`: install as an app and work offline
- `test/core.test.mjs`: 14 unit tests (timers, warning, single extension, study-then-play unlock, heavy-days rule, quiet hours, weekly summary, delete-all, migration, privacy checks)
