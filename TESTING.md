# DevRel Insights - Tester Guide

This guide covers test accounts, role-based access, and testing workflows for QA and beta testers.

## Test Accounts

All test accounts use verification code **`999999`**. No email is sent — just enter the code directly.

| Email | Code | Role | Access Level |
|-------|------|------|--------------|
| `admin@devrelinsights.app` | `999999` | Admin | Full access, user management, operations |
| `manager@devrelinsights.app` | `999999` | Manager | View all, manage events, PMO import |
| `advocate@devrelinsights.app` | `999999` | Advocate | Create/edit own insights |
| `viewer@devrelinsights.app` | `999999` | Viewer | **Read-only** access |
| `demo@devrelinsights.app` | `999999` | Advocate | App Store demo account |

## Role Permissions Matrix

| Feature | Admin | Manager | Advocate | Viewer |
|---------|:-----:|:-------:|:--------:|:------:|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| View Insights | ✅ | ✅ | ✅ | ✅ |
| View Events | ✅ | ✅ | ✅ | ✅ |
| View Leaderboard | ✅ | ✅ | ✅ | ✅ |
| View World Map | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ | ✅ |
| Create Insights | ✅ | ✅ | ✅ | ❌ |
| Edit Own Insights | ✅ | ✅ | ✅ | ❌ |
| Edit All Insights | ✅ | ✅ | ❌ | ❌ |
| Delete Insights | ✅ | ✅ | ✅* | ❌ |
| Manage Events | ✅ | ✅ | ❌ | ❌ |
| PMO Import | ✅ | ✅ | ❌ | ❌ |
| Report Bugs | ✅ | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ | ✅ |
| Operations | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |

*Advocates can only delete their own insights

## Testing Workflows

### 1. Test Viewer Read-Only Access

1. Log in as `viewer@devrelinsights.app` / `999999`
2. Verify you can:
   - View Dashboard, Insights, Events, Leaderboard, World Map
   - Search insights
   - View insight details (click any insight row)
3. Verify you **cannot**:
   - See "Add Insight" button
   - See Edit/Delete icons on insights
   - Access PMO Import (not in nav)
   - Access Operations (not in nav)
   - Access User Management (not in nav)
4. Try accessing `/admin/users` directly — should redirect to Dashboard

### 2. Test Advocate Permissions

1. Log in as `advocate@devrelinsights.app` / `999999`
2. Verify you can:
   - Create new insights
   - Edit insights you created
   - Delete insights you created
3. Verify you **cannot**:
   - Access PMO Import
   - Access Operations
   - Access User Management

### 3. Test Manager Permissions

1. Log in as `manager@devrelinsights.app` / `999999`
2. Verify you can:
   - Create/edit/delete any insight
   - Access PMO Import
   - Manage events
3. Verify you **cannot**:
   - Access Operations
   - Access User Management

### 4. Test Admin Permissions

1. Log in as `admin@devrelinsights.app` / `999999`
2. Verify you can:
   - Access everything managers can
   - Access Operations page
   - Access User Management
   - Change user roles

### 5. Test Role Escalation

1. Log in as `admin@devrelinsights.app`
2. Go to User Management (`/admin/users`)
3. Find a viewer user and change their role to Advocate
4. Log out and log in as that user
5. Verify they now have Advocate permissions

## Mobile App Testing

The same test accounts work in the iOS mobile app:

1. Open DevRel Insights app
2. Enter test email (e.g., `viewer@devrelinsights.app`)
3. Enter code `999999`
4. Verify role-appropriate access

### Mobile-Specific Tests

- **Viewer**: Should be able to browse insights but not create new ones
- **Advocate**: Should see the "+" button to capture insights
- **Manager/Admin**: Full mobile functionality

## API Testing

For direct API testing, the middleware enforces role checks:

```bash
# This should fail for viewers (403 Forbidden)
curl -X POST https://devrel-insights-admin.vercel.app/api/insights \
  -H "Cookie: di-session=<viewer-token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test insight", "type": "Feedback"}'

# Expected response:
# {"error": "You have view-only access. Contact an administrator to request edit permissions."}
```

## Reporting Issues

Use the bug report button (bottom-right corner) to report any issues. Include:
- Which test account you used
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

---

## Dev Bypass (MongoDB Employees Only)

For `@mongodb.com` emails, code `123456` works as a universal bypass during development. This uses your actual role from the database (or defaults to advocate if you're not in the system).

**Note:** This bypass should be disabled in production.
