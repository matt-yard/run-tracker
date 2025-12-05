import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'run-tracker.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export interface Run {
	id: number;
	date: string;
	distance: number; // in kilometers
	duration: number; // in minutes
	pace: number; // minutes per kilometer
	avgHeartRate?: number;
	maxHeartRate?: number;
	elevationGain?: number; // in meters
	calories?: number;
	notes?: string;
	gpxData?: string; // JSON string of GPS coordinates
	source: string; // 'apple_health', 'gpx', 'csv', 'manual'
	createdAt: string;
	// Apple Health rich metrics
	stepCount?: number;
	avgRunningPower?: number; // watts
	avgGroundContactTime?: number; // milliseconds
	avgRunningSpeed?: number; // km/hr
	avgVerticalOscillation?: number; // cm
	avgStrideLength?: number; // meters
	workoutName?: string;
	indoorWorkout?: number; // 0 or 1 (boolean)
	sourceName?: string;
	splits?: string; // JSON array of lap data
	rawData?: string; // JSON object with all extracted metrics
}

// Initialize the database schema
export function initializeDatabase() {
	db.exec(`
		CREATE TABLE IF NOT EXISTS runs (
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
			stepCount INTEGER,
			avgRunningPower REAL,
			avgGroundContactTime REAL,
			avgRunningSpeed REAL,
			avgVerticalOscillation REAL,
			avgStrideLength REAL,
			workoutName TEXT,
			indoorWorkout INTEGER,
			sourceName TEXT,
			splits TEXT,
			rawData TEXT,
			UNIQUE(date, distance, duration)
		);

		CREATE INDEX IF NOT EXISTS idx_runs_date ON runs(date);
		CREATE INDEX IF NOT EXISTS idx_runs_source ON runs(source);
	`);

	// Migrate existing databases by adding new columns if they don't exist
	const columns = [
		'stepCount INTEGER',
		'avgRunningPower REAL',
		'avgGroundContactTime REAL',
		'avgRunningSpeed REAL',
		'avgVerticalOscillation REAL',
		'avgStrideLength REAL',
		'workoutName TEXT',
		'indoorWorkout INTEGER',
		'sourceName TEXT',
		'splits TEXT',
		'rawData TEXT'
	];

	for (const column of columns) {
		const columnName = column.split(' ')[0];
		try {
			// Check if column exists by trying to select it
			db.prepare(`SELECT ${columnName} FROM runs LIMIT 1`).get();
		} catch (err) {
			// Column doesn't exist, add it
			db.exec(`ALTER TABLE runs ADD COLUMN ${column}`);
		}
	}
}

// Get all runs
export function getAllRuns(): Run[] {
	const stmt = db.prepare('SELECT * FROM runs ORDER BY date DESC');
	return stmt.all() as Run[];
}

// Get runs with pagination
export function getRuns(limit: number = 50, offset: number = 0): Run[] {
	const stmt = db.prepare('SELECT * FROM runs ORDER BY date DESC LIMIT ? OFFSET ?');
	return stmt.all(limit, offset) as Run[];
}

// Get a single run by ID
export function getRun(id: number): Run | undefined {
	const stmt = db.prepare('SELECT * FROM runs WHERE id = ?');
	return stmt.get(id) as Run | undefined;
}

// Insert a new run
export function insertRun(run: Omit<Run, 'id' | 'createdAt'>): number {
	const stmt = db.prepare(`
		INSERT INTO runs (
			date, distance, duration, pace, avgHeartRate, maxHeartRate,
			elevationGain, calories, notes, gpxData, source, createdAt,
			stepCount, avgRunningPower, avgGroundContactTime, avgRunningSpeed,
			avgVerticalOscillation, avgStrideLength, workoutName, indoorWorkout,
			sourceName, splits, rawData
		) VALUES (
			@date, @distance, @duration, @pace, @avgHeartRate, @maxHeartRate,
			@elevationGain, @calories, @notes, @gpxData, @source, @createdAt,
			@stepCount, @avgRunningPower, @avgGroundContactTime, @avgRunningSpeed,
			@avgVerticalOscillation, @avgStrideLength, @workoutName, @indoorWorkout,
			@sourceName, @splits, @rawData
		)
	`);

	const result = stmt.run({
		...run,
		createdAt: new Date().toISOString()
	});

	return result.lastInsertRowid as number;
}

// Delete a run
export function deleteRun(id: number): boolean {
	const stmt = db.prepare('DELETE FROM runs WHERE id = ?');
	const result = stmt.run(id);
	return result.changes > 0;
}

// Check if a run already exists (duplicate detection)
export function runExists(date: string, distance: number, duration: number): boolean {
	const stmt = db.prepare('SELECT id FROM runs WHERE date = ? AND distance = ? AND duration = ?');
	const result = stmt.get(date, distance, duration);
	return result !== undefined;
}

// Get statistics
export function getStats(startDate?: string, endDate?: string) {
	let query = 'SELECT COUNT(*) as count, SUM(distance) as totalDistance, AVG(pace) as avgPace FROM runs';
	const params: string[] = [];

	if (startDate && endDate) {
		query += ' WHERE date >= ? AND date <= ?';
		params.push(startDate, endDate);
	} else if (startDate) {
		query += ' WHERE date >= ?';
		params.push(startDate);
	}

	const stmt = db.prepare(query);
	return stmt.get(...params) as { count: number; totalDistance: number; avgPace: number };
}

// Get personal records
export function getPersonalRecords() {
	const fastestPace = db
		.prepare('SELECT * FROM runs ORDER BY pace ASC LIMIT 1')
		.get() as Run | undefined;
	const longestDistance = db
		.prepare('SELECT * FROM runs ORDER BY distance DESC LIMIT 1')
		.get() as Run | undefined;
	const longestDuration = db
		.prepare('SELECT * FROM runs ORDER BY duration DESC LIMIT 1')
		.get() as Run | undefined;

	return {
		fastestPace,
		longestDistance,
		longestDuration
	};
}

// Export all runs to CSV format
export function exportToCsv(): string {
	const runs = getAllRuns();
	const headers = [
		'Date',
		'Distance (km)',
		'Duration (min)',
		'Pace (min/km)',
		'Avg Heart Rate',
		'Max Heart Rate',
		'Elevation Gain (m)',
		'Calories',
		'Source'
	];

	const rows = runs.map((run) => [
		run.date,
		run.distance.toFixed(2),
		run.duration.toFixed(2),
		run.pace.toFixed(2),
		run.avgHeartRate || '',
		run.maxHeartRate || '',
		run.elevationGain || '',
		run.calories || '',
		run.source
	]);

	return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

// Get runs grouped by week
export function getRunsByWeek(limit: number = 12) {
	const stmt = db.prepare(`
		SELECT
			strftime('%Y-W%W', date) as week,
			COUNT(*) as count,
			SUM(distance) as totalDistance,
			AVG(pace) as avgPace
		FROM runs
		GROUP BY week
		ORDER BY week DESC
		LIMIT ?
	`);
	return stmt.all(limit);
}

// Get runs grouped by month
export function getRunsByMonth(limit: number = 12) {
	const stmt = db.prepare(`
		SELECT
			strftime('%Y-%m', date) as month,
			COUNT(*) as count,
			SUM(distance) as totalDistance,
			AVG(pace) as avgPace
		FROM runs
		GROUP BY month
		ORDER BY month DESC
		LIMIT ?
	`);
	return stmt.all(limit);
}

// Initialize the database on import
initializeDatabase();

export default db;
