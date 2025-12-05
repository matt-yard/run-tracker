import { XMLParser } from 'fast-xml-parser';
import Papa from 'papaparse';
import { createReadStream, readFileSync } from 'fs';
import { createInterface } from 'readline';
import type { Run } from './database';

export interface ParsedRun {
	date: string;
	distance: number;
	duration: number;
	pace: number;
	avgHeartRate?: number;
	maxHeartRate?: number;
	elevationGain?: number;
	calories?: number;
	notes?: string;
	gpxData?: string;
	source: string;
	// Apple Health rich metrics
	stepCount?: number;
	avgRunningPower?: number;
	avgGroundContactTime?: number;
	avgRunningSpeed?: number;
	avgVerticalOscillation?: number;
	avgStrideLength?: number;
	workoutName?: string;
	indoorWorkout?: number;
	sourceName?: string;
	splits?: string;
	rawData?: string;
}

function calculatePace(distance: number, duration: number): number {
	if (distance === 0) return 0;
	return duration / distance;
}

// Parse Apple Health XML export
export function parseAppleHealthXML(xmlContent: string): ParsedRun[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '',
		isArray: (tagName) => {
			// Ensure these tags are always arrays even if there's only one
			return ['Workout', 'WorkoutStatistics', 'WorkoutEvent', 'MetadataEntry', 'WorkoutActivity'].includes(tagName);
		}
	});

	const result = parser.parse(xmlContent);
	const runs: ParsedRun[] = [];

	if (!result.HealthData || !result.HealthData.Workout) {
		return runs;
	}

	const workouts = Array.isArray(result.HealthData.Workout)
		? result.HealthData.Workout
		: [result.HealthData.Workout];

	for (const workout of workouts) {
		// Only process running workouts
		if (
			!workout.workoutActivityType ||
			!workout.workoutActivityType.includes('Running')
		) {
			continue;
		}

		// Extract basic workout attributes
		const durationValue = parseFloat(workout.duration || '0');
		const durationUnit = workout.durationUnit || 'min';

		// Convert duration to minutes
		let duration = durationValue;
		if (durationUnit === 'hr') {
			duration = durationValue * 60;
		}

		// Extract WorkoutStatistics
		let distanceKm = 0;
		let calories: number | undefined;
		let avgHeartRate: number | undefined;
		let maxHeartRate: number | undefined;
		let stepCount: number | undefined;
		let avgRunningPower: number | undefined;
		let avgGroundContactTime: number | undefined;
		let avgRunningSpeed: number | undefined;
		let avgVerticalOscillation: number | undefined;
		let avgStrideLength: number | undefined;

		const workoutStats = Array.isArray(workout.WorkoutStatistics)
			? workout.WorkoutStatistics
			: workout.WorkoutStatistics
			? [workout.WorkoutStatistics]
			: [];

		for (const stat of workoutStats) {
			const type = stat.type;

			if (type === 'HKQuantityTypeIdentifierDistanceWalkingRunning') {
				const distance = parseFloat(stat.sum || '0');
				const unit = stat.unit || 'km';
				// Convert to km
				distanceKm = unit === 'mi' ? distance * 1.60934 : distance;
			} else if (type === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
				calories = stat.sum ? parseInt(stat.sum) : undefined;
			} else if (type === 'HKQuantityTypeIdentifierHeartRate') {
				avgHeartRate = stat.average ? Math.round(parseFloat(stat.average)) : undefined;
				maxHeartRate = stat.maximum ? Math.round(parseFloat(stat.maximum)) : undefined;
			} else if (type === 'HKQuantityTypeIdentifierStepCount') {
				stepCount = stat.sum ? Math.round(parseFloat(stat.sum)) : undefined;
			} else if (type === 'HKQuantityTypeIdentifierRunningPower') {
				avgRunningPower = stat.average ? parseFloat(stat.average) : undefined;
			} else if (type === 'HKQuantityTypeIdentifierRunningGroundContactTime') {
				avgGroundContactTime = stat.average ? parseFloat(stat.average) : undefined;
			} else if (type === 'HKQuantityTypeIdentifierRunningSpeed') {
				const speed = stat.average ? parseFloat(stat.average) : undefined;
				const unit = stat.unit || 'km/hr';
				// Convert to km/hr
				avgRunningSpeed = unit === 'mi/hr' && speed ? speed * 1.60934 : speed;
			} else if (type === 'HKQuantityTypeIdentifierRunningVerticalOscillation') {
				avgVerticalOscillation = stat.average ? parseFloat(stat.average) : undefined;
			} else if (type === 'HKQuantityTypeIdentifierRunningStrideLength') {
				avgStrideLength = stat.average ? parseFloat(stat.average) : undefined;
			}
		}

		// Extract MetadataEntry values
		let workoutName: string | undefined;
		let indoorWorkout: number | undefined;

		const metadataEntries = Array.isArray(workout.MetadataEntry)
			? workout.MetadataEntry
			: workout.MetadataEntry
			? [workout.MetadataEntry]
			: [];

		for (const entry of metadataEntries) {
			if (entry.key === 'HKWorkoutBrandName') {
				workoutName = entry.value;
			} else if (entry.key === 'HKIndoorWorkout') {
				indoorWorkout = parseInt(entry.value);
			}
		}

		// Extract splits from WorkoutEvents
		const workoutEvents = Array.isArray(workout.WorkoutEvent)
			? workout.WorkoutEvent
			: workout.WorkoutEvent
			? [workout.WorkoutEvent]
			: [];

		const splits: any[] = [];
		for (const event of workoutEvents) {
			if (event.type === 'HKWorkoutEventTypeLap' && event.duration) {
				splits.push({
					duration: parseFloat(event.duration),
					durationUnit: event.durationUnit || 'min',
					date: event.date
				});
			}
		}

		// Create raw data object with all extracted metrics
		const rawData = {
			workoutActivityType: workout.workoutActivityType,
			sourceName: workout.sourceName,
			sourceVersion: workout.sourceVersion,
			device: workout.device,
			creationDate: workout.creationDate,
			startDate: workout.startDate,
			endDate: workout.endDate,
			workoutStats,
			metadata: metadataEntries,
			events: workoutEvents
		};

		if (distanceKm > 0 && duration > 0) {
			runs.push({
				date: workout.startDate ? new Date(workout.startDate).toISOString() : new Date().toISOString(),
				distance: distanceKm,
				duration: duration,
				pace: calculatePace(distanceKm, duration),
				calories,
				avgHeartRate,
				maxHeartRate,
				elevationGain: undefined,
				notes: undefined,
				gpxData: undefined,
				stepCount,
				avgRunningPower,
				avgGroundContactTime,
				avgRunningSpeed,
				avgVerticalOscillation,
				avgStrideLength,
				workoutName,
				indoorWorkout,
				sourceName: workout.sourceName,
				splits: splits.length > 0 ? JSON.stringify(splits) : undefined,
				rawData: JSON.stringify(rawData),
				source: 'apple_health'
			});
		}
	}

	return runs;
}

