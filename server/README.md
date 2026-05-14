# Backend-ready foundation

This frontend still runs in local mode, but these files prepare the project for the correct production path:

- `schema.postgres.sql` - recommended PostgreSQL schema
- `src/services/entryNormalizer.js` - normalizes entries from UI, Excel, or API
- `src/services/importProfiles.js` - mapping profile for `OTK_WORKPLACE.xlsx`

## Recommended backend flow

1. Create PostgreSQL database
2. Run `schema.postgres.sql`
3. Build Node.js/Express API with these modules:
   - `POST /auth/login`
   - `GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`
   - `GET /complaints`, `GET /complaints/:id`
   - `POST /complaints`, `PUT /complaints/:id`, `DELETE /complaints/:id`
   - `GET /settings`, `PUT /settings`
   - `POST /imports/otk-workplace`
4. Use the import profile to map Excel columns into `otk_entries`

## Excel import notes

For `OTK_WORKPLACE.xlsx`, import by column position:

1. `Data` -> `event_date`
2. `Track` -> `track_code`
3. `Problem` -> `problem_type`
4. `Ma'sul bo'lim` -> `department`
5. `Name` -> `handled_by_name`
6. `Status` -> `status`
7. `Comment` -> `comment`

Fallbacks:

- empty `department` -> `Belgilanmagan`
- missing `request_source` -> `Belgilanmagan`
- source system -> `excel:OTK_WORKPLACE.xlsx`

## Why this is safe now

The current UI still uses local mode, so nothing in the running app is forced onto a backend yet. These additions make the data shape consistent now, so later API migration is much less risky.
