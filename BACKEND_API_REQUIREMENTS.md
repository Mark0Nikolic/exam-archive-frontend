# Backend API Requirements

## Paper visibility and status ordering

The frontend paper table calls `GET /api/papers` with an optional `status` query parameter.
The real API must apply access control and sorting before pagination:

- Moderators, administrators, and super administrators can receive all papers.
- Ordinary users can receive every approved paper plus only pending or rejected papers they uploaded.
- A supplied `status` filters that already-authorized result set; it must never bypass ownership checks.
- Mixed results are sorted by status in this order: `Pending`, `Rejected`, `Approved`.
- Pending papers are sorted oldest first so moderators see the oldest requests first.
- Rejected and approved groups can retain their existing newest-first ordering.
- The response should set `isOwnedByCurrentUser` on each paper. This allows the frontend to apply a defensive visibility check, but it does not replace server-side authorization.
- Filtering, ordering, `totalItems`, and `totalPages` must all be calculated before the requested page is returned.

Ordinary users will defensively hide non-approved results that do not explicitly include `isOwnedByCurrentUser: true`.
