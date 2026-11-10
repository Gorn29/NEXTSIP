# NEXT SIP — AI Craft Lab

Interactive web prototype for the NEXT SIP project proposal.

## Run
Open index.html in a modern browser. No build step or dependencies are required.

## Included modules
- Dashboard overview
- Flavor Studio: ingredient selection, three concept cards, Flavor Radar (rule-based demonstration)
- Batch Guardian: mock batch records, trend chart, rule-based anomaly flags
- Sip Passport: product preview, language switch, QR demonstration
- Compliance Guard: keyword-based preliminary screening

## Important limitations
This is a front-end prototype. It does not yet connect to an LLM, RAG, FlavorDB, a trained ML model, Supabase, LINE OA, or IoT sensors. Sample values and rule-based alerts are demonstrations, not scientific validation or product-safety determinations. The QR currently points to a placeholder domain and must be changed to a real published passport URL.

AI suggestions must not replace qualified expert review or laboratory testing. Compliance screening is preliminary and is not legal advice.

## Next development steps
1. Add a verified Thai ingredient/flavor dataset and source citations.
2. Integrate an LLM with structured output and retrieval-grounded references.
3. Build and evaluate Batch Guardian using reviewed datasets.
4. Add Supabase authentication, database, storage, and role-based access.
5. Publish individual passport pages and generate real QR destinations.
6. Evaluate Compliance Guard against expert-reviewed test cases.
