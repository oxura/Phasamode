# Project Journal - Phase Messenger Improvements

## Session: Refining Messenger Features
**Objective:** Update MessengerContext to support reactions, saves, mute, trash, and invites. Redesign UI to match reference.

### Accomplishments
- **Backend Refinement:**
  - Updated Zod schemas for all endpoints.
  - Implemented new API endpoints: `POST/DELETE Reactions`, `POST/DELETE Saves`, `PATCH Mute`, `GET Search`, `GET Trash`, `POST/PATCH Calls`, `POST Invites`.
  - Added broadcast logic for real-time updates of reactions, saves, and history clearing.
- **Frontend Implementation:**
  - Redesigned `ChatArea` with Doodle background, glassmorphism, and capsule input.
  - Implemented `MessageBubble` with reactions, saved status, and file previews.
  - Created `SavesView` and `TrashView` for managing saved/deleted messages.
  - Created `ShareView` for group invites and app sharing.
  - Updated `MessengerContext` with state and logic for all new features.
  - Integrated full view-switching logic in `NavigationSidebar`.
- **Dev Setup:**
  - Created `init-db.sql` for native database setup.
  - Updated `README.md` with PSQL commands.
  - Verified removal of Docker dependencies.

### Technical Challenges & Solutions
- **Real-time Reactions:** Optimized WebSocket payloads and implemented optimistic UI updates to ensure responsiveness.
- **View Switching:** Decoupled `activeView` from local state to the context, allowing seamless transitions from any component.

### Pending / Next Steps
- [ ] Implement deeper file validation on backend.
- [ ] Write integration tests for the full message flow.
- [ ] Implement "Read Receipts" (Phase 4 suggestion).
- [ ] Add emoji search to the picker.
