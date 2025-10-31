// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const mammoth = require('mammoth');
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const docusign = require('docusign-esign');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());

// Middleware for auth
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Routes

// Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );
    
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET);
    res.json({ user: result.rows[0], token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Document upload and AI extraction
app.post('/api/documents/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = result.value;
    
    // Use OpenAI to extract fields intelligently
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a legal document analyzer. Extract all placeholder fields from the document and provide intelligent suggestions. Return JSON format."
        },
        {
          role: "user",
          content: `Analyze this legal document and extract all placeholder fields:\n\n${text.substring(0, 4000)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const aiAnalysis = JSON.parse(completion.choices[0].message.content);
    
    // Save to database
    const dbResult = await pool.query(
      'INSERT INTO documents (user_id, filename, original_text, ai_analysis) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, req.file.originalname, text, JSON.stringify(aiAnalysis)]
    );
    
    res.json({
      documentId: dbResult.rows[0].id,
      text,
      fields: aiAnalysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Workflows
app.post('/api/workflows', authenticateToken, async (req, res) => {
  try {
    const { templateId, name, data } = req.body;
    
    const result = await pool.query(
      'INSERT INTO workflows (user_id, template_id, name, data, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, templateId, name, JSON.stringify(data), 'in_progress']
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workflows WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/workflows/:id', authenticateToken, async (req, res) => {
  try {
    const { data, status } = req.body;
    
    const result = await pool.query(
      'UPDATE workflows SET data = $1, status = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
      [JSON.stringify(data), status, req.params.id, req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe payment
app.post('/api/payments/create-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, workflowId } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      metadata: { workflowId, userId: req.user.id }
    });
    
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DocuSign integration
app.post('/api/docusign/send', authenticateToken, async (req, res) => {
  try {
    const { documentContent, signerEmail, signerName } = req.body;
    
    // Initialize DocuSign client
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + process.env.DOCUSIGN_ACCESS_TOKEN);
    
    // Create envelope
    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    const envelope = {
      emailSubject: 'Please sign this document',
      documents: [{
        documentBase64: Buffer.from(documentContent).toString('base64'),
        name: 'Legal Document',
        fileExtension: 'txt',
        documentId: '1'
      }],
      recipients: {
        signers: [{
          email: signerEmail,
          name: signerName,
          recipientId: '1',
          routingOrder: '1'
        }]
      },
      status: 'sent'
    };
    
    const result = await envelopesApi.createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, {
      envelopeDefinition: envelope
    });
    
    res.json({ envelopeId: result.envelopeId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Chat completion
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { messages, context } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful legal assistant helping users complete legal documents. Be concise and professional."
        },
        ...messages
      ]
    });
    
    res.json({ message: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});