# Builder Insights — Mobile App Tester Guide

Quick reference for testers to log in and verify key features of the mobile app.

---

## Getting the App

| Platform | How to Install |
|----------|----------------|
| **iOS** | [TestFlight](https://testflight.apple.com/join/rAqHXs1Y) — install via the TestFlight link on your iPhone |
| **Android** | APK from GitHub Actions artifacts or local build (see README) |
| **Development** | `npx expo start` and scan QR code with Expo Go |

---

## Login

### Credentials

| Account | Email | Code |
|---------|-------|------|
| **Demo** | `demo@builderinsights.app` | `999999` |

### Login Flow

1. Open the app.
2. Enter your email: `demo@builderinsights.app`
3. Tap **Send Code**.
4. Enter the 6-digit code: `999999`
5. You should land on the Home screen.

**Note:** If magic link fails (e.g. network issues), the app may show "Dev mode: Use code 123456" — try that code instead.

**Allowed domains:** Only `@mongodb.com` or `@builderinsights.app` emails are accepted.

---

## Things to Check

### 1. Login & Onboarding

- [ ] Login screen appears on first launch
- [ ] Email validation rejects invalid domains
- [ ] Code entry works (6 digits, auto-advances)
- [ ] Successful login navigates to Home
- [ ] First-time users see onboarding carousel; can dismiss and proceed

### 2. Home Screen

- [ ] Stats cards show: Events attended, Insights captured, Pending sync
- [ ] Quick Capture button is visible and tappable
- [ ] Review Drafts section appears if you have voice drafts
- [ ] Bottom nav tabs: Home, Capture, Events, Dashboard, Profile

### 3. Quick Capture (Text)

- [ ] Tap Quick Capture or go to Capture tab
- [ ] Type an insight (e.g. "Developer asked about Vector Search indexing")
- [ ] Select Insight Type (Pain Point, Feature Request, Praise, Question)
- [ ] Select Product Area(s)
- [ ] Set Sentiment and Priority
- [ ] Optionally attach to an Event
- [ ] Save — insight appears in feed and syncs when online

### 4. Voice Capture

- [ ] Tap microphone icon in capture form
- [ ] Grant mic permission if prompted
- [ ] Record a short insight (e.g. "Developer from fintech struggling with Atlas setup")
- [ ] Transcription appears (requires network)
- [ ] Classify the insight and save
- [ ] Drafts appear under Review Drafts on Home if not yet classified

### 5. Events

- [ ] Events tab shows list of events
- [ ] Tap an event to view details and sessions
- [ ] Can create new event (if allowed)
- [ ] Checking into an event sets context for new captures

### 6. Dashboard

- [ ] Dashboard shows analytics (insights by type, product area, sentiment)
- [ ] Charts render correctly
- [ ] Data reflects your captured insights

### 7. Profile & Settings

- [ ] Profile shows user name and email
- [ ] Settings accessible from Profile
- [ ] Help / Capture Guide opens
- [ ] Security settings (e.g. app lock) work if enabled
- [ ] Logout works and returns to login screen

### 8. Offline Support

- [ ] Enable airplane mode
- [ ] Capture an insight — it saves locally
- [ ] Pending count increments (badge on Profile tab)
- [ ] Disable airplane mode — pending items sync automatically
- [ ] Pending count returns to 0 after sync

### 9. Insight Detail & Edit

- [ ] Tap an insight to view full details
- [ ] Edit insight — change type, product area, text, etc.
- [ ] Changes persist and sync

### 10. Pending Recordings

- [ ] If you have unclassified voice drafts, access Pending Recordings (from Profile or Home)
- [ ] Classify and save each draft
- [ ] Drafts move to insights list after saving

### 11. Bug Reporting (Mobile App)

- [ ] Shake your phone to open the bug report screen
- [ ] Enter a title and description of the issue
- [ ] Add steps to reproduce (optional but helpful)
- [ ] Attach a screenshot if available
- [ ] Submit — report syncs to the admin portal

---

## Bug Reporting via the Interface

Both the mobile app and the admin portal let you submit bug reports directly. Reports appear in the admin **Bug Reports** page (`/bugs`) for triage.

### Mobile App

| How to open | Shake your phone |
|-------------|------------------|
| **Fields** | Title, description, steps to reproduce, optional screenshot |
| **Context** | Device info and app version are sent automatically |
| **Sync** | Reports sync when online; offline reports queue and sync later |

### Admin Portal (Web)

| How to open | Tap the bug icon (floating button, bottom-right corner) on any page |
|-------------|---------------------------------------------------------------------|
| **Fields** | Bug Title (required), Description (required), Steps to Reproduce (optional), Priority (Low / Medium / High / Critical) |
| **Context** | Browser user agent is sent automatically |
| **Access** | Available to all roles (Viewer, Advocate, Manager, Admin) |

**Tips for good bug reports:**
- Be specific: "Login fails with code 999999" vs "Login broken"
- Include steps: "1. Open app 2. Enter demo@builderinsights.app 3. Enter 999999 4. See error"
- Note your environment: device, OS version, app version
- Screenshots help, especially for UI issues

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App won't log in | Use `demo@builderinsights.app` / `999999`. Check network. Force-quit and reopen. |
| Voice recording fails | Check mic permissions in device Settings. Ensure phone is not muted. Transcription needs network. |
| Insights not syncing | Check network. Pending count shows unsynced items. Refresh or wait for auto-sync. |
| App crashes on launch | Clear app data/cache, reinstall from TestFlight. |

---

## Quick Reference

| Resource | Value |
|----------|-------|
| **TestFlight (iOS)** | https://testflight.apple.com/join/rAqHXs1Y |
| **Demo Email** | demo@builderinsights.app |
| **Demo Code** | 999999 |
| **Bug report (mobile)** | Shake phone |
| **Bug report (admin)** | FAB button, bottom-right corner |

---

*Admin portal testing is covered separately. This guide focuses on the mobile app only.*
