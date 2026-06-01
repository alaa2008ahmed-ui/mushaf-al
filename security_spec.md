# Security Specification for Daily Sales Report

## Data Invariants
1.  **Identity Bond:** Every `Invoice` should ideally be linked to the user who created it, but in this app's current implementation, it uses `updatedAt` and optimistic local storage.
2.  **Schema Integrity:** No document can have extra fields not defined in the schema.
3.  **Role-Based Access:** Standard users should not be able to modify system `records` of type `branch` or `item` or other `user` records, although the current app UI manages this, rules must enforce it.
4.  **PO Balance Integrity:** `poCustomers` data should be accurately maintained.

## The Dirty Dozen Payloads (Rejection Targets)
1.  **Identity Spoofing:** Create a `salesInvoice` with a fake ID.
2.  **Privilege Escalation:** A regular user trying to update their own role to 'admin' in `records/{userId}`.
3.  **Schema Poisoning:** Adding a 1MB junk string to `itemName` in `salesInvoices`.
4.  **Cross-Branch Modification:** (If we had strict branch isolation, but currently it's more open).
5.  **State Bypassing:** Modifying a 'monthly' status invoice back to 'daily'.
6.  **Admin Bypass:** Deleting all `customers` without being authenticated.
7.  **Unverified User Write:** Writing to `poCustomers` with an unverified email.
8.  **Empty Payload:** Creating a `customer` with no fields.
9.  **Type Mismatch:** Sending a string for `quantity` in `salesInvoices`.
10. **ID Injection:** Using `../../../system` as a document ID.
11. **PII Exposure:** Reading another user's PII (though mostly public in this system).
12. **Recursive Cost Attack:** Deep nested document lookup (if we had complex rules).

## Test Runner (firestore.rules.test.ts)
```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "gen-lang-client-0808250175",
    firestore: {
      rules: await fs.readFile("firestore.rules", "utf8"),
    },
  });
});

test("should deny unauthenticated access", async () => {
  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(unauthedDb, "records/test")));
});
```
