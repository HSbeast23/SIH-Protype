const express = require('express');
const cors = require('cors');
const { fetchRailwayTracks, getMumbaiRailwayTracks, clearCache, getCacheStats } = require('./osm');

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
        description: 'API for fetching and caching railway track data from OpenStreetMap',
        endpoints: {
            'GET /api/osm?s={south}&w={west}&n={north}&e={east}': 'Fetch railway tracks for bounding box',
            'GET /api/mumbai': 'Get Mumbai railway tracks with predefined coordinates',
            'GET /api/cache/stats': 'Get cache statistics',
            'DELETE /api/cache': 'Clear cache',
            'GET /api/health': 'Health check'
        },
        example: {
            mumbai: 'http://localhost:3001/api/mumbai',
            custom: 'http://localhost:3001/api/osm?s=18.9&w=72.7&n=19.3&e=73.0'
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