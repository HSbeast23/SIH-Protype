const turf = require('@turf/turf');

/**
 * Convert longitude,latitude to leaflet format [latitude, longitude]
 * @param {Array} lonLat - [longitude, latitude]
 * @returns {Array} [latitude, longitude]
 */
function lonLatToLeaflet([lon, lat]) { 
    return [lat, lon]; 
}

/**
 * Snap a train position to the nearest railway track and compute oriented train segment
 * @param {Array} trainPointLonLat - Train position as [longitude, latitude]
 * @param {Object} trackFeature - GeoJSON LineString feature representing railway track
 * @param {number} trainBodyMeters - Length of train body in meters (default: 150)
 * @returns {Object} Object containing snapped position and train line segment
 */
function computeTrainSegment(trainPointLonLat, trackFeature, trainBodyMeters = 150) {
    // Create point from train coordinates [lon, lat]
    const point = turf.point(trainPointLonLat);
    
    // Create line from track feature
    const line = turf.lineString(trackFeature.geometry.coordinates);
    
    // Find nearest point on the track line
    const snapped = turf.nearestPointOnLine(line, point, { units: 'meters' });
    
    // Get the index of the nearest segment on the line
    const index = snapped.properties.index || 0;
    const coords = trackFeature.geometry.coordinates;
    
    // Get previous and next coordinates to compute direction
    const prev = coords[Math.max(0, index)];
    const next = coords[Math.min(coords.length - 1, index + 1)];
    
    // Calculate bearing (direction) along the track
    const bearing = turf.bearing(turf.point(prev), turf.point(next));
    
    // Create train body as a line segment
    const half = trainBodyMeters / 2;
    
    // Calculate head and tail positions of the train
    const head = turf.destination(snapped, half / 1000, bearing, { units: 'kilometers' });
    const tail = turf.destination(snapped, half / 1000, bearing + 180, { units: 'kilometers' });
    
    return {
        snapped: snapped.geometry.coordinates, // [lon, lat] - exact point on track
        trainLine: [tail.geometry.coordinates, head.geometry.coordinates], // train body line
        bearing: bearing, // direction train is facing
        trackIndex: index, // which segment of the track
        distance: snapped.properties.dist // distance from original point to track
    };
}

/**
 * Find the best railway track for a given train position
 * @param {Array} trainPointLonLat - Train position as [longitude, latitude]
 * @param {Array} railwayFeatures - Array of GeoJSON LineString features
 * @param {number} maxDistanceKm - Maximum distance to search for tracks (default: 1km)
 * @returns {Object|null} Best track match or null if no suitable track found
 */
function findNearestTrack(trainPointLonLat, railwayFeatures, maxDistanceKm = 1) {
    const point = turf.point(trainPointLonLat);
    let bestTrack = null;
    let minDistance = Infinity;
    
    for (const feature of railwayFeatures) {
        if (feature.geometry.type !== 'LineString') continue;
        
        const line = turf.lineString(feature.geometry.coordinates);
        const nearestPoint = turf.nearestPointOnLine(line, point, { units: 'meters' });
        const distance = nearestPoint.properties.dist;
        
        // Convert distance to kilometers for comparison
        const distanceKm = distance / 1000;
        
        if (distanceKm <= maxDistanceKm && distance < minDistance) {
            minDistance = distance;
            bestTrack = {
                feature: feature,
                distance: distance,
                nearestPoint: nearestPoint
            };
        }
    }
    
    return bestTrack;
}

/**
 * Snap train to tracks and return complete train representation
 * @param {Array} trainPointLonLat - Train position as [longitude, latitude]
 * @param {Array} railwayFeatures - Array of railway track features
 * @param {Object} options - Options for train snapping
 * @returns {Object|null} Complete train object or null if snapping failed
 */
