import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON, useMap } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom train icon
const createTrainIcon = (trainType, isMoving = true) => {
    const colors = {
        local: '#2563eb',
        express: '#059669',
        fast: '#dc2626',
        default: '#7c3aed'
    };
    
    const color = colors[trainType] || colors.default;
    const opacity = isMoving ? 1 : 0.6;
    
    return new L.DivIcon({
        html: `
            <div style="
                background-color: ${color};
                border: 2px solid white;
                border-radius: 50%;
                width: 12px;
                height: 12px;
                opacity: ${opacity};
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                transform: translate(-50%, -50%);
            "></div>
            <div style="
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                background: ${color};
                color: white;
                padding: 1px 4px;
                border-radius: 2px;
                font-size: 8px;
                font-weight: bold;
                white-space: nowrap;
                pointer-events: none;
            ">🚂</div>
        `,
        className: 'train-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
};

// Component to animate train movement
const TrainAnimator = ({ train, isVisible }) => {
    const map = useMap();
    const markerRef = useRef(null);
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
        
        // Find the current position based on time
        let position = null;
        for (let i = 0; i < train.positions.length; i++) {
            if (train.positions[i].time <= timeStr) {
                position = train.positions[i];
            } else {
                break;
            }
        }
        
        if (position && position.lat && position.lon) {
            setCurrentPosition(position);
        }
        
    }, [train.positions, currentTime]);
    
    if (!isVisible || !currentPosition) return null;
    
    return (
        <Marker
            ref={markerRef}
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
                        <strong>Status:</strong> {currentPosition.status || 'unknown'}
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

const OSRDMapView = () => {
    const [railwayData, setRailwayData] = useState(null);
    const [simulationData, setSimulationData] = useState(null);
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTrains, setShowTrains] = useState(true);
    const [showRoutes, setShowRoutes] = useState(true);
    const [simulationStatus, setSimulationStatus] = useState('idle');
    
    // Mumbai coordinates for map center
    const mumbaiCenter = [19.1, 72.85];
    const defaultZoom = 11;
    
    // Fetch railway data and start OSRD simulation
    useEffect(() => {
        const initializeOSRDSimulation = async () => {
            try {
                setLoading(true);
                setError(null);
                setSimulationStatus('initializing');
                
                console.log('🚂 Initializing OSRD Mumbai train simulation...');
                
                // Fetch railway tracks and OSRD simulation in parallel
                const [railwayResponse, simulationResponse] = await Promise.all([
                    axios.get('http://localhost:3001/api/mumbai', {
                        timeout: 45000
                    }),
                    axios.get('http://localhost:3001/api/osrd/simulation', {
                        timeout: 60000
                    })
                ]);
                
                console.log('✅ Railway data received:', railwayResponse.data);
                console.log('✅ OSRD simulation received:', simulationResponse.data);
                
                if (railwayResponse.data && railwayResponse.data.features) {
                    setRailwayData(railwayResponse.data);
                    console.log(`📍 Loaded ${railwayResponse.data.features.length} railway tracks`);
                }
                
                if (simulationResponse.data && simulationResponse.data.simulation) {
                    setSimulationData(simulationResponse.data.simulation);
                    setTrains(simulationResponse.data.simulation.trains || []);
                    setSimulationStatus('running');
                    console.log(`🚄 Loaded ${simulationResponse.data.simulation.trains?.length || 0} trains from OSRD`);
                } else {
                    setError('No simulation data received from OSRD');
                    setSimulationStatus('error');
                }
                
            } catch (err) {
                console.error('❌ OSRD initialization failed:', err);
                setError(err.response?.data?.message || err.message || 'Failed to initialize OSRD simulation');
                setSimulationStatus('error');
            } finally {
                setLoading(false);
            }
        };

        initializeOSRDSimulation();
    }, []);
    
    // Style for railway tracks
    const railwayStyle = {
        color: '#1e40af', // Blue color for railway tracks
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '5, 5'
    };
    
    // Style for train routes
    const getRouteStyle = (trainType) => {
        const baseStyle = {
            weight: 2,
            opacity: 0.6,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '3, 3'
        };
        
        switch (trainType) {
            case 'express':
                return { ...baseStyle, color: '#059669' }; // Green
            case 'local':
                return { ...baseStyle, color: '#2563eb' }; // Blue
            case 'fast':
                return { ...baseStyle, color: '#dc2626' }; // Red
            default:
                return { ...baseStyle, color: '#7c3aed' }; // Purple
        }
    };
    
    // Convert route geometry to Leaflet format
    const routeToLeafletCoords = (routeGeometry) => {
        return routeGeometry.map(coord => [coord.lat, coord.lon]);
    };
    
    // Handle GeoJSON feature events
    const onEachFeature = (feature, layer) => {
        if (feature.properties) {
            const { railway, name, operator, electrified, gauge } = feature.properties;
            
            let popupContent = `<div style="font-family: Arial, sans-serif;">`;
            popupContent += `<h4 style="margin: 0 0 8px 0; color: #1f2937;">🛤️ Railway Track</h4>`;
            
            if (name) popupContent += `<p style="margin: 4px 0;"><strong>Name:</strong> ${name}</p>`;
            if (railway) popupContent += `<p style="margin: 4px 0;"><strong>Type:</strong> ${railway}</p>`;
            if (operator) popupContent += `<p style="margin: 4px 0;"><strong>Operator:</strong> ${operator}</p>`;
            if (electrified) popupContent += `<p style="margin: 4px 0;"><strong>Electrified:</strong> ${electrified}</p>`;
            if (gauge) popupContent += `<p style="margin: 4px 0;"><strong>Gauge:</strong> ${gauge}</p>`;
            
            popupContent += `</div>`;
            
            layer.bindPopup(popupContent);
        }
    };
    
    const getSimulationStatusColor = () => {
        switch (simulationStatus) {
            case 'running': return '#059669';
            case 'initializing': return '#f59e0b';
            case 'error': return '#dc2626';
            default: return '#6b7280';
        }
    };
    
    return (
        <div className="map-container" style={{ position: 'relative', height: '100%', width: '100%' }}>
            {loading && (
                <div className="map-loading" style={{
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
                    <div className="loading-spinner" style={{
                        border: '4px solid #f3f4f6',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 10px'
                    }}></div>
                    <p>Loading OSRD Mumbai train simulation...</p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>
                        Status: {simulationStatus}
                    </p>
                </div>
            )}
            
            {error && (
                <div className="map-error" style={{
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
                        ❌ OSRD Simulation Error
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
                className="osrd-railway-map"
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

                {/* Train route polylines */}
                {showRoutes && trains && trains.length > 0 && trains.map((train) => (
                    train.route_geometry && (
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
            <div className="osrd-controls" style={{
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
                    OSRD Simulation Control
                </h3>
                
                <div style={{ marginBottom: '8px' }}>
                    <span style={{ 
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getSimulationStatusColor(),
                        marginRight: '6px'
                    }}></span>
                    <span style={{ fontSize: '12px' }}>Status: {simulationStatus}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                        className={`control-btn ${showTrains ? 'active' : ''}`}
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
                        className={`control-btn ${showRoutes ? 'active' : ''}`}
                        onClick={() => setShowRoutes(!showRoutes)}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            background: showRoutes ? '#3b82f6' : 'white',
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
                <div className="osrd-stats" style={{
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
                        OSRD Mumbai Simulation
                    </div>
                    <div>Trains: {trains.length}</div>
                    <div>Type: {simulationData.metadata?.type || 'Real-time'}</div>
                    <div>Updated: {new Date().toLocaleTimeString()}</div>
                </div>
            )}
            
            <style jsx>{`
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

export default OSRDMapView;