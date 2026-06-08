import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export async function listPaymentRequests(db, userId) {
  const paymentsRef = collection(db, "customers", userId, "payments");
  const paymentsQuery = query(paymentsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(paymentsQuery);

  return snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));
}

export async function createPaymentRequest(db, userId, payment) {
  return addDoc(collection(db, "customers", userId, "payments"), {
    amount: Number(payment.amount),
    beneficiaryName: payment.beneficiaryName,
    country: payment.country,
    createdAt: serverTimestamp(),
    currency: payment.currency,
    iban: payment.iban,
    reference: payment.reference,
    status: "SUBMITTED_FOR_SIMULATION",
    swiftCode: payment.swiftCode,
  });
}
