import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  auth,
  authPersistenceReady,
  db,
  firebaseReady,
  missingFirebaseKeys,
} from "./lib/firebase";
import {
  validateLogin,
  validatePayment,
  validateRegistration,
} from "./lib/validators";
import { sendLoginAlert } from "./lib/loginAlerts";
import bankLogo from "./assets/invest-int-bank-logo.svg";

const registerDefaults = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const loginDefaults = {
  email: "",
  password: "",
};

const paymentDefaults = {
  beneficiaryName: "",
  country: "RSA",
  currency: "USD",
  amount: "",
  iban: "",
  swiftCode: "",
  reference: "",
};

const countryOptions = [
  { flag: "🇦🇺", name: "Australia" },
  { flag: "🇧🇷", name: "Brazil" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇨🇳", name: "China" },
  { flag: "🇫🇷", name: "France" },
  { flag: "🇩🇪", name: "Germany" },
  { flag: "🇮🇳", name: "India" },
  { flag: "🇮🇹", name: "Italy" },
  { flag: "🇯🇵", name: "Japan" },
  { flag: "🇳🇬", name: "Nigeria" },
  { flag: "🇿🇦", name: "RSA" },
  { flag: "🇪🇸", name: "Spain" },
  { flag: "🇦🇪", name: "United Arab Emirates" },
  { flag: "🇬🇧", name: "United Kingdom" },
  { flag: "🇺🇸", name: "United States" },
];

const currencyOptions = [
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar" },
  { code: "BRL", flag: "🇧🇷", name: "Brazilian Real" },
  { code: "CAD", flag: "🇨🇦", name: "Canadian Dollar" },
  { code: "CNY", flag: "🇨🇳", name: "Chinese Yuan" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "GBP", flag: "🇬🇧", name: "Pound Sterling" },
  { code: "INR", flag: "🇮🇳", name: "Indian Rupee" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "NGN", flag: "🇳🇬", name: "Nigerian Naira" },
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "ZAR", flag: "🇿🇦", name: "South African Rand" },
];

const securityCards = [
  {
    title: "Protected Client Sign-In",
    body: "Customer sign-in is protected with strong password handling and hardened access controls.",
  },
  {
    title: "Verified Payment Details",
    body: "Names, amounts, IBANs, SWIFT codes, and references are checked before a request reaches the payments desk.",
  },
  {
    title: "Encrypted Banking Access",
    body: "The portal is delivered over encrypted connections to help protect client activity and payment instructions in transit.",
  },
];

const authSignals = [
  { label: "FX corridors", value: "120+" },
  { label: "Review controls", value: "Active" },
  { label: "Session trust", value: "Protected" },
];

const dashboardSignals = [
  { label: "Client access", value: "Verified" },
  { label: "Payments desk", value: "Open" },
  { label: "Connection", value: "Encrypted" },
];

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const IDLE_WARNING_SECONDS = 60;
const MAX_WRONG_PASSWORD_ATTEMPTS = 3;
const LOGIN_LOCKOUT_PREFIX = "invest-int-bank-login-lockout:";