function snapTrainToTracks(trainPointLonLat, railwayFeatures, options = {}) {
    const {
        trainBodyMeters = 150,
        maxDistanceKm = 1,
        trainId = null,
        trainType = 'local'
    } = options;
    
    // Find the nearest suitable track
    const nearestTrack = findNearestTrack(trainPointLonLat, railwayFeatures, maxDistanceKm);
    
    if (!nearestTrack) {
        console.warn(`No suitable track found for train at ${trainPointLonLat} within ${maxDistanceKm}km`);
        return null;
    }
    
    // Compute train segment on the found track
    const trainSegment = computeTrainSegment(trainPointLonLat, nearestTrack.feature, trainBodyMeters);
    
    return {
        id: trainId,
        type: trainType,
        originalPosition: trainPointLonLat,
        snappedPosition: trainSegment.snapped,
        trainLine: trainSegment.trainLine,
        bearing: trainSegment.bearing,
        track: {
            properties: nearestTrack.feature.properties,
            index: trainSegment.trackIndex
        },
        metadata: {
            distanceToTrack: nearestTrack.distance,
            trainLength: trainBodyMeters,
            snappedAt: new Date().toISOString()
        }
    };
}

/**
 * Snap multiple trains to tracks in batch
 * @param {Array} trains - Array of train objects with position property
 * @param {Array} railwayFeatures - Array of railway track features
 * @param {Object} options - Options for train snapping
 * @returns {Array} Array of snapped train objects
 */
function snapMultipleTrains(trains, railwayFeatures, options = {}) {
    const snappedTrains = [];
    
    for (const train of trains) {
        const trainPosition = train.position || train.coordinates;
        if (!trainPosition) {
            console.warn('Train missing position data:', train);
            continue;
        }
        
        const snappedTrain = snapTrainToTracks(
            trainPosition,
            railwayFeatures,
            {
                ...options,
                trainId: train.id,
                trainType: train.type
            }
        );
        
        if (snappedTrain) {
            snappedTrains.push(snappedTrain);
        }
    }
    
    return snappedTrains;
}

/**
 * Generate sample train positions around Mumbai for testing
 * @returns {Array} Array of train objects with Mumbai positions
 */
function generateSampleTrainPositions() {
    // Sample positions around Mumbai railway network
    const positions = [
        { id: 1, name: "Bandra Local", position: [72.826, 19.054], type: "local" },
        { id: 2, name: "Santacruz Express", position: [72.836, 19.104], type: "express" },
        { id: 3, name: "Vile Parle Local", position: [72.846, 19.124], type: "local" },
        { id: 4, name: "Andheri Fast", position: [72.856, 19.144], type: "fast" },
        { id: 5, name: "Jogeshwari Local", position: [72.866, 19.164], type: "local" },
        { id: 6, name: "Goregaon Express", position: [72.876, 19.184], type: "express" },
        { id: 7, name: "Malad Local", position: [72.886, 19.204], type: "local" },
        { id: 8, name: "Kandivali Fast", position: [72.896, 19.224], type: "fast" },
        { id: 9, name: "Borivali Express", position: [72.906, 19.244], type: "express" },
        { id: 10, name: "Dadar Local", position: [72.8297, 18.9647], type: "local" },
        { id: 11, name: "Matunga Express", position: [72.8448, 19.0176], type: "express" },
        { id: 12, name: "Sion Local", position: [72.8561, 19.0728], type: "local" },
        { id: 13, name: "Kurla Fast", position: [72.8637, 19.1136], type: "fast" },
        { id: 14, name: "Ghatkopar Local", position: [72.8776, 19.1557], type: "local" },
        { id: 15, name: "Vikhroli Express", position: [72.8911, 19.2041], type: "express" },
        { id: 16, name: "Kanjurmarg Local", position: [72.9051, 19.2403], type: "local" },
        { id: 17, name: "Bhandup Fast", position: [72.9156, 19.2564], type: "fast" },
        { id: 18, name: "Nahur Local", position: [72.9283, 19.2728], type: "local" },
        { id: 19, name: "Mulund Express", position: [72.9421, 19.2832], type: "express" },
        { id: 20, name: "Thane Fast", position: [72.9594, 19.2967], type: "fast" },
        { id: 21, name: "Lower Parel Local", position: [72.8314, 18.9388], type: "local" },
        { id: 22, name: "Grant Road Express", position: [72.8223, 18.9067], type: "express" }
    ];
    
    return positions;
}

module.exports = {
    computeTrainSegment,
    findNearestTrack,
    snapTrainToTracks,
    snapMultipleTrains,
    lonLatToLeaflet,
    generateSampleTrainPositions
};