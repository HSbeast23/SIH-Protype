import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, GeoJSON } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom train icon
const createTrainIcon = (trainType, isMoving = true) => {
    const colors = {
        local: '#3b82f6',   // Blue
        express: '#10b981', // Green  
        fast: '#ef4444',    // Red
        default: '#8b5cf6'  // Purple
    };
    
    const color = colors[trainType] || colors.default;
    const emoji = '🚂';
    
    return new L.DivIcon({
        html: `
            <div style="
                background-color: ${color};
                border: 2px solid white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                position: relative;
            ">${emoji}</div>
        `,
        className: 'train-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
};

// Component to animate train movement
const TrainAnimator = ({ train, isVisible }) => {
    const [currentPosition, setCurrentPosition] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        
        return () => clearInterval(timer);
    }, []);
    
    useEffect(() => {
        if (!train.positions || train.positions.length === 0) return;
        
        // Get current time in HH:MM:SS format
        const timeStr = currentTime.toTimeString().slice(0, 8);
        
        // Find the closest position based on current time
        let closestPosition = train.positions[0];
        for (let i = 0; i < train.positions.length; i++) {
            if (train.positions[i].time <= timeStr) {
                closestPosition = train.positions[i];
            } else {
                break;
            }
        }
        
        if (closestPosition && closestPosition.lat && closestPosition.lon) {
            setCurrentPosition(closestPosition);
        }
        
    }, [train.positions, currentTime]);
    
    if (!isVisible || !currentPosition) return null;
    
    return (
        <Marker
            position={[currentPosition.lat, currentPosition.lon]}
            icon={createTrainIcon(train.train_type || 'local', currentPosition.status === 'running')}
        >
            <Popup>
                <div style={{ fontFamily: 'Arial, sans-serif', minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                        🚂 {train.train_name || train.train_id}
                    </h4>
                    <p style={{ margin: '4px 0' }}>
                        <strong>Current Time:</strong> {currentPosition.time}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                        <strong>Speed:</strong> {currentPosition.speed || 0} km/h
                    </p>
                    <p style={{ margin: '4px 0' }}>
                        <strong>Status:</strong> {currentPosition.status || 'running'}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                        <strong>Position:</strong> {currentPosition.lat.toFixed(4)}, {currentPosition.lon.toFixed(4)}
                    </p>
                    {train.origin_station && train.destination_station && (
                        <p style={{ margin: '4px 0' }}>
                            <strong>Route:</strong> {train.origin_station} → {train.destination_station}
                        </p>
                    )}
                </div>
            </Popup>
        </Marker>
    );
};

const WorkingMapView = () => {
    const [railwayData, setRailwayData] = useState(null);
    const [simulationData, setSimulationData] = useState(null);
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTrains, setShowTrains] = useState(true);
    const [showRoutes, setShowRoutes] = useState(true);
    const [showTracks, setShowTracks] = useState(true);
    
    // Mumbai coordinates for map center
    const mumbaiCenter = [19.1, 72.85];
    const defaultZoom = 11;
    
    // Fetch railway data and simulation
    useEffect(() => {
        const initializeSimulation = async () => {
            try {
                setLoading(true);
                setError(null);
                
                console.log('🚂 Loading Mumbai railway simulation...');
                
                // Fetch data from simplified backend
                const [railwayResponse, simulationResponse] = await Promise.all([
                    axios.get('http://localhost:3001/api/mumbai', { timeout: 10000 }),
                    axios.get('http://localhost:3001/api/osrd/simulation', { timeout: 15000 })
                ]);
                
                console.log('✅ Railway data loaded:', railwayResponse.data);
                console.log('✅ Simulation loaded:', simulationResponse.data);
                
                if (railwayResponse.data && railwayResponse.data.features) {
                    setRailwayData(railwayResponse.data);
                    console.log(`📍 Loaded ${railwayResponse.data.features.length} railway tracks`);
                }
                
                if (simulationResponse.data && simulationResponse.data.simulation) {
                    setSimulationData(simulationResponse.data.simulation);
                    setTrains(simulationResponse.data.simulation.trains || []);
                    console.log(`🚄 Loaded ${simulationResponse.data.simulation.trains?.length || 0} trains`);
                } else {
                    setError('No simulation data received');
                }
                
            } catch (err) {
                console.error('❌ Failed to load data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load simulation data');
            } finally {
                setLoading(false);
            }
        };

        initializeSimulation();
    }, []);
    
    // Style for railway tracks (red dashed lines)
    const railwayStyle = {
        color: '#dc2626',     // Red color
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '8, 4'     // Dashed line
    };
    
    // Style for train routes (lighter colored lines)
    const getRouteStyle = (trainType) => {
        const baseStyle = {
            weight: 2,
            opacity: 0.6,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '4, 4'
        };
        
        switch (trainType) {
            case 'express':
                return { ...baseStyle, color: '#10b981' }; // Green
            case 'local':
                return { ...baseStyle, color: '#3b82f6' }; // Blue
            case 'fast':
                return { ...baseStyle, color: '#ef4444' }; // Red
            default:
                return { ...baseStyle, color: '#8b5cf6' }; // Purple
        }
    };
    
    // Convert route geometry to Leaflet format
    const routeToLeafletCoords = (routeGeometry) => {
        if (!Array.isArray(routeGeometry)) return [];
        return routeGeometry.map(coord => [coord.lat, coord.lon]);
    };
    
    // Handle GeoJSON feature events for railway tracks
    const onEachFeature = (feature, layer) => {
        if (feature.properties) {
            const { railway, name, operator, electrified, gauge } = feature.properties;
            
            let popupContent = `<div style="font-family: Arial, sans-serif;">`;
            popupContent += `<h4 style="margin: 0 0 8px 0; color: #1f2937;">🛤️ ${name || 'Railway Track'}</h4>`;
            
            if (railway) popupContent += `<p style="margin: 4px 0;"><strong>Type:</strong> ${railway}</p>`;
            if (operator) popupContent += `<p style="margin: 4px 0;"><strong>Operator:</strong> ${operator}</p>`;
            if (electrified) popupContent += `<p style="margin: 4px 0;"><strong>Electrified:</strong> ${electrified}</p>`;
            if (gauge) popupContent += `<p style="margin: 4px 0;"><strong>Gauge:</strong> ${gauge}mm</p>`;
            
            popupContent += `</div>`;
            
            layer.bindPopup(popupContent);
        }
    };
    
    return (
        <div className="map-container" style={{ position: 'relative', height: '100%', width: '100%' }}>
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    textAlign: 'center'
                }}>
                    <div style={{
                        border: '4px solid #f3f4f6',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 10px'
                    }}></div>
                    <p>Loading Mumbai train simulation...</p>
                </div>
            )}
            
            {error && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    right: '20px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '16px',
                    zIndex: 1000
                }}>
                    <h3 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>
                        ❌ Error Loading Simulation
                    </h3>
                    <p style={{ margin: '0', color: '#7f1d1d' }}>{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <MapContainer
                center={mumbaiCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                className="mumbai-railway-map"
            >
                {/* Base map layer */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Railway tracks layer (red dashed lines) */}
                {showTracks && railwayData && railwayData.features && railwayData.features.length > 0 && (
                    <GeoJSON
                        data={railwayData}
                        style={railwayStyle}
                        onEachFeature={onEachFeature}
                    />
                )}

                {/* Train route polylines */}
                {showRoutes && trains && trains.length > 0 && trains.map((train) => (
                    train.route_geometry && train.route_geometry.length > 0 && (
                        <Polyline
                            key={`route_${train.train_id}`}
                            positions={routeToLeafletCoords(train.route_geometry)}
                            pathOptions={getRouteStyle(train.train_type)}
                        >
                            <Popup>
                                <div style={{ fontFamily: 'Arial, sans-serif' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                                        🚂 {train.train_name || train.train_id}
                                    </h4>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Route:</strong> {train.origin_station} → {train.destination_station}
                                    </p>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Departure:</strong> {train.departure_time}
                                    </p>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Speed:</strong> {train.speed_kmph} km/h
                                    </p>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Stations:</strong> {train.stations?.length || 0}
                                    </p>
                                </div>
                            </Popup>
                        </Polyline>
                    )
                ))}

                {/* Animated train markers */}
                {showTrains && trains && trains.length > 0 && trains.map((train) => (
                    <TrainAnimator
                        key={train.train_id}
                        train={train}
                        isVisible={showTrains}
                    />
                ))}
            </MapContainer>

            {/* Control panel */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'white',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                minWidth: '200px'
            }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
                    Mumbai Train Simulation
                </h3>
                
                <div style={{ marginBottom: '8px' }}>
                    <span style={{ 
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: error ? '#dc2626' : '#10b981',
                        marginRight: '6px'
                    }}></span>
                    <span style={{ fontSize: '12px' }}>
                        Status: {error ? 'Error' : loading ? 'Loading' : 'Running'}
                    </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                        onClick={() => setShowTracks(!showTracks)}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            background: showTracks ? '#dc2626' : 'white',
                            color: showTracks ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        {showTracks ? '🛤️ Hide Tracks' : '🛤️ Show Tracks'}
                    </button>
                    
                    <button 
                        onClick={() => setShowTrains(!showTrains)}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            background: showTrains ? '#3b82f6' : 'white',
                            color: showTrains ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        {showTrains ? '🚂 Hide Trains' : '🚂 Show Trains'}
                    </button>
                    
                    <button 
                        onClick={() => setShowRoutes(!showRoutes)}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            background: showRoutes ? '#10b981' : 'white',
                            color: showRoutes ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        {showRoutes ? '📍 Hide Routes' : '📍 Show Routes'}
                    </button>
                </div>
            </div>

            {/* Statistics panel */}
            {simulationData && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    background: 'white',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    fontSize: '12px'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        Mumbai Railway Simulation
                    </div>
                    <div>Trains: {trains.length}</div>
                    <div>Mode: {simulationData.metadata?.type || 'Realistic'}</div>
                    <div>Updated: {new Date().toLocaleTimeString()}</div>
                    <div>Tracks: {railwayData?.features?.length || 0}</div>
                </div>
            )}
            
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .train-marker {
                    background: transparent !important;
                    border: none !important;
                }
            `}</style>
        </div>
    );
};

export default WorkingMapView;