# LexAI - AI-Powered Legal Automation Platform

🚀 **Live Demo**: [https://lexai-platform.vercel.app](https://lexai-platform.vercel.app)  
📂 **GitHub**: [https://github.com/yourusername/lexai-platform](https://github.com/yourusername/lexai-platform)

## Features

- 🤖 **AI-Powered Document Analysis** - OpenAI GPT-4 integration for intelligent field extraction
- 💬 **Conversational Completion** - Natural language interface for filling legal documents
- ✍️ **DocuSign Integration** - Send documents for electronic signature
- 💳 **Stripe Payments** - Process payments for legal services
- 🔐 **JWT Authentication** - Secure user authentication
- 📊 **Workflow Management** - Track document completion progress
- 🌓 **Dark/Light Mode** - Beautiful UI with theme toggle
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- Lucide Icons
- Mammoth.js (Word document processing)

### Backend
- Node.js + Express
- PostgreSQL
- OpenAI API
- Stripe API
- DocuSign eSignature API
- JWT Authentication

### Infrastructure
- Vercel (Frontend)
- Railway/Heroku (Backend)
- PostgreSQL Database
- Docker support

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- OpenAI API Key
- Stripe API Key (test mode)
- DocuSign Developer Account

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/lexai-platform.git
cd lexai-platform
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

3. **Setup Database**
```bash
psql -U postgres -d lexai -f database/schema.sql
```

4. **Setup Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

5. **Visit** `http://localhost:3000`

### Docker Setup
```bash
docker-compose up -d
```

## API Documentation

### Authentication

#### POST /api/auth/register
Register a new user
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

#### POST /api/auth/login
Login existing user
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Documents

#### POST /api/documents/upload
Upload and analyze document
- Requires: multipart/form-data with 'document' field
- Returns: Document ID, extracted text, AI analysis

### Workflows

#### POST /api/workflows
Create new workflow
```json
{
  "templateId": "incorporation",
  "name": "Delaware C-Corp Formation",
  "data": {}
}
```

#### GET /api/workflows
Get user's workflows

#### PUT /api/workflows/:id
Update workflow data

### Payments

#### POST /api/payments/create-intent
Create Stripe payment intent
```json
{
  "amount": 299,
  "workflowId": "wf_123"
}
```

### DocuSign

#### POST /api/docusign/send
Send document for signature
```json
{
  "documentContent": "...",
  "signerEmail": "signer@example.com",
  "signerName": "Jane Smith"
}
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/lexai
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
DOCUSIGN_INTEGRATION_KEY=...
DOCUSIGN_ACCOUNT_ID=...
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
PORT=3001
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Deployment

### Vercel (Frontend)
```bash
vercel --prod
```

### Railway (Backend)
```bash
railway login
railway init
railway up
```

### Environment Setup
Add all environment variables in your hosting platform's dashboard.

## Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter)  
Project Link: [https://github.com/yourusername/lexai-platform](https://github.com/yourusername/lexai-platform)

## Acknowledgments

- OpenAI for GPT-4 API
- Stripe for payment processing
- DocuSign for eSignature capabilities
- Vercel for hosting