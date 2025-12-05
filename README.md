# Running Tracker

A complete web application for tracking and analyzing your running data. Built with SvelteKit, Svelte 5, SQLite, and shadcn-svelte components.

## Features

- 📊 **Dashboard** with key statistics (weekly, monthly, yearly totals)
- 📁 **Data Import** from multiple formats:
  - Apple Health XML exports
  - GPX files (GPS tracks)
  - CSV files
- 📈 **Visualizations** with interactive charts:
  - Weekly/Monthly distance trends
  - Pace analysis
  - Distance distribution
- 🏃 **Run Management** with sorting, filtering, and delete capabilities
- 💾 **Export** data to CSV format
- 🏆 **Personal Records** tracking (fastest pace, longest distance, longest duration)
- 🎨 **Modern UI** using shadcn-svelte components
- 🌙 **Dark mode** support

## Tech Stack

- **Frontend**: SvelteKit with Svelte 5 (using Runes API)
- **Database**: SQLite with better-sqlite3
- **UI Components**: shadcn-svelte
- **Charts**: LayerChart with D3
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety

## Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository (if needed)

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5173
```

## Usage

### Uploading Data

1. Navigate to the **Upload Data** page
2. Select a file in one of the supported formats:
   - **Apple Health XML**: Export from iPhone Settings → Privacy → Health → Export Health Data
   - **GPX files**: GPS track files from fitness apps
   - **CSV files**: Spreadsheet with columns for date, distance, duration, etc.
3. Click **Upload and Import**

The app will automatically:
- Detect the file format
- Parse the running data
- Skip duplicate entries
- Store runs in the local SQLite database

### Viewing Your Data

- **Dashboard**: Overview of recent runs and statistics
- **View All Runs**: Complete run history with sorting and filtering
- **Statistics**: Visual charts showing trends over time

### Managing Runs

- **Filter**: Use the search box to find specific runs
- **Sort**: Click column headers to sort by date, distance, or pace
- **Delete**: Remove individual runs (with confirmation)
- **Export**: Download all data as CSV

## Data Formats

### Apple Health XML

The app extracts running workouts from Apple Health exports. Required fields:
- `workoutActivityType`: Must contain "Running"
- `totalDistance`: Distance covered
- `duration`: Duration of the run
- `startDate`: When the run started

Optional fields:
- `totalEnergyBurned`: Calories burned

### GPX Files

Standard GPS track format. The app calculates:
- Distance from GPS coordinates (Haversine formula)
- Duration from timestamps
- Elevation gain from elevation data

### CSV Files

The parser auto-detects column names (case-insensitive). Supported columns:
- **Required**: date, distance, duration
- **Optional**: pace, heart rate, elevation, calories

Example CSV:
```csv
Date,Distance (km),Duration (min),Pace (min/km),Avg Heart Rate
2024-01-15,5.2,28,5.38,145
2024-01-18,10.5,55,5.24,152
```

## Database Schema

The SQLite database (`run-tracker.db`) contains a single `runs` table:

```sql
CREATE TABLE runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    distance REAL NOT NULL,
    duration REAL NOT NULL,
    pace REAL NOT NULL,
    avgHeartRate INTEGER,
    maxHeartRate INTEGER,
    elevationGain REAL,
    calories INTEGER,
    notes TEXT,
    gpxData TEXT,
    source TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    UNIQUE(date, distance, duration)
);
```

The unique constraint prevents duplicate imports.

## Development

### Project Structure

```
src/
├── lib/
│   ├── components/ui/    # shadcn-svelte components
│   ├── server/
│   │   ├── database.ts   # Database utilities
│   │   └── parsers.ts    # File parsing logic
│   └── utils.ts          # Helper functions
├── routes/
│   ├── +page.svelte      # Dashboard
│   ├── upload/           # File upload page
│   ├── runs/             # Run management page
│   └── stats/            # Statistics/charts page
└── app.css               # Global styles
```

### Key Technologies

- **Svelte 5 Runes**: All components use the new `$state()`, `$derived()`, `$props()` API
- **SvelteKit Server Routes**: Database operations run server-side for security
- **Form Actions**: Handle file uploads and deletions
- **TypeScript**: Full type safety throughout

### Building for Production

```bash
npm run build
```

This creates a production build in the `build/` directory. The app can be deployed to any Node.js hosting service.

To preview the production build:
```bash
npm run preview
```

## Shadcn-svelte Components Used

The application uses the following shadcn-svelte components:
- Button
- Card (Card, CardHeader, CardTitle, CardContent)
- Input
- Table (Table, TableHeader, TableBody, TableRow, TableHead, TableCell)
- Badge

All components follow the shadcn-svelte design system and support dark mode.

## Database Location

The SQLite database is stored in the project root as `run-tracker.db`. To reset the database, simply delete this file and restart the application.

## License

MIT