// Parse GPX file
export function parseGPX(gpxContent: string): ParsedRun[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: ''
	});

	const result = parser.parse(gpxContent);
	const runs: ParsedRun[] = [];

	if (!result.gpx || !result.gpx.trk) {
		return runs;
	}

	const tracks = Array.isArray(result.gpx.trk) ? result.gpx.trk : [result.gpx.trk];

	for (const track of tracks) {
		if (!track.trkseg) continue;

		const segments = Array.isArray(track.trkseg) ? track.trkseg : [track.trkseg];
		let totalDistance = 0;
		let elevationGain = 0;
		let startTime: Date | null = null;
		let endTime: Date | null = null;
		let lastPoint: any = null;
		const points: any[] = [];

		for (const segment of segments) {
			if (!segment.trkpt) continue;

			const trackPoints = Array.isArray(segment.trkpt) ? segment.trkpt : [segment.trkpt];

			for (const point of trackPoints) {
				const lat = parseFloat(point.lat);
				const lon = parseFloat(point.lon);
				const ele = point.ele ? parseFloat(point.ele) : undefined;
				const time = point.time ? new Date(point.time) : null;

				points.push({ lat, lon, ele, time });

				if (time && !startTime) {
					startTime = time;
				}
				if (time) {
					endTime = time;
				}

				if (lastPoint) {
					// Calculate distance using Haversine formula
					const R = 6371; // Earth's radius in km
					const dLat = ((lat - lastPoint.lat) * Math.PI) / 180;
					const dLon = ((lon - lastPoint.lon) * Math.PI) / 180;
					const a =
						Math.sin(dLat / 2) * Math.sin(dLat / 2) +
						Math.cos((lastPoint.lat * Math.PI) / 180) *
							Math.cos((lat * Math.PI) / 180) *
							Math.sin(dLon / 2) *
							Math.sin(dLon / 2);
					const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
					totalDistance += R * c;

					// Calculate elevation gain
					if (ele !== undefined && lastPoint.ele !== undefined && ele > lastPoint.ele) {
						elevationGain += ele - lastPoint.ele;
					}
				}

				lastPoint = { lat, lon, ele };
			}
		}

		if (startTime && endTime && totalDistance > 0) {
			const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // Convert to minutes

			runs.push({
				date: startTime.toISOString(),
				distance: totalDistance,
				duration: duration,
				pace: calculatePace(totalDistance, duration),
				avgHeartRate: undefined,
				maxHeartRate: undefined,
				elevationGain: elevationGain > 0 ? elevationGain : undefined,
				calories: undefined,
				notes: undefined,
				gpxData: JSON.stringify(points),
				stepCount: undefined,
				avgRunningPower: undefined,
				avgGroundContactTime: undefined,
				avgRunningSpeed: undefined,
				avgVerticalOscillation: undefined,
				avgStrideLength: undefined,
				workoutName: undefined,
				indoorWorkout: undefined,
				sourceName: undefined,
				splits: undefined,
				rawData: undefined,
				source: 'gpx'
			});
		}
	}

	return runs;
}

