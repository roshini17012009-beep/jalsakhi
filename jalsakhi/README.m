# JalSakhi – Village Water-Quality Advisory Assistant

Rule-based (IF-THEN) advisory website that judges drinking-water safety from pH, turbidity and TDS readings.

**Stack:** Flask + SQLite (backend), React + Tailwind CSS + Chart.js (frontend, loaded by CDN so no npm is needed).

## Folder structure

```
jalsakhi/
├── app.py              # Flask API, login, roles, rule engine
├── requirements.txt    # Python dependencies
├── README.md
└── static/
    ├── index.html      # page shell (Tailwind, React, Chart.js via CDN)
    └── app.jsx         # all pages: Home, Login, Dashboard, Test, Result, History, Rules, About
```

## How to run (VS Code)

1. Open the `jalsakhi` folder in VS Code (File > Open Folder).
2. Open the terminal with Ctrl + ` (backtick).
3. Create and activate a virtual environment:
   - Windows: `python -m venv venv` then `venv\Scripts\activate`
   - Mac/Linux: `python3 -m venv venv` then `source venv/bin/activate`
4. Install the dependencies: `pip install -r requirements.txt`
5. Start the server: `python app.py` (Mac/Linux: `python3 app.py`)
6. Open http://127.0.0.1:5000 in your browser.

Internet is needed once, because React, Tailwind and Chart.js load from CDNs.
The SQLite database (`jalsakhi.db`) is created automatically with demo data on first run.
Press Ctrl + C in the terminal to stop the server.

## Demo logins

| Role          | Email               | Password  |
|---------------|---------------------|-----------|
| Villager      | ravi@jalsakhi.in    | ravi123   |
| Health worker | health@jalsakhi.in  | health123 |
| Admin         | admin@jalsakhi.in   | admin123  |

## Features

- Home page with a creative water-themed design
- Login and registration with role-based access
- Dashboard with status split, score trend, pH/turbidity and TDS charts, village risk ranking and recent tests
- Water test form for pH, turbidity and TDS, plus village and source type
- Result page showing the score, the IF-THEN rules that fired and recommendations
- Searchable and filterable test history
- Rule base page listing all 11 rules

## Rule-based reasoning

The engine checks the readings against IF-THEN rules based on drinking-water limits (IS 10500 style):

| Parameter | Desirable | Permissible |
|-----------|-----------|-------------|
| pH        | 6.5 to 8.5 | 5.5 to 9.2 (caution band) |
| Turbidity | up to 1 NTU | up to 5 NTU |
| TDS       | up to 500 mg/L | up to 2000 mg/L |

Each rule that fires adds a penalty to a score out of 100 (caution -15, unsafe -35).
Overall status: **Safe** (no rules fired), **Caution** (only caution rules) or **Unsafe** (any unsafe rule).

## Roles and permissions

- **Villager:** test water, see own history and recommendations.
- **Health worker:** everything a villager can do, plus all villages' tests and the full dashboard.
- **Administrator:** everything, plus the user list and deleting test records.

## API endpoints

| Method | Endpoint            | Access                  |
|--------|---------------------|-------------------------|
| POST   | /api/auth/register  | public                  |
| POST   | /api/auth/login     | public                  |
| POST   | /api/auth/logout    | logged in               |
| GET    | /api/auth/me        | public (returns null)   |
| GET    | /api/rules          | public                  |
| POST   | /api/analyze        | logged in               |
| GET    | /api/tests          | logged in (role-scoped) |
| GET    | /api/tests/<id>     | logged in (role-scoped) |
| DELETE | /api/tests/<id>     | admin                   |
| GET    | /api/stats          | logged in (role-scoped) |
| GET    | /api/users          | admin                   |

## Troubleshooting

- `python` not recognised: install Python from python.org and tick "Add Python to PATH", then restart VS Code.
- Blank page: make sure `index.html` and `app.jsx` are inside the `static` folder, and open the site through http://127.0.0.1:5000.
- PowerShell blocks activation: run `Set-ExecutionPolicy -Scope Process Bypass`, or use Command Prompt.
- Port already in use: change the last line of `app.py` to `app.run(debug=True, port=5001)`.

## Before deploying

Set a real `SECRET_KEY` environment variable and change the demo passwords.

Note: this is a first-level screening aid. Confirm serious findings with an accredited laboratory.