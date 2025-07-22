const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to your Google Cloud Jump Start Solution!',
    service: 'serverless-web-app',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/api/data', (req, res) => {
  res.json({
    data: [
      { id: 1, name: 'Sample Data 1' },
      { id: 2, name: 'Sample Data 2' },
      { id: 3, name: 'Sample Data 3' },
    ],
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