// Parse CSV file
export function parseCSV(csvContent: string): ParsedRun[] {
	const result = Papa.parse(csvContent, {
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true
	});

	const runs: ParsedRun[] = [];

	for (const row of result.data as any[]) {
		// Try to identify the column names (case-insensitive)
		const keys = Object.keys(row).map((k) => k.toLowerCase());

		const getColumn = (possibleNames: string[]): any => {
			for (const name of possibleNames) {
				const key = keys.find((k) => k.includes(name));
				if (key) return row[Object.keys(row)[keys.indexOf(key)]];
			}
			return undefined;
		};

		const date = getColumn(['date', 'time', 'start']);
		let distance = getColumn(['distance', 'dist', 'km', 'miles']);
		const duration = getColumn(['duration', 'time', 'minutes', 'mins']);
		const pace = getColumn(['pace', 'avg pace', 'average pace']);
		const avgHeartRate = getColumn(['heart rate', 'hr', 'avg hr', 'avghr']);
		const maxHeartRate = getColumn(['max heart rate', 'max hr', 'maxhr']);
		const elevationGain = getColumn(['elevation', 'elev', 'elevation gain']);
		const calories = getColumn(['calories', 'cal', 'kcal']);

		if (!date || !distance || !duration) {
			continue; // Skip rows without required data
		}

		// Parse distance (could be in km or miles)
		let distanceKm = parseFloat(distance);
		// If distance seems like it might be in miles (< 50 is a reasonable heuristic)
		// and there's a column name suggesting miles, convert it
		const distanceCol = Object.keys(row).find((k) => k.toLowerCase().includes('mile'));
		if (distanceCol) {
			distanceKm = distanceKm * 1.60934;
		}

		// Parse duration (could be in various formats)
		let durationMinutes: number;
		if (typeof duration === 'string' && duration.includes(':')) {
			// Format like "HH:MM:SS" or "MM:SS"
			const parts = duration.split(':').map((p) => parseFloat(p));
			if (parts.length === 3) {
				durationMinutes = parts[0] * 60 + parts[1] + parts[2] / 60;
			} else if (parts.length === 2) {
				durationMinutes = parts[0] + parts[1] / 60;
			} else {
				durationMinutes = parseFloat(duration);
			}
		} else {
			durationMinutes = parseFloat(duration);
		}

		// Calculate pace if not provided
		let paceValue = pace ? parseFloat(pace) : calculatePace(distanceKm, durationMinutes);

		runs.push({
			date: new Date(date).toISOString(),
			distance: distanceKm,
			duration: durationMinutes,
			pace: paceValue,
			avgHeartRate: avgHeartRate ? parseInt(avgHeartRate) : undefined,
			maxHeartRate: maxHeartRate ? parseInt(maxHeartRate) : undefined,
			elevationGain: elevationGain ? parseFloat(elevationGain) : undefined,
			calories: calories ? parseInt(calories) : undefined,
			notes: undefined,
			gpxData: undefined,
			stepCount: undefined,
			avgRunningPower: undefined,
			avgGroundContactTime: undefined,
			avgRunningSpeed: undefined,
			avgVerticalOscillation: undefined,
			avgStrideLength: undefined,
			workoutName: undefined,
			indoorWorkout: undefined,
			sourceName: undefined,
			splits: undefined,
			rawData: undefined,
			source: 'csv'
		});
	}

	return runs;
}

