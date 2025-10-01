import React, { useState, useEffect } from 'react';
import MapView from './MapView';
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

  // Dummy data for SIH simulation
  const trainStats = {
    totalTrains: 22,
    onTime: 18,
    delayed: 4,
    avgDelay: 12, // minutes
    activeRoutes: 15
  };

  const recentAlerts = [
    { id: 1, type: 'delay', message: 'Local train on Western Line delayed by 15 minutes', time: '2 min ago' },
    { id: 2, type: 'maintenance', message: 'Track maintenance scheduled for Platform 3', time: '5 min ago' },
    { id: 3, type: 'rescheduled', message: 'Express train rescheduled due to weather conditions', time: '8 min ago' }
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
            <h2 className="section-title">Train Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card total">
                <div className="stat-number">{trainStats.totalTrains}</div>
                <div className="stat-label">Total Trains</div>
              </div>
              <div className="stat-card on-time">
                <div className="stat-number">{trainStats.onTime}</div>
                <div className="stat-label">On Time</div>
              </div>
              <div className="stat-card delayed">
                <div className="stat-number">{trainStats.delayed}</div>
                <div className="stat-label">Delayed</div>
              </div>
              <div className="stat-card avg-delay">
                <div className="stat-number">{trainStats.avgDelay}m</div>
                <div className="stat-label">Avg Delay</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="sidebar-section">
            <h2 className="section-title">Quick Actions</h2>
            <div className="action-buttons">
              <button className="action-btn primary">
                📊 View Analytics
              </button>
              <button className="action-btn secondary">
                🔄 Reschedule Trains
              </button>
              <button className="action-btn secondary">
                ⚠️ Manage Delays
              </button>
              <button className="action-btn secondary">
                📱 Send Alerts
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
                <span className="status-text">API Server</span>
              </div>
              <div className="status-item">
                <span className="status-dot online"></span>
                <span className="status-text">Railway Data</span>
              </div>
              <div className="status-item">
                <span className="status-dot online"></span>
                <span className="status-text">Real-time Updates</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Map Area */}
        <main className="map-area">
          <div className="map-header">
            <h2 className="map-title">Mumbai Railway Network</h2>
            <div className="map-controls">
              <span className="map-legend">
                <span className="legend-item">
                  <span className="legend-color railway"></span>
                  Railway Tracks
                </span>
              </span>
            </div>
          </div>
          <div className="map-wrapper">
            <MapView />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
