# Demo Script Notes

## Opening

“This is the Invest Int Bank Customer International Payments Portal. We used React for the frontend, Firebase Authentication for secure login and registration, Cloud Firestore for storing simulated payments, GitHub Actions for CI/CD, and Firebase Hosting for HTTPS hosting.”

## Registration

- Enter an invalid email and show rejection.
- Enter a weak password and show rejection.
- Explain:
  - Firebase Authentication stores passwords securely using hashing and salting.
  - This is safer than writing custom password storage code.

## Login

- Log in with the registered account.
- Explain:
  - Firebase manages session security.
  - Managed authentication reduces configuration mistakes.

## Payment Simulation

- Enter an invalid IBAN or bad amount and show rejection.
- Submit a valid payment.
- Explain:
  - Frontend validation uses regular expressions.
  - Firestore rules validate again on the backend.
  - No real money moves because the system is a simulation.

## HTTPS

- Open the deployed Firebase Hosting URL.
- Show the browser lock icon.
- Explain:
  - HTTPS protects data in transit and helps prevent man-in-the-middle attacks.

## Attack Protection

- Brute force: Firebase abuse protections and throttling.
- XSS: React escaping plus input whitelisting.
- Injection: SDK-based Firestore access and restrictive rules.
- Session hijacking: managed auth tokens and secure sessions.
- Man-in-the-middle: HTTPS/TLS in production.

## CI/CD

- Show the GitHub Actions workflow.
- Explain:
  - Every push automatically installs dependencies, builds the app, and audits packages.
  - Automation helps catch problems earlier and keeps deployments more consistent.
