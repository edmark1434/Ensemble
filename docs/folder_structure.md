EnsembleProject Folder Structure
📂 Root Directory
The root directory of the EnsembleProject contains the core applications (frontend and backend) alongside some project-wide configurations and tools.

backend/ - The backend server application.
frontend/ - The frontend web application.
docs/ - Project documentation files.
video-editor/ - Seems to be an independent module or sub-project for video editing.
docker-compose.yml - Docker setup for containerizing and running the applications/services.
ENSEMBLEBACKUP.sql - A backup of the SQL database.
README.md - Main project readme file.
⚙️ Backend (/backend)
The backend is a Node.js server (using Express, as evidenced by server.js) built with a modular, layered architecture that separates concerns effectively.

Route/ - Defines the API endpoints and maps them to their respective controllers.
Controllers/ - Extracts request parameters, delegates to services, and formats HTTP responses.
Services/ - Contains the core business logic of the application.
Repositories/ - Handles data access, executing direct interactions with the database.
middleware/ - Express middleware functions (e.g., for authentication, validation, error handling).
lib/ - Shared helper utilities, constants, or third-party library wrappers.
migrations/ - Scripts to handle database schema changes over time.
sql/ - Raw SQL files, probably used for initial seeding, queries, or procedures.
server.js - The main entry point to start the backend server.
package.json - Manages backend dependencies and scripts.
🎨 Frontend (/frontend)
The frontend is a modern web application built using React, TypeScript, and Vite. The presence of components.json strongly suggests the use of a UI library like shadcn/ui or a similar Tailwind-based component system.

src/ - The main source code directory.
components/ - Reusable UI components used across different pages.
pages/ - Top-level route components representing full views.
hooks/ - Custom React hooks for state and lifecycle management.
lib/ - Utility functions (e.g., the cn utility often used with Tailwind/shadcn).
assets/ - Static assets like images, icons, or global styles.
data/ - Static or mock data arrays.
draft/ - Likely used for experimental or WIP components/pages.
App.tsx - The root React application component (often defining routers/providers).
main.tsx - The Vite entry point that mounts the React app to the DOM.
public/ - Static assets served at the root URL path.
vite.config.ts - Configuration for the Vite bundler.
tailwind.config.js / components.json - Styling and component system configurations.
forum-context.md - Documentation context likely related to a forum feature in the app.
package.json - Manages frontend dependencies and scripts.