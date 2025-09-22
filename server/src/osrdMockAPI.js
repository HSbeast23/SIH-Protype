const express = require('express');
const cors = require('cors');

class OSRDMockAPI {
    constructor(port = 8080) {
        this.app = express();
        this.port = port;
        this.trains = new Map();
        this.simulationState = {
            startTime: new Date(),
            isRunning: false,
            currentTime: '09:00:00'
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        this.initializeMumbaiTrains();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use((req, res, next) => {
            console.log(`🚂 OSRD Mock API: ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'OSRD Mock API',
                version: '1.0.0',
                timestamp: new Date().toISOString()
            });
        });

        // Infrastructure endpoint
        this.app.get('/infrastructure', (req, res) => {
            res.json(this.getMumbaiInfrastructure());
        });

        // Create simulation
        this.app.post('/simulation', (req, res) => {
            const simulationId = `sim_${Date.now()}`;
            res.json({
                simulation_id: simulationId,
                status: 'created',
                trains: req.body.trains || []
            });
        });

        // Run simulation
        this.app.post('/simulation/:id/run', (req, res) => {
            const simulationId = req.params.id;
            this.simulationState.isRunning = true;
            this.simulationState.startTime = new Date();
            
            res.json({
                simulation_id: simulationId,
                status: 'running',
                results: this.generateSimulationResults(),
                trains: Array.from(this.trains.values()),
                metadata: {
                    start_time: req.body.start_time || '09:00:00',
                    end_time: req.body.end_time || '18:00:00',
                    real_time: req.body.real_time || false
                }
            });
        });

        // Get simulation state
        this.app.get('/simulation/:id/state', (req, res) => {
            const currentTime = this.getCurrentSimulationTime();
            const trains = this.getTrainsAtTime(currentTime);
            
            res.json({
                current_time: currentTime,
                trains: trains,
                events: this.getEventsAtTime(currentTime)
            });
        });

        // Import OSM data (mock)
        this.app.post('/import/osm', (req, res) => {
            const importId = `import_${Date.now()}`;
            res.json({
                import_id: importId,
                status: 'completed',
                message: 'OSM railway data imported successfully'
            });
        });

        // Train paths
        this.app.post('/routing/paths', (req, res) => {
            res.json({
                paths: this.generateTrainPaths(req.body.trains),
                routing_info: {
                    algorithm: 'dijkstra',
                    computation_time: '0.5s'
                }
            });
        });
    }

    initializeMumbaiTrains() {
        // Load the exact Mumbai trains from mumbaiTrains.json
        const fs = require('fs');
        const path = require('path');
        
        try {
            const trainsPath = path.join(__dirname, '../data/mumbaiTrains.json');
            const trainsData = JSON.parse(fs.readFileSync(trainsPath, 'utf8'));
            
            trainsData.forEach(train => {
                // Convert the format to match OSRD expectations
                const osrdTrain = {
                    train_id: train.train_id,
                    train_name: train.train_name,
                    route: train.origin_station + '-' + train.destination_station,
                    departure_time: train.departure_time,
                    speed_kmph: train.speed_kmph,
                    stations: train.stations.map(station => ({
                        name: station.name,
                        lat: station.lat,
                        lon: station.lon,
                        arrival: this.calculateArrivalTime(train.departure_time, station.halt_time_sec)
                    })),
                    route_geometry: train.route_geometry,
                    status: train.status
                };
                
                this.trains.set(train.train_id, osrdTrain);
            });
            
            console.log(`📊 Loaded ${trainsData.length} Mumbai trains from data file`);
        } catch (error) {
            console.error('❌ Failed to load Mumbai trains:', error.message);
            // Fallback to default trains
            this.initializeDefaultTrains();
        }
    }

    calculateArrivalTime(departureTime, haltTimeSeconds) {
        // Simple calculation - in real implementation this would be more complex
        const [hours, minutes] = departureTime.split(':').map(Number);
        const departureSeconds = hours * 3600 + minutes * 60;
        const arrivalSeconds = departureSeconds + haltTimeSeconds;
        
        const arrivalHours = Math.floor(arrivalSeconds / 3600) % 24;
        const arrivalMinutes = Math.floor((arrivalSeconds % 3600) / 60);
        const remainingSeconds = arrivalSeconds % 60;
        
        return `${arrivalHours.toString().padStart(2, '0')}:${arrivalMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    initializeDefaultTrains() {
        console.log('🔄 Using default train configuration');
        // Fallback default trains (keeping the original code as fallback)
        const defaultTrains = [
            {
                train_id: 'T001',
                train_name: 'CST → Thane Local',
                route: 'Central',
                stations: [
                    { name: 'CST', lat: 18.9400, lon: 72.8350, arrival: '09:00:00' },
                    { name: 'Thane', lat: 19.2183, lon: 72.9781, arrival: '09:45:00' }
                ]
            }
        ];

        defaultTrains.forEach(train => {
            this.trains.set(train.train_id, train);
        });
    }

    getMumbaiInfrastructure() {
        return {
            tracks: [
                {
                    id: 'western_main',
                    name: 'Western Railway Main Line',
                    geometry: [
                        [72.8260, 18.9338], // Churchgate
                        [72.8405, 19.0544], // Bandra
                        [72.8464, 19.1197], // Andheri
                        [72.8567, 19.2307], // Borivali
                        [72.8081, 19.4559]  // Virar
                    ]
                },
                {
                    id: 'central_main',
                    name: 'Central Railway Main Line',
                    geometry: [
                        [72.8355, 18.9398], // CSMT
                        [72.8430, 19.0187], // Dadar
                        [72.8826, 19.0728], // Kurla
                        [72.9081, 19.0864], // Ghatkopar
                        [73.1355, 19.2437]  // Kalyan
                    ]
                },
                {
                    id: 'harbour_line',
                    name: 'Harbour Line',
                    geometry: [
                        [72.8355, 18.9398], // CSMT
                        [73.0022, 19.0790], // Vashi
                        [73.1089, 19.0023]  // Panvel
                    ]
                }
            ],
            stations: Array.from(this.trains.values()).flatMap(train => 
                train.stations.map(station => ({
                    id: station.name.toLowerCase().replace(/\s+/g, '_'),
                    name: station.name,
                    lat: station.lat,
                    lon: station.lon,
                    line: train.route
                }))
            ),
            signals: [],
            metadata: {
                region: 'Mumbai',
                total_tracks: 3,
                total_stations: 50,
                last_updated: new Date().toISOString()
            }
        };
    }

    getCurrentSimulationTime() {
        if (!this.simulationState.isRunning) {
            return this.simulationState.currentTime;
        }

        const elapsed = (Date.now() - this.simulationState.startTime.getTime()) / 1000;
        const startHour = 9; // 9 AM
        const currentHour = startHour + (elapsed / 3600); // Real time to simulation time
        
        const hours = Math.floor(currentHour);
        const minutes = Math.floor((currentHour - hours) * 60);
        const seconds = Math.floor(((currentHour - hours) * 60 - minutes) * 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getTrainsAtTime(currentTime) {
        const [hours, minutes, seconds] = currentTime.split(':').map(Number);
        const currentTimeSeconds = hours * 3600 + minutes * 60 + seconds;
        
        return Array.from(this.trains.values()).map(train => {
            const position = this.interpolateTrainPosition(train, currentTimeSeconds);
            return {
                train_id: train.train_id,
                train_name: train.train_name,
                route: train.route,
                lat: position.lat,
                lon: position.lon,
                speed: position.speed,
                status: position.status,
                next_station: position.next_station,
                delay: 0,
                current_time: currentTime
            };
        });
    }

    interpolateTrainPosition(train, currentTimeSeconds) {
        if (!train.route_geometry || train.route_geometry.length === 0) {
            return this.interpolateByStations(train, currentTimeSeconds);
        }

        // Use route_geometry for more accurate path following
        const departureTime = train.departure_time || '09:00';
        const [depHours, depMinutes] = departureTime.split(':').map(Number);
        const departureSeconds = depHours * 3600 + depMinutes * 60;
        
        // Calculate total journey time based on stations
        const lastStation = train.stations[train.stations.length - 1];
        const [arrHours, arrMinutes, arrSecs = 0] = lastStation.arrival.split(':').map(Number);
        const arrivalSeconds = arrHours * 3600 + arrMinutes * 60 + arrSecs;
        
        const totalJourneyTime = arrivalSeconds - departureSeconds;
        const elapsed = currentTimeSeconds - departureSeconds;
        
        if (elapsed < 0) {
            // Train hasn't started yet
            return {
                lat: train.route_geometry[0].lat,
                lon: train.route_geometry[0].lon,
                speed: 0,
                status: 'waiting',
                next_station: train.stations[0].name,
                route_geometry: train.route_geometry // Include full route for polyline
            };
        }
        
        if (elapsed >= totalJourneyTime) {
            // Train has completed journey
            const lastPoint = train.route_geometry[train.route_geometry.length - 1];
            return {
                lat: lastPoint.lat,
                lon: lastPoint.lon,
                speed: 0,
                status: 'completed',
                next_station: train.stations[train.stations.length - 1].name,
                route_geometry: train.route_geometry
            };
        }
        
        // Calculate progress along the route (0 to 1)
        const progress = elapsed / totalJourneyTime;
        
        // Find position along route_geometry based on progress
        const totalPoints = train.route_geometry.length;
        const exactPosition = progress * (totalPoints - 1);
        const currentIndex = Math.floor(exactPosition);
        const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);
        const segmentProgress = exactPosition - currentIndex;
        
        const currentPoint = train.route_geometry[currentIndex];
        const nextPoint = train.route_geometry[nextIndex];
        
        // Interpolate between current and next point
        const lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * segmentProgress;
        const lon = currentPoint.lon + (nextPoint.lon - currentPoint.lon) * segmentProgress;
        
        // Find next station
        const nextStation = this.findNextStation(train, progress);
        
        return {
            lat: lat,
            lon: lon,
            speed: train.speed_kmph || 40,
            status: 'running',
            next_station: nextStation,
            route_geometry: train.route_geometry,
            progress: progress // Add progress for debugging
        };
    }

    findNextStation(train, progress) {
        const totalStations = train.stations.length;
        const stationIndex = Math.floor(progress * totalStations);
        
        if (stationIndex >= totalStations - 1) {
            return train.stations[totalStations - 1].name;
        }
        
        return train.stations[stationIndex + 1].name;
    }

    interpolateByStations(train, currentTimeSeconds) {
        // Fallback method using stations when route_geometry is not available
        const stations = train.stations;
        
        // Find current segment
        for (let i = 0; i < stations.length - 1; i++) {
            const currentStation = stations[i];
            const nextStation = stations[i + 1];
            
            const currentStationTime = this.timeToSeconds(currentStation.arrival);
            const nextStationTime = this.timeToSeconds(nextStation.arrival);
            
            if (currentTimeSeconds >= currentStationTime && currentTimeSeconds <= nextStationTime) {
                // Interpolate position between stations
                const progress = (currentTimeSeconds - currentStationTime) / (nextStationTime - currentStationTime);
                
                const lat = currentStation.lat + (nextStation.lat - currentStation.lat) * progress;
                const lon = currentStation.lon + (nextStation.lon - currentStation.lon) * progress;
                
                return {
                    lat: lat,
                    lon: lon,
                    speed: train.speed_kmph || 40,
                    status: 'running',
                    next_station: nextStation.name
                };
            }
        }
        
        // Train hasn't started or has finished
        if (currentTimeSeconds < this.timeToSeconds(stations[0].arrival)) {
            return {
                lat: stations[0].lat,
                lon: stations[0].lon,
                speed: 0,
                status: 'waiting',
                next_station: stations[0].name
            };
        } else {
            const lastStation = stations[stations.length - 1];
            return {
                lat: lastStation.lat,
                lon: lastStation.lon,
                speed: 0,
                status: 'completed',
                next_station: lastStation.name
            };
        }
    }

    timeToSeconds(timeStr) {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    getEventsAtTime(currentTime) {
        // Generate some mock events
        return [
            {
                time: currentTime,
                type: 'departure',
                train_id: 'WR_9001',
                station: 'Dadar',
                message: 'Train departing on time'
            }
        ];
    }

    generateSimulationResults() {
        return {
            simulation_type: 'real_time',
            total_trains: this.trains.size,
            infrastructure: 'Mumbai Local Railway Network',
            status: 'running'
        };
    }

    generateTrainPaths(trains) {
        return trains.map(train => ({
            train_id: train.train_id,
            path: train.stations.map(station => ({
                lat: station.lat,
                lon: station.lon,
                time: station.arrival
            }))
        }));
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚂 OSRD Mock API Server running on http://localhost:${this.port}`);
            console.log(`✅ Health check: http://localhost:${this.port}/health`);
            console.log(`🗺️  Infrastructure: http://localhost:${this.port}/infrastructure`);
        });
    }
}

module.exports = OSRDMockAPI;