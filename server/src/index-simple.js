const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load Mumbai trains data
let mumbaiTrainsData = [];
try {
    const mumbaiTrainsPath = path.join(__dirname, '..', 'data', 'mumbaiTrains.json');
    if (fs.existsSync(mumbaiTrainsPath)) {
        mumbaiTrainsData = JSON.parse(fs.readFileSync(mumbaiTrainsPath, 'utf8'));
        console.log(`📊 Loaded ${mumbaiTrainsData.length} Mumbai trains from data file`);
    } else {
        console.warn('⚠️  Mumbai trains data file not found');
    }
} catch (error) {
    console.error('❌ Failed to load Mumbai trains data:', error.message);
}

// Mock Mumbai railway tracks for development
const mockMumbaiTracks = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "railway": "rail",
                "name": "Western Railway Line",
                "operator": "Western Railway",
                "electrified": "yes",
                "gauge": "1676"
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [72.8258, 18.9220], // Churchgate
                    [72.8250, 18.9407], // Marine Lines
                    [72.8205, 18.9584], // Grant Road
                    [72.8246, 19.0021], // Lower Parel
                    [72.8471, 19.0182], // Dadar
                    [72.8289, 19.0660], // Santacruz
                    [72.8460, 19.1191], // Andheri
                    [72.8415, 19.1592], // Goregaon
                    [72.8412, 19.1818], // Malad
                    [72.8560, 19.2273], // Kandivali
                    [72.8560, 19.2400]  // Borivali
                ]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "railway": "rail",
                "name": "Central Railway Line",
                "operator": "Central Railway",
                "electrified": "yes",
                "gauge": "1676"
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [72.8350, 18.9400], // CST
                    [72.8433, 18.9972], // Byculla
                    [72.8471, 19.0182], // Dadar
                    [72.8553, 19.0370], // Sion
                    [72.8677, 19.0660], // Kurla
                    [72.8981, 19.0723], // Ghatkopar
                    [72.9511, 19.1375], // Bhandup
                    [72.9623, 19.1512], // Mulund
                    [72.9714, 19.1620], // Nahur
                    [72.9781, 19.2183]  // Thane
                ]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "railway": "rail",
                "name": "Harbour Line",
                "operator": "Central Railway",
                "electrified": "yes",
                "gauge": "1676"
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [72.8350, 18.9400], // CST
                    [72.8677, 19.0660], // Kurla
                    [73.0186, 19.0594], // Vashi
                    [73.0179, 19.0319], // Belapur
                    [73.1171, 18.9876]  // Panvel
                ]
            }
        }
    ],
    "metadata": {
        "fetchedAt": new Date().toISOString(),
        "trackCount": 3,
        "source": "mock_data"
    }
};

// Generate realistic train simulation
function generateTrainSimulation(trains) {
    const currentTime = new Date();
    const results = trains.map(train => {
        const positions = [];
        
        // Generate positions for the next 8 hours with 30-second intervals
        for (let minutes = 0; minutes < 480; minutes += 0.5) {
            const totalTime = 8 * 60; // 8 hours in minutes
            const progress = Math.min(minutes / totalTime, 1);
            
            // Interpolate between start and end stations
            const route = train.route_geometry;
            if (route && route.length > 1) {
                const segmentIndex = Math.floor(progress * (route.length - 1));
                const segmentProgress = (progress * (route.length - 1)) - segmentIndex;
                
                const startPoint = route[segmentIndex];
                const endPoint = route[Math.min(segmentIndex + 1, route.length - 1)];
                
                const lat = startPoint.lat + (endPoint.lat - startPoint.lat) * segmentProgress;
                const lon = startPoint.lon + (endPoint.lon - startPoint.lon) * segmentProgress;
                
                const time = new Date(currentTime.getTime() + minutes * 60000);
                const timeStr = time.toTimeString().slice(0, 8);
                
                positions.push({
                    time: timeStr,
                    lat: lat,
                    lon: lon,
                    speed: train.speed_kmph || 40,
                    status: progress >= 1 ? 'completed' : 'running'
                });
            }
        }
        
        return {
            train_id: train.train_id,
            train_name: train.train_name,
            train_type: train.train_id.includes('express') ? 'express' : 'local',
            origin_station: train.origin_station,
            destination_station: train.destination_station,
            departure_time: train.departure_time,
            speed_kmph: train.speed_kmph,
            positions: positions,
            route_geometry: train.route_geometry,
            stations: train.stations,
            status: 'running'
        };
    });
    
    return {
        success: true,
        simulationId: `mock_simulation_${Date.now()}`,
        trains: results,
        metadata: {
            type: 'mock_simulation',
            generated_at: new Date().toISOString(),
            total_trains: results.length
        }
    };
}

