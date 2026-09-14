# Exam Archive — Feature Roadmap

This document tracks the current progress and proposed direction of the project.

## Implemented

- Authentication and session restoration
- Role-based protected routes
- English, Serbian Latin, and Serbian Cyrillic localization
- Persistent language selector on login and authenticated pages
- Browse approved exam papers
- Filter papers by study program, major, year, subject, exam type, month, and year
- Upload papers with file validation
- Paper metadata/details
- Moderator approval and rejection workflow at `/pending`
- Mock backend for local development and presentations

## Recommended Next Steps

### 1. Moderator Dashboard

- Expose the existing `/pending` page through a role-restricted home card and sidebar item.
- Show the number of pending papers.
- Support approval, rejection reasons, and recent moderation activity.

This should be the quickest high-impact addition because most of the moderation workflow already exists.

### 2. Paper Viewing and Downloading

- Add PDF and image previews.
- Add page navigation.
- Add a download button and file metadata.

This is the largest missing part of the archive's core purpose.

### 3. My Uploads

- List papers uploaded by the current user.
- Show Pending, Approved, and Rejected statuses.
- Display rejection reasons.
- Allow users to correct and resubmit rejected papers.
- Optionally allow pending uploads to be deleted.

### 4. Admin Dashboard

- Manage users and roles.
- Manage study programs, majors, subjects, and academic years.
- Display platform statistics and moderation activity.
- Keep Administrator and Moderator permissions clearly separated.

### 5. My Profile

- Display account information and role.
- Change password.
- Save the preferred language.
- Show upload statistics.
- Manage active sessions and sign out.

A profile page is most valuable when it provides actions rather than only displaying a username and role.

### 6. Search Improvements

- Search by subject name or code.
- Combine text search with the existing filters.
- Add recent searches and saved filters.

### 7. Additional Presentation Features

- Favorite or bookmark papers.
- Recently viewed papers.
- Report incorrect or low-quality papers.
- Notify users when an upload is approved or rejected.
- Add dashboard statistics.
- Improve the mobile paper-preview experience.

## Suggested Implementation Order

1. Expose the existing moderator workflow.
2. Implement paper preview and download.
3. Add My Uploads.
4. Build the Admin dashboard.
5. Add My Profile.
6. Improve search and filtering.
7. Add favorites, notifications, reports, and presentation polish.

## Localization Requirement

Every new screen and feature should add English and Serbian Latin text to `src/i18n/resources.ts`. Serbian Cyrillic is generated automatically from the Serbian Latin resources.
