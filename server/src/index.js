const express = require('express');
const cors = require('cors');
const { fetchRailwayTracks, getMumbaiRailwayTracks, clearCache, getCacheStats } = require('./osm');
const { snapTrainToTracks, snapMultipleTrains, generateSampleTrainPositions } = require('./snap');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

/**
 * GET /api/osm - Fetch railway tracks for given bounding box
 * Query parameters:
 * - s: south latitude (required)
 * - w: west longitude (required) 
 * - n: north latitude (required)
 * - e: east longitude (required)
 */
app.get('/api/osm', async (req, res) => {
    try {
        const { s, w, n, e } = req.query;
        
        // Validate required parameters
        if (!s || !w || !n || !e) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'Please provide s (south), w (west), n (north), e (east) coordinates',
                example: '/api/osm?s=18.9&w=72.7&n=19.3&e=73.0'
            });
        }

        // Convert to numbers and validate
        const south = parseFloat(s);
        const west = parseFloat(w);
        const north = parseFloat(n);
        const east = parseFloat(e);

        if (isNaN(south) || isNaN(west) || isNaN(north) || isNaN(east)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'All coordinates must be valid numbers'
            });
        }

        // Validate bounding box
        if (south >= north || west >= east) {
            return res.status(400).json({
                error: 'Invalid bounding box',
                message: 'South must be < North, West must be < East'
            });
        }

        // Fetch railway tracks
        const railwayData = await fetchRailwayTracks(south, west, north, east);
        
        res.json(railwayData);

    } catch (error) {
        console.error('Error in /api/osm endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch railway data'
        });
    }
});

/**
 * POST /api/snap - Snap a single train to nearest railway track
 * Body: { "position": [longitude, latitude], "trainId": "optional", "trainType": "optional" }
 */
app.post('/api/snap', async (req, res) => {
    try {
        const { position, trainId, trainType = 'local', trainBodyMeters = 150 } = req.body;
        
        if (!position || !Array.isArray(position) || position.length !== 2) {
            return res.status(400).json({
                error: 'Invalid position',
                message: 'Position must be an array of [longitude, latitude]',
                example: { position: [72.826, 19.054] }
            });
        }
        
        // Get Mumbai railway tracks
        const railwayData = await getMumbaiRailwayTracks();
        
        if (!railwayData.features || railwayData.features.length === 0) {
            return res.status(500).json({
                error: 'No railway data available',
                message: 'Could not fetch Mumbai railway tracks'
            });
        }
        
        // Snap train to track
        const snappedTrain = snapTrainToTracks(
            position,
            railwayData.features,
            {
                trainBodyMeters,
                trainId,
                trainType
            }
        );
        
        if (!snappedTrain) {
            return res.status(404).json({
                error: 'No suitable track found',
                message: 'Train position is too far from any railway track',
                originalPosition: position
            });
        }
        
        res.json({
            success: true,
            train: snappedTrain,
            metadata: {
                processedAt: new Date().toISOString(),
                trackCount: railwayData.features.length
            }
        });
        
    } catch (error) {
        console.error('Error in /api/snap endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to snap train to track'
        });
    }
});

/**
 * POST /api/snap/multiple - Snap multiple trains to railway tracks
 * Body: { "trains": [{ "position": [lon, lat], "id": "optional", "type": "optional" }] }
 */
app.post('/api/snap/multiple', async (req, res) => {
    try {
        const { trains, trainBodyMeters = 150 } = req.body;
        
        if (!trains || !Array.isArray(trains)) {
            return res.status(400).json({
                error: 'Invalid trains data',
                message: 'Trains must be an array of train objects',
                example: {
                    trains: [
                        { position: [72.826, 19.054], id: 1, type: 'local' },
                        { position: [72.836, 19.104], id: 2, type: 'express' }
                    ]
                }
            });
        }
        
        // Get Mumbai railway tracks
        const railwayData = await getMumbaiRailwayTracks();
        
        if (!railwayData.features || railwayData.features.length === 0) {
            return res.status(500).json({
                error: 'No railway data available',
                message: 'Could not fetch Mumbai railway tracks'
            });
        }
        
        // Snap all trains to tracks
        const snappedTrains = snapMultipleTrains(
            trains,
            railwayData.features,
            { trainBodyMeters }
        );
        
        res.json({
            success: true,
            trains: snappedTrains,
            statistics: {
                totalRequested: trains.length,
                successfullySnapped: snappedTrains.length,
                failed: trains.length - snappedTrains.length
            },
            metadata: {
                processedAt: new Date().toISOString(),
                trackCount: railwayData.features.length
            }
        });
        
    } catch (error) {
        console.error('Error in /api/snap/multiple endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to snap trains to tracks'
        });
    }
});

