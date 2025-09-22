import React, { useState, useEffect } from 'react';
import WorkingMapView from './WorkingMapView';
import './App.css';

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const recentAlerts = [
    { id: 1, type: 'delay', message: 'Central Line train delayed by 5 minutes at Dadar', time: '2 min ago' },
    { id: 2, type: 'maintenance', message: 'Western Line track maintenance at Andheri', time: '5 min ago' },
    { id: 3, type: 'rescheduled', message: 'Harbour Line express on schedule', time: '8 min ago' }
  ];

  return (
    <div className="app">
      {/* Top Navigation Bar */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-left">
            <h1 className="app-title">
                Railway Dashboard
            </h1>
            <span className="app-subtitle">SIH 2025 - Real-time Train Monitoring System</span>
          </div>
          <div className="nav-right">
            <div className="current-time">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="current-date">
              {currentTime.toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Train Statistics */}
          <div className="sidebar-section">
            <h2 className="section-title">Live Train Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card total">
                <div className="stat-number">5</div>
                <div className="stat-label">Mumbai Trains</div>
              </div>
              <div className="stat-card on-time">
                <div className="stat-number">3</div>
                <div className="stat-label">Running</div>
              </div>
              <div className="stat-card delayed">
                <div className="stat-number">2</div>
                <div className="stat-label">At Station</div>
              </div>
              <div className="stat-card avg-delay">
                <div className="stat-number">LIVE</div>
                <div className="stat-label">Status</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="sidebar-section">
            <h2 className="section-title">Quick Controls</h2>
            <div className="action-buttons">
              <button className="action-btn primary">
                🚂 View Live Trains
              </button>
              <button className="action-btn secondary">
                📊 Train Analytics
              </button>
              <button className="action-btn secondary">
                🗺️ Track Details
              </button>
              <button className="action-btn secondary">
                ⚡ Refresh Data
              </button>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="sidebar-section">
            <h2 className="section-title">Recent Alerts</h2>
            <div className="alerts-list">
              {recentAlerts.map(alert => (
                <div key={alert.id} className={`alert-item ${alert.type}`}>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">{alert.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="sidebar-section">
            <h2 className="section-title">System Status</h2>
            <div className="status-indicators">
              <div className="status-item">
                <span className="status-dot online"></span>
                <span className="status-text">Backend API</span>
              </div>
              <div className="status-item">
                <span className="status-dot online"></span>
                <span className="status-text">Railway Data</span>
              </div>
              <div className="status-item">
                <span className="status-dot online"></span>
                <span className="status-text">Live Simulation</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Map Area */}
        <main className="map-area">
          <div className="map-header">
            <h2 className="map-title">Mumbai Railway Live Simulation</h2>
            <div className="map-controls">
              <span className="map-legend">
                <span className="legend-item">
                  <span className="legend-color railway" style={{backgroundColor: '#dc2626'}}></span>
                  Railway Tracks
                </span>
                <span className="legend-item">
                  <span className="legend-color trains" style={{backgroundColor: '#3b82f6'}}></span>
                  Live Trains
                </span>
              </span>
            </div>
          </div>
          <div className="map-wrapper">
            <WorkingMapView />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;