# Admin Scripts

One-shot TypeScript scripts for **initial app setup** and system administration. Run against the live iCure database using a global admin account.

## How to Run

From the **project root**:
```bash
npx ts-node -P tsconfig.scripts.json src/scripts/<scriptName>.ts
```

## Credentials Setup (before running any script)

Script constants are read from `src/scripts/utils.ts`. Fill in the empty strings before running, revert after.

**Before running a script:**
1. Open `src/scripts/utils.ts`
2. Fill in `ADMIN_SOLUTIONS_EMAIL` and `ADMIN_SOLUTIONS_AUTH_TOKEN` (get from iCure Cockpit dashboard)
3. Fill in `ICURE_NIGHTLY_URL` (SDK target URL), `ICURE_API_URL` (REST API URL), and `DATABASE_ID`

**After running:** revert `src/scripts/utils.ts` to avoid committing credentials.

## Initialization Order

Must be done **in this order** for a new environment.

**Option A — All-in-one** (recommended):
1. `initProject.ts` — creates AdminRoot + SiteRoot + first Site in one run (set `adminRootEmail`, `siteRootEmail`, `siteEmail`)
2. **Key init**: log in to the app with the site email to initialize encryption keys, then log out
3. `addAdministrator.ts` — creates first admin user (set `adminName`, `adminFirstName`, `adminLastName`, `adminRoot_ID`, `adminEmail`, `JWT_TOKEN`)

**Option B — Step by step:**
1. `addAdminRoot.ts` — creates the `ADMIN_ROOT` HCP + user (set `adminRootEmail`)
2. `addSiteRoot.ts` — creates the `SITE_ROOT` HCP + user (set `siteRootEmail`, `adminRoot_ID`)
3. `addSite.ts` — creates one `SITE` HCP per physical location (repeat per site; set `siteName`, `siteRoot_ID`, `siteEmail`)
4. **Key init**: log in to the app with each site's email to initialize encryption keys, then log out
5. `addAdministrator.ts` — creates first admin user (set `adminName`, `adminFirstName`, `adminLastName`, `adminRoot_ID`, `adminEmail`, `JWT_TOKEN`)

## Scripts Reference

| Script | Purpose | Variables to set in script |
|--------|---------|---------------------------|
| `initProject.ts` | All-in-one: create AdminRoot + SiteRoot + first Site | `adminRootEmail`, `siteRootEmail`, `siteEmail` |
| `addAdminRoot.ts` | Create ADMIN_ROOT HCP + user | `adminRootEmail` |
| `addSiteRoot.ts` | Create SITE_ROOT HCP + user | `siteRootEmail`, `adminRoot_ID` |
| `addSite.ts` | Create a SITE HCP + user | `siteName`, `siteRoot_ID`, `siteEmail` |
| `addAdministrator.ts` | Create an Administrator user (sets all 3 roles) | `adminName`, `adminFirstName`, `adminLastName`, `adminRoot_ID`, `adminEmail`, `JWT_TOKEN` |
| `addEmailProcess.ts` | Register an email template on MSG Gateway | See script — uses curl-style API call |
| `getAdminRoot.ts` | Print adminRoot ID and details | — |
| `getSiteRoot.ts` | Print siteRoot ID and details | — |
| `removeAdminRoot.ts` | Delete adminRoot | Confirm the ID first with getAdminRoot |
| `removeSite.ts` | Delete a Site | `siteNameToDelete` |
| `removeSiteRoot.ts` | Delete siteRoot | Confirm the ID first with getSiteRoot |

## Key Concepts

**adminRoot** (`ADMIN_ROOT` tag): Top-level HCP. All CalendarItems and Patients are shared with it, giving Administrators full visibility.

**siteRoot** (`SITE_ROOT` tag): Second-level HCP. Sites are children of siteRoot; Patients are shared with it, giving CITY_WORKERs visibility.

**Site** (`SITE` tag): Physical location (e.g., city hall). Parent = siteRoot. Each site needs its own email and key initialization step.

**Administrator**: Created with all 3 roles (`ADMINISTRATOR`, `HEAD_OF_SERVICE`, `CITY_WORKER`). `parentId = adminRoot_ID`. After creation, the admin can create more users via the app UI.

## addAdministrator: JWT Token

The JWT needed for `addAdministrator.ts` is a **global admin JWT** (not a regular user token). Get it by making an authenticated request in iCure Cockpit and copying the `Authorization: Bearer` header value.

## Permissions & Roles API

Custom roles: `ADMINISTRATOR`, `HEAD_OF_SERVICE`, `CITY_WORKER`. All endpoints require a global admin JWT.

```
POST   https://api.icure.cloud/rest/v2/aa/icure/permissions               # List all possible permissions
POST   https://api.icure.cloud/rest/v2/role/{roleName}                   # Create role (body: ["PermissionName", ...])
GET    https://api.icure.cloud/rest/v2/role/{roleID}                     # Get role
GET    https://api.icure.cloud/rest/v2/role/inGroup/{groupId}            # List roles in group (including builtins)
PUT    https://api.icure.cloud/rest/v2/role/{roleID}                     # Update role permissions (body: ["PermissionName", ...])
DELETE https://api.icure.cloud/rest/v2/role/{roleID}                     # Delete role
POST   https://api.icure.cloud/rest/v2/user/{userId}/inGroup/{groupId}/roles/set  # Set user roles (body: { "ids": [...] })
```

## Email Process Registration

Email templates are registered via MSG Gateway REST API. The `addEmailProcess.ts` script wraps this, but you can also use curl directly.

**Available template variables:**
`firstName`, `lastName`, `group`, `from`, `mobilePhone`, `email`, `validationCode`, `hcpId`, `url`, `date`, `time`, `location`, `service`, `procedure`, `procedureDetails`

**Create an email process:**
```bash
curl -X POST \
  'https://msg-gw.icure.cloud/{SPEC_ID}/process/template/{EMAIL_TEMPLATE}/{DATABASE_ID}?language={language}' \
  -H 'Authorization: Bearer $JWT' \
  -H 'Content-Type: application/json' \
  -d '{ "subject": "Your subject {{ firstName }}", "body": "Body {{ lastName }}" }'
```
Returns a `processId` to store and use in the frontend for sending emails.

**Send an email** (JWT can be any authenticated account, not necessarily global admin):
```bash
curl -X POST \
  'https://msg-gw.icure.cloud/{SPEC_ID}/email/to/{receiver}' \
  -H 'Authorization: Bearer $JWT' \
  -H 'Content-Type: application/json' \
  -d '{ "from": "no-reply@mouscron.be", "processId": "{processId}", "variables": { "lastName": "Doe" } }'
```
