require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const agentRoutes = require('./routes/agentRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const publicRoutes = require('./routes/publicRoutes');


// Initialize database connection
connectDB();

const app = express();

// Middlewares
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Body parser middleware for parsing application/json

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'API is running and healthy' });
});

// Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/v1/public', publicRoutes);

// Error fallback middleware
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
