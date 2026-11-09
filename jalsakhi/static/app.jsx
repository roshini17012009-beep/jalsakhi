const { useState, useEffect, useRef } = React;

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */
async function api(path, method = "GET", body) {
  const res = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

const STATUS = {
  Safe:    { bg: "bg-emerald-100", text: "text-emerald-700", ring: "#10b981", emoji: "✅", msg: "Safe to drink" },
  Caution: { bg: "bg-amber-100",   text: "text-amber-700",   ring: "#f59e0b", emoji: "⚠️", msg: "Treat before drinking" },
  Unsafe:  { bg: "bg-rose-100",    text: "text-rose-700",    ring: "#f43f5e", emoji: "⛔", msg: "Do not drink untreated" },
};
const ROLE_LABEL = { villager: "Villager", health_worker: "Health Worker", admin: "Administrator" };
const SOURCES = ["Borewell", "Hand pump", "Tap water", "Open well", "River", "Pond", "Canal"];

function go(path) { window.location.hash = path; }

function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "/");
  useEffect(() => {
    const h = () => { setRoute(window.location.hash.slice(1) || "/"); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return route;
}

function Badge({ status }) {
  const s = STATUS[status];
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{status}</span>;
}

function Logo({ light }) {
  return (
    <a href="#/" className="flex items-center gap-2 select-none">
      <span className="relative inline-block w-8 h-8">
        <span className="drop absolute inset-1 bg-gradient-to-br from-cyan-300 to-ocean-600 shadow-lg"></span>
      </span>
      <span className={`text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-ocean-800"}`}>
        Jal<span className="text-cyan-300">Sakhi</span>
      </span>
    </a>
  );
}

function Waves() {
  const path = "M0,64 C150,120 350,0 600,64 C850,128 1050,10 1200,64 L1200,120 L0,120 Z";
  return (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none h-28 pointer-events-none">
      <div className="flex w-[200%] animate-wave2 absolute bottom-0 opacity-40">
        {[0, 1].map(i => <svg key={i} viewBox="0 0 1200 120" className="w-1/2 h-28" preserveAspectRatio="none"><path d={path} fill="#a5f3fc" /></svg>)}
      </div>
      <div className="flex w-[200%] animate-wave absolute bottom-0">
        {[0, 1].map(i => <svg key={i} viewBox="0 0 1200 120" className="w-1/2 h-24" preserveAspectRatio="none"><path d={path} fill="#f0fbfd" /></svg>)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */
function Navbar({ user, onLogout, route }) {
  const [open, setOpen] = useState(false);
  const links = user
    ? [["/dashboard", "Dashboard"], ["/test", "Test Water"], ["/history", "History"], ["/rules", "Rules"], ["/about", "About"]]
    : [["/", "Home"], ["/rules", "Rules"], ["/about", "About"]];
  const dark = !user && route === "/";
  const textCls = dark ? "text-white/90 hover:text-white" : "text-ocean-800 hover:text-ocean-500";
  return (
    <header className={`${dark ? "absolute" : "sticky bg-white/85 backdrop-blur shadow-sm"} top-0 inset-x-0 z-40`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
        <Logo light={dark} />
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {links.map(([to, label]) => (
            <a key={to} href={"#" + to} className={`${textCls} ${route === to ? "font-bold underline underline-offset-8 decoration-cyan-400" : ""}`}>{label}</a>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <div className="text-ocean-900 font-semibold text-sm">{user.name}</div>
                <div className="text-[11px] text-ocean-600">{ROLE_LABEL[user.role]}</div>
              </div>
              <button onClick={onLogout} className="btn px-4 py-2 rounded-full bg-ocean-700 text-white text-sm hover:bg-ocean-800">Logout</button>
            </div>
          ) : (
            <a href="#/login" className="btn px-5 py-2 rounded-full bg-white text-ocean-800 font-semibold shadow hover:shadow-lg">Login</a>
          )}
        </nav>
        <button className={`md:hidden text-2xl ${dark ? "text-white" : "text-ocean-800"}`} onClick={() => setOpen(!open)}>☰</button>
      </div>
      {open && (
        <div className="md:hidden bg-white shadow-lg px-5 pb-4 flex flex-col gap-3 text-ocean-900 font-medium">
          {links.map(([to, label]) => <a key={to} href={"#" + to} onClick={() => setOpen(false)}>{label}</a>)}
          {user ? <button className="text-left text-rose-600" onClick={() => { setOpen(false); onLogout(); }}>Logout</button>
                : <a href="#/login" onClick={() => setOpen(false)}>Login</a>}
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-ocean-950 text-ocean-200 mt-20">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row gap-6 justify-between items-center text-sm">
        <Logo light />
        <p className="text-center">Clean water for every village · Rule-based advisory using pH, turbidity and TDS</p>
        <p className="text-ocean-400">© 2026 JalSakhi</p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Home                                                               */
/* ------------------------------------------------------------------ */
function Home({ user }) {
  const features = [
    ["🧪", "Instant Water Test", "Enter pH, turbidity and TDS readings from a simple field kit and get a verdict in seconds."],
    ["🧠", "Rule-Based Reasoning", "Transparent IF-THEN rules based on drinking-water standards. See exactly why advice was given."],
    ["📊", "Live Dashboards", "Village-wise safety scores, trends and risk alerts for health workers and officers."],
    ["🗣️", "Simple Advice", "Plain steps such as boil, filter, add alum or chlorinate that every family can follow."],
  ];
  const steps = [["1", "Collect a sample", "Use a TDS meter, pH strip and turbidity tube."], ["2", "Enter the readings", "Choose the village and water source."],
                 ["3", "Rules fire", "The engine matches your readings against IF-THEN rules."], ["4", "Get advice", "Safe, Caution or Unsafe, with clear next steps."]];
  return (
    <div>
      <section className="hero-bg relative text-white overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl -top-10 -left-10"></div>
        <div className="absolute w-96 h-96 rounded-full bg-sky-400/20 blur-3xl bottom-0 right-0"></div>
        <div className="max-w-6xl mx-auto px-5 pt-36 pb-48 grid md:grid-cols-2 gap-10 items-center relative z-10">
          <div className="animate-rise">
            <span className="glass px-4 py-1.5 rounded-full text-xs tracking-wider uppercase">Village Water-Quality Advisory Assistant</span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mt-5">Know your water.<br /><span className="text-cyan-300">Protect your village.</span></h1>
            <p className="mt-5 text-ocean-100 text-lg max-w-lg">JalSakhi turns three simple measurements into clear, trustworthy advice, powered by transparent rule-based reasoning.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href={user ? "#/test" : "#/register"} className="btn px-7 py-3 rounded-full bg-white text-ocean-800 font-semibold shadow-xl">{user ? "Test your water" : "Get started free"}</a>
              <a href={user ? "#/dashboard" : "#/login"} className="btn px-7 py-3 rounded-full glass font-semibold">{user ? "Open dashboard" : "Login"}</a>
            </div>
            <div className="mt-10 flex gap-8 text-sm">
              {[["3", "Parameters"], ["11", "Expert rules"], ["3", "User roles"]].map(([n, l]) => (
                <div key={l}><div className="text-3xl font-extrabold text-cyan-300">{n}</div><div className="text-ocean-100">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="relative flex justify-center animate-floaty">
            <div className="glass rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Sample report</span><span className="text-xs text-ocean-100">Kovilpatti · Borewell</span>
              </div>
              {[["pH", "7.2", "Normal", 72], ["Turbidity", "0.8 NTU", "Clear", 90], ["TDS", "340 mg/L", "Good", 80]].map(([k, v, s, w]) => (
                <div key={k} className="mb-4">
                  <div className="flex justify-between text-sm"><span>{k}</span><span className="font-semibold">{v} · {s}</span></div>
                  <div className="h-2 rounded-full bg-white/20 mt-1"><div className="h-2 rounded-full bg-cyan-300" style={{ width: w + "%" }}></div></div>
                </div>
              ))}
              <div className="rounded-2xl bg-emerald-400/90 text-emerald-950 font-semibold px-4 py-3 text-center">✅ Safe to drink · Score 100</div>
            </div>
          </div>
        </div>
        <Waves />
      </section>

      <section className="max-w-6xl mx-auto px-5 -mt-6">
        <h2 className="text-3xl font-extrabold text-ocean-900 text-center">Everything a village needs</h2>
        <p className="text-center text-ocean-700 mt-2">Simple for villagers, powerful for health workers and officers.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {features.map(([i, t, d]) => (
            <div key={t} className="card p-6 hover:-translate-y-2 transition">
              <div className="text-4xl">{i}</div>
              <h3 className="font-bold text-ocean-900 mt-3">{t}</h3>
              <p className="text-sm text-slate-600 mt-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 mt-24">
        <h2 className="text-3xl font-extrabold text-ocean-900 text-center">How it works</h2>
        <div className="grid md:grid-cols-4 gap-6 mt-10">
          {steps.map(([n, t, d]) => (
            <div key={n} className="relative card p-6 pt-10">
              <div className="absolute -top-5 left-6 w-11 h-11 rounded-full bg-gradient-to-br from-cyan-400 to-ocean-700 text-white font-bold flex items-center justify-center shadow-lg">{n}</div>
              <h3 className="font-bold text-ocean-900">{t}</h3>
              <p className="text-sm text-slate-600 mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 mt-24">
        <div className="hero-bg rounded-3xl text-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div><h2 className="text-3xl font-extrabold">Ready to check your village water?</h2><p className="text-ocean-100 mt-2">Create a free account in under a minute.</p></div>
          <a href={user ? "#/test" : "#/register"} className="btn px-8 py-3 rounded-full bg-white text-ocean-800 font-semibold">{user ? "Start a test" : "Create account"}</a>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Login / Register                                                   */
/* ------------------------------------------------------------------ */
function Auth({ mode, onAuth }) {
  const isLogin = mode === "login";
  const [f, setF] = useState({ name: "", email: "", password: "", village: "", role: "villager" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const { user } = await api(isLogin ? "/auth/login" : "/auth/register", "POST", f);
      onAuth(user); go("/dashboard");
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  const demo = (email, password) => setF({ ...f, email, password });
  const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white";

  return (
    <div className="hero-bg min-h-screen flex items-center justify-center px-4 py-24 relative overflow-hidden">
      <div className="absolute w-80 h-80 rounded-full bg-cyan-300/20 blur-3xl top-10 left-10"></div>
      <div className="relative z-10 grid md:grid-cols-2 max-w-4xl w-full rounded-3xl overflow-hidden shadow-2xl animate-rise">
        <div className="hidden md:flex flex-col justify-between p-10 text-white glass">
          <Logo light />
          <div>
            <h2 className="text-3xl font-extrabold leading-snug">{isLogin ? "Welcome back" : "Join your village's water guardians"}</h2>
            <p className="text-ocean-100 mt-3 text-sm">Test water, track quality over time and get clear advice for your family and community.</p>
          </div>
          <div className="text-xs text-ocean-100">💧 Every drop counts.</div>
        </div>
        <form onSubmit={submit} className="bg-white p-8 md:p-10">
          <h1 className="text-2xl font-extrabold text-ocean-900">{isLogin ? "Login to JalSakhi" : "Create your account"}</h1>
          <p className="text-sm text-slate-500 mb-6">{isLogin ? "Enter your details to continue." : "It only takes a minute."}</p>
          {err && <div className="mb-4 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3">{err}</div>}
          <div className="space-y-4">
            {!isLogin && <input className={inp} placeholder="Full name" value={f.name} onChange={set("name")} required />}
            <input className={inp} type="email" placeholder="Email address" value={f.email} onChange={set("email")} required />
            <input className={inp} type="password" placeholder="Password (min 6 characters)" value={f.password} onChange={set("password")} required />
            {!isLogin && (
              <>
                <input className={inp} placeholder="Village name" value={f.village} onChange={set("village")} />
                <select className={inp} value={f.role} onChange={set("role")}>
                  <option value="villager">I am a villager</option>
                  <option value="health_worker">I am a health worker</option>
                </select>
              </>
            )}
          </div>
          <button disabled={busy} className="btn w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-ocean-600 to-cyan-500 text-white font-semibold shadow-lg disabled:opacity-60">
            {busy ? "Please wait…" : isLogin ? "Login" : "Create account"}
          </button>
          <p className="text-sm text-center text-slate-500 mt-5">
            {isLogin ? "New here? " : "Already registered? "}
            <a className="text-ocean-600 font-semibold" href={isLogin ? "#/register" : "#/login"}>{isLogin ? "Create an account" : "Login"}</a>
          </p>
          {isLogin && (
            <div className="mt-6 border-t pt-4">
              <p className="text-xs text-slate-400 mb-2">Demo accounts (click to fill):</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={() => demo("ravi@jalsakhi.in", "ravi123")} className="px-3 py-1 rounded-full bg-ocean-50 text-ocean-700">Villager</button>
                <button type="button" onClick={() => demo("health@jalsakhi.in", "health123")} className="px-3 py-1 rounded-full bg-ocean-50 text-ocean-700">Health worker</button>
                <button type="button" onClick={() => demo("admin@jalsakhi.in", "admin123")} className="px-3 py-1 rounded-full bg-ocean-50 text-ocean-700">Admin</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Charts                                                             */
/* ------------------------------------------------------------------ */
function ChartBox({ build, deps, height = 260 }) {
  const ref = useRef(null);
  useEffect(() => {
    const chart = new Chart(ref.current, build());
    return () => chart.destroy();
  }, deps);
  return <div style={{ height }}><canvas ref={ref}></canvas></div>;
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
function Stat({ icon, label, value, sub, tone }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${tone}`}>{icon}</div>
      <div><div className="text-2xl font-extrabold text-ocean-900 leading-none">{value}</div>
        <div className="text-sm text-slate-500 mt-1">{label}</div>{sub && <div className="text-[11px] text-slate-400">{sub}</div>}</div>
    </div>
  );
}

function Dashboard({ user }) {
  const [s, setS] = useState(null);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/stats").then(setS).catch(e => setErr(e.message));
    if (user.role === "admin") api("/users").then(d => setUsers(d.users)).catch(() => {});
  }, []);
  if (err) return <Page><p className="text-rose-600">{err}</p></Page>;
  if (!s) return <Page><p className="text-ocean-700">Loading dashboard…</p></Page>;

  const scopeText = user.role === "villager" ? "Your water tests" : "All village tests";
  const overall = s.total ? Math.round(s.trend.reduce((a, t) => a + t.score, 0) / s.trend.length) : 0;
  const labels = s.trend.map(t => t.date.slice(5));

  return (
    <Page title={`Hello, ${user.name.split(" ")[0]} 👋`} sub={`${scopeText} · ${ROLE_LABEL[user.role]} view`}
          action={<a href="#/test" className="btn px-6 py-3 rounded-full bg-gradient-to-r from-ocean-600 to-cyan-500 text-white font-semibold shadow-lg">+ New water test</a>}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Stat icon="🧪" label="Total tests" value={s.total} tone="bg-ocean-100" />
        <Stat icon="✅" label="Safe" value={s.counts.Safe} tone="bg-emerald-100" />
        <Stat icon="⚠️" label="Caution" value={s.counts.Caution} tone="bg-amber-100" />
        <Stat icon="⛔" label="Unsafe" value={s.counts.Unsafe} tone="bg-rose-100" sub={s.total ? `Avg score ${overall}` : ""} />
      </div>

      {s.total === 0 ? (
        <div className="card p-10 mt-8 text-center text-slate-500">No tests yet. <a className="text-ocean-600 font-semibold" href="#/test">Run your first test</a>.</div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            <div className="card p-6">
              <h3 className="font-bold text-ocean-900 mb-3">Water status split</h3>
              <ChartBox deps={[s]} build={() => ({
                type: "doughnut",
                data: { labels: ["Safe", "Caution", "Unsafe"], datasets: [{ data: [s.counts.Safe, s.counts.Caution, s.counts.Unsafe], backgroundColor: ["#10b981", "#f59e0b", "#f43f5e"], borderWidth: 0 }] },
                options: { maintainAspectRatio: false, cutout: "68%", plugins: { legend: { position: "bottom" } } }
              })} />
            </div>
            <div className="card p-6 lg:col-span-2">
              <h3 className="font-bold text-ocean-900 mb-3">Safety score trend (latest tests)</h3>
              <ChartBox deps={[s]} build={() => ({
                type: "line",
                data: { labels, datasets: [{ label: "Score", data: s.trend.map(t => t.score), borderColor: "#0891b2", backgroundColor: "rgba(34,211,238,.2)", fill: true, tension: .35, pointRadius: 4 }] },
                options: { maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
              })} />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <div className="card p-6">
              <h3 className="font-bold text-ocean-900 mb-3">pH &amp; turbidity readings</h3>
              <ChartBox deps={[s]} build={() => ({
                type: "bar",
                data: { labels, datasets: [
                  { label: "pH", data: s.trend.map(t => t.ph), backgroundColor: "#06b6d4", borderRadius: 6 },
                  { label: "Turbidity (NTU)", data: s.trend.map(t => t.turbidity), backgroundColor: "#a78bfa", borderRadius: 6 }] },
                options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
              })} />
            </div>
            <div className="card p-6">
              <h3 className="font-bold text-ocean-900 mb-3">TDS readings (mg/L)</h3>
              <ChartBox deps={[s]} build={() => ({
                type: "line",
                data: { labels, datasets: [
                  { label: "TDS", data: s.trend.map(t => t.tds), borderColor: "#f97316", backgroundColor: "rgba(249,115,22,.15)", fill: true, tension: .3 },
                  { label: "Desirable limit", data: s.trend.map(() => 500), borderColor: "#10b981", borderDash: [6, 6], pointRadius: 0 }] },
                options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
              })} />
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 mt-6">
            <div className="card p-6 lg:col-span-3">
              <h3 className="font-bold text-ocean-900 mb-4">Village risk ranking</h3>
              <div className="space-y-4">
                {s.villages.map(v => (
                  <div key={v.village}>
                    <div className="flex justify-between text-sm"><span className="font-semibold text-ocean-900">{v.village}</span>
                      <span className="text-slate-500">{v.tests} tests · {v.unsafe} unsafe · avg {v.avg_score}</span></div>
                    <div className="h-2.5 bg-slate-100 rounded-full mt-1.5">
                      <div className="h-2.5 rounded-full" style={{ width: v.avg_score + "%", background: v.avg_score >= 80 ? "#10b981" : v.avg_score >= 50 ? "#f59e0b" : "#f43f5e" }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6 lg:col-span-2">
              <h3 className="font-bold text-ocean-900 mb-4">Recent tests</h3>
              <div className="space-y-3">
                {s.recent.map(t => (
                  <a key={t.id} href={"#/result/" + t.id} className="flex items-center justify-between rounded-xl p-3 hover:bg-ocean-50 transition">
                    <div><div className="font-semibold text-sm text-ocean-900">{t.village}</div><div className="text-xs text-slate-500">{t.source} · {t.created_at.slice(0, 10)}</div></div>
                    <Badge status={t.status} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {user.role === "admin" && (
        <div className="card p-6 mt-6">
          <h3 className="font-bold text-ocean-900 mb-4">👥 Registered users (admin only)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-500"><tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Village</th></tr></thead>
              <tbody>{users.map(u => <tr key={u.id} className="border-t"><td className="py-2 font-medium">{u.name}</td><td>{u.email}</td><td>{ROLE_LABEL[u.role]}</td><td>{u.village}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/*  Page wrapper                                                       */
/* ------------------------------------------------------------------ */
function Page({ title, sub, action, children }) {
  return (
    <main className="max-w-6xl mx-auto px-5 pt-10 min-h-[70vh] animate-rise">
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div><h1 className="text-3xl font-extrabold text-ocean-900">{title}</h1>{sub && <p className="text-ocean-700 text-sm mt-1">{sub}</p>}</div>
          {action}
        </div>
      )}
      {children}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Water test form                                                    */
/* ------------------------------------------------------------------ */
function Slider({ label, unit, min, max, step, value, onChange, hint }) {
  return (
    <div>
      <div className="flex justify-between items-end">
        <label className="font-semibold text-ocean-900 text-sm">{label}</label>
        <div className="flex items-center gap-1">
          <input type="number" step={step} min={min} max={max} value={value} onChange={e => onChange(e.target.value)}
                 className="w-24 text-right border border-slate-200 rounded-lg px-2 py-1 text-sm font-semibold" />
          <span className="text-xs text-slate-500 w-12">{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} className="w-full mt-2" />
      <p className="text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function TestForm({ user }) {
  const [f, setF] = useState({ village: user.village || "", source: "Borewell", ph: 7, turbidity: 1, tds: 300 });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { const r = await api("/analyze", "POST", f); go("/result/" + r.id); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  const inp = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white";
  return (
    <Page title="Test your water" sub="Enter readings from your test kit. The rule engine does the rest.">
      <form onSubmit={submit} className="card p-8 max-w-3xl mx-auto">
        {err && <div className="mb-4 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div><label className="text-sm font-semibold text-ocean-900">Village</label>
            <input className={inp + " mt-1"} value={f.village} onChange={e => set("village")(e.target.value)} placeholder="e.g. Kovilpatti" required /></div>
          <div><label className="text-sm font-semibold text-ocean-900">Water source</label>
            <select className={inp + " mt-1"} value={f.source} onChange={e => set("source")(e.target.value)}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="space-y-7">
          <Slider label="🧪 pH level" unit="pH" min={0} max={14} step={0.1} value={f.ph} onChange={set("ph")} hint="Acceptable range 6.5 to 8.5" />
          <Slider label="🌫️ Turbidity" unit="NTU" min={0} max={50} step={0.1} value={f.turbidity} onChange={set("turbidity")} hint="Desirable ≤ 1 NTU, permissible ≤ 5 NTU" />
          <Slider label="🧂 TDS (dissolved solids)" unit="mg/L" min={0} max={4000} step={10} value={f.tds} onChange={set("tds")} hint="Desirable ≤ 500 mg/L, permissible ≤ 2000 mg/L" />
        </div>
        <button disabled={busy} className="btn w-full mt-8 py-3.5 rounded-xl bg-gradient-to-r from-ocean-600 to-cyan-500 text-white font-semibold shadow-lg disabled:opacity-60">
          {busy ? "Analysing…" : "Analyse water quality"}
        </button>
      </form>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/*  Result + recommendations                                           */
/* ------------------------------------------------------------------ */
function ScoreRing({ score, color }) {
  const r = 54, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 140 140" className="w-40 h-40">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset 1s" }} />
      <text x="70" y="68" textAnchor="middle" className="font-extrabold" fontSize="30" fill="#164e63">{score}</text>
      <text x="70" y="88" textAnchor="middle" fontSize="11" fill="#64748b">out of 100</text>
    </svg>
  );
}

function Result({ id }) {
  const [t, setT] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { setT(null); api("/tests/" + id).then(d => setT(d.test)).catch(e => setErr(e.message)); }, [id]);
  if (err) return <Page><p className="text-rose-600">{err}</p></Page>;
  if (!t) return <Page><p className="text-ocean-700">Loading result…</p></Page>;
  const s = STATUS[t.status];
  const sevColor = { unsafe: "border-rose-400 bg-rose-50", caution: "border-amber-400 bg-amber-50", safe: "border-emerald-400 bg-emerald-50" };
  return (
    <Page title="Water analysis result" sub={`${t.village} · ${t.source} · ${t.created_at.replace("T", " ")}`}
          action={<a href="#/test" className="btn px-5 py-2.5 rounded-full bg-ocean-700 text-white text-sm">Test again</a>}>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-8 flex flex-col items-center text-center">
          <ScoreRing score={t.score} color={s.ring} />
          <div className="text-4xl mt-2">{s.emoji}</div>
          <div className={`mt-2 px-4 py-1.5 rounded-full font-bold ${s.bg} ${s.text}`}>{t.status}</div>
          <p className="text-slate-600 mt-3 text-sm">{s.msg}</p>
          <div className="grid grid-cols-3 gap-3 w-full mt-6 text-center">
            {[["pH", t.ph], ["NTU", t.turbidity], ["TDS", t.tds]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-ocean-50 py-3"><div className="font-extrabold text-ocean-900">{v}</div><div className="text-[11px] text-slate-500">{k}</div></div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-ocean-900 mb-1">🧠 Rule-based reasoning</h3>
            <p className="text-xs text-slate-500 mb-4">These IF-THEN rules matched your readings.</p>
            <div className="space-y-3">
              {t.findings.map(f => (
                <div key={f.rule} className={`border-l-4 rounded-xl p-4 ${sevColor[f.severity]}`}>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">{f.rule}</span>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{f.severity}</span></div>
                  <div className="text-sm mt-1"><b className="text-ocean-800">IF</b> {f.if}</div>
                  <div className="text-sm"><b className="text-ocean-800">THEN</b> {f.then}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-bold text-ocean-900 mb-4">💡 Recommendations</h3>
            <ol className="space-y-3">
              {t.advice.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-ocean-700 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>{a}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/*  History                                                            */
/* ------------------------------------------------------------------ */
function History({ user }) {
  const [tests, setTests] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const load = () => api("/tests").then(d => setTests(d.tests));
  useEffect(() => { load(); }, []);
  const del = async (id) => { if (confirm("Delete this test record?")) { await api("/tests/" + id, "DELETE"); load(); } };
  if (!tests) return <Page><p className="text-ocean-700">Loading history…</p></Page>;
  const shown = tests.filter(t => (filter === "All" || t.status === filter) &&
    (t.village + t.source).toLowerCase().includes(q.toLowerCase()));
  return (
    <Page title="Test history" sub={user.role === "villager" ? "Your previous tests" : "All recorded tests"}>
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search village or source…" className="border border-slate-200 rounded-full px-5 py-2.5 text-sm bg-white w-64" />
        {["All", "Safe", "Caution", "Unsafe"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-full text-sm font-medium ${filter === s ? "bg-ocean-700 text-white" : "bg-white text-ocean-800 border border-slate-200"}`}>{s}</button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-ocean-50 text-ocean-800"><tr>
            {["Date", "Village", "Source", "pH", "NTU", "TDS", "Score", "Status", "Tested by", ""].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {shown.map(t => (
              <tr key={t.id} className="border-t hover:bg-ocean-50/50">
                <td className="px-4 py-3">{t.created_at.slice(0, 10)}</td><td className="px-4 font-medium">{t.village}</td><td className="px-4">{t.source}</td>
                <td className="px-4">{t.ph}</td><td className="px-4">{t.turbidity}</td><td className="px-4">{t.tds}</td><td className="px-4 font-semibold">{t.score}</td>
                <td className="px-4"><Badge status={t.status} /></td><td className="px-4 text-slate-500">{t.tested_by}</td>
                <td className="px-4 whitespace-nowrap">
                  <a href={"#/result/" + t.id} className="text-ocean-600 font-semibold mr-3">View</a>
                  {user.role === "admin" && <button onClick={() => del(t.id)} className="text-rose-500">Delete</button>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan="10" className="px-4 py-10 text-center text-slate-400">No tests found.</td></tr>}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/*  Rules + About                                                      */
/* ------------------------------------------------------------------ */
function Rules() {
  const [rules, setRules] = useState([]);
  useEffect(() => { api("/rules").then(d => setRules(d.rules)); }, []);
  return (
    <Page title="The rule base" sub="Every recommendation comes from one of these transparent IF-THEN rules.">
      <div className="grid md:grid-cols-2 gap-4">
        {rules.map(r => (
          <div key={r.id} className="card p-5">
            <div className="flex justify-between"><span className="font-bold text-ocean-700">{r.id}</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${r.severity === "unsafe" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{r.severity}</span></div>
            <p className="text-sm mt-2"><b className="text-ocean-800">IF</b> {r.if}</p>
            <p className="text-sm"><b className="text-ocean-800">THEN</b> {r.then}</p>
          </div>
        ))}
      </div>
    </Page>
  );
}

function About() {
  const roles = [
    ["🏡", "Villager", "Test water, view own history and get recommendations."],
    ["🩺", "Health Worker", "Everything a villager can do, plus see all villages and the full dashboard."],
    ["🛡️", "Administrator", "Full access, including user list and deleting records."],
  ];
  return (
    <Page title="About JalSakhi" sub="Village Water-Quality Advisory Assistant using rule-based reasoning">
      <div className="card p-8 leading-relaxed text-slate-700">
        <p><b className="text-ocean-900">JalSakhi</b> (“water friend”) helps villages judge drinking-water safety without a laboratory. It reads three field measurements (pH, turbidity and TDS) plus the type of source, and applies expert IF-THEN rules based on Indian drinking-water norms (IS 10500) to give a clear verdict and practical advice.</p>
        <p className="mt-4">Because the system is rule-based, every result is explainable: the result page lists the exact rules that fired, so health workers and villagers can trust and verify the advice. This tool is a first-level screening aid; confirm serious findings with an accredited laboratory.</p>
      </div>
      <h2 className="text-2xl font-extrabold text-ocean-900 mt-10 mb-4">User roles</h2>
      <div className="grid md:grid-cols-3 gap-5">
        {roles.map(([i, t, d]) => <div key={t} className="card p-6"><div className="text-3xl">{i}</div><h3 className="font-bold text-ocean-900 mt-2">{t}</h3><p className="text-sm text-slate-600 mt-1">{d}</p></div>)}
      </div>
      <h2 className="text-2xl font-extrabold text-ocean-900 mt-10 mb-4">Technology</h2>
      <div className="flex flex-wrap gap-3">
        {["React.js", "Tailwind CSS", "Chart.js", "Flask", "SQLite", "Rule-based inference engine"].map(t => <span key={t} className="px-4 py-2 rounded-full bg-white shadow text-sm font-medium text-ocean-800">{t}</span>)}
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
function App() {
  const route = useRoute();
  const [user, setUser] = useState(undefined);
  useEffect(() => { api("/auth/me").then(d => setUser(d.user)).catch(() => setUser(null)); }, []);
  const logout = async () => { await api("/auth/logout", "POST"); setUser(null); go("/"); };

  if (user === undefined) return <div className="min-h-screen flex items-center justify-center text-ocean-700">Loading JalSakhi…</div>;

  const protectedRoutes = ["/dashboard", "/test", "/history"];
  const isResult = route.startsWith("/result/");
  if (!user && (protectedRoutes.includes(route) || isResult)) { setTimeout(() => go("/login"), 0); return null; }

  let view;
  if (route === "/login") view = <Auth mode="login" onAuth={setUser} />;
  else if (route === "/register") view = <Auth mode="register" onAuth={setUser} />;
  else if (route === "/dashboard") view = <Dashboard user={user} />;
  else if (route === "/test") view = <TestForm user={user} />;
  else if (route === "/history") view = <History user={user} />;
  else if (isResult) view = <Result id={route.split("/")[2]} />;
  else if (route === "/rules") view = <Rules />;
  else if (route === "/about") view = <About />;
  else view = <Home user={user} />;

  const authPage = route === "/login" || route === "/register";
  return (
    <div>
      {!authPage && <Navbar user={user} onLogout={logout} route={route} />}
      {view}
      {!authPage && <Footer />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);