// Routes

/**
 * GET /api/health - Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        trains_loaded: mumbaiTrainsData.length,
        services: {
            backend: 'healthy',
            osm_tracks: 'mock_data',
            train_simulation: 'mock_mode'
        }
    });
});

/**
 * GET /api/mumbai - Get Mumbai railway tracks
 */
app.get('/api/mumbai', (req, res) => {
    try {
        console.log('📍 Serving Mumbai railway tracks (mock data)');
        res.json(mockMumbaiTracks);
    } catch (error) {
        console.error('❌ Error serving Mumbai tracks:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch Mumbai railway data'
        });
    }
});

/**
 * GET /api/trains/mumbai - Get Mumbai trains data
 */
app.get('/api/trains/mumbai', (req, res) => {
    try {
        res.json({
            success: true,
            trains: mumbaiTrainsData,
            count: mumbaiTrainsData.length,
            description: '5 Mumbai local trains with realistic schedules and routes'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get Mumbai trains',
            message: error.message
        });
    }
});

/**
 * GET /api/osrd/simulation - Get OSRD simulation (mock mode)
 */
app.get('/api/osrd/simulation', (req, res) => {
    try {
        if (mumbaiTrainsData.length === 0) {
            return res.status(404).json({
                error: 'No train data available',
                message: 'Mumbai trains data not loaded'
            });
        }

        console.log('🚂 Generating mock simulation for Mumbai trains...');
        const simulation = generateTrainSimulation(mumbaiTrainsData);
        
        res.json({
            success: true,
            simulation: simulation,
            trains_count: mumbaiTrainsData.length,
            generated_at: new Date().toISOString(),
            mode: 'mock_simulation'
        });

    } catch (error) {
        console.error('❌ Simulation generation failed:', error);
        res.status(500).json({
            error: 'Simulation failed',
            message: error.message
        });
    }
});

/**
 * GET / - Root endpoint with API documentation
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Mumbai Railway Simulation API (Simplified)',
        version: '1.0.0',
        description: 'Simplified API for Mumbai train simulation with mock OSRD backend',
        endpoints: {
            'GET /api/health': 'Health check',
            'GET /api/mumbai': 'Mumbai railway tracks (mock data)',
            'GET /api/trains/mumbai': 'Mumbai train schedules',
            'GET /api/osrd/simulation': 'Train simulation (mock mode)'
        },
        status: {
            osrd_backend: 'mock_mode',
            mumbai_tracks: 'available',
            train_data: `${mumbaiTrainsData.length} trains loaded`
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚂 Mumbai Railway Simulation API (Simplified) running on port ${PORT}`);
    console.log(`📍 API Documentation: http://localhost:${PORT}`);
    console.log(`🗺️  Mumbai tracks: http://localhost:${PORT}/api/mumbai`);
    console.log(`🚄 Train simulation: http://localhost:${PORT}/api/osrd/simulation`);
    console.log(`⚡ Health check: http://localhost:${PORT}/api/health`);
    console.log(`🎯 Mode: Simplified (No OSRD dependency)`);
});

module.exports = app;