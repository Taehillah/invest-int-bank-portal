const emailJsConfig = {
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_LOGIN_TEMPLATE_ID,
};

export function loginAlertsConfigured() {
  return Object.values(emailJsConfig).every(Boolean);
}

export async function sendLoginAlert({ email, name }) {
  if (!loginAlertsConfigured()) {
    return { skipped: true };
  }

  const loginContext = getLoginContext();
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    body: JSON.stringify({
      accessToken: emailJsConfig.publicKey,
      service_id: emailJsConfig.serviceId,
      template_id: emailJsConfig.templateId,
      user_id: emailJsConfig.publicKey,
      template_params: {
        browser: loginContext.browser,
        device: loginContext.device,
        login_time: loginContext.loginTime,
        timezone: loginContext.timezone,
        to_email: email,
        to_name: name || "Invest Int Bank customer",
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Login alert email could not be sent.");
  }

  return { skipped: false };
}

function getLoginContext() {
  const userAgent = navigator.userAgent || "Unknown browser";
  const platform = navigator.userAgentData?.platform || navigator.platform || "Unknown device";

  return {
    browser: userAgent,
    device: platform,
    loginTime: new Date().toLocaleString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown timezone",
  };
}
