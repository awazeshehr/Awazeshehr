# Plan: Citizen Registration — Structured Errors, Real‑Time Validation, and Inline UX

## Objective
- Eliminate generic “Registration Failed” by introducing structured, traceable error handling in the backend.
- Add real‑time, client‑side validation with clear inline feedback to improve usability and reduce failed submissions.
- Ensure maintainability, security, and consistent developer ergonomics (codes, messages, correlation IDs).

## Scope
- Backend: Registration endpoint(s), validation layer, error mapping, standardized response envelope.
- Frontend: Citizen registration form in the Role Selection/Registration UI, real‑time validation, inline indicators/messages.
- Non‑functional: Logging, correlation IDs, basic tests, accessibility, and rollout notes.

---

## Backend Plan

1) Standard Response Schema
- Replace generic failures with a consistent envelope:
  - success: boolean
  - data: object | null
  - error: { code: string, message: string, field?: string, details?: object, correlationId: string }
  - timestamp: ISO string
- Maintain appropriate HTTP status codes (4xx for client errors, 5xx for server errors), but always include the structured error body.

2) Error Code Registry
- Create an enum-like map (e.g., server/constants/errorCodes.js) with stable codes and messages:
  - REG_DUPLICATE_EMAIL
  - REG_DUPLICATE_USERNAME
  - REG_INVALID_EMAIL_FORMAT
  - REG_PASSWORD_POLICY_VIOLATION
  - REG_MISSING_REQUIRED_FIELD
  - REG_INVALID_INPUT_FORMAT
  - REG_DB_INSERT_FAILED
  - REG_UNAUTHORIZED_OR_MALFORMED
  - REG_UNKNOWN_ERROR
- Provide developer‑facing default messages; allow field‑specific overrides (e.g., { field: "email" }).

3) Validation Layer
- Implement field validations before DB operations (no new dependencies required):
  - Email regex (RFC‑reasonable), username alphanumeric length rules, phone/CNIC format as required, strong password policy.
  - Password policy: min length (e.g., 8), at least one lowercase, uppercase, digit, special char; configurable via env.
  - Syntactic checks for required fields with per‑field errors.
- Map validation failures to error codes above with field context.

4) Duplicate/DB Error Handling
- Ensure unique indexes on Citizen collection (email, username as applicable).
- On Mongo/Mongoose duplicate key (E11000), translate to REG_DUPLICATE_EMAIL or REG_DUPLICATE_USERNAME.
- Wrap create/save in try/catch and translate DB errors to REG_DB_INSERT_FAILED with correlationId.

5) Correlation IDs and Logging
- Add a middleware to attach a per‑request correlationId (UUID v4).
- On error, include correlationId in the response; log error with code, stack (server‑side), and correlationId.

6) Registration Endpoint Update
- In server routes (e.g., server/routes/auth.js), refactor registration handler to:
  - Run validation; short‑circuit with 400 and structured error if invalid.
  - Check for duplicates; return specific code if found.
  - Attempt DB insert; on failure, return REG_DB_INSERT_FAILED.
  - On success, return { success: true, data: { userId, ... } } with 201.

7) Availability Check Endpoint (Optional but recommended)
- Add GET /auth/check-availability?email=&username= to return:
  - { success: true, data: { emailAvailable: boolean, usernameAvailable: boolean } }
- Rate limit and debounce on client; basic throttling on server if needed.

8) Backward Compatibility
- Preserve `success` flag in responses; clients expecting it will keep working.
- Keep messages human‑readable; codes stable for logging/analytics.

---

## Frontend Plan (Real‑Time Validation + Inline UX)

1) Validation Model
- Add a local validation state per field in the registration form (RoleSelection.js):
  - errors: { field: { code?: string, message?: string } }
  - touched: { field: boolean }
  - validity: { field: boolean }
- Implement pure utility validators (no new libs):
  - validateEmail(value): { valid, code?, message? }
  - validatePassword(value): { score: 0–4, valid, code?, message? }
  - validateUsername(value): { valid, code?, message? }
  - validateRequired(value): { valid, code?, message? }
  - validateConfirmPassword(pw, confirm): { valid, code?, message? }

2) Real‑Time Feedback
- On change: run lightweight, synchronous validators and update inline status immediately.
- On blur: mark field as touched to show messages.
- Debounced async availability check (300–500ms) for email/username if non‑empty and syntactically valid; display availability result.

3) Inline UX
- Add inline messages directly under inputs with color cues:
  - .is-valid → green outline/check icon
  - .is-invalid → red outline/warning message
- Password strength meter beneath password field (0–4): Very Weak → Strong, color‑coded.
- Disable submit until all required fields are valid; show a concise summary at top if submit attempted with invalid fields.
- Accessibility: aria‑live="polite" regions for validation messages, appropriate input aria‑invalid attributes.

4) Server Error Mapping on Submit
- On failed registration, map `error.code` to friendly inline messages (e.g., REG_DUPLICATE_EMAIL highlights the email field).
- If `field` exists in payload, attach message to that field; otherwise, show a general non‑field error area.

5) CSS Enhancements
- In RoleSelection.css, add styles for .is-valid, .is-invalid, small.helper-text, strength meter bars, and lightweight inline icons (font‑awesome already present).

6) No Heavy Dependencies
- Implement basic strength heuristics locally (length + char classes).
- If later approved, optionally integrate zxcvbn for advanced scoring; not required for this iteration.

---

## Testing & Verification

1) Backend
- Unit tests (or lightweight integration) for:
  - Validation returns correct codes/messages.
  - Duplicate key maps to appropriate code.
  - Unknown errors yield REG_UNKNOWN_ERROR with correlationId.
- Manual verification with curl/Postman for each error scenario.

2) Frontend
- Unit tests for validators (email, password, required, confirm).
- Manual test matrix:
  - Empty required fields → inline red messages on blur.
  - Invalid email format → instant red message.
  - Weak→strong password meter reacts as user types.
  - Mismatched confirm password → inline message.
  - Email already used → async availability shows “already taken”, submit blocked.
  - Successful registration → no inline errors, submit enabled and succeeds.

---

## Security & Privacy
- Never log plaintext passwords.
- Sanitize/escape messages; avoid leaking internal DB info.
- Consider basic throttling on availability endpoint to prevent enumeration.

---

## Rollout & Acceptance

1) Acceptance Criteria
- Backend returns structured errors with stable codes for all failure paths.
- Client shows inline validation and strength meter; no generic dropdown errors for registration.
- Submit disabled until the form is valid; server errors map to appropriate fields/messages.
- CorrelationId in all error responses and server logs.

2) Rollout Notes
- DB unique indexes confirmed and built for email/username.
- Feature toggles not required for client; changes are additive and UX‑only.

---

## Implementation Checklist (High‑Level)
- [ ] Add error code registry and response helpers.
- [ ] Add correlationId middleware.
- [ ] Refactor registration route to use new validation and error mapping.
- [ ] Add optional availability endpoint.
- [ ] Implement client validators and state for real‑time checks.
- [ ] Add inline UX (classes, icons, strength meter).
- [ ] Map server error codes to inline messages.
- [ ] Add/execute tests and perform manual verification.

Deliverable: Structured backend responses + responsive, inline‑validated registration form with clear, actionable feedback.

