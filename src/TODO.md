# To Do List

This file tracks the features and changes for the TronicsLab application.

---

## P1: Core Architecture Rework

These are foundational changes to the site's structure and navigation. They should be implemented first to minimize breaking changes later.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Hierarchical Content System** | `DONE` | Reworked the content structure to support a three-level hierarchy. Updated data models, seeding logic, and creation actions. Separated client and server type definitions to resolve build errors and remove old pages. |
| **Drill-Down Sidebar Navigation** | `DONE` | Core drill-down logic is implemented. Styling and final polish are tracked in a separate task. |
| **Sidebar Accordion Styling** | `TO DO` | Restyle the sidebar navigation and accordion to match the provided reference image, including active state highlighting, proper icons (`>` for navigation, `v` for expand), and section headings. |
| **Breadcrumb Navigation** | `IN PROGRESS` | Basic implementation is complete. Further refinement is needed for visual polish and hierarchical logic. |
| **Category-Centric Homepage** | `TO DO` | Redesign the homepage to be a directory of top-level categories, each with a short description. Remove the generic welcome message and featured articles list. |

---

## P2: Feature Enhancements

These tasks build upon the new core architecture to improve user functionality.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Hierarchical Category Management** | `TO DO` | Create a new admin interface to manage the content hierarchy. This should include functionality to Create, Read, Update, and Delete categories. Implement logic to handle orphaned articles and subcategories upon deletion of a parent category. |
| **Update Article Creation Form** | `TO DO` | Modify the article creation/editing form to use a hierarchical selector for choosing a category, reflecting the new data model. The old category selection method is now obsolete. |
| **Fix Article Description** | `TO DO` | The article creation form is missing a description field. It currently truncates the article content to generate the description, which is not ideal. The form needs a dedicated textarea for the description. |
| **Rich Commenting System** | `TO DO` | Allow users to embed syntax-highlighted code snippets within their comments. |
| **Feature-Rich Article Editor** | `TO DO` | Enhance the article creation form to support easy embedding of code, links, images, GitHub gists, file attachments, and videos. |
| **Site-Wide Search** | `TO DO` | Add a search bar to the main navigation to allow users to find articles across all categories. |
| **Enhanced Article Creation** | `TO DO` | Improve the article creation form. It's currently too basic and needs more advanced features for formatting and media embedding. |
| **Article Commenting Notifications** | `TO DO` | Implement an email or in-app notification system to alert users when someone replies to their comment. |
| **Article Tagging System** | `TO DO` | Implement a tagging system for articles to allow for more flexible content discovery. Admins should be able to add multiple tags to an article. |

---

## P3: Visuals & Polish

These tasks focus on improving the visual identity and user experience of the site.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Brand Asset Implementation** | `TO DO` | Source and implement a logo for TronicsLab, as well as a consistent set of icons for use in navigation and category representation. |
| **Dark Theme Refinement** | `DONE` | The original dark theme was too high-contrast. It has been updated with a softer, slate-blue palette to improve readability and reduce eye strain. |
| **Breadcrumb Refinement** | `TO DO` | Improve visuals and hierarchy logic. Should display readable names (e.g., `Home / Category / Article Title`) instead of raw slugs. |

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
| **Fix 404 on Refresh** | `ON HOLD` | **Problem:** Refreshing on dynamic article pages (e.g., `/articles/some-slug`) causes a 404 error. **Cause:** The app is a server-rendered Next.js app, but the `firebase.json` is configured for a static site. **Solution:** Upgrade the project to the Blaze plan and deploy using **Firebase App Hosting**. This is postponed until the app is ready for a production launch. |
| **Image Optimization** | `DONE` | **Problem:** Images were not loading on the live site. **Cause:** A failed attempt to manually configure the image loader was interfering with the platform's automatic optimization. **Solution:** Removed the custom `loader.js` file and the `images` and `rewrites` configuration from `next.config.mjs`. This allows the default App Hosting image optimization to function as intended. |
| **Remove Hardcoded Admin UID** | `TO DO` | **Problem:** The admin UID is hardcoded in `seedDatabaseAction`. **Risk:** This is an information disclosure risk, making the admin account a specific target for attackers. **Solution:** Refactor `seedDatabaseAction` to assign seed articles to the user *running* the action, using their `decodedToken.uid`, rather than a static, hardcoded value. |
