# SwiftShift

SwiftShift is a modern scheduling UI for tutoring centers. It makes it easy to visualize coverage, capture availability, and manage time off while staying compatible with the **When I Work** scheduling platform.

## Why use SwiftShift?

- **Cleaner scheduling UX**: Focused day/weekly views that make coverage gaps obvious.
- **Tutor-first workflows**: Simple availability and time off management.
- **When I Work compatible**: Built to integrate with the When I Work API and calendar model.
- **Fast iteration**: Runs locally with mock data so you can design the workflow before wiring the API.

## Project layout

- `swiftshift-ui/` — The React UI (see its README for setup and API integration).

## Next steps

- Set up the UI locally: `cd swiftshift-ui && npm install && npm run dev`
- Add your When I Work API credentials in `swiftshift-ui/.env`
- Replace mock data with real API requests when ready
