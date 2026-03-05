# Vue Migration Guide

## Run Vue frontend in development

1. Install frontend dependencies:
   - `cd frontend-vue`
   - `npm install`
2. Start backend API (root):
   - `npm start`
3. Start Vue app:
   - `cd frontend-vue`
   - `npm run dev`
4. Open Vite URL shown in terminal.

By default, Vite proxies `/api/*` to `http://localhost:7000`.

## Build Vue frontend for production

1. `cd frontend-vue`
2. `npm run build`

This generates `frontend-vue/dist`.

## Current migration status

- Migrated:
  - Login flow (`/`)
  - Director dashboard (`/director`) with cards/charts and legacy section links
  - Director sales overview in Vue (inside Director dashboard `Sales Overview` tab)
  - Director stock overview in Vue (inside Director dashboard `Stock Overview` tab)
  - Director credit overview in Vue (inside Director dashboard `Credit Overview` tab)
  - Director administration in Vue (inside Director dashboard `Administration` tab)
  - Manager dashboard in Vue (`/manager`) with cards/charts
  - Manager record sales in Vue (inside Manager dashboard `Record Sales` tab)
  - Manager stock management in Vue (inside Manager dashboard `Stock Management` tab)
  - Manager sales report in Vue (inside Manager dashboard `Sales Report` tab)
  - Manager procurement in Vue (inside Manager dashboard `Procure Produce` tab)
  - Sales Agent dashboard in Vue (`/sales-agent`) with cards/charts
  - Sales Agent record sale in Vue (inside Sales Agent dashboard `Record Sale` tab)
  - Sales Agent stock view in Vue (inside Sales Agent dashboard `View Stock` tab)
  - Sales Agent my sales in Vue (inside Sales Agent dashboard `My Sales` tab)
- Added role-based Vue routes:
  - `/manager`
  - `/sales-agent`
- Legacy pages remain available at `/legacy/pages/...`
- Backend now serves `frontend-vue/dist` when present.