const lockedAccountMessage =
  "This account has been locked after three incorrect password attempts. Please visit the bank physically to have your password reset.";

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [registerValues, setRegisterValues] = useState(registerDefaults);
  const [loginValues, setLoginValues] = useState(loginDefaults);
  const [paymentValues, setPaymentValues] = useState(paymentDefaults);
  const [registerErrors, setRegisterErrors] = useState({});
  const [loginErrors, setLoginErrors] = useState({});
  const [paymentErrors, setPaymentErrors] = useState({});
  const [authMessage, setAuthMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [payments, setPayments] = useState([]);
  const [sessionWarningVisible, setSessionWarningVisible] = useState(false);
  const [sessionWarningSeconds, setSessionWarningSeconds] = useState(
    IDLE_WARNING_SECONDS,
  );
  const [idleResetKey, setIdleResetKey] = useState(0);
  const authPanelContentRef = useRef(null);
  const [authPanelHeight, setAuthPanelHeight] = useState("auto");
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const warningVisibleRef = useRef(false);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return undefined;
    }

    let unsubscribe = () => {};
    let active = true;

    authPersistenceReady.then(async () => {
      if (!active) {
        return;
      }

      await signOut(auth).catch(() => {});

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        try {
          if (user) {
            await loadPayments(user.uid);
          } else {
            setPayments([]);
          }
        } catch (error) {
          console.error(error);
          setPaymentMessage(
            "Firebase is connected, but payment history could not be loaded.",
          );
        }
        setLoading(false);
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    warningVisibleRef.current = sessionWarningVisible;
  }, [sessionWarningVisible]);

  useEffect(() => {
    if (!currentUser || !auth) {
      return undefined;
    }

    const signOutForHiddenScreen = () => {
      if (!document.hidden) {
        return;
      }

      signOut(auth)
        .then(() => {
          setAuthMessage("You were signed out because the banking screen was left.");
        })
        .catch((error) => {
          console.error("Automatic screen-leave sign out failed.", error);
        });
    };

    const signOutForPageExit = () => {
      signOut(auth).catch(() => {});
    };

    document.addEventListener("visibilitychange", signOutForHiddenScreen);
    window.addEventListener("pagehide", signOutForPageExit);

    return () => {
      document.removeEventListener("visibilitychange", signOutForHiddenScreen);
      window.removeEventListener("pagehide", signOutForPageExit);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !auth) {
      clearTimeout(idleTimerRef.current);
      clearInterval(warningTimerRef.current);
      setSessionWarningVisible(false);
      setSessionWarningSeconds(IDLE_WARNING_SECONDS);
      return undefined;
    }

    const clearIdleTimers = () => {
      clearTimeout(idleTimerRef.current);
      clearInterval(warningTimerRef.current);
    };

    const forceIdleLogout = async () => {
      clearIdleTimers();
      setSessionWarningVisible(false);
      setSessionWarningSeconds(IDLE_WARNING_SECONDS);
      await signOut(auth);
      setAuthMessage("You were signed out because the session was inactive.");
    };

    const showIdleWarning = () => {
      setSessionWarningSeconds(IDLE_WARNING_SECONDS);
      setSessionWarningVisible(true);

      warningTimerRef.current = setInterval(() => {
        setSessionWarningSeconds((seconds) => {
          if (seconds <= 1) {
            forceIdleLogout();
            return 0;
          }

          return seconds - 1;
        });
      }, 1000);
    };

    const resetIdleTimer = () => {
      if (warningVisibleRef.current) {
        return;
      }

      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(showIdleWarning, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    return () => {
      clearIdleTimers();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [currentUser, idleResetKey]);

  useLayoutEffect(() => {
    if (!authPanelContentRef.current || currentUser) {
      return;
    }

    setAuthPanelHeight(`${authPanelContentRef.current.scrollHeight}px`);
  }, [authMode, authMessage, currentUser, loginErrors, registerErrors]);

  async function loadPayments(userId) {
    if (!db) {
      return;
    }

    const paymentsRef = collection(db, "customers", userId, "payments");
    const paymentsQuery = query(paymentsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(paymentsQuery);

    setPayments(
      snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data(),
      })),
    );
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    const errors = validateRegistration(registerValues);
    setRegisterErrors(errors);
    setAuthMessage("");

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!auth || !db) {
      setAuthMessage("Configure Firebase environment variables before registering.");
      return;
    }

    try {
      setAuthBusy(true);
      const credentials = await createUserWithEmailAndPassword(
        auth,
        registerValues.email.trim(),
        registerValues.password,
      );

      await updateProfile(credentials.user, {
        displayName: registerValues.fullName.trim(),
      });

      await setDoc(doc(db, "profiles", credentials.user.uid), {
        fullName: registerValues.fullName.trim(),
        email: registerValues.email.trim(),
        createdAt: serverTimestamp(),
      });

      const loginAlertMessage = await getLoginAlertMessage({
        email: credentials.user.email,
        name: registerValues.fullName.trim(),
      });

      setRegisterValues(registerDefaults);
      setAuthMessage(
        `Registration successful. Your secure session is active. ${loginAlertMessage}`,
      );
    } catch (error) {
      setAuthMessage(mapAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const errors = validateLogin(loginValues);
    setLoginErrors(errors);
    setAuthMessage("");

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!auth) {
      setAuthMessage("Configure Firebase environment variables before logging in.");
      return;
    }

    const normalizedEmail = loginValues.email.trim().toLowerCase();
    let emailBelongsToAccount = false;

    if (isLoginLocked(normalizedEmail)) {
      setAuthMessage(lockedAccountMessage);
      return;
    }

    try {
      setAuthBusy(true);
      emailBelongsToAccount = await emailHasSignInMethods(normalizedEmail);
      const credentials = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        loginValues.password,
      );
      clearWrongPasswordAttempts(normalizedEmail);
      const loginAlertMessage = await getLoginAlertMessage({
        email: credentials.user.email,
        name: credentials.user.displayName,
      });
      setLoginValues(loginDefaults);
      setAuthMessage(`Login successful. ${loginAlertMessage}`);
    } catch (error) {
      if (
        error.code === "auth/invalid-credential" &&
        emailBelongsToAccount
      ) {
        const attempts = recordWrongPasswordAttempt(normalizedEmail);

        if (attempts >= MAX_WRONG_PASSWORD_ATTEMPTS) {
          setAuthMessage(lockedAccountMessage);
          return;
        }

        setAuthMessage(
          `Incorrect password. ${MAX_WRONG_PASSWORD_ATTEMPTS - attempts} attempt(s) remaining before this account is locked.`,
        );
        return;
      }

      setAuthMessage(mapAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    const { errors, normalized } = validatePayment(paymentValues);
    setPaymentErrors(errors);
    setPaymentMessage("");

    if (Object.keys(errors).length > 0 || !currentUser) {
      return;
    }

    if (!db) {
      setPaymentMessage("Configure Firebase environment variables before submitting payments.");
      return;
    }

    try {
      setPaymentBusy(true);
      await addDoc(collection(db, "customers", currentUser.uid, "payments"), {
        amount: Number(normalized.amount),
        beneficiaryName: normalized.beneficiaryName,
        country: normalized.country,
        createdAt: serverTimestamp(),
        currency: normalized.currency,
        iban: normalized.iban,
        reference: normalized.reference,
        status: "SUBMITTED_FOR_SIMULATION",
        swiftCode: normalized.swiftCode,
      });

      setPaymentValues(paymentDefaults);
      setPaymentMessage(
        "Payment submitted for simulation. No real funds have moved.",
      );
      await loadPayments(currentUser.uid);
    } catch (error) {
      setPaymentMessage(
        "The payment could not be stored. Check Firebase configuration and Firestore rules.",
      );
      console.error(error);
    } finally {
      setPaymentBusy(false);
    }
  }

  async function handleLogout() {
    if (!auth) {
      return;
    }

    await signOut(auth);
    setAuthMessage("You have been signed out.");
  }

  function handleStaySignedIn() {
    clearInterval(warningTimerRef.current);
    setSessionWarningVisible(false);
    setSessionWarningSeconds(IDLE_WARNING_SECONDS);
    clearTimeout(idleTimerRef.current);
    setIdleResetKey((key) => key + 1);
  }

  if (loading) {
    return (
      <main className="app-shell">
        <SceneBackdrop />
        <section className="loading-stage panel">
          <BrandMark />
          <h1>Preparing secure banking workspace...</h1>
          <p className="lead compact">
            Arranging client sign-in, payment review, and protected access for
            the international banking journey.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <SceneBackdrop />

      {!firebaseReady ? (
        <section className="auth-stage">
          <AuthVisual />

          <aside className="auth-card panel">
            <p className="section-kicker">Configuration</p>
            <h2>Complete bank portal setup</h2>
            <p className="muted-copy">
              The interface is ready. Add the project keys below to enable
              client registration, sign-in, and payment request storage.
            </p>

            <div className="config-list">
              {missingFirebaseKeys.map((key) => (
                <div className="config-item" key={key}>
                  <span className="config-dot" />
                  <code>{key}</code>
                </div>
              ))}
            </div>

            <p className="status-text">
              Copy <code>.env.example</code> to <code>.env</code>, paste your
              Firebase values, then restart the Vite server.
            </p>
          </aside>
        </section>
      ) : !currentUser ? (
        <section className="auth-stage">
          <AuthVisual />

          <aside className="auth-card panel">
            <div className="auth-card-header">
              <p className="section-kicker">Client Sign-In</p>
              <h2>
                {authMode === "login"
                  ? "Welcome back to Invest Int Bank"
                  : "Open your secure banking profile"}
              </h2>
              <p className="muted-copy">
                {authMode === "login"
                  ? "Continue to your international payments desk."
                  : "Register with a strong password to begin secure cross-border banking."}
              </p>
            </div>

            <div className="switcher" role="tablist" aria-label="Authentication mode">
              <button
                aria-selected={authMode === "login"}
                className={authMode === "login" ? "switcher-tab active" : "switcher-tab"}
                onClick={() => setAuthMode("login")}
                type="button"
              >
                Login
              </button>
              <button
                aria-selected={authMode === "register"}
                className={
                  authMode === "register" ? "switcher-tab active" : "switcher-tab"
                }
                onClick={() => setAuthMode("register")}
                type="button"
              >
                Register
              </button>
            </div>

            <div className="auth-panel-height" style={{ height: authPanelHeight }}>
              <div className="auth-panel-content" ref={authPanelContentRef}>
                {authMode === "register" ? (
                  <form className="form-stack auth-form" onSubmit={handleRegisterSubmit}>
                    <Field
                      label="Full name"
                      name="fullName"
                      value={registerValues.fullName}
                      onChange={(event) =>
                        setRegisterValues((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                      error={registerErrors.fullName}
                      placeholder="Amina Dlamini"
                    />
                    <Field
                      label="Email address"
                      name="email"
                      type="email"
                      value={registerValues.email}
                      onChange={(event) =>
                        setRegisterValues((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      error={registerErrors.email}
                      placeholder="customer@example.com"
                    />
                    <Field
                      label="Password"
                      name="password"
                      type="password"
                      value={registerValues.password}
                      onChange={(event) =>
                        setRegisterValues((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      error={registerErrors.password}
                      placeholder="12+ chars with symbols"
                    />
                    <Field
                      label="Confirm password"
                      name="confirmPassword"
                      type="password"
                      value={registerValues.confirmPassword}
                      onChange={(event) =>
                        setRegisterValues((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                      error={registerErrors.confirmPassword}
                      placeholder="Repeat password"
                    />

                    <button className="primary-button" disabled={authBusy} type="submit">
                      {authBusy ? "Creating account..." : "Open banking profile"}
                    </button>
                  </form>
                ) : (
                  <form className="form-stack auth-form" onSubmit={handleLoginSubmit}>
                    <Field
                      label="Email address"
                      name="loginEmail"
                      type="email"
                      value={loginValues.email}
                      onChange={(event) =>
                        setLoginValues((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      error={loginErrors.email}
                      placeholder="customer@example.com"
                    />
                    <Field
                      label="Password"
                      name="loginPassword"
                      type="password"
                      value={loginValues.password}
                      onChange={(event) =>
                        setLoginValues((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      error={loginErrors.password}
                      placeholder="Your password"
                    />

                    <button className="primary-button" disabled={authBusy} type="submit">
                      {authBusy ? "Signing in..." : "Enter banking portal"}
                    </button>
                  </form>
                )}

                {authMessage ? <p className="status-text">{authMessage}</p> : null}
              </div>
            </div>

            <div className="auth-footer-note">
              <span>Protected client sign-in</span>
              <span>Encrypted banking access</span>
              <span>Verified payment details</span>
            </div>

            <AuthShowcase />
          </aside>
        </section>
      ) : (
        <section className="dashboard-stage">
          {sessionWarningVisible ? (
            <div className="session-timeout-overlay" role="alertdialog" aria-modal="true">
              <div className="session-timeout-dialog panel">
                <p className="section-kicker">Session check</p>
                <h2>Are you still there?</h2>
                <p className="muted-copy">
                  For security, inactive banking sessions are signed out
                  automatically. Confirm within {sessionWarningSeconds} seconds
                  to keep this session active.
                </p>
                <div className="session-timeout-actions">
                  <button
                    className="primary-button"
                    onClick={handleStaySignedIn}
                    type="button"
                  >
                    Yes, keep me signed in
                  </button>
                  <button className="ghost-button" onClick={handleLogout} type="button">
                    Sign out now
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <header className="dashboard-topbar panel">
            <div className="dashboard-brand-block">
              <BrandMark />
              <div>
                <p className="section-kicker">Authenticated Session</p>
                <h1>Welcome, {currentUser.displayName || "Customer"}</h1>
              </div>
            </div>

            <div className="dashboard-actions">
              <div className="chip-row">
                {dashboardSignals.map((signal) => (
                  <span className="chip" key={signal.label}>
                    {signal.label}: {signal.value}
                  </span>
                ))}
              </div>
              <button className="ghost-button" onClick={handleLogout} type="button">
                Sign out
              </button>
            </div>
          </header>

          <section className="dashboard-grid">
            <section className="panel payment-workspace">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">New Instruction</p>
                  <h2>International payment request</h2>
                  <p className="muted-copy">
                    Capture beneficiary and settlement details for secure banker
                    review and customer confirmation.
                  </p>
                </div>
                <span className="chip chip-accent">Encrypted access</span>
              </div>

              <form className="form-stack payment-form" onSubmit={handlePaymentSubmit}>
                <Field
                  label="Beneficiary name"
                  name="beneficiaryName"
                  value={paymentValues.beneficiaryName}
                  onChange={(event) =>
                    setPaymentValues((current) => ({
                      ...current,
                      beneficiaryName: event.target.value,
                    }))
                  }
                  error={paymentErrors.beneficiaryName}
                  placeholder="Luca Meyer"
                />
                <div className="input-grid">
                  <SelectField
                    label="Country"
                    name="country"
                    value={paymentValues.country}
                    onChange={(event) =>
                      setPaymentValues((current) => ({
                        ...current,
                        country: event.target.value,
                      }))
                    }
                    error={paymentErrors.country}
                  >
                    {countryOptions.map((country) => (
                      <option key={country.name} value={country.name}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Currency"
                    name="currency"
                    value={paymentValues.currency}
                    onChange={(event) =>
                      setPaymentValues((current) => ({
                        ...current,
                        currency: event.target.value.toUpperCase(),
                      }))
                    }
                    error={paymentErrors.currency}
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.flag} {currency.code} - {currency.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <Field
                  label="Amount"
                  name="amount"
                  value={paymentValues.amount}
                  onChange={(event) =>
                    setPaymentValues((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  error={paymentErrors.amount}
                  placeholder="1250.00"
                />
                <Field
                  label="Beneficiary IBAN"
                  name="iban"
                  value={paymentValues.iban}
                  onChange={(event) =>
                    setPaymentValues((current) => ({
                      ...current,
                      iban: event.target.value.toUpperCase(),
                    }))
                  }
                  error={paymentErrors.iban}
                  placeholder="DE44500105175407324931"
                />
                <Field
                  label="SWIFT / BIC"
                  name="swiftCode"
                  value={paymentValues.swiftCode}
                  onChange={(event) =>
                    setPaymentValues((current) => ({
                      ...current,
                      swiftCode: event.target.value.toUpperCase(),
                    }))
                  }
                  error={paymentErrors.swiftCode}
                  placeholder="DEUTDEFF"
                />
                <Field
                  label="Payment reference"
                  name="reference"
                  value={paymentValues.reference}
                  onChange={(event) =>
                    setPaymentValues((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  error={paymentErrors.reference}
                  placeholder="Invoice 2026/05 consulting"
                />

                <button className="primary-button" disabled={paymentBusy} type="submit">
                  {paymentBusy ? "Submitting..." : "Send payment request"}
                </button>
              </form>

              {paymentMessage ? <p className="status-text">{paymentMessage}</p> : null}
            </section>

            <section className="panel activity-panel">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Submission Log</p>
                  <h2>Recent payment requests</h2>
                </div>
                <span className="chip chip-accent">
                  {String(payments.length).padStart(2, "0")} saved
                </span>
              </div>

              {payments.length === 0 ? (
                <p className="empty-state">
                  No payment requests yet. Send one to demonstrate the secure banking flow.
                </p>
              ) : (
                <div className="payment-list">
                  {payments.map((payment) => (
                    <article className="payment-card" key={payment.id}>
                      <div>
                        <p className="payment-amount">
                          {payment.currency} {Number(payment.amount).toFixed(2)}
                        </p>
                        <p className="payment-meta">
                          {payment.beneficiaryName} • {payment.country}
                        </p>
                      </div>
                      <div className="payment-aside">
                        <span className="chip chip-accent">{payment.status}</span>
                        <p className="payment-reference">{payment.reference}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        </section>
      )}
    </main>
  );
}

function AuthVisual() {
  return (
    <section className="auth-visual panel">
      <BrandMark />

      <div className="hero-copy">
        <p className="section-kicker">Cross-Border Banking</p>
        <h1>Move funds across borders with trusted client access.</h1>
        <p className="lead">
          A secure customer space for onboarding and international payment
          requests, designed for confidence, control, and banker review.
        </p>
      </div>

      <div className="visual-layer">
        <div className="visual-rings" />
        <div className="terrain terrain-back" />
        <div className="terrain terrain-front" />
        <div className="floating-card vault-card panel">
          <div className="vault-card-top">
            <div>
              <p className="mini-label">Client status</p>
              <strong>Premier Customer</strong>
            </div>
            <span className="chip chip-accent">Protected</span>
          </div>
          <p className="vault-card-line">Status: Ready for cross-border payment requests</p>
          <div className="vault-meter">
            <span />
          </div>
          <div className="vault-meta">
            {authSignals.map((signal) => (
              <div key={signal.label}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="assurance-strip">
        {securityCards.map((card) => (
          <article className="assurance-card" key={card.title}>
            <strong>{card.title}</strong>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SceneBackdrop() {
  return (
    <>
      <div className="backdrop-grid" />
      <div className="backdrop-particles backdrop-particles-a" />
      <div className="backdrop-particles backdrop-particles-b" />
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />
      <div className="background-glow background-glow-top" />
      <div className="background-glow background-glow-bottom" />
    </>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark">
      <img alt="Invest Int Bank logo" className="brand-logo" src={bankLogo} />
      <div>
        <strong>Invest Int Bank</strong>
        <p>Customer International Payments Portal</p>
      </div>
    </div>
  );
}

function AuthShowcase() {
  return (
    <section className="auth-showcase panel">
      <div className="auth-showcase-header">
        <div className="auth-showcase-brand">
          <img alt="Invest Int Bank crest" className="showcase-logo" src={bankLogo} />
          <div>
            <strong>Invest Int Bank</strong>
            <p>Private banking card access</p>
          </div>
        </div>
        <span className="chip chip-accent">Growth Banking</span>
      </div>

      <div className="bank-card-stack" aria-hidden="true">
        <article className="bank-card bank-card-back">
          <div className="bank-card-topline">
            <span>Private</span>
            <span>EUR</span>
          </div>
          <div className="bank-card-mark">
            <img alt="" className="bank-card-logo" src={bankLogo} />
            <strong>Invest Int Bank</strong>
          </div>
          <p className="bank-card-number">•••• 4412</p>
        </article>

        <article className="bank-card bank-card-front">
          <div className="bank-card-topline">
            <span>Gold Client</span>
            <span>USD</span>
          </div>
          <div className="bank-card-mark">
            <img alt="" className="bank-card-logo" src={bankLogo} />
            <strong>Invest Int Bank</strong>
          </div>
          <p className="bank-card-number">•••• 2084</p>
          <div className="bank-card-bottomline">
            <span>Priority service</span>
            <span>Worldwide use</span>
          </div>
        </article>
      </div>
    </section>
  );
}

async function getLoginAlertMessage({ email, name }) {
  try {
    const result = await sendLoginAlert({ email, name });

    if (result.skipped) {
      return "Login alert email was skipped because EmailJS is not configured.";
    }

    return "Login alert email sent.";
  } catch (error) {
    console.error(error);
    return "Login alert email could not be sent. Check the EmailJS service, template, and public key.";
  }
}

function Field({
  error,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        autoComplete="off"
        className={error ? "input error" : "input"}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function SelectField({
  children,
  error,
  label,
  name,
  onChange,
  value,
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        className={error ? "input select-input error" : "input select-input"}
        name={name}
        onChange={onChange}
        value={value}
      >
        {children}
      </select>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

async function emailHasSignInMethods(email) {
  if (!auth) {
    return false;
  }

  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function getLockoutKey(email) {
  return `${LOGIN_LOCKOUT_PREFIX}${email}`;
}

function getWrongPasswordAttempts(email) {
  const storedValue = window.localStorage.getItem(getLockoutKey(email));
  const attempts = Number(storedValue);

  if (!Number.isInteger(attempts) || attempts < 0) {
    return 0;
  }

  return attempts;
}

function isLoginLocked(email) {
  return getWrongPasswordAttempts(email) >= MAX_WRONG_PASSWORD_ATTEMPTS;
}

function recordWrongPasswordAttempt(email) {
  const attempts = Math.min(
    getWrongPasswordAttempts(email) + 1,
    MAX_WRONG_PASSWORD_ATTEMPTS,
  );

  window.localStorage.setItem(getLockoutKey(email), String(attempts));
  return attempts;
}

function clearWrongPasswordAttempts(email) {
  window.localStorage.removeItem(getLockoutKey(email));
}

function mapAuthError(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email address is already registered.";
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts detected. Please wait and try again.";
    case "auth/weak-password":
      return "Choose a stronger password that meets the policy.";
    default:
      return "Authentication failed. Verify Firebase setup and try again.";
  }
}

export default App;
