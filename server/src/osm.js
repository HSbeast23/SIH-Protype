const axios = require('axios');
const osmtogeojson = require('osmtogeojson');
const NodeCache = require('node-cache');

// Cache with 24 hour TTL (24 * 60 * 60 = 86400 seconds)
const cache = new NodeCache({ stdTTL: 86400 });

/**
 * Fetch railway tracks from OSM Overpass API for a given bounding box
 * @param {number} south - Southern boundary
 * @param {number} west - Western boundary  
 * @param {number} north - Northern boundary
 * @param {number} east - Eastern boundary
 * @returns {Promise<Object>} GeoJSON FeatureCollection of railway tracks
 */
async function fetchRailwayTracks(south, west, north, east) {
    // Create cache key from bounding box coordinates
    const cacheKey = `railway_${south}_${west}_${north}_${east}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        console.log(`Cache hit for bounding box: ${south},${west},${north},${east}`);
        return cachedData;
    }

    console.log(`Fetching railway data from OSM for bounding box: ${south},${west},${north},${east}`);

    // Overpass API query to get railway tracks
    const overpassQuery = `
        [out:json][timeout:25];
        (
          way["railway"](${south},${west},${north},${east});
          relation["railway"](${south},${west},${north},${east});
        );
        out geom;
    `;

    try {
        // Fetch data from Overpass API
        const response = await axios.post(
            'https://overpass-api.de/api/interpreter',
            overpassQuery,
            {
                headers: {
                    'Content-Type': 'text/plain',
                },
                timeout: 30000, // 30 second timeout
            }
        );

        // Convert OSM JSON to GeoJSON
        const geoJson = osmtogeojson(response.data);
        
        // Filter only LineString features with railway tags
        const railwayTracks = {
            type: 'FeatureCollection',
            features: geoJson.features.filter(feature => {
                const isLineString = feature.geometry && feature.geometry.type === 'LineString';
                const hasRailwayTag = feature.properties && feature.properties.railway;
                return isLineString && hasRailwayTag;
            })
        };

        // Add metadata
        railwayTracks.metadata = {
            fetchedAt: new Date().toISOString(),
            boundingBox: { south, west, north, east },
            trackCount: railwayTracks.features.length
        };

        // Cache the result
        cache.set(cacheKey, railwayTracks);
        
        console.log(`Fetched and cached ${railwayTracks.features.length} railway tracks`);
        return railwayTracks;

    } catch (error) {
        console.error('Error fetching railway data from OSM:', error.message);
        
        // Return empty GeoJSON on error
        return {
            type: 'FeatureCollection',
            features: [],
            error: 'Failed to fetch railway data',
            metadata: {
                fetchedAt: new Date().toISOString(),
                boundingBox: { south, west, north, east },
                trackCount: 0
            }
        };
    }
}

/**
 * Get Mumbai railway tracks with predefined bounding box
 * @returns {Promise<Object>} GeoJSON FeatureCollection of Mumbai railway tracks
 */
async function getMumbaiRailwayTracks() {
    // Mumbai bounding box coordinates
    const mumbaiBox = {
        south: 18.9,
        west: 72.7,
        north: 19.3,
        east: 73.0
    };
    
    return await fetchRailwayTracks(
        mumbaiBox.south,
        mumbaiBox.west,
        mumbaiBox.north,
        mumbaiBox.east
    );
}

/**
 * Clear cache (useful for development)
 */
function clearCache() {
    cache.flushAll();
    console.log('Railway tracks cache cleared');
}

/**
 * Get cache statistics
 */
function getCacheStats() {
    return {
        keys: cache.keys(),
        stats: cache.getStats()
    };
}

module.exports = {
    fetchRailwayTracks,
    getMumbaiRailwayTracks,
    clearCache,
    getCacheStats
};