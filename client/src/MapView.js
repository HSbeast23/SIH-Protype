import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polyline, Popup } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const MapView = () => {
    const [railwayData, setRailwayData] = useState(null);
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTrains, setShowTrains] = useState(true);

    // Mumbai coordinates for map center
    const mumbaiCenter = [19.1, 72.85];
    const defaultZoom = 12;

    // Fetch railway data and demo trains from server
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                console.log('Fetching Mumbai railway tracks and demo trains...');
                
                // Fetch railway tracks and demo trains in parallel
                const [railwayResponse, trainsResponse] = await Promise.all([
                    axios.get('http://localhost:3001/api/mumbai', {
                        timeout: 45000 // 45 second timeout
                    }),
                    axios.get('http://localhost:3001/api/trains/sample', {
                        timeout: 30000 // 30 second timeout
                    })
                ]);
                
                console.log('Railway data received:', railwayResponse.data);
                console.log('Demo trains received:', trainsResponse.data);
                
                if (railwayResponse.data && railwayResponse.data.features) {
                    setRailwayData(railwayResponse.data);
                    console.log(`Loaded ${railwayResponse.data.features.length} railway tracks`);
                } else {
                    setError('No railway data received');
                }

                if (trainsResponse.data && trainsResponse.data.trains) {
                    setTrains(trainsResponse.data.trains);
                    console.log(`Loaded ${trainsResponse.data.trains.length} demo trains`);
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

    // Style for railway tracks
    const railwayStyle = {
        color: '#dc2626', // Red color for railway tracks
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
    };

    // Style for trains based on type
    const getTrainStyle = (trainType) => {
        const baseStyle = {
            weight: 6,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
        };

        switch (trainType) {
            case 'express':
                return { ...baseStyle, color: '#059669' }; // Green for express
            case 'local':
                return { ...baseStyle, color: '#2563eb' }; // Blue for local
            default:
                return { ...baseStyle, color: '#7c3aed' }; // Purple for others
        }
    };

    // Convert train line coordinates to Leaflet format
    const trainToLeafletCoords = (trainLine) => {
        return trainLine.map(([lon, lat]) => [lat, lon]);
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
                    <p>Loading Mumbai railway tracks...</p>
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

                {/* Trains layer */}
                {showTrains && trains && trains.length > 0 && trains.map((train) => (
                    <Polyline
                        key={train.id}
                        positions={trainToLeafletCoords(train.trainLine)}
                        pathOptions={getTrainStyle(train.type)}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'Arial, sans-serif', minWidth: '250px' }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#1f2937', fontSize: '18px' }}>
                                    🚂 {train.type === 'express' ? `Mumbai Central Express ${train.id}` : `CST Local ${train.id}`}
                                </h4>
                                
                                <p style={{ margin: '8px 0', fontSize: '16px' }}>
                                    <strong>Speed:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>
                                        {train.type === 'express' ? '65 km/h' : '45 km/h'}
                                    </span>
                                </p>
                                
                                <p style={{ margin: '8px 0', fontSize: '16px' }}>
                                    <strong>Current Station:</strong> <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                        {train.type === 'express' ? 'Dadar' : 'Bandra'}
                                    </span>
                                </p>
                                
                                <p style={{ margin: '8px 0', fontSize: '16px' }}>
                                    <strong>Next Station:</strong> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>
                                        {train.type === 'express' ? 'Andheri' : 'Khar Road'}
                                    </span>
                                </p>
                                
                                <p style={{ margin: '8px 0', fontSize: '14px', color: '#6b7280' }}>
                                    <strong>Track:</strong> {train.track?.properties?.name || 'Mumbai Metro Line 3'}
                                </p>
                                
                                <p style={{ margin: '8px 0', fontSize: '14px', color: '#6b7280' }}>
                                    <strong>Direction:</strong> {Math.round(train.bearing)}°
                                </p>
                            </div>
                        </Popup>
                    </Polyline>
                ))}
            </MapContainer>

            {/* Map info overlay */}
            <div className="map-info">
                {railwayData && railwayData.metadata && (
                    <div className="map-stats">
                        <span className="track-count">
                            {railwayData.metadata.trackCount} tracks loaded
                        </span>
                        <span className="train-count">
                            {trains.length} trains active
                        </span>
                        <span className="last-updated">
                            Updated: {new Date(railwayData.metadata.fetchedAt).toLocaleTimeString()}
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
                </div>
            </div>
        </div>
    );
};

export default MapView;