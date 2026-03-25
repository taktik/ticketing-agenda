# Ticketing Agenda - City Worker Frontend

Admin-facing React app for city workers to manage appointments, services, procedures, and scheduling rules for the Mouscron city ticketing system.

## Tech Stack
- **React 18** with TypeScript 4.9
- **Redux Toolkit** (RTK Query for API, redux-persist for credentials)
- **React Router v7** (BrowserRouter)
- **Ant Design 5** (UI components, theming via `style/antd/antdTheme.ts`)
- **FullCalendar 6** (agenda/calendar view)
- **dayjs** + **date-fns** (date manipulation and formatting)
- **RRule** (RFC 5545 recurrence rules for scheduling)
- **iCure Cardinal SDK** 2.1.0 (encryption, auth, data access)
- **Azure MSAL** (Azure AD authentication for workers)
- **Friendly Challenge** (CAPTCHA for email auth)
- **i18next** (FR, NL, EN, DE)
- **Create React App** (react-scripts 5.0.1)
- **LESS** for stylesheets (compiled via less-watch-compiler)

## Project Structure
```
src/
  App.tsx                    # Root: contexts (Hierarchy, Permission, CitizenReservation), i18n, theme
  index.tsx                  # Redux Provider + PersistGate + MSAL Provider
  navigation/Router.tsx      # Routes: / (login), /dashboard (main)
  pages/
    DashboardPage/           # Main view: site selector, calendar, service/procedure filters, modals
    authentication/
      LoginPage/             # Auth method selector (email or Azure)
      EmailLogin/            # Email OTP flow
      AzureLogin/            # Azure AD redirect flow
    NotFoundPage/
  components/
    Calendar/
      index.tsx              # FullCalendar wrapper with grid/list views
      CreateCitizenAppointment/  # Worker books on behalf of citizen (multi-step wizard)
        appointmentSteps/    # StepProcedureSelector, StepTimeSlotSelector, StepPersonalInfo, StepReview, StepResult
        CitizenReservationTypes.ts  # ProcedureGroup, SiteVariant, ProcedureVariant, AppointmentDraft, PersonalInfo
      CreateTimeOff/         # Create time-off blocks
      EventDetails/ModalEvent.tsx  # View/edit/delete appointment details
      EventContent/          # GridEventContent, ListEventContent (calendar event rendering)
      AppointmentSelector/   # Appointment action selector
      TimeSlotPickerUI/      # Time slot picker component
    ModalCitizenSearch/      # Search citizens by name, view their details + appointment history
    ModalScheduling/
      index.tsx              # List scheduling rules per service
      ModalRules/index.tsx   # Create/edit rules: RRule, hours, availabilities, procedures, public flag
    ModalHierarchySettings/
      index.tsx              # Tabs for site/service management
      SiteSetting/           # Create/edit sites
      ServiceSetting/        # Create/edit services + their procedures
    ModalGeneralSettings/
      Settings/AccountSetting/   # User account info
      Settings/ManageUsers/      # Team management (invite, assign roles/services)
    SiteSelector/            # Site dropdown
    ItemSelector/            # Generic list selector (services, procedures)
    AssignmentSelector/      # Assign workers to services
    EditableServiceTitle/    # Inline editable service name
    common/
      Header/                # App header with language selector + settings buttons
      helpers.ts             # Date/time conversions, property accessors, tag helpers
      LanguageSelector/      # Language switcher
      CustomModal/           # Styled modal wrapper
      ModalConfirmAction/    # Confirmation dialog
      DurationInput/         # Duration picker (hours + minutes)
      EditableSiteInfo/      # Inline editable site info
      SpinLoader/
      StyledButton/
    authentication/
      LoginForm/             # Email + OTP form
      KerberusWidget/        # CAPTCHA widget
  core/
    api/
      agendaApi.ts           # Services CRUD (Agenda objects)
      calendarItemApi.ts     # Appointments CRUD (CalendarItem objects)
      calendarItemTypeApi.ts # Procedures CRUD (CalendarItemType objects)
      healthcarePartyApi.ts  # Sites (HealthcareParty with tag SITE)
      userApi.ts             # User CRUD + queries
      patientApi.ts          # Patient/citizen CRUD
      dataOwnerApi.ts        # Current data owner + role detection
      roleApi.ts             # Role definitions (ADMINISTRATOR, HEAD_OF_SERVICE, CITY_WORKER)
      anonymousApi.ts        # Public availability/procedure data (no auth)
      emailApi.ts            # Send emails via MSG Gateway
      appointmentPollingApi.ts # Poll backend for QBetter propagation status
      recoveryApi.ts         # Key recovery
      groupApi.ts            # Group operations
      fetchType.ts           # Enums: HcpTag, EntityType, PropertyId, CalendarItemTag, ConfirmationCodeSpecialValue; request/response types
      utils.ts               # guard(), retry logic, baseQueryWithRetry
    services/
      auth.api.ts            # Auth slice: Azure login, email OTP, crypto strategies, SDK init
    contexts/
      HierarchyContext.tsx   # Loads and organizes: siteRoot, adminRoot, allSites, agendasBySiteId, calendarItemTypesByAgendaId
      PermissionContext.tsx   # User role, assignments (ASSIGNMENT|{agendaId} properties), access control
      CitizenReservationContext.tsx  # Appointment booking state (drafts, timeslot, availabilities)
    hooks.ts                 # useAppSelector, useAppDispatch, useDebounce
    hooks/useCalendarItemDetails.ts  # Hook for appointment detail fetching
    hooks/useNotificationHelper.ts   # Hook for success/error notification display
    store.ts                 # Redux store config
    reducer.ts               # Root reducer (persists only app state)
    app/index.ts             # Persisted app state (savedCredentials)
  config/
    config.service.ts        # Default config values
    config.azure.ts          # MSAL configuration (Azure AD)
  constants/index.ts         # All env-based constants, email template IDs, date rules
  helpers/
    transformProcedures.ts   # Transform raw procedures into ProcedureGroup hierarchy
    types.ts                 # PatientsTagsEnum, utility enums
    dateFormaters.ts         # Date utilities
    fileToBase64.ts
  style/                     # LESS stylesheets + Ant Design theme
  i18n.ts                    # i18next config
  scripts/                   # Admin scripts: addAdminRoot, addSiteRoot, removeSiteRoot
```

