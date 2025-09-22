import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polyline } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom train icon
const trainIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="6" width="18" height="10" rx="2"/>
            <circle cx="8" cy="12" r="2"/>
            <circle cx="16" cy="12" r="2"/>
            <path d="m16 16 4 4-4 4"/>
            <path d="m8 16-4 4 4 4"/>
        </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    className: 'train-icon'
});

const MapView = () => {
    const [railwayData, setRailwayData] = useState(null);
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTrains, setShowTrains] = useState(true);
    const [showRoutes, setShowRoutes] = useState(true);
    const [simulationData, setSimulationData] = useState(null);
    const [simulationId, setSimulationId] = useState(null);

    // Mumbai coordinates for map center
    const mumbaiCenter = [19.1, 72.85];
    const defaultZoom = 12;

    // Fetch railway data and start OSRD simulation
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                console.log('Fetching Mumbai railway tracks and starting OSRD simulation...');
                
                // Fetch railway tracks and start OSRD simulation in parallel
                const [railwayResponse, osrdResponse] = await Promise.all([
                    axios.get('http://localhost:3001/api/mumbai', {
                        timeout: 45000 // 45 second timeout
                    }),
                    axios.get('http://localhost:3001/api/osrd/simulation', {
                        timeout: 60000 // 60 second timeout for simulation
                    })
                ]);
                
                console.log('Railway data received:', railwayResponse.data);
                console.log('OSRD simulation started:', osrdResponse.data);
                
                if (railwayResponse.data && railwayResponse.data.features) {
                    setRailwayData(railwayResponse.data);
                    console.log(`Loaded ${railwayResponse.data.features.length} railway tracks`);
                } else {
                    setError('No railway data received');
                }

                if (osrdResponse.data && osrdResponse.data.success) {
                    setSimulationData(osrdResponse.data);
                    setSimulationId(osrdResponse.data.simulationId);
                    
                    if (osrdResponse.data.trains && osrdResponse.data.trains.length > 0) {
                        setTrains(osrdResponse.data.trains);
                        console.log(`Loaded ${osrdResponse.data.trains.length} OSRD trains`);
                    }
                }
                
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Fetch current train positions immediately and continuously
    useEffect(() => {
        const fetchCurrentTrains = async () => {
            try {
                console.log('🚂 Fetching live train positions from mumbaiTrains.json...');
                const response = await axios.get('http://localhost:3001/api/trains/current', {
                    timeout: 10000
                });

                if (response.data && response.data.success && response.data.trains) {
                    console.log(`📍 Found ${response.data.trains.length} live trains:`, response.data.trains);
                    setTrains(response.data.trains);
                } else {
                    console.warn('⚠️ No train data received:', response.data);
                }
            } catch (err) {
                console.error('❌ Error fetching live trains:', err);
            }
        };

        // Initial fetch
        const timer = setTimeout(fetchCurrentTrains, 2000);
        
        // Set up continuous updates
        const interval = setInterval(fetchCurrentTrains, 3000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    // Real-time train position updates
    useEffect(() => {
        if (!simulationId) return;

        const updateTrainPositions = async () => {
            try {
                console.log('🔄 Updating train positions...');
                const response = await axios.get('http://localhost:3001/api/osrd/simulation/current', {
                    timeout: 10000
                });

                if (response.data && response.data.success && response.data.trains) {
                    console.log(`📍 Updated ${response.data.trains.length} train positions`);
                    setTrains(response.data.trains);
                } else {
                    console.warn('⚠️ No train data in current simulation response');
                }
            } catch (err) {
                console.error('❌ Error updating train positions:', err);
            }
        };

        // Update train positions every 3 seconds for real-time movement
        const interval = setInterval(updateTrainPositions, 3000);
        
        // Initial update
        updateTrainPositions();

        return () => clearInterval(interval);
    }, [simulationId]);

    // Style for railway tracks
    const railwayStyle = {
        color: '#dc2626', // Red color for railway tracks
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
    };

    // Style for trains based on status
    const getTrainColor = (train) => {
        switch (train.status) {
            case 'running':
                return '#059669'; // Green for running trains
            case 'waiting':
                return '#f59e0b'; // Orange for waiting trains
            case 'completed':
                return '#6b7280'; // Gray for completed trains
            default:
                return '#2563eb'; // Blue for default
        }
    };

    // Get train route colors
    const getRouteColor = (trainId) => {
        const colors = ['#2563eb', '#059669', '#dc2626', '#f59e0b', '#8b5cf6'];
        const hash = trainId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    // Convert route_geometry to Leaflet polyline format
    const formatRouteForPolyline = (route_geometry) => {
        if (!route_geometry || !Array.isArray(route_geometry)) return [];
        return route_geometry.map(point => [point.lat, point.lon]);
    };

    // Create custom train markers
    const createTrainMarker = (train) => {
        const color = getTrainColor(train);
        return new L.Icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="6" width="18" height="10" rx="2"/>
                    <circle cx="8" cy="12" r="1.5" fill="white"/>
                    <circle cx="16" cy="12" r="1.5" fill="white"/>
                    <path d="m6 16-2 2 2 2" stroke-width="1.5"/>
                    <path d="m18 16 2 2-2 2" stroke-width="1.5"/>
                </svg>
            `),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
            className: `train-icon train-${train.status}`
        });
    };

    // Handle GeoJSON feature events
    const onEachFeature = (feature, layer) => {
        if (feature.properties) {
            const { railway, name, operator, electrified, gauge } = feature.properties;
            
            let popupContent = `<div style="font-family: Arial, sans-serif;">`;
            popupContent += `<h4 style="margin: 0 0 8px 0; color: #1f2937;">Railway Track</h4>`;
            
            if (name) popupContent += `<p style="margin: 4px 0;"><strong>Name:</strong> ${name}</p>`;
            if (railway) popupContent += `<p style="margin: 4px 0;"><strong>Type:</strong> ${railway}</p>`;
            if (operator) popupContent += `<p style="margin: 4px 0;"><strong>Operator:</strong> ${operator}</p>`;
            if (electrified) popupContent += `<p style="margin: 4px 0;"><strong>Electrified:</strong> ${electrified}</p>`;
            if (gauge) popupContent += `<p style="margin: 4px 0;"><strong>Gauge:</strong> ${gauge}</p>`;
            
            popupContent += `</div>`;
            
            layer.bindPopup(popupContent);
        }
    };

    return (
        <div className="map-container">
            {loading && (
                <div className="map-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading Mumbai railway tracks and OSRD simulation...</p>
                </div>
            )}
            
            {error && (
                <div className="map-error">
                    <h3>Error Loading Railway Data</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>
                        Retry
                    </button>
                </div>
            )}

            <MapContainer
                center={mumbaiCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                className="railway-map"
            >
                {/* Base map layer */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Railway tracks layer */}
                {railwayData && railwayData.features && railwayData.features.length > 0 && (
                    <GeoJSON
                        data={railwayData}
                        style={railwayStyle}
                        onEachFeature={onEachFeature}
                    />
                )}

                {/* Train Routes (Polylines) */}
                {console.log('🛤️ Rendering routes:', { showRoutes, trainsCount: trains?.length })}
                {showRoutes && trains && trains.length > 0 && trains.map((train, index) => {
                    const routePoints = formatRouteForPolyline(train.route_geometry);
                    console.log(`🛤️ Route ${index} for ${train.train_id}:`, routePoints);
                    if (routePoints.length === 0) return null;
                    
                    return (
                        <Polyline
                            key={`route-${train.train_id}`}
                            positions={routePoints}
                            color={getRouteColor(train.train_id)}
                            weight={4}
                            opacity={0.7}
                            dashArray="5, 10"
                        />
                    );
                })}

                {/* OSRD Trains layer */}
                {console.log('🚂 Rendering trains:', { showTrains, trainsCount: trains?.length, trains })}
                {showTrains && trains && trains.length > 0 && trains.map((train, index) => {
                    console.log(`🚂 Rendering train ${index}:`, train);
                    return (
                        <Marker
                            key={train.train_id}
                            position={[train.lat, train.lon]}
                            icon={createTrainMarker(train)}
                        >
                            <Popup>
                                <div style={{ fontFamily: 'Arial, sans-serif', minWidth: '200px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>🚂 {train.train_name}</h4>
                                    <p style={{ margin: '4px 0' }}><strong>Train ID:</strong> {train.train_id}</p>
                                    <p style={{ margin: '4px 0' }}><strong>Route:</strong> {train.origin} → {train.destination}</p>
                                    <p style={{ margin: '4px 0' }}><strong>Status:</strong> 
                                        <span style={{ 
                                            color: getTrainColor(train), 
                                            fontWeight: 'bold',
                                            textTransform: 'capitalize'
                                        }}> {train.status}</span>
                                    </p>
                                    <p style={{ margin: '4px 0' }}><strong>Speed:</strong> {train.speed} km/h</p>
                                    <p style={{ margin: '4px 0' }}><strong>Departure:</strong> {train.departure_time}</p>
                                    {train.progress && (
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Progress:</strong> {Math.round(train.progress * 100)}%
                                        </p>
                                    )}
                                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#6b7280' }}>
                                        Position: {train.lat.toFixed(4)}, {train.lon.toFixed(4)}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Map info overlay */}
            <div className="map-info">
                {railwayData && railwayData.metadata && (
                    <div className="map-stats">
                        <span className="track-count">
                            🛤️ {railwayData.metadata.trackCount} tracks loaded
                        </span>
                        <span className="train-count">
                            🚂 {trains.length} trains active
                        </span>
                        <span className="simulation-status">
                            {simulationData?.metadata?.type === 'mock_simulation' ? 
                                '⚡ OSRD Simulation' : 
                                '🔴 Mock Simulation'
                            }
                        </span>
                        <span className="last-updated">
                            ⏰ Updated: {new Date().toLocaleTimeString()}
                        </span>
                    </div>
                )}
                
                {/* Train toggle control */}
                <div className="map-controls">
                    <button 
                        className={`control-btn ${showTrains ? 'active' : ''}`}
                        onClick={() => setShowTrains(!showTrains)}
                    >
                        {showTrains ? '🚂 Hide Trains' : '🚂 Show Trains'}
                    </button>
                    
                    <button 
                        className={`control-btn ${showRoutes ? 'active' : ''}`}
                        onClick={() => setShowRoutes(!showRoutes)}
                    >
                        {showRoutes ? '🛤️ Hide Routes' : '🛤️ Show Routes'}
                    </button>
                    
                    {/* Refresh simulation button */}
                    <button 
                        className="control-btn refresh-btn"
                        onClick={() => window.location.reload()}
                    >
                        🔄 Refresh Simulation
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MapView;