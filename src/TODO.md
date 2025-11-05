# To Do List

This file tracks the features and changes for the TronicsLab application.

---

## P1: Core Architecture Rework

These are foundational changes to the site's structure and navigation. They should be implemented first to minimize breaking changes later.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Hierarchical Content System** | `DONE` | Reworked the content structure to support a three-level hierarchy. Updated data models, seeding logic, and creation actions. Separated client and server type definitions to resolve build errors and remove old pages. |
| **Drill-Down Sidebar Navigation** | `DONE` | Core drill-down logic is implemented. Styling and final polish are tracked in a separate task. |
| **Admin UI Overhaul** | `DONE` | Replaced the admin sidebar with a more modern and intuitive tabbed header. This provides a cleaner separation between the main site and the administrative section. |
| **Sidebar Accordion Styling** | `DONE` | Restyle the sidebar navigation and accordion to match the provided reference image, including active state highlighting, proper icons (`>` for navigation, `v` for expand), and section headings. |
| **Breadcrumb Navigation** | `DONE` | Basic implementation is complete. Further refinement is needed for visual polish and hierarchical logic. |
| **Category-Centric Homepage** | `DONE` | Redesign the homepage to be a directory of top-level categories, each with a short description. Remove the generic welcome message and featured articles list. |

---

## P2: Feature Enhancements

These tasks build upon the new core architecture to improve user functionality.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Hierarchical Category Management** | `TO DO` | Create a new admin interface to manage the content hierarchy. This should include functionality to Create, Read, Update, and Delete categories. Implement logic to handle orphaned articles and subcategories upon deletion of a parent category. |
| **Update Article Creation Form** | `DONE` | Modified the article creation/editing form to use a hierarchical selector for choosing a category, reflecting the new data model. The old category selection method is now obsolete. |
| **Fix Article Description** | `DONE` | The article creation form is missing a description field. It currently truncates the article content to generate the description, which is not ideal. The form needs a dedicated textarea for the description. |
| **Rich Commenting System** | `TO DO` | Allow users to embed syntax-highlighted code snippets within their comments. |
| **Feature-Rich Article Editor** | `IN PROGRESS` | Enhance the article creation form to support easy embedding of code, links, images, GitHub gists, file attachments, and videos. |
| **Site-Wide Search** | `TO DO` | Add a search bar to the main navigation to allow users to find articles across all categories. |
| **Enhanced Article Creation** | `DONE` | Improved the article creation form. It's currently too basic and needs more advanced features for formatting and media embedding. |
| **Article Commenting Notifications** | `TO DO` | Implement an email or in-app notification system to alert users when someone replies to their comment. |
| **Article Tagging System** | `TO DO` | Implement a tagging system for articles to allow for more flexible content discovery. Admins should be able to add multiple tags to an article. |

---

## P3: Visuals & Polish

These tasks focus on improving the visual identity and user experience of the site.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Header Layout Bugs** | `DONE` | **Problem:** The main header was overlapping the sidebar, and the content was misaligned. **Solution:** Correctly restructured the root layout to establish the required `peer` relationship between the sidebar and content inset, fixing the overlap. |
| **Brand Asset Implementation** | `IN PROGRESS` | **Logo:** The new TronicsLab SVG logo has been implemented in the main sidebar. **Next Up:** Source and implement a consistent set of icons for use in navigation and category representation. |
| **Dark Theme Refinement** | `DONE` | The original dark theme was too high-contrast. It has been updated with a softer, slate-blue palette to improve readability and reduce eye strain. |
| **Breadcrumb Refinement** | `DONE` | Improve visuals and hierarchy logic. Should display readable names (e.g., `Home / Category / Article Title`) instead of raw slugs. |

---

## P4: Architectural Improvements (Future Scalability)

These are architectural changes to improve performance and scalability as the site grows. They are not urgent for the current stage but should be considered before a large-scale launch.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **On-Demand Data Fetching** | `TO DO` | **Problem:** `DataProvider` fetches all primary data on initial load, which will not scale. **Solution:** Refactor to fetch data on-demand (e.g., per-page with pagination) instead of loading everything into a single global context. |
| **Selective Real-time Listeners** | `TO DO` | **Problem:** Using real-time listeners for all data is resource-intensive and costly. **Solution:** Convert listeners for mostly static data (articles, categories) to one-time `getDocs` fetches. Reserve real-time listeners for highly dynamic features like comments. |
| **Optimistic UI Updates** | `TO DO` | **Problem:** The UI waits for server confirmation, which can feel slow. **Solution:** Implement "optimistic updates" where the UI updates instantly, then rolls back if the server action fails. This will make the app feel more responsive. |

