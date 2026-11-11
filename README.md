# NEXT SIP — AI Craft Lab

Interactive web prototype for the NEXT SIP project proposal.

## Run
Open the site through a static web host (for example GitHub Pages). ES modules and Supabase Auth require the site to be served over HTTPS or localhost; opening the HTML file directly may not work.

## Authentication setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run the SQL in `supabase/schema.sql`.
3. Copy the Project URL and Publishable key from Supabase Project Settings → API.
4. Put those two public values in `supabase-config.js`.
5. In Supabase Authentication → URL Configuration, set the Site URL to the deployed site URL and add the deployed `/reset-password.html` URL to Redirect URLs.
6. Enable email confirmation in Supabase Authentication settings and configure the email provider as needed.

The app uses Supabase Auth for sign-up, sign-in, sign-out, persistent sessions, and password recovery. The dashboard redirects visitors without a valid session to `login.html`. A database trigger creates a producer profile, and row-level security restricts profile access to the signed-in owner.

**Security:** `supabase-config.js` may contain only the Project URL and Publishable key. Never put a Supabase Secret key or `service_role` key in browser code or GitHub.

## Included modules
- Dashboard overview
- Flavor Studio: ingredient selection, three concept cards, Flavor Radar (rule-based demonstration)
- Batch Guardian: user-created Batch IDs, production metadata, pH / °Brix / temperature measurement history, status tracking, and browser-local persistence
- Sip Passport: product preview, language switch, QR demonstration
- Compliance Guard: keyword-based preliminary screening
- Authentication: sign-up, sign-in, email confirmation flow, sign-out, session guard, and password reset

## Important limitations
This is still a front-end prototype. Batch Guardian records remain in the current browser using localStorage; they are not yet synchronized to Supabase. Flavor Studio remains rule-based. The QR currently points to a placeholder domain and must be changed to a real published passport URL. The profiles table is the first database table; batches, measurements, and product passports still need their own tables and owner-based policies.

AI suggestions must not replace qualified expert review or laboratory testing. Compliance screening is preliminary and is not legal advice.

## Next development steps
1. Configure Supabase credentials and URL settings.
2. Verify registration, email confirmation, login, logout, and password recovery.
3. Connect Batch Guardian records to Supabase with row-level security.
4. Add product and passport tables with public read rules for published passports.
5. Continue developing the reviewed ingredient dataset and AI-assisted modules.
