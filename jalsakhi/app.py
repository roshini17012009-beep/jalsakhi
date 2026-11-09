"""
JalSakhi - Village Water-Quality Advisory Assistant (rule-based reasoning)
Backend: Flask + SQLite
Run:  python app.py   ->  http://127.0.0.1:5000
"""
import os
import json
import sqlite3
from datetime import datetime, timedelta, UTC
from functools import wraps

from flask import Flask, request, jsonify, session, g, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE, "jalsakhi.db")

app = Flask(__name__, static_folder="static", static_url_path="/static")
app.secret_key = os.environ.get("SECRET_KEY", "change-this-secret-in-production")

ROLES = ("villager", "health_worker", "admin")


# --------------------------------------------------------------------------
# Database helpers
# --------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'villager',
            village TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            village TEXT NOT NULL,
            source TEXT NOT NULL,
            ph REAL NOT NULL,
            turbidity REAL NOT NULL,
            tds REAL NOT NULL,
            status TEXT NOT NULL,
            score INTEGER NOT NULL,
            findings TEXT NOT NULL,
            advice TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        """
    )
    if db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        now = datetime.now(UTC).isoformat(timespec="seconds")
        demo_users = [
            ("Admin Officer", "admin@jalsakhi.in", "admin123", "admin", "District Office"),
            ("Dr. Meena (Health Worker)", "health@jalsakhi.in", "health123", "health_worker", "Kovilpatti"),
            ("Ravi Kumar", "ravi@jalsakhi.in", "ravi123", "villager", "Kovilpatti"),
        ]
        for name, email, pw, role, village in demo_users:
            db.execute(
                "INSERT INTO users (name,email,password_hash,role,village,created_at) VALUES (?,?,?,?,?,?)",
                (name, email, generate_password_hash(pw), role, village, now),
            )
        # demo test history so the dashboard looks alive on first run
        samples = [
            ("Kovilpatti", "Borewell", 7.2, 0.8, 340),
            ("Kovilpatti", "Hand pump", 6.9, 1.6, 520),
            ("Sivagiri", "Open well", 7.8, 6.4, 610),
            ("Sivagiri", "Borewell", 8.9, 1.1, 780),
            ("Nallur", "River", 7.1, 12.0, 450),
            ("Nallur", "Tap water", 7.4, 0.5, 280),
            ("Rajapalayam", "Borewell", 6.2, 0.9, 2300),
            ("Rajapalayam", "Pond", 7.0, 9.5, 400),
            ("Kovilpatti", "Tap water", 7.3, 0.4, 260),
            ("Sivagiri", "Hand pump", 5.2, 2.2, 900),
            ("Nallur", "Borewell", 7.6, 0.7, 410),
            ("Rajapalayam", "Tap water", 7.5, 0.6, 330),
        ]
        admin_id = db.execute("SELECT id FROM users WHERE role='admin'").fetchone()[0]
        for i, (village, source, ph, turb, tds) in enumerate(samples):
            res = analyze_water(ph, turb, tds, source)
            when = (datetime.now(UTC) - timedelta(days=len(samples) - i)).isoformat(timespec="seconds")
            db.execute(
                """INSERT INTO tests (user_id,village,source,ph,turbidity,tds,status,score,findings,advice,created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (admin_id, village, source, ph, turb, tds, res["status"], res["score"],
                 json.dumps(res["findings"]), json.dumps(res["advice"]), when),
            )
    db.commit()
    db.close()


# --------------------------------------------------------------------------
# Rule-based reasoning engine (IF-THEN rules, BIS IS 10500 style limits)
#   pH:         6.5 - 8.5 acceptable
#   Turbidity:  <= 1 NTU desirable, <= 5 NTU permissible
#   TDS:        <= 500 mg/L desirable, <= 2000 mg/L permissible
# Each rule: id, IF-condition, severity, finding (THEN), advice (THEN)
# --------------------------------------------------------------------------
OPEN_SOURCES = ("Open well", "River", "Pond", "Canal")