// Parse Apple Health XML from file path (for large files)
export async function parseAppleHealthXMLFromFile(filePath: string): Promise<ParsedRun[]> {
	const runs: ParsedRun[] = [];

	// For large XML files, we need to use a streaming approach
	// We'll use a regex-based extraction since full XML parsing requires loading entire file
	const fileStream = createReadStream(filePath, { encoding: 'utf8' });
	const rl = createInterface({
		input: fileStream,
		crlfDelay: Infinity
	});

	let workoutBuffer = '';
	let inWorkout = false;

	for await (const line of rl) {
		// Check if we're entering a Workout tag (not WorkoutEvent or WorkoutStatistics)
		if (line.includes('<Workout ') || line.includes('<Workout>')) {
			inWorkout = true;
			workoutBuffer = line;
		} else if (inWorkout) {
			workoutBuffer += '\n' + line;

			// Check if we've reached the end of the workout tag
			if (line.includes('</Workout>')) {
				inWorkout = false;

				// Parse this workout
				try {
					// First check if this is a running workout
					const activityTypeMatch = workoutBuffer.match(/workoutActivityType="([^"]+)"/);
					if (!activityTypeMatch || !activityTypeMatch[1].includes('Running')) {
						workoutBuffer = '';
						continue;
					}

					// Extract basic attributes from opening Workout tag
					const durationMatch = workoutBuffer.match(/duration="([^"]+)"/);
					const durationUnitMatch = workoutBuffer.match(/durationUnit="([^"]+)"/);
					const startDateMatch = workoutBuffer.match(/startDate="([^"]+)"/);
					const sourceNameMatch = workoutBuffer.match(/sourceName="([^"]+)"/);

					if (!durationMatch) {
						workoutBuffer = '';
						continue;
					}

					let durationValue = parseFloat(durationMatch[1]);
					const durationUnit = durationUnitMatch ? durationUnitMatch[1] : 'min';

					// Convert duration to minutes
					let duration = durationValue;
					if (durationUnit === 'hr') {
						duration = durationValue * 60;
					}

					// Extract WorkoutStatistics using regex
					let distanceKm = 0;
					let calories: number | undefined;
					let avgHeartRate: number | undefined;
					let maxHeartRate: number | undefined;
					let stepCount: number | undefined;
					let avgRunningPower: number | undefined;
					let avgGroundContactTime: number | undefined;
					let avgRunningSpeed: number | undefined;
					let avgVerticalOscillation: number | undefined;
					let avgStrideLength: number | undefined;

					// Find all WorkoutStatistics elements
					const statsRegex = /<WorkoutStatistics[^>]+>/g;
					const statsMatches = workoutBuffer.match(statsRegex) || [];

					for (const statTag of statsMatches) {
						const typeMatch = statTag.match(/type="([^"]+)"/);
						if (!typeMatch) continue;

						const type = typeMatch[1];

						if (type === 'HKQuantityTypeIdentifierDistanceWalkingRunning') {
							const sumMatch = statTag.match(/sum="([^"]+)"/);
							const unitMatch = statTag.match(/unit="([^"]+)"/);
							if (sumMatch) {
								const distance = parseFloat(sumMatch[1]);
								const unit = unitMatch ? unitMatch[1] : 'km';
								distanceKm = unit === 'mi' ? distance * 1.60934 : distance;
							}
						} else if (type === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
							const sumMatch = statTag.match(/sum="([^"]+)"/);
							if (sumMatch) calories = parseInt(sumMatch[1]);
						} else if (type === 'HKQuantityTypeIdentifierHeartRate') {
							const avgMatch = statTag.match(/average="([^"]+)"/);
							const maxMatch = statTag.match(/maximum="([^"]+)"/);
							if (avgMatch) avgHeartRate = Math.round(parseFloat(avgMatch[1]));
							if (maxMatch) maxHeartRate = Math.round(parseFloat(maxMatch[1]));
						} else if (type === 'HKQuantityTypeIdentifierStepCount') {
							const sumMatch = statTag.match(/sum="([^"]+)"/);
							if (sumMatch) stepCount = Math.round(parseFloat(sumMatch[1]));
						} else if (type === 'HKQuantityTypeIdentifierRunningPower') {
							const avgMatch = statTag.match(/average="([^"]+)"/);
							if (avgMatch) avgRunningPower = parseFloat(avgMatch[1]);
						} else if (type === 'HKQuantityTypeIdentifierRunningGroundContactTime') {
							const avgMatch = statTag.match(/average="([^"]+)"/);
							if (avgMatch) avgGroundContactTime = parseFloat(avgMatch[1]);
						} else if (type === 'HKQuantityTypeIdentifierRunningSpeed') {
							const avgMatch = statTag.match(/average="([^"]+)"/);
							const unitMatch = statTag.match(/unit="([^"]+)"/);
							if (avgMatch) {
								const speed = parseFloat(avgMatch[1]);
								const unit = unitMatch ? unitMatch[1] : 'km/hr';
								avgRunningSpeed = unit === 'mi/hr' ? speed * 1.60934 : speed;
							}
						} else if (type === 'HKQuantityTypeIdentifierRunningVerticalOscillation') {
							const avgMatch = statTag.match(/average="([^"]+)"/);
							if (avgMatch) avgVerticalOscillation = parseFloat(avgMatch[1]);
						} else if (type === 'HKQuantityTypeIdentifierRunningStrideLength') {
							const avgMatch = statTag.match(/average="([^"]+)"/);
							if (avgMatch) avgStrideLength = parseFloat(avgMatch[1]);
						}
					}

					// Extract MetadataEntry values
					let workoutName: string | undefined;
					let indoorWorkout: number | undefined;

					const metadataRegex = /<MetadataEntry[^>]+>/g;
					const metadataMatches = workoutBuffer.match(metadataRegex) || [];

					for (const metaTag of metadataMatches) {
						const keyMatch = metaTag.match(/key="([^"]+)"/);
						const valueMatch = metaTag.match(/value="([^"]+)"/);
						if (!keyMatch || !valueMatch) continue;

						if (keyMatch[1] === 'HKWorkoutBrandName') {
							workoutName = valueMatch[1];
						} else if (keyMatch[1] === 'HKIndoorWorkout') {
							indoorWorkout = parseInt(valueMatch[1]);
						}
					}

					// Extract splits from WorkoutEvents
					const splits: any[] = [];
					const eventRegex = /<WorkoutEvent[^>]+>/g;
					const eventMatches = workoutBuffer.match(eventRegex) || [];

					for (const eventTag of eventMatches) {
						const typeMatch = eventTag.match(/type="([^"]+)"/);
						if (typeMatch && typeMatch[1] === 'HKWorkoutEventTypeLap') {
							const durationMatch = eventTag.match(/duration="([^"]+)"/);
							const dateMatch = eventTag.match(/date="([^"]+)"/);
							const durationUnitMatch = eventTag.match(/durationUnit="([^"]+)"/);
							if (durationMatch) {
								splits.push({
									duration: parseFloat(durationMatch[1]),
									durationUnit: durationUnitMatch ? durationUnitMatch[1] : 'min',
									date: dateMatch ? dateMatch[1] : undefined
								});
							}
						}
					}

					if (distanceKm > 0 && duration > 0) {
						runs.push({
							date: startDateMatch ? new Date(startDateMatch[1]).toISOString() : new Date().toISOString(),
							distance: distanceKm,
							duration: duration,
							pace: calculatePace(distanceKm, duration),
							calories,
							avgHeartRate,
							maxHeartRate,
							elevationGain: undefined,
							notes: undefined,
							gpxData: undefined,
							stepCount,
							avgRunningPower,
							avgGroundContactTime,
							avgRunningSpeed,
							avgVerticalOscillation,
							avgStrideLength,
							workoutName,
							indoorWorkout,
							sourceName: sourceNameMatch ? sourceNameMatch[1] : undefined,
							splits: splits.length > 0 ? JSON.stringify(splits) : undefined,
							rawData: undefined,
							source: 'apple_health'
						});
					}
				} catch (err) {
					// Skip invalid workouts
					console.error('Error parsing workout:', err);
				}

				workoutBuffer = '';
			}
		}
	}

	return runs;
}

