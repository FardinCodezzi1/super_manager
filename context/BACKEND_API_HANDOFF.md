# BACKEND API HANDOFF & SPECIFICATION
## Mess Meal Manager & Tour Expense Platform

> **Target Consumer**: Vite + React Mobile Application (packaged into Android APK via `html2app.dev`, running inside a local WebView at `http://127.0.0.1:<random-port>`).  
> **Backend Architecture**: NestJS (Express runtime), Prisma ORM v6, Neon Serverless PostgreSQL (Singapore `ap-southeast-1`), JWT Authentication.  
> **Document Purpose**: Exhaustive file-by-file specification covering all routes, database models, business logic, financial math, role rules, CORS configurations, and exact JSON request/response contracts. **Zero placeholders.**

---

# Table of Contents
1. [Production Base URL, Environment & CORS Setup](#1-production-base-url-environment--cors-setup)
2. [Complete Feature & Module Inventory](#2-complete-feature--module-inventory)
3. [Authentication, JWT & Role Permissions](#3-authentication-jwt--role-permissions)
4. [Full Database & Prisma Schema & Enums](#4-full-database--prisma-schema--enums)
5. [100% Complete API Endpoint Reference](#5-100-complete-api-endpoint-reference)
   - [5.1 Root & API Documentation](#51-root--api-documentation)
   - [5.2 Authentication & User Profile Module (`/api/auth`)](#52-authentication--user-profile-module-apiauth)
   - [5.3 Mess & Roommate Management Module (`/api/mess`)](#53-mess--roommate-management-module-apimess)
   - [5.4 Manager Rotation Queue & Anti-Cheat Audit Logs (`/api/mess/manager/*`)](#54-manager-rotation-queue--anti-cheat-audit-logs-apimessmanager)
   - [5.5 Bazar Expense Tracker & Approval Module (`/api/bazar`)](#55-bazar-expense-tracker--approval-module-apibazar)
   - [5.6 Daily Meals & Leave Requests Module (`/api/meals`)](#56-daily-meals--leave-requests-module-apimeals)
   - [5.7 Member Deposits Module (`/api/deposits`)](#57-member-deposits-module-apideposits)
   - [5.8 Monthly Financial Summary & Balances Module (`/api/summary`)](#58-monthly-financial-summary--balances-module-apisummary)
   - [5.9 Tour Expense Management Module (`/api/tours`)](#59-tour-expense-management-module-apitours)
   - [5.10 Personal Notes & Checklists Module (`/api/notes`)](#510-personal-notes--checklists-module-apinotes)
   - [5.11 Super Admin Platform Oversight Module (`/api/admin`)](#511-super-admin-platform-oversight-module-apiadmin)
   - [5.12 App Configuration Singleton Module (`/api/config`)](#512-app-configuration-singleton-module-apiconfig)
6. [Frontend State Management & Storage Guide for Mobile WebViews](#6-frontend-state-management--storage-guide-for-mobile-webviews)

---

# 1. Production Base URL, Environment & CORS Setup

### Base URLs
* **Production Live Base URL**: `https://meal-manager-api.onrender.com`
* **Production API Base URL**: `https://meal-manager-api.onrender.com/api`
* **Local Development Base URL**: `http://localhost:3000`
* **Local Development API Base URL**: `http://localhost:3000/api`
* **Interactive Swagger UI**: `https://meal-manager-api.onrender.com/api/docs`
* **Raw OpenAPI 3.0.3 Spec**: `https://meal-manager-api.onrender.com/api/openapi.json`

### CORS Configuration
Configured globally in `src/main.ts`:
```typescript
app.enableCors({
  origin: '*',
  methods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

#### Mobile WebView Compatibility (`html2app.dev`)
* When running as an Android APK via `html2app.dev`, the WebView serves local files via an internal webserver running at `http://127.0.0.1:<random-port>` or `http://localhost:<random-port>`.
* Because `origin: '*'` is configured on the backend, **all cross-origin HTTP and preflight requests from `http://127.0.0.1:*` or any port are fully permitted without CORS errors**.
* Preflight `OPTIONS` requests return `HTTP 204 No Content` with appropriate CORS headers.

### Error Response Protocol
All exceptions thrown anywhere in NestJS are intercepted by `src/common/filters/http-exception.filter.ts` and returned in a unified format:
```json
{
  "error": "Descriptive human-readable error string",
  "details": null
}
```
* Status codes follow standard HTTP semantics:
  * `400 Bad Request`: Missing fields, validation failures, business logic guardrail violations.
  * `401 Unauthorized`: Missing, invalid, or expired JWT token; bad credentials.
  * `403 Forbidden`: Role permission denied (e.g. member attempting manager operation).
  * `404 Not Found`: Entity not found.
  * `500 Internal Server Error`: Unhandled server exception.

---

# 2. Complete Feature & Module Inventory

### 2.1 Authentication & Profile Management
* **Credentials**: User registers with `name`, `email`, `password`, and optional `phone`. Passwords hashed with `bcryptjs` (salt rounds: 10).
* **Single Active Mess Constraint**: Enforced at the database level (`@@unique([userId, status])` where status = `ACTIVE`). A user can belong to only **one active mess** concurrently. They must leave their current mess before creating or joining another.
* **Safe Account Deletion Guardrails**:
  1. If an active Manager tries to delete their account while other members remain in the mess: **Rejected (400)**. The Manager must transfer the role or delete the mess first.
  2. If an active Member tries to delete their account: **Rejected (400)**. The Member must leave the mess first.
  3. If a user has historical records (bazar entries, meals, deposits) from past messes: The account is **not hard-deleted**. Instead, personal notes are wiped and user details are anonymized (`name: "Former Member"`, `email: "deleted_<id>_<hex>@anonymized.local"`, `passwordHash: "DELETED_ACCOUNT"`). This **preserves roommates' historical balance sheets and calculations** without breaking foreign keys.
  4. If a user has zero mess history: Hard deleted from the database.

### 2.2 Mess & Roommate System
* **Creation**: Manager creates mess by name. A unique 5-character alphanumeric invite code (`MESS-XXXXX`) is generated. The creator becomes `MANAGER` with `ACTIVE` status. An initial `MessMonth` cycle (`YYYY-MM`) is created.
* **Join Workflow**: Roommates submit the invite code. If they previously belonged to that mess, their historical record is reactivated (`status: ACTIVE`, `leftAt: null`, `role: MEMBER`); otherwise a new `MessMember` record is created.
* **Leave Workflow**: Members can leave at any time (`status: LEFT`, `leftAt: now`). Their past records remain intact for accounting.
* **Closure**: Only the active Manager can close/delete a mess. Requires manager password confirmation. If other active members are in the mess, `force: true` must be supplied. Deleting cascades and releases all members.

### 2.3 Automated Manager Role Shifting / Rotation Queue
* **Rotation Schedule**: Configured on the mess (`rotationType: "MONTHLY"`).
* **Sequence Queue (`ManagerSequence`)**:
  * An ordered queue of active members (`orderIndex: 0, 1, 2...`).
  * If uninitialized, the system auto-initializes the current Manager at index 0 and remaining members by `joinedAt`.
  * The Manager can reorder the sequence anytime (`PUT /api/mess/manager/sequence`).
* **Automatic Monthly Rotation Trigger**:
  * When a new monthly cycle is opened (`POST /api/mess/months`), if `rotationType === 'MONTHLY'` and active members > 1:
  * The system computes `nextIndex = (currentIndex + 1) % sequence.length`.
  * The current manager is demoted to `MEMBER`.
  * The next member in line is promoted to `MANAGER`.
  * `mess.managerId` is updated.
  * An audit log is written (`action: 'AUTOMATIC_MONTHLY_ROTATION'`).
* **Manual Override Transfer**:
  * Emergency role handover (`POST /api/mess/manager/transfer`) with required `reason`.
* **Anti-Cheat Audit Log (`ManagerAuditLog`)**:
  * Immutable historical ledger storing every manager handover, rotation, and queue reorder with initiator user ID, previous manager, new manager, and reason.

### 2.4 Bazar Expense System (2 Modes & Approval Gating)
* **Mode 1 (QUICK)**: Lump-sum expenditure (`amount`, `category`, `date`, `notes`).
* **Mode 2 (CHECKLIST)**: Detailed itemized list stored as JSON in `items`:
  ```json
  [
    { "name": "Potatoes", "qty": "3 kg", "price": 150, "bought": true },
    { "name": "Chicken", "qty": "1.5 kg", "price": 450, "bought": true }
  ]
  ```
* **Approval State Machine**:
  * Manager's own bazar entries are automatically `APPROVED`.
  * Member submissions enter as `PENDING`.
  * Manager approves (`APPROVED`) or rejects (`REJECTED`) via `PATCH /api/bazar/:id/approve`.
  * **Critical Financial Rule**: Unapproved `PENDING` and `REJECTED` entries are **strictly excluded** from monthly meal rate and member cost calculations.
  * Members can edit or delete their own entries while still `PENDING` or `DRAFT`. Once `APPROVED`, only the Manager can edit or delete.

### 2.5 Daily Meals Tracking & Automated Leave Handling
* **Meal Logging**: Lunch and dinner recorded as decimal numbers (e.g. `1.0`, `0.5`, `2.0`).
* **Permissions**: Regular members can only update their own meals for their active member ID. The Manager can update meals for any member.
* **Leave Requests (`LeaveRequest`)**:
  * Member submits a date range: `startDate` to `endDate` with `reason`.
  * Status starts at `PENDING`.
  * Manager approves or rejects via `PATCH /api/meals/leave-requests/:id`.
  * **Automated Auto-Zeroing Hook**: Upon approval (`status === 'APPROVED'`), the backend automatically iterates through every calendar date between `startDate` and `endDate` (inclusive), locates or creates the `DailyMeal` records, and updates them to:
    ```json
    { "lunch": 0, "dinner": 0, "isLeave": true }
    ```

### 2.6 Deposits & Financial Reconciliation Math
* **Deposit Recording**: Only the Manager can record deposits (`POST /api/deposits`).
* **Summary Math (`GET /api/summary?monthKey=YYYY-MM`)**:
  1. `totalApprovedBazar = sum(bazarEntries where status == 'APPROVED')`
  2. `totalDeposits = sum(deposits.amount)`
  3. `totalMeals = sum(dailyMeals.lunch + dailyMeals.dinner)`
  4. `mealRate = totalMeals > 0 ? Number((totalApprovedBazar / totalMeals).toFixed(2)) : 0`
  5. For each member (both active and left):
     * `memberTotalMeals = sum(member's daily meals lunch + dinner)`
     * `memberTotalDeposit = sum(member's deposits)`
     * `mealCost = Number((memberTotalMeals * mealRate).toFixed(2))`
     * `balance = Number((memberTotalDeposit - mealCost).toFixed(2))`
     * **Balance Interpretation**:
       * `balance > 0`: **Surplus / Refund** (Mess owes money back to member).
       * `balance < 0`: **Due / Owing** (Member owes money to the Mess).

### 2.7 Tour & Group Trip Expense Management System
* **Decoupled System**: Independent from mess memberships; users can participate in multiple tours.
* **Tour Lifecycle**: `PLANNING` ➔ `ACTIVE` ➔ `COMPLETED` ➔ `CANCELLED`.
* **Roles**:
  * `LEAD`: Tour creator or appointed lead. Full administrative control.
  * `ACCOUNTANT`: Appointed by the Lead. Can log deposits, record expenses, and add participants.
  * `MEMBER`: Regular tour participant.
* **Offline Participant Support**:
  * Friends without an account can be added by the Lead/Accountant as a participant (`userId: null`). They are assigned equal cost shares and can have cash deposits/expenses logged under their name.
* **Tour Financial Reconciliation Math (`GET /api/tours/:id`)**:
  1. `totalDeposits = sum(tourDeposits.amount)`
  2. `totalExpenses = sum(tourExpenses.amount)`
  3. `balance = totalDeposits - totalExpenses` (Current trip treasury cash on hand)
  4. `budgetRemaining = tour.budget - totalExpenses`
  5. `activeMembersCount = tour.members.length`
  6. `perMemberShare = totalExpenses / activeMembersCount` (Equal split per person)
  7. For each participant:
     * `netBalance = totalDeposited - perMemberShare`
     * `netBalance > 0`: Participant is due a refund from the treasury.
     * `netBalance < 0`: Participant still owes money into the treasury.

### 2.8 Personal Notes & Checklists
* User-scoped notes with optional interactive checklist items: `[{ id: "1", text: "Buy shampoo", done: false }]`.
* 100% private to the user; inaccessible to mess managers or roommates.

### 2.9 Super Admin Oversight
* Granted if `user.isSuperAdmin === true` or email is `fardin1.codezzi@gmail.com`.
* Telemetry across all registered users, messes, tours, meals, and finances.
* Ability to reset forgotten passwords for any user (`PUT /api/admin/users/:id`) and delete invalid messes/tours.

---

# 3. Authentication, JWT & Role Permissions

### Headers Format
All authenticated requests must include the HTTP header:
```http
Authorization: Bearer <JWT_TOKEN>
```

### JWT Token Lifetime & Signing
* Signed with HS256 using `JWT_SECRET`.
* Default expiration: `30d` (30 days).
* No refresh token flow is used; tokens are long-lived (30 days).

### Decoded JWT Token Payload
```typescript
interface JwtPayload {
  userId: string;       // cuid of the user
  email: string;        // normalized lowercase email
  isSuperAdmin?: boolean;
  iat: number;          // timestamp in seconds
  exp: number;          // timestamp in seconds
}
```

### User Roles & Permission Matrices

#### 1. System Level
* `isSuperAdmin === true`: Bypasses tour membership restrictions; accesses `/api/admin/*`.

#### 2. Mess Level (`MessMember.role`)
| Action | `MANAGER` | `MEMBER` |
| :--- | :---: | :---: |
| View Mess info, members, months, summary | Yes | Yes |
| Record own meals | Yes | Yes |
| Record other members' meals | **Yes** | No (403) |
| Submit Bazar entry | Auto-approved | Enters as PENDING |
| Approve / Reject Bazar entries | **Yes** | No (403) |
| Record / Edit / Delete Member Deposits | **Yes** | No (403) |
| Submit Leave Request | Yes | Yes |
| Approve / Reject Leave Requests | **Yes** | No (403) |
| Reorder Rotation Queue / Transfer Manager Role | **Yes** | No (403) |
| Close / Delete Mess | **Yes** (password required) | No (403) |
| Export / Import Mess Data | **Yes** | No (403) |

#### 3. Tour Level (`TourMember.role`)
| Action | `LEAD` | `ACCOUNTANT` | `MEMBER` |
| :--- | :---: | :---: | :---: |
| View Tour Details, Expenses, Deposits | Yes | Yes | Yes |
| Record Deposits | Yes | Yes | No (403) |
| Record Expenses | Yes | Yes | No (403) |
| Add Offline Participant | Yes | Yes | No (403) |
| Promote / Demote Member Roles | **Yes** | No (403) | No (403) |
| Edit Tour Budget, Destination, Status | **Yes** | No (403) | No (403) |
| Delete Tour | **Yes** | No (403) | No (403) |

---

# 4. Full Database & Prisma Schema & Enums

Below is the complete, verbatim Prisma schema (`prisma/schema.prisma`):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id              String         @id @default(cuid())
  email           String         @unique
  name            String
  passwordHash    String
  phone           String?
  isSuperAdmin    Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  memberships     MessMember[]
  personalNotes   PersonalNote[]
  tourMemberships TourMember[]
}

model Mess {
  id               String            @id @default(cuid())
  name             String
  inviteCode       String            @unique
  managerId        String
  rotationType     String            @default("MONTHLY")
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  members          MessMember[]
  months           MessMonth[]
  managerSequences ManagerSequence[]
  auditLogs        ManagerAuditLog[]
}

model MessMember {
  id               String            @id @default(cuid())
  userId           String
  messId           String
  role             Role              @default(MEMBER)
  status           MembershipStatus  @default(ACTIVE)
  joinedAt         DateTime          @default(now())
  leftAt           DateTime?
  bazarEntries     BazarEntry[]
  dailyMeals       DailyMeal[]
  deposits         Deposit[]
  leaveRequests    LeaveRequest[]
  managerSequences ManagerSequence[]
  mess             Mess              @relation(fields: [messId], references: [id], onDelete: Cascade)
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, status])
}

model MessMonth {
  id           String       @id @default(cuid())
  messId       String
  monthKey     String
  status       String       @default("OPEN")
  createdAt    DateTime     @default(now())
  bazarEntries BazarEntry[]
  dailyMeals   DailyMeal[]
  deposits     Deposit[]
  mess         Mess         @relation(fields: [messId], references: [id], onDelete: Cascade)

  @@unique([messId, monthKey])
}

model BazarEntry {
  id          String         @id @default(cuid())
  messMonthId String
  memberId    String
  amount      Float
  category    String
  date        DateTime
  status      ApprovalStatus @default(APPROVED)
  mode        BazarMode      @default(QUICK)
  items       Json?
  notes       String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  member      MessMember     @relation(fields: [memberId], references: [id], onDelete: Cascade)
  messMonth   MessMonth      @relation(fields: [messMonthId], references: [id], onDelete: Cascade)
}

model Deposit {
  id          String     @id @default(cuid())
  messMonthId String
  memberId    String
  amount      Float
  date        DateTime
  notes       String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  member      MessMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  messMonth   MessMonth  @relation(fields: [messMonthId], references: [id], onDelete: Cascade)
}

model DailyMeal {
  id          String     @id @default(cuid())
  messMonthId String
  memberId    String
  date        DateTime
  lunch       Float      @default(1.0)
  dinner      Float      @default(1.0)
  isLeave     Boolean    @default(false)
  updatedAt   DateTime   @updatedAt
  member      MessMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  messMonth   MessMonth  @relation(fields: [messMonthId], references: [id], onDelete: Cascade)

  @@unique([memberId, date])
}

model LeaveRequest {
  id        String         @id @default(cuid())
  memberId  String
  startDate DateTime
  endDate   DateTime
  reason    String?
  status    ApprovalStatus @default(PENDING)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  member    MessMember     @relation(fields: [memberId], references: [id], onDelete: Cascade)
}

model PersonalNote {
  id          String   @id @default(cuid())
  userId      String
  title       String
  content     String
  isChecklist Boolean  @default(false)
  items       Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ManagerSequence {
  id         String     @id @default(cuid())
  messId     String
  memberId   String
  orderIndex Int
  updatedAt  DateTime   @updatedAt
  mess       Mess       @relation(fields: [messId], references: [id], onDelete: Cascade)
  member     MessMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([messId, memberId])
}

model ManagerAuditLog {
  id                String   @id @default(cuid())
  messId            String
  changedById       String
  action            String
  previousManagerId String?
  newManagerId      String?
  reason            String?
  createdAt         DateTime @default(now())
  mess              Mess     @relation(fields: [messId], references: [id], onDelete: Cascade)
}

model AppConfig {
  id               String   @id @default("global-config")
  appName          String   @default("Mess Meal Manager")
  appIconSvg       String?  @db.Text
  creatorName      String   @default("Fardin Abu Ubaid")
  creatorEmail     String   @default("fardin1.codezzi@gmail.com")
  creatorPortfolio String   @default("https://portfolio-fardin.vercel.app")
  creatorBio       String?  @default("Full-Stack Developer & Creator of Mess Meal Manager")
  broadcastNotice  String?
  noticeActive     Boolean  @default(false)
  updatedAt        DateTime @updatedAt
}

model Tour {
  id          String        @id @default(cuid())
  name        String
  description String?
  destination String?
  startDate   DateTime?
  endDate     DateTime?
  budget      Float         @default(0)
  status      TourStatus    @default(ACTIVE)
  inviteCode  String        @unique
  creatorId   String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  members     TourMember[]
  expenses    TourExpense[]
  deposits    TourDeposit[]
}

model TourMember {
  id       String        @id @default(cuid())
  tourId   String
  userId   String?
  name     String
  email    String?
  phone    String?
  role     TourRole      @default(MEMBER)
  joinedAt DateTime      @default(now())
  tour     Tour          @relation(fields: [tourId], references: [id], onDelete: Cascade)
  user     User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  expenses TourExpense[]
  deposits TourDeposit[]

  @@unique([tourId, userId])
}

model TourExpense {
  id        String      @id @default(cuid())
  tourId    String
  memberId  String?
  title     String
  amount    Float
  category  String      @default("General")
  date      DateTime    @default(now())
  notes     String?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  tour      Tour        @relation(fields: [tourId], references: [id], onDelete: Cascade)
  member    TourMember? @relation(fields: [memberId], references: [id], onDelete: SetNull)
}

model TourDeposit {
  id        String     @id @default(cuid())
  tourId    String
  memberId  String
  amount    Float
  date      DateTime   @default(now())
  notes     String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  tour      Tour       @relation(fields: [tourId], references: [id], onDelete: Cascade)
  member    TourMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
}

enum Role {
  MANAGER
  MEMBER
}

enum MembershipStatus {
  ACTIVE
  LEFT
  REMOVED
}

enum ApprovalStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
}

enum BazarMode {
  QUICK
  CHECKLIST
}

enum TourRole {
  LEAD
  ACCOUNTANT
  MEMBER
}

enum TourStatus {
  PLANNING
  ACTIVE
  COMPLETED
  CANCELLED
}
```

---

# 5. 100% Complete API Endpoint Reference

---

## 5.1 Root & API Documentation

### 5.1.1 Landing / Health Page
* **Method**: `GET`
* **Path**: `/`
* **Auth**: Public (No auth)
* **Response**: `200 OK` (`text/html; charset=utf-8`)

### 5.1.2 Raw OpenAPI Specification
* **Method**: `GET`
* **Path**: `/api/openapi.json`
* **Auth**: Public (No auth)
* **Response**: `200 OK` (`application/json`)
  * Full OpenAPI 3.0.3 specification JSON describing all endpoints.

### 5.1.3 Swagger UI Documentation
* **Method**: `GET`
* **Path**: `/api/docs`
* **Auth**: Public (No auth)
* **Response**: `200 OK` (`text/html; charset=utf-8`)

---

## 5.2 Authentication & User Profile Module (`/api/auth`)

### 5.2.1 Register New User
* **Method**: `POST`
* **Path**: `/api/auth/register`
* **Auth**: Public
* **Request Body**:
  ```json
  {
    "name": "Fardin Abu Ubaid",
    "email": "user@example.com",
    "password": "securepassword123",
    "phone": "+8801700000000"
  }
  ```
  * `name`: string (Required)
  * `email`: string (Required, validated and lowercased)
  * `password`: string (Required)
  * `phone`: string (Optional)
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": "cmvme3ec40000wmawn2g7sv5u",
      "email": "user@example.com",
      "name": "Fardin Abu Ubaid",
      "phone": "+8801700000000",
      "isSuperAdmin": false,
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Errors**:
  * `400 Bad Request`: `{"error": "Name, email, and password are required"}`
  * `400 Bad Request`: `{"error": "A user with this email already exists"}`

### 5.2.2 User Login
* **Method**: `POST`
* **Path**: `/api/auth/login`
* **Auth**: Public
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": "cmvme3ec40000wmawn2g7sv5u",
      "email": "user@example.com",
      "name": "Fardin Abu Ubaid",
      "phone": "+8801700000000",
      "isSuperAdmin": false,
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Errors**:
  * `400 Bad Request`: `{"error": "Email and password are required"}`
  * `401 Unauthorized`: `{"error": "Invalid email or password"}`

### 5.2.3 Get Current Authenticated Profile (`me`)
* **Method**: `GET`
* **Path**: `/api/auth/me`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "user": {
      "id": "cmvme3ec40000wmawn2g7sv5u",
      "email": "user@example.com",
      "name": "Fardin Abu Ubaid",
      "phone": "+8801700000000",
      "isSuperAdmin": false,
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:00:00.000Z"
    },
    "activeMembership": {
      "id": "cmvme3exm0003wmawp81i0wg5",
      "messId": "cmvme3exl0001wmawtestmess",
      "role": "MANAGER",
      "status": "ACTIVE",
      "joinedAt": "2026-10-24T12:00:00.000Z",
      "mess": {
        "id": "cmvme3exl0001wmawtestmess",
        "name": "Sunrise Deluxe Mess",
        "inviteCode": "MESS-TAEMS",
        "managerId": "cmvme3ec40000wmawn2g7sv5u"
      }
    }
  }
  ```
  *(Note: If the user is not in an active mess, `"activeMembership": null`).*

### 5.2.4 Update Profile Information & Change Password
* **Method**: `PUT`
* **Path**: `/api/auth/me`
* **Auth**: Bearer Token required
* **Request Body** (all fields optional):
  ```json
  {
    "name": "Fardin Updated",
    "phone": "+8801711111111",
    "email": "newemail@example.com",
    "currentPassword": "oldpassword123",
    "newPassword": "newsecurepassword123"
  }
  ```
  * Note: Changing password strictly requires valid `currentPassword`. `newPassword` must be $\ge 6$ characters.
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Profile updated successfully",
    "user": {
      "id": "cmvme3ec40000wmawn2g7sv5u",
      "name": "Fardin Updated",
      "email": "newemail@example.com",
      "phone": "+8801711111111",
      "isSuperAdmin": false,
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:05:00.000Z"
    }
  }
  ```
* **Errors**:
  * `400 Bad Request`: `{"error": "Current password is required to set a new password"}`
  * `400 Bad Request`: `{"error": "Current password is incorrect"}`
  * `400 Bad Request`: `{"error": "New password must be at least 6 characters long"}`

### 5.2.5 Delete / Anonymize Account
* **Method**: `DELETE`
* **Path**: `/api/auth/me`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "password": "securepassword123"
  }
  ```
* **Success Response (`200 OK`) - When past historical mess records exist**:
  ```json
  {
    "message": "Account successfully deactivated and personal data anonymized. Past mess accounting records were preserved."
  }
  ```
* **Success Response (`200 OK`) - When user has zero historical mess ties**:
  ```json
  {
    "message": "Account permanently deleted successfully."
  }
  ```
* **Errors**:
  * `400 Bad Request`: If user is an active Manager with other members: `{"error": "Cannot delete account: You are currently the MANAGER of an active mess with other members. You must transfer the manager role to another member or remove all members first."}`
  * `400 Bad Request`: If user is an active Member: `{"error": "Cannot delete account: You are currently an ACTIVE member of a mess. Please leave the mess first (/api/mess/leave) to settle records before deleting your account."}`
  * `401 Unauthorized`: `{"error": "Invalid password. Account deletion aborted."}`

---

## 5.3 Mess & Roommate Management Module (`/api/mess`)

### 5.3.1 Get Active Mess Details
* **Method**: `GET`
* **Path**: `/api/mess`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "mess": {
      "id": "cmvme3exl0001wmawtestmess",
      "name": "Sunrise Mess",
      "inviteCode": "MESS-ZFMG5",
      "managerId": "cmvme3ec40000wmawn2g7sv5u",
      "rotationType": "MONTHLY",
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:00:00.000Z",
      "members": [
        {
          "id": "cmvme3exm0003wmawp81i0wg5",
          "userId": "cmvme3ec40000wmawn2g7sv5u",
          "messId": "cmvme3exl0001wmawtestmess",
          "role": "MANAGER",
          "status": "ACTIVE",
          "joinedAt": "2026-10-24T12:00:00.000Z",
          "leftAt": null,
          "user": {
            "id": "cmvme3ec40000wmawn2g7sv5u",
            "name": "Manager Bob",
            "email": "manager@test.com",
            "phone": "+8801700000001"
          }
        }
      ],
      "months": [
        {
          "id": "cmvme3exm0004wmawtestmonth",
          "messId": "cmvme3exl0001wmawtestmess",
          "monthKey": "2026-10",
          "status": "OPEN",
          "createdAt": "2026-10-24T12:00:00.000Z"
        }
      ]
    },
    "currentRole": "MANAGER"
  }
  ```

### 5.3.2 Create New Mess
* **Method**: `POST`
* **Path**: `/api/mess/create`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "name": "Greenwood Bachelor Mess"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Mess created successfully",
    "mess": {
      "id": "cmvme3exl0001wmawtestmess",
      "name": "Greenwood Bachelor Mess",
      "inviteCode": "MESS-K79P2",
      "managerId": "cmvme3ec40000wmawn2g7sv5u",
      "rotationType": "MONTHLY",
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:00:00.000Z"
    },
    "membership": {
      "id": "cmvme3exm0003wmawp81i0wg5",
      "userId": "cmvme3ec40000wmawn2g7sv5u",
      "messId": "cmvme3exl0001wmawtestmess",
      "role": "MANAGER",
      "status": "ACTIVE",
      "joinedAt": "2026-10-24T12:00:00.000Z",
      "leftAt": null
    },
    "currentMonth": {
      "id": "cmvme3exm0004wmawtestmonth",
      "messId": "cmvme3exl0001wmawtestmess",
      "monthKey": "2026-10",
      "status": "OPEN",
      "createdAt": "2026-10-24T12:00:00.000Z"
    }
  }
  ```
* **Errors**:
  * `400 Bad Request`: `{"error": "You already have an active mess membership. Leave your current mess before creating a new one."}`

### 5.3.3 Join Mess with Invite Code
* **Method**: `POST`
* **Path**: `/api/mess/join`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "inviteCode": "MESS-K79P2"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Joined mess successfully",
    "membership": {
      "id": "cmvme3fhb0008wmawcq531w6n",
      "userId": "cmvme3f8e0006wmaw9pukhcq8",
      "messId": "cmvme3exl0001wmawtestmess",
      "role": "MEMBER",
      "status": "ACTIVE",
      "joinedAt": "2026-10-24T12:01:00.000Z",
      "leftAt": null
    },
    "mess": {
      "id": "cmvme3exl0001wmawtestmess",
      "name": "Greenwood Bachelor Mess",
      "inviteCode": "MESS-K79P2"
    }
  }
  ```
* **Errors**:
  * `400 Bad Request`: `{"error": "You already have an active mess membership. Leave your current mess before joining another."}`
  * `404 Not Found`: `{"error": "Invalid invite code: Mess not found"}`

### 5.3.4 Leave Active Mess
* **Method**: `POST`
* **Path**: `/api/mess/leave`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "You have left the mess successfully. Historical records have been preserved.",
    "membership": {
      "id": "cmvme3fhb0008wmawcq531w6n",
      "userId": "cmvme3f8e0006wmaw9pukhcq8",
      "messId": "cmvme3exl0001wmawtestmess",
      "role": "MEMBER",
      "status": "LEFT",
      "joinedAt": "2026-10-24T12:01:00.000Z",
      "leftAt": "2026-10-24T12:10:00.000Z"
    }
  }
  ```

### 5.3.5 Update Mess Settings / Transfer Manager / Regenerate Invite Code
* **Method**: `PUT`
* **Path**: `/api/mess`
* **Auth**: Bearer Token (Manager only)
* **Request Body** (all fields optional):
  ```json
  {
    "name": "Sunrise Deluxe Mess",
    "regenerateInviteCode": true,
    "newManagerMemberId": "cmvme3fhb0008wmawcq531w6n"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Mess updated successfully",
    "mess": {
      "id": "cmvme3exl0001wmawtestmess",
      "name": "Sunrise Deluxe Mess",
      "inviteCode": "MESS-TAEMS",
      "managerId": "cmvme3f8e0006wmaw9pukhcq8",
      "rotationType": "MONTHLY",
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:10:00.000Z"
    }
  }
  ```
* **Errors**:
  * `403 Forbidden`: `{"error": "Forbidden: Only the mess manager can update mess settings"}`

### 5.3.6 Delete / Disband Mess
* **Method**: `DELETE`
* **Path**: `/api/mess`
* **Auth**: Bearer Token (Manager only)
* **Request Body**:
  ```json
  {
    "password": "managerpassword123",
    "force": false
  }
  ```
  *(Note: If `force` is false, deletion will fail if other active members exist).*
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Mess closed and deleted successfully. All members have been released, and you are now free to create or join another mess."
  }
  ```
* **Errors**:
  * `400 Bad Request`: `{"error": "Cannot delete mess: There are still 2 other active member(s) in this mess..."}`
  * `403 Forbidden`: `{"error": "Invalid manager password. Mess closure aborted."}`

### 5.3.7 Get Mess Members List
* **Method**: `GET`
* **Path**: `/api/mess/members`
* **Auth**: Bearer Token required
* **Query Parameters**:
  * `messId`: string (Optional; defaults to active mess)
* **Success Response (`200 OK`)**:
  ```json
  {
    "messId": "cmvme3exl0001wmawtestmess",
    "members": [
      {
        "id": "cmvme3exm0003wmawp81i0wg5",
        "userId": "cmvme3ec40000wmawn2g7sv5u",
        "messId": "cmvme3exl0001wmawtestmess",
        "role": "MANAGER",
        "status": "ACTIVE",
        "joinedAt": "2026-10-24T12:00:00.000Z",
        "leftAt": null,
        "user": {
          "id": "cmvme3ec40000wmawn2g7sv5u",
          "name": "Bob",
          "email": "bob@test.com",
          "phone": "+8801700000001"
        }
      }
    ]
  }
  ```

### 5.3.8 List Monthly Cycles
* **Method**: `GET`
* **Path**: `/api/mess/months`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "messId": "cmvme3exl0001wmawtestmess",
    "months": [
      {
        "id": "cmvme3exm0004wmawtestmonth",
        "messId": "cmvme3exl0001wmawtestmess",
        "monthKey": "2026-10",
        "status": "OPEN",
        "createdAt": "2026-10-24T12:00:00.000Z"
      }
    ]
  }
  ```

### 5.3.9 Open New Monthly Cycle & Trigger Automatic Manager Rotation
* **Method**: `POST`
* **Path**: `/api/mess/months`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "monthKey": "2026-11"
  }
  ```
  *(Format: `YYYY-MM`. Cannot be a future month).*
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Month 2026-11 opened successfully",
    "month": {
      "id": "cmvme8monthid0001",
      "messId": "cmvme3exl0001wmawtestmess",
      "monthKey": "2026-11",
      "status": "OPEN",
      "createdAt": "2026-10-24T12:15:00.000Z"
    },
    "managerRotation": {
      "rotated": true,
      "previousManager": {
        "memberId": "cmvme3exm0003wmawp81i0wg5",
        "name": "Manager Bob"
      },
      "newManager": {
        "memberId": "cmvme3fhb0008wmawcq531w6n",
        "name": "Member Alice"
      }
    }
  }
  ```

### 5.3.10 Export Mess Accounting Data
* **Method**: `GET`
* **Path**: `/api/mess/export`
* **Auth**: Bearer Token required
* **Query Parameters**:
  * `monthKey`: string (Required, e.g. `2026-10`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "exportVersion": "1.0",
    "exportedAt": "2026-10-24T12:20:00.000Z",
    "monthKey": "2026-10",
    "mess": { "id": "...", "name": "...", "inviteCode": "...", "managerId": "..." },
    "bazarEntries": [ ... ],
    "deposits": [ ... ],
    "dailyMeals": [ ... ]
  }
  ```

### 5.3.11 Import Mess Accounting Data
* **Method**: `POST`
* **Path**: `/api/mess/import`
* **Auth**: Bearer Token (Manager only)
* **Request Body**:
  ```json
  {
    "monthKey": "2026-10",
    "bazarEntries": [ ... ],
    "deposits": [ ... ],
    "dailyMeals": [ ... ]
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Mess data imported successfully",
    "monthKey": "2026-10",
    "stats": {
      "importedBazar": 5,
      "importedDeposits": 3,
      "importedMeals": 28
    }
  }
  ```

---

## 5.4 Manager Rotation Queue & Anti-Cheat Audit Logs (`/api/mess/manager/*`)

### 5.4.1 Get Manager Sequence Queue
* **Method**: `GET`
* **Path**: `/api/mess/manager/sequence`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "messId": "cmvme3exl0001wmawtestmess",
    "rotationType": "MONTHLY",
    "currentManagerMemberId": "cmvme3exm0003wmawp81i0wg5",
    "currentManager": {
      "id": "cmvme3exm0003wmawp81i0wg5",
      "name": "Kamal",
      "email": "kamal@example.com"
    },
    "sequence": [
      {
        "orderIndex": 0,
        "memberId": "cmvme3exm0003wmawp81i0wg5",
        "name": "Kamal",
        "email": "kamal@example.com",
        "phone": "+8801700000001",
        "isCurrentManager": true
      },
      {
        "orderIndex": 1,
        "memberId": "cmvme3fhb0008wmawcq531w6n",
        "name": "Jamal",
        "email": "jamal@example.com",
        "phone": "+8801700000002",
        "isCurrentManager": false
      }
    ]
  }
  ```

### 5.4.2 Reorder Rotation Queue
* **Method**: `PUT`
* **Path**: `/api/mess/manager/sequence`
* **Auth**: Bearer Token (Manager only)
* **Request Body**:
  ```json
  {
    "memberIds": [
      "cmvme3fhb0008wmawcq531w6n",
      "cmvme3exm0003wmawp81i0wg5"
    ],
    "rotationType": "MONTHLY",
    "reason": "Fair rotation agreed in monthly meeting"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Manager rotation queue updated successfully"
  }
  ```

### 5.4.3 Manual Emergency Manager Role Transfer Override
* **Method**: `POST`
* **Path**: `/api/mess/manager/transfer`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "targetMemberId": "cmvme3fhb0008wmawcq531w6n",
    "reason": "Emergency handover due to exams"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Manager role transferred successfully",
    "transfer": {
      "previousManager": {
        "id": "cmvme3exm0003wmawp81i0wg5",
        "name": "Kamal"
      },
      "newManager": {
        "id": "cmvme3fhb0008wmawcq531w6n",
        "name": "Jamal"
      }
    }
  }
  ```

### 5.4.4 Get Immutable Manager Audit Logs
* **Method**: `GET`
* **Path**: `/api/mess/manager/logs`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "messId": "cmvme3exl0001wmawtestmess",
    "logs": [
      {
        "id": "cmvlog001",
        "action": "AUTOMATIC_MONTHLY_ROTATION",
        "reason": "Automatic monthly manager rotation executed for month 2026-11",
        "createdAt": "2026-10-24T12:15:00.000Z",
        "changedBy": {
          "id": "cmvme3ec40000wmawn2g7sv5u",
          "name": "Kamal",
          "email": "kamal@example.com"
        },
        "previousManager": {
          "id": "cmvme3exm0003wmawp81i0wg5",
          "name": "Kamal"
        },
        "newManager": {
          "id": "cmvme3fhb0008wmawcq531w6n",
          "name": "Jamal"
        }
      },
      {
        "id": "cmvlog002",
        "action": "SEQUENCE_REORDERED",
        "reason": "Fair rotation agreed in monthly meeting",
        "createdAt": "2026-10-24T12:14:00.000Z",
        "changedBy": {
          "id": "cmvme3ec40000wmawn2g7sv5u",
          "name": "Kamal",
          "email": "kamal@example.com"
        },
        "previousManager": null,
        "newManager": null
      }
    ]
  }
  ```

---

## 5.5 Bazar Expense Tracker & Approval Module (`/api/bazar`)

### 5.5.1 Get Bazar Entries for a Month
* **Method**: `GET`
* **Path**: `/api/bazar`
* **Auth**: Bearer Token required
* **Query Parameters**:
  * `monthKey`: string (Required, format: `YYYY-MM`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "monthKey": "2026-10",
    "messId": "cmvme3exl0001wmawtestmess",
    "messMonthId": "cmvme3exm0004wmawtestmonth",
    "entries": [
      {
        "id": "cmvme3g7p000awmawue9jnxen",
        "messMonthId": "cmvme3exm0004wmawtestmonth",
        "memberId": "cmvme3fhb0008wmawcq531w6n",
        "amount": 600.0,
        "category": "Vegetables & Meat",
        "date": "2026-10-05T00:00:00.000Z",
        "status": "APPROVED",
        "mode": "CHECKLIST",
        "items": [
          { "name": "Potatoes", "qty": "3 kg", "price": 150, "bought": true },
          { "name": "Chicken", "qty": "1.5 kg", "price": 450, "bought": true }
        ],
        "notes": "Weekly market bazaar",
        "createdAt": "2026-10-24T12:02:00.000Z",
        "updatedAt": "2026-10-24T12:03:00.000Z",
        "member": {
          "user": {
            "id": "cmvme3f8e0006wmaw9pukhcq8",
            "name": "Member Alice",
            "email": "member@test.com"
          }
        }
      }
    ],
    "stats": {
      "totalEntries": 1,
      "approvedCount": 1,
      "pendingCount": 0,
      "rejectedCount": 0,
      "totalApprovedAmount": 600.0
    }
  }
  ```

### 5.5.2 Submit Bazar Entry (Quick or Checklist Mode)
* **Method**: `POST`
* **Path**: `/api/bazar`
* **Auth**: Bearer Token required
* **Request Body (Quick Mode)**:
  ```json
  {
    "monthKey": "2026-10",
    "amount": 350.0,
    "category": "Fish & Groceries",
    "date": "2026-10-06",
    "mode": "QUICK",
    "notes": "Evening fish market"
  }
  ```
* **Request Body (Checklist Mode)**:
  ```json
  {
    "monthKey": "2026-10",
    "amount": 600.0,
    "category": "Vegetables & Meat",
    "date": "2026-10-05",
    "mode": "CHECKLIST",
    "items": [
      { "name": "Potatoes", "qty": "3 kg", "price": 150, "bought": true },
      { "name": "Chicken", "qty": "1.5 kg", "price": 450, "bought": true }
    ],
    "notes": "Weekly market bazaar"
  }
  ```
* **Success Response (`201 Created`) - If submitted by Member**:
  ```json
  {
    "message": "Bazar entry submitted and pending manager approval",
    "entry": {
      "id": "cmvme3g7p000awmawue9jnxen",
      "messMonthId": "cmvme3exm0004wmawtestmonth",
      "memberId": "cmvme3fhb0008wmawcq531w6n",
      "amount": 600.0,
      "category": "Vegetables & Meat",
      "date": "2026-10-05T00:00:00.000Z",
      "status": "PENDING",
      "mode": "CHECKLIST",
      "items": [ ... ],
      "notes": "Weekly market bazaar",
      "createdAt": "2026-10-24T12:02:00.000Z",
      "updatedAt": "2026-10-24T12:02:00.000Z",
      "member": { ... }
    }
  }
  ```
* **Success Response (`201 Created`) - If submitted by Manager**:
  ```json
  {
    "message": "Bazar entry created and automatically approved",
    "entry": {
      "status": "APPROVED",
      "...": "..."
    }
  }
  ```

### 5.5.3 Update Bazar Entry
* **Method**: `PUT`
* **Path**: `/api/bazar/:id`
* **Auth**: Bearer Token required
* **Permissions**: Manager can edit any entry; Member can edit only their own `PENDING` or `DRAFT` entries.
* **Request Body**:
  ```json
  {
    "amount": 650.0,
    "category": "Vegetables & Meat",
    "date": "2026-10-05",
    "notes": "Updated total"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Bazar entry updated successfully",
    "entry": { ... }
  }
  ```

### 5.5.4 Delete Bazar Entry
* **Method**: `DELETE`
* **Path**: `/api/bazar/:id`
* **Auth**: Bearer Token required
* **Permissions**: Manager can delete any entry; Member can delete only their own `PENDING` or `DRAFT` entries.
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Bazar entry deleted successfully",
    "id": "cmvme3g7p000awmawue9jnxen"
  }
  ```

### 5.5.5 Manager Approve / Reject Bazar Entry
* **Method**: `PATCH`
* **Path**: `/api/bazar/:id/approve`
* **Auth**: Bearer Token (Manager only)
* **Request Body**:
  ```json
  {
    "status": "APPROVED"
  }
  ```
  *(Allowed values: `"APPROVED"`, `"REJECTED"`).*
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Bazar entry marked as APPROVED",
    "entry": {
      "id": "cmvme3g7p000awmawue9jnxen",
      "status": "APPROVED",
      "updatedAt": "2026-10-24T12:03:00.000Z",
      "...": "..."
    }
  }
  ```
* **Errors**:
  * `403 Forbidden`: `{"error": "Forbidden: Only mess managers can approve or reject bazar entries"}`

---

## 5.6 Daily Meals & Leave Requests Module (`/api/meals`)

### 5.6.1 Get Daily Meals for a Month
* **Method**: `GET`
* **Path**: `/api/meals`
* **Auth**: Bearer Token required
* **Query Parameters**:
  * `monthKey`: string (Required, format: `YYYY-MM`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "monthKey": "2026-10",
    "messId": "cmvme3exl0001wmawtestmess",
    "messMonthId": "cmvme3exm0004wmawtestmonth",
    "meals": [
      {
        "id": "cmvmeal001",
        "messMonthId": "cmvme3exm0004wmawtestmonth",
        "memberId": "cmvme3exm0003wmawp81i0wg5",
        "date": "2026-10-05T00:00:00.000Z",
        "lunch": 1.0,
        "dinner": 1.0,
        "isLeave": false,
        "updatedAt": "2026-10-24T12:04:00.000Z",
        "member": {
          "user": {
            "id": "cmvme3ec40000wmawn2g7sv5u",
            "name": "Manager Bob",
            "email": "manager@test.com"
          }
        }
      }
    ],
    "groupedByDate": {
      "2026-10-05": [
        {
          "id": "cmvmeal001",
          "memberId": "cmvme3exm0003wmawp81i0wg5",
          "lunch": 1.0,
          "dinner": 1.0,
          "isLeave": false,
          "...": "..."
        }
      ]
    }
  }
  ```

### 5.6.2 Record / Update Member Daily Meals
* **Method**: `POST`
* **Path**: `/api/meals/update`
* **Auth**: Bearer Token required
* **Permissions**: Regular members can only update their own meals (`memberId === activeMembership.id`). The Manager can update any member.
* **Request Body**:
  ```json
  {
    "memberId": "cmvme3exm0003wmawp81i0wg5",
    "date": "2026-10-05",
    "lunch": 1.5,
    "dinner": 1.0,
    "isLeave": false
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Meal record updated successfully",
    "meal": {
      "id": "cmvmeal001",
      "messMonthId": "cmvme3exm0004wmawtestmonth",
      "memberId": "cmvme3exm0003wmawp81i0wg5",
      "date": "2026-10-05T00:00:00.000Z",
      "lunch": 1.5,
      "dinner": 1.0,
      "isLeave": false,
      "updatedAt": "2026-10-24T12:04:00.000Z"
    }
  }
  ```
* **Errors**:
  * `403 Forbidden`: `{"error": "Forbidden: You can only update your own meal records"}`

### 5.6.3 Submit Leave Request
* **Method**: `POST`
* **Path**: `/api/meals/leave-request` *(or `/api/meals/leave-requests`)*
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "startDate": "2026-10-10",
    "endDate": "2026-10-12",
    "reason": "Home visit for vacation"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Leave request submitted successfully. Pending manager approval.",
    "leaveRequest": {
      "id": "cmvleave001",
      "memberId": "cmvme3fhb0008wmawcq531w6n",
      "startDate": "2026-10-10T00:00:00.000Z",
      "endDate": "2026-10-12T00:00:00.000Z",
      "reason": "Home visit for vacation",
      "status": "PENDING",
      "createdAt": "2026-10-24T12:05:00.000Z",
      "updatedAt": "2026-10-24T12:05:00.000Z",
      "member": {
        "user": {
          "id": "cmvme3f8e0006wmaw9pukhcq8",
          "name": "Member Alice",
          "email": "member@test.com"
        }
      }
    }
  }
  ```

### 5.6.4 List Leave Requests
* **Method**: `GET`
* **Path**: `/api/meals/leave-requests`
* **Auth**: Bearer Token required
* **Behavior**: If Manager, returns all leave requests in the mess. If Member, returns only user's own requests.
* **Success Response (`200 OK`)**:
  ```json
  {
    "leaveRequests": [
      {
        "id": "cmvleave001",
        "memberId": "cmvme3fhb0008wmawcq531w6n",
        "startDate": "2026-10-10T00:00:00.000Z",
        "endDate": "2026-10-12T00:00:00.000Z",
        "reason": "Home visit for vacation",
        "status": "PENDING",
        "createdAt": "2026-10-24T12:05:00.000Z",
        "updatedAt": "2026-10-24T12:05:00.000Z",
        "member": {
          "user": {
            "id": "cmvme3f8e0006wmaw9pukhcq8",
            "name": "Member Alice",
            "email": "member@test.com"
          }
        }
      }
    ]
  }
  ```

### 5.6.5 Manager Approve / Reject Leave Request (Auto-Zeroing Daily Meals)
* **Method**: `PATCH`
* **Path**: `/api/meals/leave-requests/:id`
* **Auth**: Bearer Token (Manager only)
* **Request Body**:
  ```json
  {
    "status": "APPROVED"
  }
  ```
  *(Allowed values: `"APPROVED"`, `"REJECTED"`).*
* **Behavior**: If `APPROVED`, automatically updates daily meals for all dates in the range to `{ lunch: 0, dinner: 0, isLeave: true }`.
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Leave request marked as APPROVED",
    "leaveRequest": {
      "id": "cmvleave001",
      "status": "APPROVED",
      "updatedAt": "2026-10-24T12:06:00.000Z",
      "...": "..."
    }
  }
  ```

---

## 5.7 Member Deposits Module (`/api/deposits`)

### 5.7.1 List Deposits for a Month
* **Method**: `GET`
* **Path**: `/api/deposits`
* **Auth**: Bearer Token required
* **Query Parameters**:
  * `monthKey`: string (Required, format: `YYYY-MM`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "monthKey": "2026-10",
    "messId": "cmvme3exl0001wmawtestmess",
    "messMonthId": "cmvme3exm0004wmawtestmonth",
    "totalDeposit": 2000.0,
    "deposits": [
      {
        "id": "cmvdep001",
        "messMonthId": "cmvme3exm0004wmawtestmonth",
        "memberId": "cmvme3exm0003wmawp81i0wg5",
        "amount": 1000.0,
        "date": "2026-10-01T00:00:00.000Z",
        "notes": "Initial monthly deposit",
        "member": {
          "user": {
            "id": "cmvme3ec40000wmawn2g7sv5u",
            "name": "Manager Bob",
            "email": "manager@test.com"
          }
        }
      }
    ]
  }
  ```

### 5.7.2 Record Member Deposit
* **Method**: `POST`
* **Path**: `/api/deposits`
* **Auth**: Bearer Token (Manager only)
* **Request Body**:
  ```json
  {
    "monthKey": "2026-10",
    "memberId": "cmvme3fhb0008wmawcq531w6n",
    "amount": 1000.0,
    "date": "2026-10-01",
    "notes": "Bank transfer / bKash"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Deposit recorded successfully",
    "deposit": {
      "id": "cmvdep002",
      "messMonthId": "cmvme3exm0004wmawtestmonth",
      "memberId": "cmvme3fhb0008wmawcq531w6n",
      "amount": 1000.0,
      "date": "2026-10-01T00:00:00.000Z",
      "notes": "Bank transfer / bKash",
      "createdAt": "2026-10-24T12:07:00.000Z",
      "updatedAt": "2026-10-24T12:07:00.000Z",
      "member": { ... }
    }
  }
  ```
* **Errors**:
  * `403 Forbidden`: `{"error": "Forbidden: Only mess managers can record member deposits"}`

### 5.7.3 Update Deposit Entry
* **Method**: `PUT`
* **Path**: `/api/deposits/:id`
* **Auth**: Bearer Token (Manager only)
* **Request Body**:
  ```json
  {
    "amount": 1200.0,
    "notes": "Corrected deposit amount"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Deposit updated successfully",
    "deposit": { ... }
  }
  ```

### 5.7.4 Delete Deposit Entry
* **Method**: `DELETE`
* **Path**: `/api/deposits/:id`
* **Auth**: Bearer Token (Manager only)
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Deposit record deleted successfully",
    "id": "cmvdep002"
  }
  ```

---

## 5.8 Monthly Financial Summary & Balances Module (`/api/summary`)

### 5.8.1 Get Real-Time Financial Summary & Member Balances
* **Method**: `GET`
* **Path**: `/api/summary`
* **Auth**: Bearer Token required
* **Query Parameters**:
  * `monthKey`: string (Required, format: `YYYY-MM`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "monthKey": "2026-10",
    "messId": "cmvme3exl0001wmawtestmess",
    "messMonthId": "cmvme3exm0004wmawtestmonth",
    "totalApprovedBazar": 600.0,
    "totalDeposits": 2000.0,
    "totalMeals": 4.0,
    "mealRate": 150.0,
    "memberSummaries": [
      {
        "memberId": "cmvme3exm0003wmawp81i0wg5",
        "userId": "cmvme3ec40000wmawn2g7sv5u",
        "name": "Manager Bob",
        "role": "MANAGER",
        "status": "ACTIVE",
        "totalMeals": 2.0,
        "totalDeposit": 1000.0,
        "mealCost": 300.0,
        "balance": 700.0
      },
      {
        "memberId": "cmvme3fhb0008wmawcq531w6n",
        "userId": "cmvme3f8e0006wmaw9pukhcq8",
        "name": "Member Alice",
        "role": "MEMBER",
        "status": "ACTIVE",
        "totalMeals": 2.0,
        "totalDeposit": 1000.0,
        "mealCost": 300.0,
        "balance": 700.0
      }
    ]
  }
  ```
  * Note on `balance`:
    * Positive value (`700.0`): Surplus / Refund due to the member.
    * Negative value (`-300.0`): Dues owed by the member to the mess treasury.

---

## 5.9 Tour Expense Management Module (`/api/tours`)

### 5.9.1 List User Tours
* **Method**: `GET`
* **Path**: `/api/tours`
* **Auth**: Bearer Token required
* **Query Parameters**:
  * `all`: boolean (`true` allowed for Super Admin only to view all tours platform-wide)
* **Success Response (`200 OK`)**:
  ```json
  {
    "tours": [
      {
        "id": "cmvtour001",
        "name": "Cox's Bazar Sea Vacation",
        "description": "Annual team retreat",
        "destination": "Cox's Bazar",
        "startDate": "2026-11-01T00:00:00.000Z",
        "endDate": "2026-11-04T00:00:00.000Z",
        "budget": 30000.0,
        "status": "PLANNING",
        "inviteCode": "TOUR-RFQMZ",
        "creatorId": "cmvme3ec40000wmawn2g7sv5u",
        "createdAt": "2026-10-24T12:08:00.000Z",
        "updatedAt": "2026-10-24T12:08:00.000Z",
        "myRole": "LEAD",
        "membersCount": 3,
        "totalDeposits": 24000.0,
        "totalExpenses": 15000.0,
        "balance": 9000.0,
        "budgetRemaining": 15000.0
      }
    ]
  }
  ```

### 5.9.2 Create New Tour
* **Method**: `POST`
* **Path**: `/api/tours`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "name": "Cox's Bazar Sea Vacation",
    "destination": "Cox's Bazar",
    "budget": 30000.0,
    "description": "Annual team retreat",
    "startDate": "2026-11-01",
    "endDate": "2026-11-04"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Tour created successfully",
    "tour": {
      "id": "cmvtour001",
      "name": "Cox's Bazar Sea Vacation",
      "destination": "Cox's Bazar",
      "budget": 30000.0,
      "inviteCode": "TOUR-RFQMZ",
      "creatorId": "cmvme3ec40000wmawn2g7sv5u",
      "status": "PLANNING",
      "leadMember": {
        "id": "cmvtourmem001",
        "tourId": "cmvtour001",
        "userId": "cmvme3ec40000wmawn2g7sv5u",
        "name": "Dave",
        "role": "LEAD"
      }
    }
  }
  ```

### 5.9.3 Join Tour with Invite Code
* **Method**: `POST`
* **Path**: `/api/tours/join`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "inviteCode": "TOUR-RFQMZ"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Successfully joined tour",
    "tour": { ... },
    "member": {
      "id": "cmvtourmem002",
      "tourId": "cmvtour001",
      "userId": "cmvme4o2h001twmawttnji60t",
      "name": "Emma",
      "role": "MEMBER"
    }
  }
  ```

### 5.9.4 Get Full Tour Details & Financial Split Sheet
* **Method**: `GET`
* **Path**: `/api/tours/:id`
* **Auth**: Bearer Token (Tour participant or Super Admin)
* **Success Response (`200 OK`)**:
  ```json
  {
    "tour": {
      "id": "cmvtour001",
      "name": "Cox's Bazar Sea Vacation",
      "description": "Annual team retreat",
      "destination": "Cox's Bazar",
      "startDate": "2026-11-01T00:00:00.000Z",
      "endDate": "2026-11-04T00:00:00.000Z",
      "budget": 30000.0,
      "status": "PLANNING",
      "inviteCode": "TOUR-RFQMZ",
      "creatorId": "cmvme3ec40000wmawn2g7sv5u",
      "createdAt": "2026-10-24T12:08:00.000Z",
      "updatedAt": "2026-10-24T12:08:00.000Z"
    },
    "summary": {
      "budget": 30000.0,
      "totalDeposits": 24000.0,
      "totalExpenses": 15000.0,
      "balance": 9000.0,
      "budgetRemaining": 15000.0,
      "perMemberShare": 5000.0,
      "membersCount": 3,
      "categoryBreakdown": {
        "Transport": 6000.0,
        "Hotel": 9000.0
      }
    },
    "members": [
      {
        "id": "cmvtourmem001",
        "userId": "cmvme3ec40000wmawn2g7sv5u",
        "name": "Dave",
        "email": "dave@test.com",
        "phone": "+8801811112222",
        "role": "LEAD",
        "joinedAt": "2026-10-24T12:08:00.000Z",
        "totalDeposited": 10000.0,
        "totalSpent": 6000.0,
        "shareCost": 5000.0,
        "netBalance": 5000.0
      },
      {
        "id": "cmvtourmem002",
        "userId": "cmvme4o2h001twmawttnji60t",
        "name": "Emma",
        "email": "emma@test.com",
        "phone": "+8801833334444",
        "role": "ACCOUNTANT",
        "joinedAt": "2026-10-24T12:09:00.000Z",
        "totalDeposited": 8000.0,
        "totalSpent": 0.0,
        "shareCost": 5000.0,
        "netBalance": 3000.0
      },
      {
        "id": "cmvtourmem003",
        "userId": null,
        "name": "Rahim (Cash)",
        "email": null,
        "phone": "+8801900000000",
        "role": "MEMBER",
        "joinedAt": "2026-10-24T12:10:00.000Z",
        "totalDeposited": 6000.0,
        "totalSpent": 0.0,
        "shareCost": 5000.0,
        "netBalance": 1000.0
      }
    ],
    "expenses": [
      {
        "id": "cmvexp001",
        "title": "Scania Bus Tickets",
        "amount": 6000.0,
        "category": "Transport",
        "date": "2026-10-24T12:11:00.000Z",
        "memberId": "cmvtourmem001",
        "memberName": "Dave"
      },
      {
        "id": "cmvexp002",
        "title": "Hotel Deluxe Room",
        "amount": 9000.0,
        "category": "Hotel",
        "date": "2026-10-24T12:11:00.000Z",
        "memberId": null,
        "memberName": "Shared Tour Expense"
      }
    ],
    "deposits": [
      {
        "id": "cmvtourdep001",
        "amount": 10000.0,
        "date": "2026-10-24T12:10:00.000Z",
        "notes": "bKash Trx 99A...",
        "memberId": "cmvtourmem001",
        "memberName": "Dave"
      }
    ]
  }
  ```

### 5.9.5 Update Tour Info & Status
* **Method**: `PUT`
* **Path**: `/api/tours/:id`
* **Auth**: Bearer Token (Tour Lead or Super Admin)
* **Request Body**:
  ```json
  {
    "name": "Cox's Bazar Tour (Confirmed)",
    "budget": 35000.0,
    "status": "ACTIVE"
  }
  ```
  *(Status options: `"PLANNING"`, `"ACTIVE"`, `"COMPLETED"`, `"CANCELLED"`).*
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Tour updated successfully",
    "tour": { ... }
  }
  ```

### 5.9.6 Delete Tour
* **Method**: `DELETE`
* **Path**: `/api/tours/:id`
* **Auth**: Bearer Token (Tour Lead or Super Admin)
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Tour \"Cox's Bazar Sea Vacation\" deleted successfully"
  }
  ```

### 5.9.7 List Tour Deposits
* **Method**: `GET`
* **Path**: `/api/tours/:id/deposits`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "deposits": [
      {
        "id": "cmvtourdep001",
        "tourId": "cmvtour001",
        "memberId": "cmvtourmem001",
        "amount": 10000.0,
        "date": "2026-10-24T12:10:00.000Z",
        "notes": "bKash Trx 99A...",
        "member": {
          "id": "cmvtourmem001",
          "name": "Dave",
          "role": "LEAD"
        }
      }
    ]
  }
  ```

### 5.9.8 Record Tour Deposit
* **Method**: `POST`
* **Path**: `/api/tours/:id/deposits`
* **Auth**: Bearer Token (Lead, Accountant, or Super Admin)
* **Request Body**:
  ```json
  {
    "memberId": "cmvtourmem001",
    "amount": 10000.0,
    "date": "2026-10-24",
    "notes": "bKash Trx 99A..."
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Tour deposit recorded successfully",
    "deposit": {
      "id": "cmvtourdep001",
      "amount": 10000.0,
      "date": "2026-10-24T00:00:00.000Z",
      "notes": "bKash Trx 99A...",
      "member": {
        "id": "cmvtourmem001",
        "name": "Dave"
      }
    }
  }
  ```

### 5.9.9 Delete Tour Deposit
* **Method**: `DELETE`
* **Path**: `/api/tours/:id/deposits/:depositId`
* **Auth**: Bearer Token (Lead, Accountant, or Super Admin)
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Tour deposit deleted successfully"
  }
  ```

### 5.9.10 List Tour Expenses
* **Method**: `GET`
* **Path**: `/api/tours/:id/expenses`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "expenses": [
      {
        "id": "cmvexp001",
        "tourId": "cmvtour001",
        "memberId": "cmvtourmem001",
        "title": "Scania Bus Tickets",
        "amount": 6000.0,
        "category": "Transport",
        "date": "2026-10-24T12:11:00.000Z",
        "notes": null,
        "member": {
          "id": "cmvtourmem001",
          "name": "Dave",
          "role": "LEAD"
        }
      }
    ]
  }
  ```

### 5.9.11 Record Tour Expense
* **Method**: `POST`
* **Path**: `/api/tours/:id/expenses`
* **Auth**: Bearer Token (Lead, Accountant, or Super Admin)
* **Request Body**:
  ```json
  {
    "title": "Scania Bus Tickets (3 seats)",
    "amount": 6000.0,
    "category": "Transport",
    "memberId": "cmvtourmem001",
    "date": "2026-10-24",
    "notes": "Non-AC / Hino"
  }
  ```
  *(Note: If paid from shared fund rather than a specific member, `memberId` can be omitted or null).*
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Tour expense logged successfully",
    "expense": {
      "id": "cmvexp001",
      "title": "Scania Bus Tickets (3 seats)",
      "amount": 6000.0,
      "category": "Transport",
      "date": "2026-10-24T00:00:00.000Z",
      "notes": "Non-AC / Hino",
      "member": {
        "id": "cmvtourmem001",
        "name": "Dave"
      }
    }
  }
  ```

### 5.9.12 Delete Tour Expense
* **Method**: `DELETE`
* **Path**: `/api/tours/:id/expenses/:expenseId`
* **Auth**: Bearer Token (Lead, Accountant, or Super Admin)
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Tour expense deleted successfully"
  }
  ```

### 5.9.13 List Tour Participants
* **Method**: `GET`
* **Path**: `/api/tours/:id/members`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "members": [
      {
        "id": "cmvtourmem001",
        "tourId": "cmvtour001",
        "userId": "cmvme3ec40000wmawn2g7sv5u",
        "name": "Dave",
        "email": "dave@test.com",
        "phone": "+8801811112222",
        "role": "LEAD",
        "joinedAt": "2026-10-24T12:08:00.000Z",
        "user": {
          "id": "cmvme3ec40000wmawn2g7sv5u",
          "name": "Dave",
          "email": "dave@test.com",
          "phone": "+8801811112222"
        }
      }
    ]
  }
  ```

### 5.9.14 Add Offline Participant (Without Account)
* **Method**: `POST`
* **Path**: `/api/tours/:id/members`
* **Auth**: Bearer Token (Lead, Accountant, or Super Admin)
* **Request Body**:
  ```json
  {
    "name": "Rahim Offline Participant",
    "phone": "+8801900000000",
    "email": "rahim@optional.com",
    "role": "MEMBER"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Participant added to tour successfully",
    "member": {
      "id": "cmvtourmem003",
      "tourId": "cmvtour001",
      "userId": null,
      "name": "Rahim Offline Participant",
      "phone": "+8801900000000",
      "email": "rahim@optional.com",
      "role": "MEMBER",
      "joinedAt": "2026-10-24T12:10:00.000Z"
    }
  }
  ```

### 5.9.15 Promote / Edit Tour Member Role
* **Method**: `PUT`
* **Path**: `/api/tours/:id/members/:memberId`
* **Auth**: Bearer Token (Lead or Super Admin)
* **Request Body**:
  ```json
  {
    "role": "ACCOUNTANT",
    "name": "Emma Accountant",
    "phone": "+8801833334444"
  }
  ```
  *(Roles: `"LEAD"`, `"ACCOUNTANT"`, `"MEMBER"`).*
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Member updated successfully",
    "member": {
      "id": "cmvtourmem002",
      "role": "ACCOUNTANT",
      "...": "..."
    }
  }
  ```

### 5.9.16 Remove Tour Member
* **Method**: `DELETE`
* **Path**: `/api/tours/:id/members/:memberId`
* **Auth**: Bearer Token (Lead or Super Admin)
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Tour member removed successfully"
  }
  ```

---

## 5.10 Personal Notes & Checklists Module (`/api/notes`)

### 5.10.1 List User's Personal Notes
* **Method**: `GET`
* **Path**: `/api/notes`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "userId": "cmvme3ec40000wmawn2g7sv5u",
    "notes": [
      {
        "id": "cmvnote001",
        "userId": "cmvme3ec40000wmawn2g7sv5u",
        "title": "Monthly Personal Shopping",
        "content": "Shampoo and laundry detergent",
        "isChecklist": true,
        "items": [
          { "id": "1", "text": "Shampoo", "done": false },
          { "id": "2", "text": "Detergent", "done": true }
        ],
        "createdAt": "2026-10-24T12:12:00.000Z",
        "updatedAt": "2026-10-24T12:12:00.000Z"
      }
    ]
  }
  ```

### 5.10.2 Create Personal Note / Checklist
* **Method**: `POST`
* **Path**: `/api/notes`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "title": "Monthly Personal Shopping",
    "content": "Shampoo and laundry detergent",
    "isChecklist": true,
    "items": [
      { "id": "1", "text": "Shampoo", "done": false },
      { "id": "2", "text": "Detergent", "done": false }
    ]
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Personal note created successfully",
    "note": { ... }
  }
  ```

### 5.10.3 Update Personal Note
* **Method**: `PUT`
* **Path**: `/api/notes/:id`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "title": "Monthly Personal Shopping (Updated)",
    "items": [
      { "id": "1", "text": "Shampoo", "done": true },
      { "id": "2", "text": "Detergent", "done": true }
    ]
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Note updated successfully",
    "note": { ... }
  }
  ```

### 5.10.4 Delete Personal Note
* **Method**: `DELETE`
* **Path**: `/api/notes/:id`
* **Auth**: Bearer Token required
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Note deleted successfully",
    "id": "cmvnote001"
  }
  ```

---

## 5.11 Super Admin Platform Oversight Module (`/api/admin`)

*All routes in this module strictly require `isSuperAdmin === true` (or email `fardin1.codezzi@gmail.com`).*

### 5.11.1 Get Platform Telemetry, Stats & Lists
* **Method**: `GET`
* **Path**: `/api/admin`
* **Auth**: Bearer Token (Super Admin only)
* **Success Response (`200 OK`)**:
  ```json
  {
    "stats": {
      "totalUsers": 14,
      "totalMesses": 3,
      "totalMeals": 128.0,
      "totalBazarAmount": 18500.0,
      "totalTours": 2,
      "totalTourBudget": 60000.0,
      "totalTourExpenses": 30000.0,
      "totalTourDeposits": 48000.0
    },
    "users": [
      {
        "id": "cmvme3ec40000wmawn2g7sv5u",
        "name": "Bob",
        "email": "bob@test.com",
        "phone": "+8801700000001",
        "isSuperAdmin": false,
        "createdAt": "2026-10-24T12:00:00.000Z",
        "activeMess": {
          "id": "cmvme3exl0001wmawtestmess",
          "name": "Sunrise Mess",
          "inviteCode": "MESS-ZFMG5",
          "role": "MANAGER",
          "joinedAt": "2026-10-24T12:00:00.000Z"
        },
        "currentRole": "MANAGER"
      }
    ],
    "messes": [
      {
        "id": "cmvme3exl0001wmawtestmess",
        "name": "Sunrise Mess",
        "inviteCode": "MESS-ZFMG5",
        "managerId": "cmvme3ec40000wmawn2g7sv5u",
        "managerName": "Bob",
        "managerEmail": "bob@test.com",
        "totalMembersCount": 5,
        "activeMembersCount": 4,
        "createdAt": "2026-10-24T12:00:00.000Z",
        "updatedAt": "2026-10-24T12:00:00.000Z"
      }
    ],
    "tours": [
      {
        "id": "cmvtour001",
        "name": "Cox's Bazar Sea Vacation",
        "description": "Annual team retreat",
        "destination": "Cox's Bazar",
        "startDate": "2026-11-01T00:00:00.000Z",
        "endDate": "2026-11-04T00:00:00.000Z",
        "budget": 30000.0,
        "status": "PLANNING",
        "inviteCode": "TOUR-RFQMZ",
        "creatorId": "cmvme3ec40000wmawn2g7sv5u",
        "createdAt": "2026-10-24T12:08:00.000Z",
        "updatedAt": "2026-10-24T12:08:00.000Z",
        "totalDeposits": 24000.0,
        "totalExpenses": 15000.0,
        "balance": 9000.0,
        "membersCount": 3,
        "leadName": "Dave",
        "accountantNames": ["Emma"]
      }
    ]
  }
  ```

### 5.11.2 Super Admin Delete Mess
* **Method**: `DELETE`
* **Path**: `/api/admin/messes/:id`
* **Auth**: Bearer Token (Super Admin only)
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Mess \"Sunrise Mess\" deleted successfully by Super Admin.",
    "deletedMessId": "cmvme3exl0001wmawtestmess"
  }
  ```

### 5.11.3 Super Admin Reset User Credentials & Password
* **Method**: `PUT`
* **Path**: `/api/admin/users/:id`
* **Auth**: Bearer Token (Super Admin only)
* **Request Body**:
  ```json
  {
    "name": "Recovered Member",
    "phone": "+8801799988877",
    "newPassword": "BrandNewSecretPass999!",
    "isSuperAdmin": false
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "User details updated successfully by Super Admin",
    "passwordReset": true,
    "user": {
      "id": "cmvme4mox001mwmawb2lgejtt",
      "name": "Recovered Member",
      "email": "forgotten@test.com",
      "phone": "+8801799988877",
      "isSuperAdmin": false,
      "createdAt": "2026-10-24T12:07:00.000Z",
      "updatedAt": "2026-10-24T12:13:00.000Z"
    }
  }
  ```

---

## 5.12 App Configuration Singleton Module (`/api/config`)

### 5.12.1 Get Global App Config & Creator Bio
* **Method**: `GET`
* **Path**: `/api/config`
* **Auth**: Public (No auth required)
* **Success Response (`200 OK`)**:
  ```json
  {
    "config": {
      "id": "global-config",
      "appName": "Mess Meal Manager",
      "appIconSvg": null,
      "creatorName": "Fardin Abu Ubaid",
      "creatorEmail": "fardin1.codezzi@gmail.com",
      "creatorPortfolio": "https://portfolio-fardin.vercel.app",
      "creatorBio": "Full-Stack Developer & Creator of Mess Meal Manager",
      "broadcastNotice": null,
      "noticeActive": false,
      "updatedAt": "2026-10-24T12:00:00.000Z"
    }
  }
  ```

### 5.12.2 Update App Configuration
* **Method**: `PUT`
* **Path**: `/api/config`
* **Auth**: Bearer Token required
* **Request Body**:
  ```json
  {
    "appName": "Bache Lorr",
    "appIconSvg": "<svg>...</svg>",
    "creatorBio": "Lead Engineer",
    "broadcastNotice": "Server maintenance at 12 AM",
    "noticeActive": true
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "App configuration updated successfully",
    "config": { ... }
  }
  ```

---

# 6. Frontend State Management & Storage Guide for Mobile WebViews

When packaging the frontend into an Android APK with `html2app.dev`:

1. **Token Persistence**:
   * Store the token in standard `localStorage.setItem('auth_token', token)`. Modern Android WebViews persist `localStorage` inside app sandbox storage reliably across restarts.
2. **Global Request Headers**:
   ```typescript
   const apiClient = axios.create({
     baseURL: import.meta.env.VITE_API_URL || 'https://meal-manager-api.onrender.com/api',
   });

   apiClient.interceptors.request.use((config) => {
     const token = localStorage.getItem('auth_token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   ```
3. **Handling Network Latency & Pull-to-Refresh**:
   * Use `@tanstack/react-query` with a query client caching layer for offline resilience and smooth pull-to-refresh UX.
4. **Dates & Timezones**:
   * All dates in the API are UTC ISO strings (`2026-10-05T00:00:00.000Z`).
   * When displaying to mobile users, format using the user's device locale (e.g. `toLocaleDateString()`).
   * When sending month queries, always use `YYYY-MM` (e.g. `2026-10`).