RULES = [
    {"id": "R1", "if": "pH < 5.5", "severity": "unsafe",
     "test": lambda x: x["ph"] < 5.5,
     "finding": "Water is strongly acidic.",
     "advice": ["Do not drink without treatment.",
                "Pass water through a limestone / calcite neutralising filter.",
                "Avoid storing in metal pots; acidic water leaches metals."]},
    {"id": "R2", "if": "5.5 <= pH < 6.5", "severity": "caution",
     "test": lambda x: 5.5 <= x["ph"] < 6.5,
     "finding": "Water is mildly acidic.",
     "advice": ["Use clay or food-grade plastic containers for storage.",
                "Add a small baking-soda correction only under health-worker guidance."]},
    {"id": "R3", "if": "pH > 9.2", "severity": "unsafe",
     "test": lambda x: x["ph"] > 9.2,
     "finding": "Water is strongly alkaline.",
     "advice": ["Avoid drinking; it may irritate skin and stomach.",
                "Use an alternate source until a health worker re-tests."]},
    {"id": "R4", "if": "8.5 < pH <= 9.2", "severity": "caution",
     "test": lambda x: 8.5 < x["ph"] <= 9.2,
     "finding": "Water is mildly alkaline.",
     "advice": ["Taste may be bitter; consider mixing with a neutral-pH source.",
                "Re-test after 1 week."]},
    {"id": "R5", "if": "Turbidity > 5 NTU", "severity": "unsafe",
     "test": lambda x: x["turbidity"] > 5,
     "finding": "Water is very cloudy (high turbidity).",
     "advice": ["Settle water overnight, filter through a clean cotton cloth or sand filter.",
                "Treat with alum (phitkari) and then boil for 10 minutes.",
                "Do not give to infants or the elderly untreated."]},
    {"id": "R6", "if": "1 < Turbidity <= 5 NTU", "severity": "caution",
     "test": lambda x: 1 < x["turbidity"] <= 5,
     "finding": "Water is slightly cloudy.",
     "advice": ["Filter through a cloth and boil before drinking."]},
    {"id": "R7", "if": "TDS > 2000 mg/L", "severity": "unsafe",
     "test": lambda x: x["tds"] > 2000,
     "finding": "Dissolved salts are far above the permissible limit.",
     "advice": ["Not fit for drinking; use an RO unit or switch to a safer source.",
                "Use only for washing or irrigation of salt-tolerant crops."]},
    {"id": "R8", "if": "500 < TDS <= 2000 mg/L", "severity": "caution",
     "test": lambda x: 500 < x["tds"] <= 2000,
     "finding": "Dissolved salts are above the desirable limit.",
     "advice": ["Acceptable only if no better source exists.",
                "Prefer an RO / reverse-osmosis or a community plant if available."]},
    {"id": "R9", "if": "Open source AND Turbidity > 1 NTU", "severity": "unsafe",
     "test": lambda x: x["source"] in OPEN_SOURCES and x["turbidity"] > 1,
     "finding": "Open water source with visible suspended matter: high risk of germs.",
     "advice": ["Chlorinate (bleaching powder / chlorine tablet) and wait 30 minutes.",
                "Boil water for at least 10 minutes before drinking.",
                "Report diarrhoea or fever cases to the health worker."]},
    {"id": "R10", "if": "Borewell/Hand pump AND TDS > 1000 mg/L", "severity": "caution",
     "test": lambda x: x["source"] in ("Borewell", "Hand pump") and x["tds"] > 1000,
     "finding": "Groundwater with high salts may also carry fluoride or nitrate.",
     "advice": ["Request a fluoride and nitrate lab test from the block health office."]},
    {"id": "R11", "if": "pH < 6.5 AND TDS > 500 mg/L", "severity": "caution",
     "test": lambda x: x["ph"] < 6.5 and x["tds"] > 500,
     "finding": "Acidic and mineral-rich water can be corrosive and leach metals from pipes.",
     "advice": ["Inspect pipes and hand-pump parts for rust or corrosion."]},
]

PENALTY = {"caution": 15, "unsafe": 35}


