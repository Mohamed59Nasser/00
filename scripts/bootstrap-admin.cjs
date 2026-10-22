/**
 * One-time, local/bootstrap-only Admin creation.
 * The password is read from ADMIN_INITIAL_PASSWORD, hashed in memory, and never printed or written to disk.
 */
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const ADMIN_ID = "670f4db6-f7dc-44e2-9435-7bcf92271ad9";
const ADMIN = {
  username: "Mohamed Nasser",
  usernameNormalized: "mohamed nasser",
  displayName: "Mohamed Nasser",
  email: "mohamednasser555999@gmail.com",
  emailNormalized: "mohamednasser555999@gmail.com",
  phone: "01156426501",
};

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 10 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("ADMIN_INITIAL_PASSWORD must be 10–128 characters and contain a letter and a number.");
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const existing = await client.query(
      "SELECT id, role FROM public.staff_users WHERE id = $1 OR username_normalized = $2 OR email_normalized = $3 LIMIT 1",
      [ADMIN_ID, ADMIN.usernameNormalized, ADMIN.emailNormalized],
    );
    if (existing.rows.length) {
      if (existing.rows[0].role !== "admin") throw new Error("The bootstrap identity is already used by a non-Admin account.");
      console.log(`Admin already exists (${existing.rows[0].id}); no password was changed.`);
      return;
    }

    validatePassword(password);
    const passwordHash = await bcrypt.hash(password, 12);
    process.env.ADMIN_INITIAL_PASSWORD = "";
    await client.query(
      `INSERT INTO public.staff_users
        (id, username, username_normalized, display_name, email, email_normalized, phone, password_hash, role, active, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin', true, true)`,
      [ADMIN_ID, ADMIN.username, ADMIN.usernameNormalized, ADMIN.displayName, ADMIN.email, ADMIN.emailNormalized, ADMIN.phone, passwordHash],
    );
    console.log(`Admin created: ${ADMIN.displayName} <${ADMIN.email}>. First login requires a password change.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Admin bootstrap failed.");
  process.exitCode = 1;
});
