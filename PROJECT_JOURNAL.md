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
  - **Bug Fixes (2025-12-18):**
    - **Dynamic Typing Indicator:** Replaced hardcoded "Arshia is typing..." with dynamic logic that resolves usernames from `activeChat.members`.
    - **Persistent Notification Settings:** Connected the Group Info notification toggle to the `muteChat` API and added state synchronization with the backend.
- **Dev Setup:**
  - Created `init-db.sql` for native database setup.
  - Updated `README.md` with PSQL commands.
  - Verified removal of Docker dependencies.

### Technical Challenges & Solutions
- **Real-time Reactions:** Optimized WebSocket payloads and implemented optimistic UI updates to ensure responsiveness.
- **View Switching:** Decoupled `activeView` from local state to the context, allowing seamless transitions from any component.

### Session: Security & Consistency Overhaul (2025-12-18)
**Objective:** Address critical security vulnerabilities, DB schema issues, and UI/Logic inconsistencies.

#### Accomplishments
- **Security Enhancements**: 
  - Implemented chat membership checks for all mutating operations (messages, reactions, saves, calls).
  - Enforced `JWT_SECRET` presence at startup to prevent silent fallback to weak defaults.
  - Restricted "Clear History" functionality to chat admins only.
- **Database Alignment**:
  - Enabled `pgcrypto` extension in `init.sql` and `init-db.sql` to support `gen_random_uuid()`.
  - Aligned invite code length to 6 characters between backend and frontend.
- **UI & Routing**:
  - Fixed reaction toggle logic in `ChatArea.tsx` by correctly comparing acting user ID.
  - Added `/join/:code` route and `JoinInvite` page for direct link participation.
  - Updated `README.md` with mandatory environment variable documentation.

#### Technical Challenges & Solutions
- **Membership Verification**: Reused the message retrieval membership check pattern across all API endpoints to ensure consistency and minimize performance overhead.
- **Invite Routing**: Created a dedicated `JoinInvite` page that handles authentication guards and automatic joining, providing a smooth UX for shared links.

#### Pending / Next Steps
- [ ] Implement deeper file validation on backend.
- [ ] Write integration tests for the full message flow.
- [ ] Implement "Read Receipts".
- [ ] Add emoji search to the picker.

### Troubleshooting (2025-12-18)
- **CSS Warnings:** Re-applied `.vscode/settings.json` fix to suppress Tailwind CSS known at-rules warnings.
- **Database Connection (ECONNREFUSED):** Identified that the backend fails to start because PostgreSQL is not listening on port 5432.
- **UI Crash (Fixed):** Resolved `chats.filter` error by adding defensive checks in `MessengerContext.tsx` and `ChatList.tsx`, and ensuring `api.ts` throws on non-OK responses.
- **API 500 Error (Fixed):** Identified missing columns (`muted` in `chat_members`, `deleted_at` in `messages`) via diagnostic script and applied migrations to add them. The backend now starts and responds correctly.

### Session: Refined Invite & History Features (2025-12-18)
**Objective:** Improve invite link accessibility for logged-out users and restrict "Clear History" to admins.

#### Accomplishments
- **Invite Link Accessibility**:
  - Modified `/join/:code` to be a public route, allowing unauthenticated users to initiate the join process.
  - Implemented logic in `JoinInvite.tsx` to redirect unauthenticated users to `/login?next=/join/{code}`, ensuring the invite code is preserved.
  - The application now automatically joins the chat after successful authentication.
- **Role Exposure & Access Control**:
  - Updated backend endpoints (`/api/chats`, `POST /api/chats`, `/api/chats/direct`) to expose the current user's role (`cm.role`) in the chat.
  - Added `role` property to the `Chat` interface in `MessengerContext.tsx`.
- **Admin-Only "Clear History" UI**:
  - Updated `ChatArea.tsx` to conditionally disable and style the "Clear History" button based on the user's role. Non-admins now see a "(Admin only)" label.
  - Implemented 403 Forbidden error handling in `MessengerContext.tsx` to display a clear toast notification when a non-admin attempts to clear history.

#### Technical Challenges & Solutions
- **Authentication Preserving Redirect**: Leveraging React Router's URL parameters and the `next` query string permitted a seamless flow from link-click to login to chat-participation without manual code entry.
- **SQL Join Precision**: Ensured that SQL queries for both group and direct chats correctly identify the *requesting* user's role to prevent UI state drift.