## Routes
| Path | Component | Layout | Auth Required |
|------|-----------|--------|---------------|
| `/` | LoginPage | LoginLayout | No |
| `/dashboard` | DashboardPage | AuthenticatedLayout | Yes |

## Domain Hierarchy
```
Site (HealthcareParty, tag=SITE)
  └── Service (Agenda, author=site.id)
       └── Procedure (CalendarItemType, agendaId=agenda.id)
```
- **HierarchyContext** loads this tree on login and provides it app-wide
- Agendas are linked to sites via the `author` field
- CalendarItemTypes are linked to agendas via the `agendaId` field

## Roles & Permissions
Three roles stored as CodeStub tags on HealthcareParty:
- **ADMINISTRATOR**: Full access. Can manage hierarchy, scheduling, users, and all appointments
- **HEAD_OF_SERVICE**: Can manage scheduling and appointments for assigned services
- **CITY_WORKER**: Can view and manage appointments only for assigned services

Role IDs come from env vars (`REACT_APP_ROLE_ADMINISTRATOR`, etc.) and map to iCure Role objects.

Worker-to-service assignments stored as properties on HealthcareParty: `ASSIGNMENT|{agendaId} = agendaId`

## Authentication
Two auth methods:

**Email OTP** (`EmailLogin`):
1. Worker enters email → Friendly CAPTCHA resolved
2. `startEmailAuthentication(captchaToken)` → Cardinal SDK sends OTP email
3. Worker enters code → `completeEmailAuthentication()` → SDK session created
4. Token persisted via redux-persist

**Azure AD** (`AzureLogin`):
1. Worker clicks "Sign in with Microsoft"
2. MSAL handles redirect to Azure AD
3. `azureLogin(account)` → Cardinal SDK authenticates with Azure idToken
4. Same token persistence

**Crypto (PetraCareCryptoStrategies)**:
- On new key creation: generates recovery key, stores it on ticketing-service backend (`POST /api/keys`)
- On key recovery: fetches recovery key from backend (`GET /api/keys/{userId}`)

## Scheduling Rules
Rules stored as `ResourceGroupAllocationSchedule` inside `TimeTable` objects per service.

Each schedule contains `EmbeddedTimeTableItem[]`:
```
EmbeddedTimeTableItem {
  rrule: string              # RFC 5545 recurrence (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
  hours: EmbeddedTimeTableHour[]  # Time slots [{startHour: 090000, endHour: 120000}]
  calendarItemTypeIds: string[]   # Which procedures are available
  availabilities: number     # Parallel appointment slots
  public: boolean            # Bookable by citizens on ticketing-portal
  timeConstraints: number[]  # [notBeforeMinutes, notAfterMinutes] booking window
}
```

**Defaults**: `NOT_BEFORE_IN_MINUTES = 10080` (7 days), `NOT_AFTER_IN_MINUTES = 1440` (1 day)

The `ModalRules` component provides UI for building these rules with frequency, interval, day-of-week, hours table, procedure selection, and public toggle.

## Dashboard Layout
Left panel:
- Site selector (dropdown)
- Hierarchy settings button (admin only)
- Scheduling settings button (admin only)
- Mini Ant Design calendar (date navigation)
- Service filter list
- Procedure filter list

Right panel:
- Calendar toolbar: nav buttons, "Create Appointment", citizen search button, view/time-range selectors
- FullCalendar view (grid or list, day or week range)
- Appointments displayed as calendar events
- Click event → ModalEvent (view/edit/delete details)

