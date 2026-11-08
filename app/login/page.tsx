import { safeNext } from "@/lib/auth";

export const metadata = { title: "Log in · Sauce Hunter" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <form method="post" action="/api/login" className="card login">
      <h1>Sauce Hunter</h1>
      <p className="muted small">Log in to see today&apos;s jobs.</p>
      {sp.error && <p className="danger small" role="alert">Wrong username or password.</p>}
      <input type="hidden" name="next" value={safeNext(sp.next)} />
      <label>Username
        <input type="text" name="user" autoComplete="username" autoCapitalize="none" autoCorrect="off" required autoFocus />
      </label>
      <label>Password
        <input type="password" name="pass" autoComplete="current-password" required />
      </label>
      <button className="primary" type="submit">Log in</button>
    </form>
  );
}
