const axios = require('axios');

class OSRDService {
    constructor(osrdBaseUrl = 'http://localhost:8080') {
        this.baseUrl = osrdBaseUrl;
        this.apiClient = axios.create({
            baseURL: this.baseUrl,
            timeout: 60000, // 60 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        // Request interceptor for logging
        this.apiClient.interceptors.request.use(
            (config) => {
                console.log(`🚂 OSRD API Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                console.error('🚨 OSRD API Request Error:', error);
                return Promise.reject(error);
            }
        );
        
        // Response interceptor for error handling
        this.apiClient.interceptors.response.use(
            (response) => {
                console.log(`✅ OSRD API Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error) => {
                console.error('🚨 OSRD API Response Error:', error.response?.status, error.message);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Check if OSRD backend is healthy and accessible
     */
    async healthCheck() {
        try {
            const response = await this.apiClient.get('/health');
            return {
                healthy: true,
                status: response.status,
                data: response.data
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                status: error.response?.status || 'CONNECTION_ERROR'
            };
        }
    }

    /**
     * Import OSM railway data into OSRD
     * @param {string} osmFilePath - Path to OSM PBF file
     */
    async importOSMData(osmFilePath) {
        try {
            const response = await this.apiClient.post('/import/osm', {
                file_path: osmFilePath,
                import_type: 'railway'
            });
            
            return {
                success: true,
                importId: response.data.import_id,
                status: response.data.status,
                message: 'OSM import initiated successfully'
            };
        } catch (error) {
            throw new Error(`Failed to import OSM data: ${error.message}`);
        }
    }

    /**
     * Check the status of an OSM import job
     * @param {string} importId - Import job ID
     */
    async getImportStatus(importId) {
        try {
            const response = await this.apiClient.get(`/import/${importId}/status`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get import status: ${error.message}`);
        }
    }

    /**
     * Create a new simulation with train schedules
     * @param {Object} simulationConfig - Configuration for the simulation
     */
    async createSimulation(simulationConfig) {
        try {
            const response = await this.apiClient.post('/simulation', simulationConfig);
            
            return {
                success: true,
                simulationId: response.data.simulation_id,
                status: response.data.status,
                trains: response.data.trains || []
            };
        } catch (error) {
            throw new Error(`Failed to create simulation: ${error.message}`);
        }
    }

    /**
     * Run a simulation and get train positions over time
     * @param {string} simulationId - Simulation ID
     * @param {Object} options - Simulation options (start_time, end_time, etc.)
     */
    async runSimulation(simulationId, options = {}) {
        try {
            const response = await this.apiClient.post(`/simulation/${simulationId}/run`, {
                start_time: options.startTime || '09:00:00',
                end_time: options.endTime || '18:00:00',
                time_step: options.timeStep || 30, // seconds
                real_time: options.realTime || false
            });
            
            return {
                success: true,
                simulationId: simulationId,
                results: response.data.results,
                trains: response.data.trains,
                metadata: response.data.metadata
            };
        } catch (error) {
            throw new Error(`Failed to run simulation: ${error.message}`);
        }
    }

    /**
     * Get real-time simulation results
     * @param {string} simulationId - Simulation ID
     * @param {string} currentTime - Current simulation time
     */
    async getSimulationState(simulationId, currentTime) {
        try {
            const response = await this.apiClient.get(`/simulation/${simulationId}/state`, {
                params: { time: currentTime }
            });
            
            return {
                success: true,
                currentTime: response.data.current_time,
                trains: response.data.trains,
                events: response.data.events || []
            };
        } catch (error) {
            throw new Error(`Failed to get simulation state: ${error.message}`);
        }
    }

    /**
     * Get train paths and routing information
     * @param {Array} trains - Array of train objects
     */
    async getTrainPaths(trains) {
        try {
            const response = await this.apiClient.post('/routing/paths', {
                trains: trains
            });
            
            return {
                success: true,
                paths: response.data.paths,
                routing_info: response.data.routing_info
            };
        } catch (error) {
            throw new Error(`Failed to get train paths: ${error.message}`);
        }
    }

    /**
     * Get infrastructure information (tracks, stations, signals)
     */
    async getInfrastructure() {
        try {
            const response = await this.apiClient.get('/infrastructure');
            
            return {
                success: true,
                tracks: response.data.tracks,
                stations: response.data.stations,
                signals: response.data.signals,
                metadata: response.data.metadata
            };
        } catch (error) {
            throw new Error(`Failed to get infrastructure: ${error.message}`);
        }
    }

    /**
     * Mock simulation for development/testing when OSRD is not available
     * @param {Array} trains - Train configuration array
     */
    async mockSimulation(trains) {
        console.log('⚠️  Running mock simulation (OSRD not available)');
        
        // Generate mock simulation results
        const simulationResults = trains.map(train => {
            const positions = [];
            const totalTime = 8 * 60 * 60; // 8 hours in seconds
            const timeStep = 30; // 30 seconds
            
            for (let time = 0; time <= totalTime; time += timeStep) {
                // Simple linear interpolation between start and end
                const progress = time / totalTime;
                const startCoord = train.route_geometry[0];
                const endCoord = train.route_geometry[train.route_geometry.length - 1];
                
                const lat = startCoord.lat + (endCoord.lat - startCoord.lat) * progress;
                const lon = startCoord.lon + (endCoord.lon - startCoord.lon) * progress;
                
                positions.push({
                    time: this.formatTime(time),
                    lat: lat,
                    lon: lon,
                    speed: train.speed_kmph || 40,
                    status: progress >= 1 ? 'completed' : 'running'
                });
            }
            
            return {
                train_id: train.train_id,
                train_name: train.train_name,
                positions: positions,
                route_geometry: train.route_geometry,
                stations: train.stations
            };
        });
        
        return {
            success: true,
            simulationId: `mock_${Date.now()}`,
            trains: simulationResults,
            metadata: {
                type: 'mock_simulation',
                generated_at: new Date().toISOString(),
                total_trains: trains.length
            }
        };
    }

    /**
     * Format seconds to HH:MM:SS
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get Mumbai train schedules and run simulation
     * @param {Array} mumbaiTrains - Mumbai train schedules
     */
    async simulateMumbaiTrains(mumbaiTrains) {
        try {
            // First try OSRD backend
            const health = await this.healthCheck();
            
            if (health.healthy) {
                console.log('✅ OSRD backend is healthy, running real simulation');
                
                // Create simulation configuration
                const simulationConfig = {
                    name: 'Mumbai Local Trains Simulation',
                    description: '5 Mumbai local trains with realistic schedules',
                    infrastructure: 'mumbai_railway_network',
                    trains: mumbaiTrains,
                    simulation_type: 'timetable'
                };
                
                // Create and run simulation
                const simulation = await this.createSimulation(simulationConfig);
                const results = await this.runSimulation(simulation.simulationId, {
                    startTime: '09:00:00',
                    endTime: '18:00:00',
                    timeStep: 30,
                    realTime: true
                });
                
                return results;
            } else {
                console.log('⚠️  OSRD backend not available, falling back to mock simulation');
                return await this.mockSimulation(mumbaiTrains);
            }
        } catch (error) {
            console.log('⚠️  OSRD simulation failed, falling back to mock simulation:', error.message);
            return await this.mockSimulation(mumbaiTrains);
        }
    }
}

module.exports = OSRDService;