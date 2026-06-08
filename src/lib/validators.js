const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const nameRegex = /^[A-Za-z][A-Za-z\s'-]{1,59}$/;
const amountRegex = /^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/;
const ibanRegex = /^[A-Z0-9]{15,34}$/;
const swiftRegex = /^[A-Z0-9]{8}(?:[A-Z0-9]{3})?$/;
const referenceRegex = /^[A-Za-z0-9 .,\-()/]{6,140}$/;
const countryRegex = /^[A-Za-z\s-]{2,56}$/;

export function normalizeIban(value) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function validateLogin(values) {
  const errors = {};

  if (!emailRegex.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export function validatePayment(values) {
  const errors = {};
  const normalizedIban = normalizeIban(values.iban);

  if (!nameRegex.test(values.beneficiaryName.trim())) {
    errors.beneficiaryName = "Beneficiary name is invalid.";
  }

  if (!countryRegex.test(values.country.trim())) {
    errors.country = "Country is invalid.";
  }

  if (!/^[A-Z]{3}$/.test(values.currency.trim().toUpperCase())) {
    errors.currency = "Currency must be a 3-letter code such as USD.";
  }

  if (!amountRegex.test(values.amount.trim())) {
    errors.amount = "Amount must be numeric with up to 2 decimal places.";
  } else if (Number(values.amount) <= 0 || Number(values.amount) > 1000000) {
    errors.amount = "Amount must be greater than 0 and below 1,000,000.";
  }

  if (!ibanRegex.test(normalizedIban)) {
    errors.iban = "IBAN must be 15 to 34 uppercase letters and digits.";
  }

  if (!swiftRegex.test(values.swiftCode.trim().toUpperCase())) {
    errors.swiftCode = "SWIFT/BIC must be 8 or 11 uppercase letters and digits.";
  }

  if (!referenceRegex.test(values.reference.trim())) {
    errors.reference =
      "Reference must be 6 to 140 safe characters only.";
  }

  return {
    errors,
    normalized: {
      ...values,
      beneficiaryName: values.beneficiaryName.trim(),
      country: values.country.trim(),
      currency: values.currency.trim().toUpperCase(),
      iban: normalizedIban,
      swiftCode: values.swiftCode.trim().toUpperCase(),
      reference: values.reference.trim(),
    },
  };
}