/**
 * GET /api/trains/sample - Get sample train positions for Mumbai
 */
app.get('/api/trains/sample', async (req, res) => {
    try {
        const sampleTrains = generateSampleTrainPositions();
        
        // Get Mumbai railway tracks
        const railwayData = await getMumbaiRailwayTracks();
        
        if (!railwayData.features || railwayData.features.length === 0) {
            return res.json({
                success: true,
                trains: sampleTrains.map(train => ({
                    ...train,
                    snapped: false,
                    message: 'Railway data not available for snapping'
                }))
            });
        }
        
        // Snap sample trains to tracks
        const snappedTrains = snapMultipleTrains(
            sampleTrains,
            railwayData.features,
            { trainBodyMeters: 150 }
        );
        
        res.json({
            success: true,
            trains: snappedTrains,
            statistics: {
                totalSampleTrains: sampleTrains.length,
                successfullySnapped: snappedTrains.length,
                trackCount: railwayData.features.length
            },
            metadata: {
                description: '22 sample trains positioned on Mumbai railway network',
                generatedAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error in /api/trains/sample endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate sample trains'
        });
    }
});

/**
 * GET /api/mumbai - Get Mumbai railway tracks with predefined bounding box
 */
app.get('/api/mumbai', async (req, res) => {
    try {
        const railwayData = await getMumbaiRailwayTracks();
        res.json(railwayData);
    } catch (error) {
        console.error('Error in /api/mumbai endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch Mumbai railway data'
        });
    }
});

/**
 * POST /api/snap - Snap a single train to nearest railway track
 * Body: { "position": [longitude, latitude], "trainId": "optional", "trainType": "optional" }
 */
app.post('/api/snap', async (req, res) => {
    try {
        const { position, trainId, trainType, trainBodyMeters } = req.body;
        
        if (!position || !Array.isArray(position) || position.length !== 2) {
            return res.status(400).json({
                error: 'Invalid position',
                message: 'Position must be an array of [longitude, latitude]',
                example: { "position": [72.8777, 19.0760] }
            });
        }

        // Get Mumbai railway tracks
        const railwayData = await getMumbaiRailwayTracks();
        
        if (!railwayData.features || railwayData.features.length === 0) {
            return res.status(503).json({
                error: 'No railway data available',
                message: 'Railway tracks not loaded. Please try again later.'
            });
        }

        // Snap train to tracks
        const snappedTrain = snapTrainToTracks(position, railwayData.features, {
            trainId: trainId || `train_${Date.now()}`,
            trainType: trainType || 'local',
            trainBodyMeters: trainBodyMeters || 150
        });

        if (!snappedTrain) {
            return res.status(404).json({
                error: 'No suitable track found',
                message: 'Could not snap train to any nearby railway track',
                position: position
            });
        }

        res.json(snappedTrain);

    } catch (error) {
        console.error('Error in /api/snap endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to snap train to tracks'
        });
    }
});

/**
 * POST /api/snap-multiple - Snap multiple trains to railway tracks
 * Body: { "trains": [{"position": [lon, lat], "id": "optional", "type": "optional"}] }
 */
app.post('/api/snap-multiple', async (req, res) => {
    try {
        const { trains, trainBodyMeters } = req.body;
        
        if (!trains || !Array.isArray(trains)) {
            return res.status(400).json({
                error: 'Invalid trains data',
                message: 'Trains must be an array of train objects',
                example: { 
                    "trains": [
                        {"position": [72.8777, 19.0760], "id": "train1", "type": "local"},
                        {"position": [72.8800, 19.0800], "id": "train2", "type": "express"}
                    ]
                }
            });
        }

        // Get Mumbai railway tracks
        const railwayData = await getMumbaiRailwayTracks();
        
        if (!railwayData.features || railwayData.features.length === 0) {
            return res.status(503).json({
                error: 'No railway data available',
                message: 'Railway tracks not loaded. Please try again later.'
            });
        }

        // Snap all trains to tracks
        const snappedTrains = snapMultipleTrains(trains, railwayData.features, {
            trainBodyMeters: trainBodyMeters || 150
        });

        res.json({
            totalTrains: trains.length,
            successfullySnapped: snappedTrains.length,
            failed: trains.length - snappedTrains.length,
            trains: snappedTrains
        });

    } catch (error) {
        console.error('Error in /api/snap-multiple endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to snap trains to tracks'
        });
    }
});

