# Invest Int Bank

Secure customer portal for international payment simulation. The project is designed to satisfy the assessment focus on authentication, input validation, HTTPS deployment, attack mitigation explanation, and a basic CI/CD pipeline.

## Stack Used

- React + Vite for the frontend
- Firebase Authentication for registration, login, password hashing, salting, and session handling
- Cloud Firestore for storing customer profiles and simulated international payment requests
- GitHub Actions for CI on every push
- Firebase Hosting for free HTTPS deployment of the frontend

## Why This Stack Fits the Rubric

- `Firebase Authentication` is safer than writing custom password logic because it provides managed hashing, salting, secure session handling, and rate-limiting protections.
- `Firestore security rules` add backend enforcement so the app does not rely on frontend checks alone.
- `React` escapes rendered content by default, which helps reduce XSS risk when paired with strict input whitelisting.
- `Firebase Hosting` provides HTTPS so you can show the browser lock during the demo.
- `GitHub Actions` verifies the app still builds and audits dependencies on every push, which supports DevSecOps automation.

## Features

- Customer registration
- Customer login
- International payment submission simulation
- Frontend regex whitelisting for:
  - email
  - full name
  - amount
  - IBAN
  - SWIFT/BIC
  - payment reference
- Firestore rules to enforce ownership and validate payment data again on the backend
- Black, yellow, and white glassmorphism interface for Invest Int Bank

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and add your Firebase values.

3. In Firebase Console:
   - create a project
   - enable `Authentication > Email/Password`
   - create a Firestore database
   - deploy the `firestore.rules` file using Firebase CLI or the console
   - enable `Hosting`

4. Start the app:

```bash
npm run dev
```

## Firebase Hosting Deployment

1. Install the Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Log in and link the local folder to your Firebase project:

```bash
firebase login
cp .firebaserc.example .firebaserc
```

3. Edit `.firebaserc` and replace `your-firebase-project-id` with your real Firebase project ID.

4. Deploy the Firestore rules:

```bash
npm run deploy:rules
```

5. Deploy the site to Firebase Hosting:

```bash
npm run deploy:hosting
```

6. Open the generated `https://<project-id>.web.app` or `https://<project-id>.firebaseapp.com` URL and verify the browser lock icon.

## Firebase Data Model

- `profiles/{uid}`
  - `fullName`
  - `email`
  - `createdAt`
- `customers/{uid}/payments/{paymentId}`
  - `beneficiaryName`
  - `country`
  - `currency`
  - `amount`
  - `iban`
  - `swiftCode`
  - `reference`
  - `status`
  - `createdAt`

## Attack Protection Talking Points

- `Brute force`: Firebase Authentication includes abuse detection and rate limiting.
- `XSS`: React escapes content by default; unsafe HTML injection is not used; fields are whitelist-validated.
- `Injection`: Firestore is used through SDK calls, not raw SQL; rules restrict allowed fields and values.
- `Session hijacking`: Firebase manages tokens and secure authenticated sessions.
- `Man-in-the-middle`: Firebase Hosting serves the app over HTTPS/TLS.

## Demo Checklist

- Register a new user
- Explain that Firebase hashes and salts passwords
- Show an invalid email or IBAN being rejected
- Log in
- Show the HTTPS lock on the deployed Firebase Hosting site
- Submit a payment simulation
- Explain Firestore rules and managed authentication protections
- Explain the GitHub Actions pipeline running on push

## Ethical Disclosure

You should explicitly state in the presentation that this project used:

- ChatGPT/Codex for scaffolding and code generation assistance
- Firebase for authentication and managed backend security
- GitHub Actions for CI/CD automation

Do not claim that password security was implemented manually if Firebase Authentication was used.
