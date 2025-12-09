# To Do List

This file tracks the features and changes for the TronicsLab application.

---

## P2: Feature Enhancements

These tasks build upon the new core architecture to improve user functionality.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Hierarchical Category Management** | `TO DO` | Create a new admin interface to manage the content hierarchy (CRUD). Handle orphaned items on parent deletion. |
| **Feature-Rich Article Editor** | `IN PROGRESS` | Enhance the article creation form to support easy embedding of code, links, images, GitHub gists, file attachments, and videos. |
| **Rich Commenting System** | `TO DO` | Allow users to embed syntax-highlighted code snippets within their comments. |
| **Site-Wide Search** | `TO DO` | Add a search bar to the main navigation to allow users to find articles across all categories. |
| **Article Commenting Notifications** | `TO DO` | Implement an email or in-app notification system to alert users when someone replies to their comment. |
| **Article Tagging System** | `TO DO` | Implement a tagging system for articles to allow for more flexible content discovery. |
| **Implement User Profiles** | `TO DO` | Create a public profile page for each user, displaying their articles and basic information. |
| **Comment Moderation** | `TO DO` | Give article authors the ability to delete comments on their own articles. |
| **User Avatars** | `TO DO` | Allow users to upload their own profile pictures instead of relying on a generic fallback. |

---

## P3: Visuals & Polish

These tasks focus on improving the visual identity and user experience of the site.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Brand Asset Implementation** | `IN PROGRESS` | **Logo:** Implemented. **Next Up:** Source and implement a consistent set of icons for use in navigation and category representation. |

---

## P4: Architectural Improvements (Future Scalability)

These are architectural changes to improve performance and scalability as the site grows. They are not urgent but should be considered before a large-scale launch.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **On-Demand Data Fetching** | `TO DO` | **Problem:** `DataProvider` fetches all primary data on initial load. **Solution:** Refactor to fetch data on-demand (e.g., per-page with pagination). |
| **Selective Real-time Listeners** | `TO DO` | **Problem:** Using real-time listeners for all data is resource-intensive. **Solution:** Convert static data listeners to one-time `getDocs` fetches. |
| **Optimistic UI Updates** | `TO DO` | **Problem:** The UI waits for server confirmation, which can feel slow. **Solution:** Implement "optimistic updates" for a more responsive feel. |

---

## P5: Image Handling Overhaul

This is a major architectural refactor to create a unified, robust, and scalable image processing pipeline.

| Step | Task | Status | Notes |
| :--- | :--- | :--- | :--- |
| **1** | **Refactor `generateThumbnails` Cloud Function** | `TO DO` | Trigger on `images/temp/{uid}/{imageId}`. Output resized versions to the same temp folder. Create doc in `images` collection. |
| **2** | **Create `deleteImageSet` Cloud Function** | `TO DO` | HTTPS-triggered function to delete an image set from Storage and its corresponding doc from the `images` collection. |
| **3** | **Refactor Frontend Upload Logic** | `TO DO` | Create a reusable `uploadImage` function for both feature image and Tiptap editor. On removal, call the `deleteImageSet` function. |
| **4** | **Enhance Article Creation Logic** | `TO DO` | On creation, move image sets from `/temp/` to `/articles/{newArticleId}/` and update the image documents with the permanent URLs. |
| **5** | **Periodic Cleanup Function** | `TO DO` | Scheduled function to delete temp images and documents older than 24 hours. |

---

## P6: Codebase Standards & DX (Developer Experience)

This section is dedicated to improving the quality, consistency, and maintainability of the codebase.

| Task | Status | Notes |
| :--- | :--- | :--- |
| **Define and Implement a Commenting Standard** | `TO DO` | Establish a clear and consistent style for code comments (e.g., JSDoc) and progressively apply it across the codebase. |

---

## Future Considerations

These are larger features that have been discussed but are not on the immediate roadmap.

