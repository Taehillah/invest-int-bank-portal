import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
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
import { auth, db, firebaseReady, missingFirebaseKeys } from "./lib/firebase";
import {
  validateLogin,
  validatePayment,
  validateRegistration,
} from "./lib/validators";
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
  country: "",
  currency: "USD",
  amount: "",
  iban: "",
  swiftCode: "",
  reference: "",
};

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
  const authPanelContentRef = useRef(null);
  const [authPanelHeight, setAuthPanelHeight] = useState("auto");

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

    return unsubscribe;
  }, []);

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

      setRegisterValues(registerDefaults);
      setAuthMessage("Registration successful. Your secure session is active.");
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

    try {
      setAuthBusy(true);
      await signInWithEmailAndPassword(
        auth,
        loginValues.email.trim(),
        loginValues.password,
      );
      setLoginValues(loginDefaults);
      setAuthMessage("Login successful.");
    } catch (error) {
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

          <section className="hero-summary">
            <article className="panel summary-panel summary-primary">
              <div className="summary-copy">
                <p className="section-kicker">Payments Desk</p>
                <h2>Secure international payment requests at a glance</h2>
                <p className="muted-copy">
                  Review submitted transfer instructions inside a protected
                  customer journey built for trust, clarity, and banker review.
                </p>
              </div>
              <div className="summary-grid">
                <StatBlock
                  label="Payment requests"
                  value={String(payments.length).padStart(2, "0")}
                />
                <StatBlock label="Instruction checks" value="In place" />
                <StatBlock label="Service mode" value="Demo desk" />
              </div>
            </article>

            <article className="panel summary-panel summary-side">
              <p className="section-kicker">Client Protection</p>
              <div className="signal-list">
                {securityCards.map((card) => (
                  <div className="signal-row" key={card.title}>
                    <div className="signal-bullet" />
                    <div>
                      <strong>{card.title}</strong>
                      <p>{card.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

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
                  <Field
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
                    placeholder="Germany"
                  />
                  <Field
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
                    placeholder="USD"
                  />
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

            <aside className="dashboard-side-stack">
              <section className="panel notes-panel">
                <p className="section-kicker">Presentation Notes</p>
                <h2>What to explain during the banking demo</h2>
                <ul className="security-list">
                  <li>Client passwords are protected and never shown or stored in plain text.</li>
                  <li>Payment details are checked before submission and again before they are accepted.</li>
                  <li>Banking fields only accept expected formats such as IBAN, SWIFT, amount, and reference.</li>
                  <li>Signed-in access is guarded against repeated misuse and unsafe session activity.</li>
                  <li>The live banking portal runs over HTTPS to protect information in transit.</li>
                </ul>
              </section>

              <section className="panel notes-panel">
                <p className="section-kicker">Demonstration Flow</p>
                <div className="tick-list">
                  <div className="tick-row">
                    <span className="tick-mark" />
                    <span>Create a client profile</span>
                  </div>
                  <div className="tick-row">
                    <span className="tick-mark" />
                    <span>Show a rejected incorrect IBAN or amount</span>
                  </div>
                  <div className="tick-row">
                    <span className="tick-mark" />
                    <span>Send a valid international payment request</span>
                  </div>
                  <div className="tick-row">
                    <span className="tick-mark" />
                    <span>Show the secure lock on the live banking site</span>
                  </div>
                </div>
              </section>
            </aside>
          </section>

          <section className="panel activity-panel">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Submission Log</p>
                <h2>Recent payment requests</h2>
              </div>
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

function StatBlock({ label, value }) {
  return (
    <div className="stat-block">
      <span>{label}</span>
      <strong>{value}</strong>
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