// Parse CSV from file path
export function parseCSVFromFile(filePath: string): ParsedRun[] {
	const content = readFileSync(filePath, 'utf8');
	return parseCSV(content);
}

// Parse GPX from file path
export function parseGPXFromFile(filePath: string): ParsedRun[] {
	const content = readFileSync(filePath, 'utf8');
	return parseGPX(content);
}

// Auto-detect format and parse from file path (recommended for large files)
export async function parseFileFromPath(filename: string, filePath: string): Promise<ParsedRun[]> {
	const ext = filename.toLowerCase().split('.').pop();

	if (ext === 'xml') {
		// Check first few lines to detect format
		const fileStream = createReadStream(filePath, { encoding: 'utf8' });
		const rl = createInterface({
			input: fileStream,
			crlfDelay: Infinity
		});

		let isHealthData = false;
		let isGPX = false;
		let lineCount = 0;

		for await (const line of rl) {
			if (line.includes('<HealthData') || line.includes('Workout')) {
				isHealthData = true;
				break;
			} else if (line.includes('<gpx') || line.includes('<trk')) {
				isGPX = true;
				break;
			}
			lineCount++;
			if (lineCount > 50) break; // Check first 50 lines
		}

		rl.close();
		fileStream.close();

		if (isHealthData) {
			return await parseAppleHealthXMLFromFile(filePath);
		} else if (isGPX) {
			return parseGPXFromFile(filePath);
		}
	} else if (ext === 'gpx') {
		return parseGPXFromFile(filePath);
	} else if (ext === 'csv') {
		return parseCSVFromFile(filePath);
	}

	throw new Error(`Unsupported file format: ${ext}`);
}

// Auto-detect format and parse (legacy - for small files only)
export function parseFile(filename: string, content: string): ParsedRun[] {
	const ext = filename.toLowerCase().split('.').pop();

	if (ext === 'xml') {
		// Try to detect if it's Apple Health XML or GPX
		if (content.includes('<HealthData') || content.includes('Workout')) {
			return parseAppleHealthXML(content);
		} else if (content.includes('<gpx') || content.includes('<trk')) {
			return parseGPX(content);
		}
	} else if (ext === 'gpx') {
		return parseGPX(content);
	} else if (ext === 'csv') {
		return parseCSV(content);
	}

	throw new Error(`Unsupported file format: ${ext}`);
}
