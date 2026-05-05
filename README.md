# Invest Int Bank Customer International Payments Portal

Invest Int Bank is a secure customer international payments portal. The app focuses on customer registration, customer login, payment input validation, HTTPS deployment, and clear security explanation for the assessment.

Live app:

https://invest-int-bank-20260503.web.app


# Team Members

| Name | Student Number |
| --- | --- |
| Ishmael Lehlohonolo Mafole | ST10534346 |
| Bogoshi Thato Maphile | ST10122582 |
| Lungisa Thabani Zondi | ST10530818 |
| Disema Ramohaladi | ST10529815 |

# 1. What We Built

We built a customer international payments portal called **Invest Int Bank**. The app includes customer registration, customer login, and a simulated international payment form where users can enter beneficiary and payment details.

The app was built using **React with Vite** for the frontend, **Firebase Authentication** for secure registration and login, **Cloud Firestore** for storing simulated payment requests, and **Firebase Hosting** for HTTPS deployment.

# 2. Tools Used

We used the following tools:

- **React / JavaScript**: frontend application and form logic.
- **Firebase Authentication**: secure user registration, login, password handling, and session management.
- **Cloud Firestore**: stores customer payment simulation data.
- **Firebase Hosting**: hosts the app over HTTPS.
- **EmailJS**: optional third-party service provider for login alert emails.
- **GitHub Actions**: CI/CD pipeline that runs automatically on code push.
- **ChatGPT / AI assistance**: used to help generate and improve code, but the generated logic was reviewed and understood.

Using Firebase is safer than writing our own authentication system because Firebase already handles secure password hashing, salting, session tokens, HTTPS support, and abuse protection.

# 3. Password Security

Passwords are not stored manually in our app code or database. We use **Firebase Authentication**, which handles password hashing and salting for us.

Hashing means the password is converted into a one-way encrypted-looking value. Salting means Firebase adds random data before hashing so that identical passwords do not produce identical hashes. This protects users if authentication data is ever exposed.

We chose Firebase instead of custom password storage because writing our own password system could easily lead to insecure storage, weak hashing, or misconfiguration.

# 4. Input Whitelisting

The app validates user input before allowing registration or payment submission.

We validate:

- Email address format
- Full name format
- Payment amount
- IBAN / account number
- SWIFT / BIC code
- Payment reference

We use JavaScript validation and regular expressions to restrict inputs to expected formats. Invalid values are rejected in the UI before submission. For example, an invalid IBAN, invalid amount, or unsafe reference will show an error and stop the payment request.

Validation code is located in:


src/lib/validators.js


# 5. HTTPS / SSL

The app is deployed using **Firebase Hosting**, which provides HTTPS automatically.

The live app loads at:


https://invest-int-bank-20260503.web.app


In the demonstration video, we can show the browser lock icon to prove the app is running over HTTPS. HTTPS protects data in transit and helps prevent man-in-the-middle attacks.

# 6. Attack Protection

The app protects against common attacks in the following ways:

- **Brute force attacks**: Firebase Authentication includes built-in protections against repeated suspicious login attempts.
- **XSS**: React escapes rendered text by default, reducing the risk of injected scripts running in the page.
- **Injection attacks**: Inputs are validated with whitelisting and stored through Firebase SDK methods rather than building raw database queries.
- **Session hijacking**: Firebase manages secure authentication sessions and tokens instead of custom session code.
- **Stored device sessions**: Firebase Auth persistence is set to in-memory only, so members are not kept logged in using sessions stored on the PC.
- **Inactive sessions**: the dashboard uses an online/inactivity timer. After 10 minutes without activity, the app asks the user to confirm they are still there. If the user does not respond within 60 seconds, the app signs them out.
- **Repeated wrong passwords**: after three incorrect password attempts for the same email on the same browser, the app locks that login path and tells the member to visit the bank physically to reset the password.
- **Man-in-the-middle attacks**: Firebase Hosting provides HTTPS, which encrypts traffic between the browser and the deployed app.

Firestore security rules are also used to restrict access to authenticated users and validate stored payment data.

# 7. DevSecOps / CI/CD Pipeline

We used a basic CI/CD pipeline with **GitHub Actions**. The pipeline runs automatically when code is pushed.

The pipeline improves security because it gives automated checks before deployment. It helps catch build errors early, keeps deployment repeatable, and reduces manual mistakes. Automation is important in DevSecOps because security and quality checks should happen continuously, not only at the end.

The workflow file is located in:

.github/workflows/security-ci.yml

# 8. Why Managed Security Is Safer

Using Firebase Authentication is safer than custom authentication because Firebase is designed and maintained for secure identity management. It reduces the risk of insecure password storage, weak session handling, and incorrectly implemented login logic.

Our app focuses on using trusted platform security features and then adding our own validation for banking-specific input fields.

# 9. Demonstration Video Plan

In the video, one group member should demonstrate and narrate:

1. Open the deployed app and show the HTTPS lock.
2. Register a new customer account.
3. Explain that Firebase handles password hashing and salting.
4. Log in with the registered account.
5. Enter invalid payment data, such as a bad IBAN or invalid amount, and show rejection.
6. Enter valid international payment details.
7. Submit the payment request.
8. Explain protections against brute force, XSS, injection, session hijacking, and man-in-the-middle attacks.
9. Show or explain the GitHub Actions CI/CD pipeline.
10. State clearly that Firebase, GitHub Actions, and AI assistance were used.

