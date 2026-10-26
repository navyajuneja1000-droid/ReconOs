import { admin, json, userFrom } from "./_lib";

/** Deletes the logged-in user; their profile, rate cards and audits go with it (on delete cascade). */
export async function POST(req: Request) {
  let db;
  try { db = admin(); } catch { return json({ error: "not configured" }, 503); }
  const user = await userFrom(req, db);
  if (!user) return json({ error: "Please log in again." }, 401);
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "Couldn't delete right now." }, 500);
  return json({ ok: true });
}