def analyze_water(ph, turbidity, tds, source):
    x = {"ph": ph, "turbidity": turbidity, "tds": tds, "source": source}
    fired = [r for r in RULES if r["test"](x)]
    findings, advice = [], []
    for r in fired:
        findings.append({"rule": r["id"], "if": r["if"], "severity": r["severity"], "then": r["finding"]})
        for a in r["advice"]:
            if a not in advice:
                advice.append(a)
    if any(r["severity"] == "unsafe" for r in fired):
        status = "Unsafe"
    elif fired:
        status = "Caution"
    else:
        status = "Safe"
        advice = ["Water meets the desirable limits. Keep storage vessels covered and clean.",
                  "Re-test every month and after heavy rain."]
        findings = [{"rule": "R0", "if": "All parameters within limits", "severity": "safe",
                     "then": "Water is fit for drinking."}]
    score = max(0, 100 - sum(PENALTY[r["severity"]] for r in fired))
    return {"status": status, "score": score, "findings": findings, "advice": advice}


# --------------------------------------------------------------------------
# Auth helpers
# --------------------------------------------------------------------------
def current_user():
    uid = session.get("uid")
    if not uid:
        return None
    return get_db().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()


def user_json(u):
    return {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"], "village": u["village"]}


def login_required(*roles):
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            u = current_user()
            if not u:
                return jsonify(error="Please log in first."), 401
            if roles and u["role"] not in roles:
                return jsonify(error="You do not have permission for this action."), 403
            g.user = u
            return fn(*a, **kw)
        return wrapper
    return deco


def test_json(r):
    return {
        "id": r["id"], "village": r["village"], "source": r["source"],
        "ph": r["ph"], "turbidity": r["turbidity"], "tds": r["tds"],
        "status": r["status"], "score": r["score"],
        "findings": json.loads(r["findings"]), "advice": json.loads(r["advice"]),
        "created_at": r["created_at"],
        "tested_by": r["tested_by"] if "tested_by" in r.keys() else None,
    }


def visible_tests_query(user):
    base = ("SELECT t.*, u.name AS tested_by FROM tests t JOIN users u ON u.id=t.user_id ")
    if user["role"] == "villager":
        return base + "WHERE t.user_id=? ", (user["id"],)
    return base + "WHERE 1=1 ", ()


# --------------------------------------------------------------------------
# Auth endpoints
# --------------------------------------------------------------------------
@app.post("/api/auth/register")
def register():
    d = request.get_json(silent=True) or {}
    name, email, pw = (d.get("name") or "").strip(), (d.get("email") or "").strip().lower(), d.get("password") or ""
    role, village = d.get("role", "villager"), (d.get("village") or "").strip()
    if role not in ("villager", "health_worker"):   # admin cannot self-register
        role = "villager"
    if not name or "@" not in email or len(pw) < 6:
        return jsonify(error="Enter a name, a valid email and a password of 6+ characters."), 400
    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        return jsonify(error="This email is already registered."), 409
    cur = db.execute(
        "INSERT INTO users (name,email,password_hash,role,village,created_at) VALUES (?,?,?,?,?,?)",
        (name, email, generate_password_hash(pw), role, village, datetime.utcnow().isoformat(timespec="seconds")),
    )
    db.commit()
    session["uid"] = cur.lastrowid
    return jsonify(user=user_json(current_user())), 201


@app.post("/api/auth/login")
def login():
    d = request.get_json(silent=True) or {}
    email, pw = (d.get("email") or "").strip().lower(), d.get("password") or ""
    u = get_db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not u or not check_password_hash(u["password_hash"], pw):
        return jsonify(error="Incorrect email or password."), 401
    session["uid"] = u["id"]
    return jsonify(user=user_json(u))


@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@app.get("/api/auth/me")
def me():
    u = current_user()
    return jsonify(user=user_json(u) if u else None)


# --------------------------------------------------------------------------
# Water-test endpoints
# --------------------------------------------------------------------------
@app.get("/api/rules")
def rules():
    return jsonify(rules=[{"id": r["id"], "if": r["if"], "severity": r["severity"], "then": r["finding"]} for r in RULES])


@app.post("/api/analyze")
@login_required()
def analyze():
    d = request.get_json(silent=True) or {}
    try:
        ph, turb, tds = float(d["ph"]), float(d["turbidity"]), float(d["tds"])
    except (KeyError, TypeError, ValueError):
        return jsonify(error="pH, turbidity and TDS must be numbers."), 400
    if not (0 <= ph <= 14 and 0 <= turb <= 1000 and 0 <= tds <= 10000):
        return jsonify(error="Values are outside the possible range."), 400
    village = (d.get("village") or g.user["village"] or "Unknown").strip()
    source = (d.get("source") or "Borewell").strip()
    res = analyze_water(ph, turb, tds, source)
    db = get_db()
    cur = db.execute(
        """INSERT INTO tests (user_id,village,source,ph,turbidity,tds,status,score,findings,advice,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (g.user["id"], village, source, ph, turb, tds, res["status"], res["score"],
         json.dumps(res["findings"]), json.dumps(res["advice"]),
         datetime.utcnow().isoformat(timespec="seconds")),
    )
    db.commit()
    return jsonify(id=cur.lastrowid, **res), 201


@app.get("/api/tests")
@login_required()
def list_tests():
    q, args = visible_tests_query(g.user)
    rows = get_db().execute(q + "ORDER BY t.id DESC", args).fetchall()
    return jsonify(tests=[test_json(r) for r in rows])


@app.get("/api/tests/<int:tid>")
@login_required()
def get_test(tid):
    q, args = visible_tests_query(g.user)
    row = get_db().execute(q + "AND t.id=?", args + (tid,)).fetchone()
    if not row:
        return jsonify(error="Test not found."), 404
    return jsonify(test=test_json(row))


@app.delete("/api/tests/<int:tid>")
@login_required("admin")
def delete_test(tid):
    db = get_db()
    db.execute("DELETE FROM tests WHERE id=?", (tid,))
    db.commit()
    return jsonify(ok=True)


@app.get("/api/stats")
@login_required()
def stats():
    q, args = visible_tests_query(g.user)
    rows = get_db().execute(q + "ORDER BY t.id ASC", args).fetchall()
    tests = [test_json(r) for r in rows]
    counts = {"Safe": 0, "Caution": 0, "Unsafe": 0}
    villages = {}
    for t in tests:
        counts[t["status"]] += 1
        v = villages.setdefault(t["village"], {"village": t["village"], "tests": 0, "score_sum": 0, "unsafe": 0})
        v["tests"] += 1
        v["score_sum"] += t["score"]
        v["unsafe"] += t["status"] == "Unsafe"
    village_list = [{"village": v["village"], "tests": v["tests"],
                     "avg_score": round(v["score_sum"] / v["tests"]), "unsafe": v["unsafe"]}
                    for v in villages.values()]
    n = len(tests) or 1
    return jsonify(
        total=len(tests), counts=counts,
        averages={"ph": round(sum(t["ph"] for t in tests) / n, 2),
                  "turbidity": round(sum(t["turbidity"] for t in tests) / n, 2),
                  "tds": round(sum(t["tds"] for t in tests) / n)},
        trend=[{"id": t["id"], "date": t["created_at"][:10], "ph": t["ph"],
                "turbidity": t["turbidity"], "tds": t["tds"], "score": t["score"]} for t in tests[-12:]],
        villages=sorted(village_list, key=lambda v: v["avg_score"]),
        recent=list(reversed(tests))[:5],
    )


@app.get("/api/users")
@login_required("admin")
def users():
    rows = get_db().execute("SELECT * FROM users ORDER BY id").fetchall()
    return jsonify(users=[user_json(u) for u in rows])


# --------------------------------------------------------------------------
# Serve the frontend
# --------------------------------------------------------------------------
@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


init_db()

if __name__ == "__main__":
   app.run(host="0.0.0.0", port=5000, debug=False)