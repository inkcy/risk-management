# Department access codes

The department login accepts either an existing department password or a staff access code imported from the private roster. Staff codes can select any active department in the login directory, as authorized for this deployment. A staff account starts with the editor role; selecting a department associated with an administrator does not grant that role.

Import a private Word roster using absolute file paths:

```powershell
node frontend/scripts/import-department-codes.cjs --source C:\private\roster.docx
node frontend/scripts/import-department-codes.cjs --source C:\private\roster.docx --env-file C:\private\production.env --apply
```

Without `--apply`, the script only validates the source and prints counts. Applying creates missing department containers, imports salted password hashes, and verifies every imported credential in one transaction. Existing department passwords and disabled department statuses are preserved. Full codes, including a trailing letter and its case, are significant. Repeated identical records are deduplicated; genuinely shared full codes are labelled with all source names.

Plaintext codes and the private Word file must stay outside Git. Lookup values use an HMAC keyed with `SESSION_SECRET`; if that secret changes, re-run the private roster import using the new secret before enabling code logins. The login limits failed attempts per originating IP and keeps the existing lock for department-password authentication independent of staff-code authentication.
