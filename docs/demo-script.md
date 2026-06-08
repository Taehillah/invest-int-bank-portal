# Demo Script Notes

## Opening

“This is the Invest Int Bank Customer International Payments Portal. We used React for the frontend, Firebase Authentication for secure bank-created user login, Cloud Firestore for storing simulated payments, CircleCI with a SonarQube scan for CI, and Firebase Hosting for HTTPS hosting.”

## Bank-Created User Access

- Show that the login screen has no registration tab or registration form.
- Explain that accounts are created by the bank administrator in Firebase Authentication.
- Explain:
  - Firebase Authentication stores passwords securely using hashing and salting.
  - This is safer than writing custom password storage code.

## Login

- Log in with the bank-created account.
- Enter an invalid email first and show rejection.
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

- Show the CircleCI workflow and SonarQube/SonarCloud project.
- Explain:
  - Every push automatically installs dependencies, builds the app, audits packages, and runs a SonarQube scan.
  - Automation helps catch problems earlier and keeps deployments more consistent.

## Video Hand-In

- Record the demo with OBS.
- Show the deployed HTTPS URL, login with a bank-created user, input validation, payment submission, Firestore storage, Firestore rules, CircleCI, and the SonarQube scan result.
- Upload the recording as an unlisted YouTube video and include the link in the hand-in.