/**
 * GET /api/demo-trains - Get demo trains snapped to Mumbai tracks
 */
app.get('/api/demo-trains', async (req, res) => {
    try {
        // Demo train positions around Mumbai
        const demoTrains = [
            { position: [72.8777, 19.0760], id: "mumbai_local_1", type: "local" },
            { position: [72.8500, 19.0500], id: "mumbai_local_2", type: "local" },
            { position: [72.9000, 19.1000], id: "mumbai_express_1", type: "express" },
            { position: [72.8200, 19.0400], id: "western_line_1", type: "local" },
            { position: [72.8900, 19.0900], id: "central_line_1", type: "local" },
            { position: [72.8600, 19.0650], id: "mumbai_local_3", type: "local" },
            { position: [72.8750, 19.0850], id: "mumbai_express_2", type: "express" }
        ];

        // Get Mumbai railway tracks
        const railwayData = await getMumbaiRailwayTracks();
        
        if (!railwayData.features || railwayData.features.length === 0) {
            return res.status(503).json({
                error: 'No railway data available',
                message: 'Railway tracks not loaded. Please try again later.'
            });
        }

        // Snap demo trains to tracks
        const snappedTrains = snapMultipleTrains(demoTrains, railwayData.features);

        res.json({
            description: 'Demo trains for Mumbai railway system',
            totalTrains: demoTrains.length,
            successfullySnapped: snappedTrains.length,
            trains: snappedTrains,
            metadata: {
                generatedAt: new Date().toISOString(),
                tracksLoaded: railwayData.features.length
            }
        });

    } catch (error) {
        console.error('Error in /api/demo-trains endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate demo trains'
        });
    }
});

/**
 * GET /api/cache/stats - Get cache statistics
 */
app.get('/api/cache/stats', (req, res) => {
    try {
        const stats = getCacheStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting cache stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get cache statistics'
        });
    }
});

/**
 * DELETE /api/cache - Clear cache
 */
app.delete('/api/cache', (req, res) => {
    try {
        clearCache();
        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to clear cache'
        });
    }
});

/**
 * GET /api/health - Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

/**
 * GET / - Root endpoint with API documentation
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Mumbai Railway Tracks API',
        version: '1.0.0',
        description: 'API for fetching railway track data from OpenStreetMap and snapping trains to tracks',
        endpoints: {
            'GET /api/osm?s={south}&w={west}&n={north}&e={east}': 'Fetch railway tracks for bounding box',
            'GET /api/mumbai': 'Get Mumbai railway tracks with predefined coordinates',
            'POST /api/snap': 'Snap single train to nearest track',
            'POST /api/snap-multiple': 'Snap multiple trains to tracks',
            'GET /api/demo-trains': 'Get demo trains snapped to Mumbai tracks',
            'GET /api/cache/stats': 'Get cache statistics',
            'DELETE /api/cache': 'Clear cache',
            'GET /api/health': 'Health check'
        },
        examples: {
            mumbai: 'http://localhost:3001/api/mumbai',
            demoTrains: 'http://localhost:3001/api/demo-trains',
            custom: 'http://localhost:3001/api/osm?s=18.9&w=72.7&n=19.3&e=73.0',
            snapTrain: {
                url: 'http://localhost:3001/api/snap',
                method: 'POST',
                body: { "position": [72.8777, 19.0760], "trainId": "test_train" }
            }
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
    console.log(`🚂 Mumbai Railway Tracks API server running on port ${PORT}`);
    console.log(`📍 API Documentation: http://localhost:${PORT}`);
    console.log(`🗺️  Mumbai tracks: http://localhost:${PORT}/api/mumbai`);
    console.log(`⚡ Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;