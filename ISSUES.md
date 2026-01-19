# Ongoing Features & Issues

## Known Issues

### Invite Codes (registration) - Firestore index missing
- **Status:** Needs fix
- **Location:** `/profile/settings`
- **Problem:** Invite codes don't load - shows 0/5 even when codes exist
- **Cause:** Missing Firestore composite index for query
- **Fix:** Create composite index in Firebase Console → Firestore → Indexes:
  - Collection: `inviteCodes`
  - Fields: `createdBy` (Ascending), `createdAt` (Descending)
  - Query scope: Collection

---

## Planned Features

*None currently*

---

## Recently Completed

- Custom exercises UI on dashboard
- Challenge invitations (invite users to challenges)
- Profile achievements count (fetches real count)