## Citizen Search
Accessible via search button in the calendar toolbar. Opens `ModalCitizenSearch` (two-panel modal):
- **Left panel**: Search input (debounced 400ms, min 2 chars) → patient list with name, email, DOB
- **Right panel**: Selected citizen's details (name, email, phone, DOB) + appointment history sorted by date desc
- **Search filter**: `PatientFilters.byFuzzyNameForDataOwner` — fuzzy matches on `firstName`/`lastName` only (not email/phone)
- **Appointments filter**: `CalendarItemFilters.byPatientsStartTimeForSelf` — requires `secretForeignKeys` on CalendarItems (set via `SecretIdUseOption.Use` at creation)

## Appointment Flow (Worker creates for citizen)
The `CreateCitizenAppointment` wizard mirrors the citizen portal flow:
1. Select procedure(s) → drafts with ProcedureGroup/SiteVariant/ProcedureVariant
2. Select time slot → anonymous API availability check
3. Enter citizen personal info (name, email, phone, DOB, language)
4. Review and confirm → creates CalendarItem(s) in iCure
5. Polls propagation status → sends confirmation email

## Property Convention
Entity metadata stored as `DecryptedPropertyStub[]` with ID pattern:
- `{ENTITY_TYPE}|TRANSLATION|{LANG}` - translated names (e.g., `CALENDARITEMTYPE|TRANSLATION|FR`)
- `SERVICE|PARENTID` - links agenda to site
- `ASSIGNMENT|{agendaId}` - worker-to-service assignment
- `APPOINTMENT|LAST_AUTHOR` - last modifier ID
- `APPOINTMENT|QBETTER_SERVICE_ID` / `QBETTER_LOCATION_ID` / `QBETTER_APPOINTMENT_ID` / `QBETTER_CODE`

Use the typed enums in `fetchType.ts` instead of magic strings:
- `PropertyId.SERVICE_PARENTID`, `PropertyId.SITE_QBETTER_LOCATION_ID`, etc.
- `CalendarItemTag.APPOINTMENT_QBETTER_CODE`, `CalendarItemTag.APPOINTMENT_LAST_AUTHOR`, etc.
- `EntityType.SERVICE`, `EntityType.CALENDARITEMTYPE`, `EntityType.SITE`

## Date/Time Format
iCure uses numeric `YYYYMMDDHHmmss` (Long). Hours use `HHmmss` (e.g., `090000` = 09:00:00).
Helper functions in `components/common/helpers.ts`:
- `dayjsToYYYYMMDDHHmmss()`, `fuzzyDateIntToDayjs()`, `hhmmssToDayjs()`, `hhmmssToHHmm()`, `dayjsToHhmmss()`, `dayjsToFuzzyDateInt()`

## Environment Config
Runtime config injected via `window.config` in a `<script>` block in `public/index.html` (overridden at container startup by `json-env`):
- `REACT_APP_ICURE_API_URL` - iCure API
- `REACT_APP_BACKEND_API` - ticketing-service backend (https://mouscron.taktik.dev/backend)
- `REACT_APP_MSG_GW_URL` - iCure MSG Gateway
- `REACT_APP_DATABASE_ID` - iCure database ID
- `REACT_APP_EXTERNAL_SERVICES_SPEC_ID` - iCure external services spec group ID
- `REACT_APP_PARENT_ORGANISATION_ID` - Parent organisation ID
- `REACT_APP_AZURE_CLIENT_ID` / `REACT_APP_AZURE_TENANT_ID` - Azure AD config
- `REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY` - CAPTCHA site key
- `REACT_APP_ROLE_ADMINISTRATOR` / `REACT_APP_ROLE_HEAD_OF_SERVICE` / `REACT_APP_ROLE_CITY_WORKER` - Role IDs
- `REACT_APP_EMAIL_*` - Email template process IDs per language (auth code admin FR/NL + citizen FR/NL, confirmation FR/NL × with/without procedure × with/without CC, cancellation FR/NL, modification FR/NL × with/without procedure × with/without CC)
- `REACT_APP_MANAGE_APPOINTMENT_ROUTE` / `REACT_APP_NEW_APPOINTMENT_ROUTE` - Portal URLs for email links
- `REACT_APP_APPLICATION_ID`, `REACT_APP_PRIMARY_COLOR`, `REACT_APP_LOGO_URL` - White-label config

## Related Projects
- **ticketing-portal** (ticketing-mouscron/ticketing-portal): Citizen-facing frontend for booking and managing appointments
- **ticketing-service** (ticketing-mouscron/ticketing-service): Kotlin/Spring Boot backend bridging iCure ↔ QBetter, key storage, propagation tracking

## Build & Run
```bash
yarn install
yarn start       # Runs React + LESS watcher concurrently
yarn build       # Production build to /build
```
