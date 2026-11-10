# NEXT SIP — AI Craft Lab

Interactive web prototype for the NEXT SIP project proposal.

## Run
Open index.html in a modern browser. No build step or dependencies are required.

## Included modules
- Dashboard overview
- Flavor Studio: ingredient selection, three concept cards, Flavor Radar (rule-based demonstration)
- Batch Guardian: user-created Batch IDs, production metadata, pH / °Brix / temperature measurement history, status tracking, and browser-local persistence
- Sip Passport: product preview, language switch, QR demonstration
- Compliance Guard: keyword-based preliminary screening

## Important limitations
This is a front-end prototype. Batch Guardian now creates IDs from user-entered production records and stores measurements in the current browser using localStorage. This is useful for a single-device demonstration, but it is not a shared production database: records are not synced across users or devices and may be lost if browser data is cleared. It does not yet connect to Supabase, authentication, a trained ML model, IoT sensors, or LINE OA. Flavor Studio remains rule-based. The QR currently points to a placeholder domain and must be changed to a real published passport URL.

AI suggestions must not replace qualified expert review or laboratory testing. Compliance screening is preliminary and is not legal advice.

## Next development steps
1. Add a verified Thai ingredient/flavor dataset and source citations.
2. Integrate an LLM with structured output and retrieval-grounded references.
3. Build and evaluate Batch Guardian using reviewed datasets.
4. Connect Batch Guardian to Supabase: create batches and measurement tables, add authentication and row-level security, and sync records across devices.
5. Add device / IoT ingestion with validation, timestamping, and reviewed alert thresholds.
6. Publish individual passport pages and generate real QR destinations.
7. Evaluate Compliance Guard against expert-reviewed test cases.
