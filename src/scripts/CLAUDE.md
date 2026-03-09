# Admin Scripts

One-shot TypeScript scripts for **initial app setup** and system administration. Run against the live iCure database using a global admin account.

## How to Run

From the **project root**:
```bash
npx ts-node -P tsconfig.scripts.json src/scripts/<scriptName>.ts
```

## Credentials Setup (before running any script)

Script constants are read from `src/constants/index.ts`. Two of them (`ADMIN_SOLUTIONS_EMAIL`, `ADMIN_SOLUTIONS_AUTH_TOKEN`) are hardcoded empty strings that **must be filled in manually** before running. Other constants (`DATABASE_ID`, `ICURE_NIGHTLY_URL`) use `window.config.*` which doesn't exist in Node.js — those need to be temporarily hardcoded too.

**Before running a script:**
1. Open `src/constants/index.ts`
2. Fill in `ADMIN_SOLUTIONS_EMAIL` and `ADMIN_SOLUTIONS_AUTH_TOKEN` (get from iCure Cockpit dashboard)
3. Temporarily replace `window.config.REACT_APP_DATABASE_ID` with the actual database ID string, and same for `ICURE_NIGHTLY_URL` if needed

**After running:** revert `src/constants/index.ts` to avoid committing credentials.

The `ADMIN_SOLUTIONS_AUTH_TOKEN` in `.env` as `REACT_APP_ADMIN_SOLUTION_AUTH_TOKEN` is for the browser app, not the scripts.

## Initialization Order

Must be done **in this order** for a new environment:

1. `addAdminRoot.ts` — creates the `ADMIN_ROOT` HCP + user (set `adminRootEmail`)
2. `addSiteRoot.ts` — creates the `SITE_ROOT` HCP + user (set `siteRootEmail`, `adminRoot_ID`)
3. `addSite.ts` — creates one `SITE` HCP per physical location (repeat per site; set `siteName`, `siteRoot_ID`, `siteEmail`)
4. **Key init**: log in to the app with each site's email to initialize encryption keys, then log out
5. `addAdministrator.ts` — creates first admin user (set `adminName`, `adminFirstName`, `adminLastName`, `adminRoot_ID`, `adminEmail`, `JWT_TOKEN`)

## Scripts Reference

| Script | Purpose | Variables to set in script |
|--------|---------|---------------------------|
| `addAdminRoot.ts` | Create ADMIN_ROOT HCP + user | `adminRootEmail` |
| `addSiteRoot.ts` | Create SITE_ROOT HCP + user | `siteRootEmail`, `adminRoot_ID` |
| `addSite.ts` | Create a SITE HCP + user | `siteName`, `siteRoot_ID`, `siteEmail` |
| `addAdministrator.ts` | Create an Administrator user (sets all 3 roles) | `adminName`, `adminFirstName`, `adminLastName`, `adminRoot_ID`, `adminEmail`, `JWT_TOKEN` |
| `addEmailProcess.ts` | Register an email template on MSG Gateway | See script — uses curl-style API call |
| `getAdminRoot.ts` | Print adminRoot ID and details | — |
| `getSiteRoot.ts` | Print siteRoot ID and details | — |
| `removeAdminRoot.ts` | Delete adminRoot | Confirm the ID first with getAdminRoot |
| `removeSite.ts` | Delete a Site | `siteId` |
| `removeSiteRoot.ts` | Delete siteRoot | Confirm the ID first with getSiteRoot |

## Key Concepts

**adminRoot** (`ADMIN_ROOT` tag): Top-level HCP. All CalendarItems and Patients are shared with it, giving Administrators full visibility.

**siteRoot** (`SITE_ROOT` tag): Second-level HCP. Sites are children of siteRoot; Patients are shared with it, giving CITY_WORKERs visibility.

**Site** (`SITE` tag): Physical location (e.g., city hall). Parent = siteRoot. Each site needs its own email and key initialization step.

**Administrator**: Created with all 3 roles (`ADMINISTRATOR`, `HEAD_OF_SERVICE`, `CITY_WORKER`). `parentId = adminRoot_ID`. After creation, the admin can create more users via the app UI.

## addAdministrator: JWT Token

The JWT needed for `addAdministrator.ts` is a **global admin JWT** (not a regular user token). Get it by making an authenticated request in iCure Cockpit and copying the `Authorization: Bearer` header value.

## Email Process Registration

Email templates are created via MSG Gateway REST API (not via a TypeScript script). See `src/scripts/README.md` for the full curl commands and variable list.