| Feature | Notes |
| :--- | :--- |
| **Community Forum** | A dedicated forum for users to discuss topics, ask questions, and build a community. |
| **Homepage Article Slider** | A dynamic banner on the homepage to showcase a selection of recent or featured articles. |
| **Author Role** | A role that can create and manage their own articles, including tagging, but without full admin privileges. |

---

## Technical Debt & Deployment

These items are technical in nature and need to be addressed before a full production launch.

| Task | Status | Notes |
| :--- | :--- | :--- |
| **Fix Signup Data Model** | `TO DO` | **Problem:** The signup page creates users with the wrong data model. **Solution:** Update the signup logic to use the correct data model. |
| **Fix "Unknown Author" in Admin Comments** | `TO DO` | **Problem:** The comments management page displays "Unknown Author". **Solution:** Update data fetching to correctly look up the author's name. |
| **Fix 404 on Refresh** | `ON HOLD` | **Problem:** Refreshing on dynamic article pages causes a 404. **Cause:** Mismatch between Next.js app and `firebase.json` hosting config. **Solution:** Use Firebase App Hosting (requires Blaze plan). |

---

## ✅ Completed Tasks

This section serves as an archive of all completed tasks for this project.

| Feature | Notes |
| :--- | :--- |
| **Stored Cross-Site Scripting (XSS)** | Implemented server-side HTML sanitization using `sanitize-html` to prevent malicious code from being saved to the database. |
| **Secure Article Deletion** | Verified that the `deleteArticleAndAssociatedImage` function correctly checks if the user is the author or an admin before proceeding with the deletion. |
| **Admin: Users** | Fixed roles filter & refactored to use a single source of truth. |
| **Admin: Polish** | Added an 'Actions' column header to the Users admin page. |
| **Admin: Polish** | Improved the hover effect on primary and secondary buttons for better visual feedback. |
| **Admin: Articles** | Fixed a bug that caused the author's name to display as 'Unknown Author'. |
| **Admin: Articles** | Standardized the width and hover effects of the 'Edit' and 'Delete' action buttons. |
| **Admin: Categories**| Applied consistent styling and sizing to the 'Edit' and 'Delete' action buttons. |
| **Admin: Dashboard**| Added a background fill on hover to the dashboard tabs for improved usability. |
| **Admin: Comments** | Fixed a bug where the author's name would show as "Unknown Author". |
| **Admin: Comments** | Fixed a runtime error caused by passing a non-serializable `Timestamp` object from a Server Component to a Client Component. |
| **Admin: Comments** | Improved the display of long comments in the admin table by truncating them and adding a "Show More" button. |
| **Hierarchical Content System** | Reworked content structure for three-level hierarchy, updated data models, seeding, and actions. |
| **Drill-Down Sidebar Navigation** | Implemented core drill-down logic. |
| **Admin UI Overhaul** | Replaced the admin sidebar with a modern tabbed header. |
| **Sidebar Accordion Styling** | Restyled the sidebar to match the reference image, including active states and icons. |
| **Breadcrumb Navigation** | Implemented basic breadcrumb functionality. |
| **Category-Centric Homepage** | Redesigned the homepage as a directory of top-level categories. |
| **Update Article Creation Form** | Modified the form to use a hierarchical selector for categories. |
| **Fix Article Description**| Added a dedicated description textarea to the article creation form. |
| **Header Layout Bugs** | Fixed z-index/overlap issues between the main header and sidebar. |
| **Dark Theme Refinement** | Updated the dark theme with a softer, slate-blue palette. |
| **Breadcrumb Refinement** | Improved visuals and hierarchy logic to display readable names instead of raw slugs. |
| **Image Optimization** | Resolved image loading issue by removing faulty custom loader configuration. |
| **Remove Hardcoded Admin UID** | Refactored `seedDatabaseAction` to use the current user's UID instead of a hardcoded value. |
| **Consolidate Article Creation Pages** | Removed the outdated `/create` page in favor of the new `/new` page. |
| **Fix Comment Display Bug** | Standardized on `comment.comment` to fix display issues. |
| **Verify Seed Data** | Confirmed the `seedDatabaseAction` is consistent with the latest data models. |