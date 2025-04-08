# Node Observatory

<p align="center">
  <img src="./src/client/assets/neural-network.png" alt="Node Observatory Logo">
</p>

Node Observatory is an observability tool that allows the user to track requests, jobs, and schedules end-to-end within their Node.js application.

## Features

*   **Data Collection:** Ingests data from a monitored Node.js application via various watchers, including:
    *   Incoming HTTP Requests (`RequestWatcher`)
    *   Jobs (`JobsWatcher`)
    *   Application Logs (`LogWatcher`)
    *   Errors/Exceptions (`ExceptionWatcher`)
    *   Outgoing HTTP Client Requests (`HTTPClientWatcher`)
    *   Database Queries (`QueryWatcher`)
    *   Cache interactions (`CacheWatcher`)
    *   Redis commands (`RedisWatcher`)
    *   Scheduled Tasks/Jobs (`ScheduleWatcher`, `JobWatcher`)
    *   Mail (`MailWatcher`)
    *   Notifications (`NotificationWatcher`)
    *   Model events (`ModelWatcher`)
    *   View rendering (`ViewsWatcher`)
*   **Data Storage:** Uses the user-provided database store/driver to store collected data. Includes database initialization with migrations.
*   **Data Transfer:** Uses a Redis client provided by the user which acts as a buffer between the live application and database insertion (via batches with an editable time constraint).
*   **API Endpoints:** Provides API endpoints (`/observatory-api`) to query and analyze the collected data across different watcher types.
*   **Data Analysis (Watchers):** Each watcher (`src/server/lib/watchers/`) provides capabilities to:
    *   Retrieve individual entry details along with related events linked by a `uuid`.
    *   Provide aggregated views of data (e.g., instance lists, grouped summaries, time-series graphs).
    *   Supports pagination (`limit`, `offset`) for table views where applicable.
*   **Filtering:** Allows filtering data by time period (`1h`, `24h`, `7d`, `14d`, `30d`), specific keys (e.g., route, job name), search queries (`q`), and status codes/types.
*   **Instrumentation:** Uses patching (`src/server/lib/patchers/`) to automatically instrument Node.js modules.
*   **Web UI:** Includes a React-based frontend (`src/client/`) for visualizing and interacting with the collected data.

## Supported Libraries (Peer Dependencies)

This tool automatically instruments various libraries if they are found in your project. The following versions are known to be compatible (based on `peerDependencies`):

*   `@aws-sdk/client-ses`: >=3.0.0
*   `@prisma/client`: >=6.0.0
*   `ably`: >=2.0.0
*   `agenda`: >=5.0.0
*   `axios`: >=1.0.0
*   `bree`: >=9.0.0
*   `bull`: >=4.0.0
*   `bunyan`: >=1.8.0
*   `commander`: >=12.0.0
*   `ejs`: >=3.0.0
*   `ioredis`: >=5.0.0
*   `keyv`: >=5.0.0
*   `knex`: >=3.0.0
*   `level`: >=9.0.0
*   `log4js`: >=6.0.0
*   `loglevel`: >=1.0.0
*   `lru-cache`: >=11.0.0
*   `mailgun.js`: >=10.0.0
*   `memjs`: >=1.0.0
*   `mongoose`: >=8.0.0
*   `mysql2`: >=3.0.0
*   `node-cache`: >=5.0.0
*   `node-cron`: >=3.0.0
*   `node-schedule`: >=2.0.0
*   `nodemailer`: >=6.0.0
*   `pg`: >=8.0.0
*   `pino`: >=9.0.0
*   `postmark`: >=4.0.0
*   `pug`: >=3.0.0
*   `pusher`: >=5.0.0
*   `redis`: >=4.0.0
*   `sequelize`: >=6.0.0
*   `signale`: >=1.0.0
*   `sqlite3`: >=5.0.0
*   `superagent`: >=10.0.0
*   `typeorm`: >=0.3.0
*   `undici`: >=7.0.0
*   `winston`: >=3.0.0

*Note: These libraries are listed as optional peer dependencies. The core functionality works without them, but specific watchers require the corresponding library to be installed in the monitored application.*

## Components

### Backend (`src/server/`)

*   `main.ts`: Main server entry point.
*   `lib/database/migrations`: Manages the database migrations for different drivers.
*   `lib/routes/routes.ts`: Defines the API routes for accessing watcher data.
*   `lib/watchers/`: Contains the core logic for collecting and analyzing data for different event types (Requests, Logs, Cache, etc.). Includes `BaseWatcher.ts` for common functionality.
*   `lib/patchers/`: Contains logic for patching Node.js core modules and third-party libraries to intercept events.
*   `lib/logger.ts`: Handles application setup.
*   `lib/utils.ts`: Common utility functions.
*   `lib/constants.ts`: Defines shared constants.

### Frontend (`src/client/`)

*   **Technology Stack:**
    *   Framework: React
    *   Build Tool: Vite
    *   Language: TypeScript
    *   Styling: Tailwind CSS with Shadcn UI
    *   State Management: Custom context/store (`store.tsx`)
    *   Routing: React Router
*   **Key Files/Folders:**
    *   `index.html`: Main HTML entry point.
    *   `main.tsx`: Main React application entry point.
    *   `App.tsx`: Root application component (layout, routes).
    *   `index.css`: Global styles (Tailwind base).
    *   `components/`: Reusable UI components.
    *   `screens/`: Page/view components.
    *   `lib/`: Frontend utility functions, API client logic, etc.
    *   `store.tsx`: State management logic.
    *   `assets/`: Static assets (images, fonts).
    *   `tsconfig.json`: Client TypeScript configuration.

### Build & Configuration

*   `vite.config.ts`: Configuration for Vite (handles both backend and frontend development/build).
*   `package.json`: Project dependencies and scripts.

## Setup and Running

1.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
2.  **Run Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This command starts the Vite development server, which serves the frontend with HMR and runs the backend Node.js server (typically using `nodemon` or similar for auto-restarts).

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

This command will:
1.  Build the frontend React application into optimized static assets (JS, CSS) in the `dist/` directory.
2.  (Typically) Transpile the backend TypeScript code (though `tsx` might be used directly in production via the `start` script).

The production server (`npm run start`) is usually configured to serve the static frontend assets from the `dist/` folder and run the compiled backend code.

## API Usage (Example)

API endpoints are defined in `src/server/lib/routes/routes.ts`. Refer to that file and the specific watcher implementations in `src/server/lib/watchers/` for detailed query parameters and capabilities.

The base path for the API is `/observatory-api`.

Example structure:

*   `GET /observatory-api/{watcher_type}?index=instance&period=1h&limit=20`
*   `GET /observatory-api/{watcher_type}?index=group&period=24h&status=error`
*   `GET /observatory-api/{watcher_type}/{entry_id}`

## Contributing

*(Add contribution guidelines if applicable)*

## License

*(Specify project license)*
