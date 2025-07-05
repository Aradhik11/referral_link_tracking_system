const express = require('express');
const path = require('path');


const agentRoutes = require('./routes/agents');
const downloadRoutes = require('./routes/downloads');
const analyticsRoutes = require('./routes/analytics');


const { initializeStorage } = require('./services/storage');
const { trackReferralVisit } = require('./middleware/referralTracker');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));


app.set('trust proxy', 1);

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/analytics', analyticsRoutes);

// Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/download', trackReferralVisit, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('/{*any}', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    await initializeStorage();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`Download: http://localhost:${PORT}/download`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;