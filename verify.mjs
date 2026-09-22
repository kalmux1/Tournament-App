// verify.mjs
// Marks Firebase Auth users as email-verified without sending an email.
// Usage:  node verify.mjs admin@imrt.in scorer@imrt.in
import { initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { readFileSync } from "fs"

const serviceAccount = JSON.parse(readFileSync("./service-account.json", "utf8"))
initializeApp({ credential: cert(serviceAccount) })

const auth = getAuth()
const emails = process.argv.slice(2)

if (emails.length === 0) {
  console.error("Usage: node verify.mjs <email1> [email2] ...")
  process.exit(1)
}

for (const email of emails) {
  try {
    const user = await auth.getUserByEmail(email)
    await auth.updateUser(user.uid, { emailVerified: true })
    console.log(`✅ Verified ${email}  (uid: ${user.uid})`)
  } catch (err) {
    console.error(`❌ ${email}: ${err.message}`)
  }
}

console.log("\nDone.")