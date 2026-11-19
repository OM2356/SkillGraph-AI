# SkillGraph AI — Security Specification & Threat Model

## 1. Data Invariants
1. **Identity Isolation**: Every user subcollection document (`/users/{userId}/skills/*`, `projects/*`, `analyses/*`, `roadmaps/*`, `tasks/*`, `bookmarks/*`, `progress/*`, `conversations/*`, `messages/*`, `notifications/*`) MUST have `userId == userId` matching `request.auth.uid` and a verified email (`request.auth.token.email_verified == true`).
2. **No Self-Privilege Escalation**: On `/users/{userId}` creation, non-admins MUST only set `role == 'user'`. On update, non-admins CANNOT modify `role`, `uid`, or `createdAt`.
3. **Master Gate Relational Sync**: Every subcollection write verifies the parent `/users/{userId}` document exists via `exists(/databases/$(database)/documents/users/$(userId))`, and roadmap tasks verify their parent roadmap exists.
4. **Strict Key & Size Enforcement**: Every entity uses `hasAll()` + `hasOnly()` on create, `affectedKeys().hasOnly()` on update, `isValidId()` (`^[a-zA-Z0-9_\-]+$`, max 128 chars) on all path variables, and explicit `.size()` limits on every string and array.
5. **Temporal Integrity**: `createdAt == request.time` on creation (and immutable on update); `updatedAt == request.time` on creation and update.
6. **Admin Isolation & Audit Immutability**: `/careers`, `/admins`, and `/adminActivity` restrict writes strictly to verified admins (`omkarsathe3103@gmail.com` or `/admins/{uid}`), and `/adminActivity` is append-only (no updates or deletes).
7. **PII Protection & Query Enforcement**: `/users` cannot be listed by regular users. Every `allow list` rule explicitly evaluates `resource.data` or `userId == request.auth.uid`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Privilege Escalation on Signup**: `POST /users/attacker123` with `{ role: "admin", ... }`.
2. **Shadow Field Injection on Profile Update**: `PATCH /users/userA` with `{ displayName: "Valid", isVerified: true }`.
3. **Cross-User Skill Read**: User B attempts `GET /users/userA/skills/skill1`.
4. **Unverified Email Spoof**: User with `email: "omkarsathe3103@gmail.com"` and `email_verified: false` attempts `GET /users/userB`.
5. **1MB Resource Poisoning in ID**: `PUT /users/userA/skills/${"a".repeat(500)}` attempting oversized path ID.
6. **Oversized String Payload**: `PUT /users/userA/projects/proj1` with `description` of 10,000 characters (> 2000 limit).
7. **Unbounded Array Injection**: `PUT /users/userA/projects/proj1` with `techStack` containing 100 entries (> 20 limit).
8. **Fake Timestamp Forgery**: `PUT /users/userA/skills/skill1` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
9. **Immutable Field Mutation**: `PATCH /users/userA/skills/skill1` attempting to mutate `createdAt` or `userId`.
10. **Non-Admin Career Catalog Tampering**: Normal user attempts `PUT /careers/fake-role` to inject malicious role data.
11. **Admin Audit Log Deletion**: Even an admin or user attempts `DELETE /adminActivity/log1` (append-only invariant).
12. **Blanket User List Scraping**: Non-admin user attempts `LIST /users` to harvest emails/PII.