---

## P5: Image Handling Overhaul

This is a major architectural refactor to create a unified, robust, and scalable image processing pipeline.

| Step | Task | Status | Notes |
| :--- | :--- | :--- | :--- |
| **1** | **Refactor `generateThumbnails` Cloud Function** | `TO DO` | Trigger on file creation in `images/temp/{uid}/{imageId}`. Output resized versions to the *same* temp folder with `_{size}` suffixes. Create a document in a new `images` Firestore collection with all file URLs, `uid`, and `articleId: null`. |
| **2** | **Create `deleteImageSet` Cloud Function** | `TO DO` | Create a new HTTPS-triggered function that takes an image ID/URL. It will delete the original file, all its resized variants from Storage, and the corresponding document from the `images` Firestore collection. |
| **3** | **Refactor Frontend Upload Logic** | `TO DO` | Create a single, reusable `uploadImage` function for both the feature image and Tiptap editor. It will upload to `images/temp/{uid}/...` and listen on the `images` Firestore collection for the thumbnail URLs. When an image is removed from the UI, it will call the `deleteImageSet` function. |
| **4** | **Enhance Article Creation Logic** | `TO DO` | On article creation, the backend will move the associated image set(s) from the `/temp/` folder to a permanent `/articles/{newArticleId}/` folder. It will then update the image documents in Firestore with the new permanent URLs and the `articleId`. |
| **5** | **Periodic Cleanup Function** | `TO DO` | Create a scheduled Cloud Function to delete any files and Firestore documents in the `images/temp/` directory that are older than 24 hours and have not been associated with an article. |

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
| **Fix Signup Data Model** | `TO DO` | **Problem:** The signup page creates users with the wrong data model. **Solution:** Update the signup logic to use the correct data model for new user creation. |
| **Fix "Unknown Author" in Admin Comments** | `TO DO` | **Problem:** The comments management page in the admin panel displays "Unknown Author". **Solution:** The data fetching logic on the `/admin/comments` page needs to be updated to correctly look up the author's name using the `userId` associated with each comment. |
| **Fix 404 on Refresh** | `ON HOLD` | **Problem:** Refreshing on dynamic article pages (e.g., `/articles/some-slug`) causes a 404 error. **Cause:** The app is a server-rendered Next.js app, but the `firebase.json` is configured for a static site. **Solution:** Upgrade the project to the Blaze plan and deploy using **Firebase App Hosting**. This is postponed until the app is ready for a production launch. |
| **Image Optimization** | `DONE` | **Problem:** Images were not loading on the live site. **Cause:** A failed attempt to manually configure the image loader was interfering with the platform's automatic optimization. **Solution:** Removed the custom `loader.js` file and the `images` and `rewrites` configuration from `next.config.mjs`. This allows the default App Hosting image optimization to function as intended. |
| **Remove Hardcoded Admin UID** | `DONE` | **Problem:** The admin UID is hardcoded in `seedDatabaseAction`. **Risk:** This is an information disclosure risk, making the admin account a specific target for attackers. **Solution:** Refactor `seedDatabaseAction` to assign seed articles to the user *running* the action, using their `decodedToken.uid`, rather than a static, hardcoded value. |
| **Consolidate Article Creation Pages** | `DONE` | **Problem:** There were two separate pages for creating articles (`/create` and `/new`), causing confusion. **Solution:** The outdated `/create` page has been removed, and all links have been updated to point to the new, more feature-rich `/new` page. |
| **Fix Comment Display Bug** | `DONE` | **Problem:** Comments were not displaying correctly due to an inconsistent property name (`comment.content` vs. `comment.comment`). **Solution:** All instances have been updated to use `comment.comment` for consistency. |
| **Verify Seed Data** | `DONE` | **Problem:** There was a concern that the database seed data might be out of date with the latest data models. **Solution:** The `seedDatabaseAction` was reviewed and confirmed to be consistent with the current `Article`, `Category`, and `User` types. |
