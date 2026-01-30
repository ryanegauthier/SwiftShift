# SwiftShift UI

SwiftShift is a scheduling UI designed to integrate with the **When I Work** calendar and scheduling platform. This project currently ships with mock data and local persistence so you can build the user experience before wiring in the API.

## What this UI includes

- Weekly and daily schedule views
- Availability management (saved locally)
- Time off requests (saved locally, with approve/deny)
- Drag-and-drop from availability into the schedule

## Local setup

```bash
cd swiftshift-ui
npm install
npm run dev
```

Open `http://localhost:5173`.

## When I Work API integration

When you receive API access, replace the mock data calls with real API requests.

### 1) Create a `.env` file

Create `swiftshift-ui/.env`:

```bash
VITE_WIW_TOKEN=your_token_here
VITE_WIW_USER_ID=your_user_id_here
```

### 2) Update the API service

The existing UI data layer lives in `src/services/api.ts`. It currently uses mock data. Flip it to real API calls:

```ts
const USE_MOCK = false;
```

### 3) Wire availability + time off CRUD

The following endpoints are referenced in `docs-master.json`:

- Availability Events:
  - `GET /2/availabilityevents`
  - `POST /2/availabilityevents`
  - `PUT /2/availabilityevents/{id}`
  - `DELETE /2/availabilityevents/{id}`
- Time Off Requests:
  - `GET /2/timeoffrequests`
  - `POST /2/timeoffrequests`
  - `PUT /2/timeoffrequests/{id}`
  - `DELETE /2/timeoffrequests/{id}`

In the UI:

- Availability UI: `src/components/AvailabilityManager.tsx`
- Time Off UI: `src/components/TimeOffManager.tsx`
- Schedule UI: `src/components/ScheduleGrid.tsx`

You can replace the local storage hooks with API hooks to persist data:

- `src/hooks/useAvailabilityEvents.ts`
- `src/hooks/useTimeOffRequests.ts`

## Notes

- All API requests need the `Authorization` and `W-UserId` headers.
- Keep tokens in `.env` (Vite exposes `VITE_*` vars to the client).
- For production, proxy API calls through your server to avoid exposing tokens client-side.