# 10. Short Summary

Invest Int Bank is a secure customer international payments portal built with React and Firebase. Firebase Authentication protects passwords and sessions, Firestore stores simulated payment requests, Firebase Hosting provides HTTPS, and input validation rejects unsafe or invalid payment data. The project prioritizes security understanding over complex UI.

# Critical App Information

# Main Features

- Customer registration using Firebase Authentication.
- Customer login using Firebase Authentication.
- Protected dashboard for authenticated users.
- In-memory authentication session so users are not automatically logged in from saved PC sessions.
- Online/inactivity timer that warns after 10 minutes of no activity and logs the user out if they do not confirm within 60 seconds.
- Login lockout message after three incorrect password attempts, instructing the member to visit the bank physically for password reset.
- International payment request form.
- Payment validation for beneficiary name, country, currency, amount, IBAN, SWIFT/BIC, and reference.
- Simulated payment request storage in Cloud Firestore.
- Recent payment request log.
- Optional login alert email after registration or login using EmailJS.
- Firebase Hosting HTTPS deployment.
- Firestore security rules.
- GitHub Actions CI pipeline.

# How the App Runs

The app is a Vite React single page application. The frontend runs in the browser and connects to Firebase using the Firebase client SDK.

During local development:

```bash
npm install
npm run dev
```

For production build:

```bash
npm run build
```

For Firebase Hosting deployment:

```bash
npm run deploy:hosting
```

For Firestore rules deployment:

```bash
npm run deploy:rules
```

# Environment Configuration

The app uses a local `.env` file for Firebase web configuration. This file is not committed to Git.

The example file is:

.env.example

The real local file is:

.env


The `.env` file is excluded by `.gitignore` because it contains project-specific configuration values.

# Session and Online Timer

The app does not allow members to keep using old browser sessions stored on the PC. Firebase Authentication is configured with in-memory persistence, which means the authenticated session is kept only for the current app runtime and is not stored permanently in local browser storage.

When a customer is logged in, the dashboard also monitors activity such as clicks, typing, scrolling, touch activity, and mouse movement. If there is no activity for 10 minutes, the app shows a session confirmation message asking if the user is still there.

The user then has 60 seconds to confirm that they want to stay signed in. If they do not confirm, the app automatically signs them out. This reduces the risk of another person using the banking dashboard after the real customer walks away from the computer.

# Login Lockout

If a member enters the correct email but enters the wrong password three times, the app locks the login path for that email on that browser. The member is then shown a message telling them to visit the bank physically to have the password reset.

This feature supports the banking security demonstration by showing that repeated failed login attempts are not ignored. Firebase Authentication also provides managed abuse protection, while the app adds a clear customer-facing lockout message for the demo.

# Optional Login Alert Emails

The app supports optional login alert emails using **EmailJS**, which is a third-party service provider. EmailJS is convenient for a demo because it can send directly from the frontend and its free plan is enough for a small number of demonstration emails.

When the feature is configured, a member receives an email after registration or login. The alert email can include the login time, browser/device information, and timezone. The app does not track exact physical location because that would require extra browser permission or an IP location service and may create privacy and reliability issues.

To enable this feature, create an EmailJS account, connect an email service, create a template, and add these values to `.env`:

```text
VITE_EMAILJS_PUBLIC_KEY=your-emailjs-public-key
VITE_EMAILJS_SERVICE_ID=your-emailjs-service-id
VITE_EMAILJS_LOGIN_TEMPLATE_ID=your-emailjs-template-id
```

The EmailJS template should use these variables:

- `to_email`
- `to_name`
- `login_time`
- `device`
- `browser`
- `timezone`

If these EmailJS values are left blank, the app skips login alert emails and continues working normally.

# Third-Party Service Providers

This project uses trusted third-party service providers instead of custom insecure code for security-critical features:

- **Firebase Authentication**: handles registration, login, password hashing, salting, session security, and abuse protection.
- **Cloud Firestore**: stores customer profile data and simulated payment requests in a managed NoSQL document database.
- **Firebase Hosting**: hosts the app over HTTPS so traffic is encrypted in transit.
- **EmailJS**: optional provider for login alert emails. It is only used if the EmailJS environment variables are configured.
- **GitHub Actions**: runs automated CI checks on code push.

# Firebase Services Used

- **Firebase Authentication** for user registration, login, password security, and sessions.
- **Cloud Firestore** as the NoSQL document database for customer profiles and payment requests.
- **Firebase Hosting** for secure HTTPS hosting.

# Data Model

Customer profiles:

profiles/{uid}


Fields:

- `fullName`
- `email`
- `createdAt`

Payment requests:

customers/{uid}/payments/{paymentId}

Fields:

- `beneficiaryName`
- `country`
- `currency`
- `amount`
- `iban`
- `swiftCode`
- `reference`
- `status`
- `createdAt`

# Ethical Disclosure

We used some AI to speedup the development, debugging, documentation, and UI improvements. We also used Firebase managed services for authentication, database storage, hosting, and security protections.

We configured security-critical features inside Firebase Authentication that includes password hashing, salting, or session security.
