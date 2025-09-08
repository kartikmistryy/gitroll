# LinkedIn Network Analysis Platform

A sophisticated AI-powered networking platform that helps professionals discover meaningful connections from their LinkedIn network using advanced machine learning and natural language processing.

## 🎯 Project Overview

This platform combines the power of AI with your LinkedIn network to help you find the most relevant connections for your networking goals. Simply upload your LinkedIn connections, describe your mission, and let AI find the perfect matches.

### Key Features
- **AI-Powered Matching**: Uses Azure OpenAI embeddings for semantic similarity
- **Smart Mission Analysis**: Natural language processing to understand your goals
- **Profile Enrichment**: Automatic LinkedIn profile data enhancement
- **User Authentication**: Secure login with Google OAuth via Clerk
- **Data Persistence**: MongoDB integration for user history
- **Responsive Design**: Works seamlessly on desktop and mobile

## 🚀 Features

### Core Functionality
- **📊 CSV Import**: Bulk import LinkedIn connections from CSV exports
- **🔗 URL Scraping**: Single profile enrichment via LinkedIn URLs
- **🧠 AI Mission Analysis**: Intelligent parsing of networking goals
- **🎯 Vector Matching**: Semantic similarity search using embeddings
- **💡 Smart Recommendations**: AI-generated networking strategies

### Technical Highlights
- **Next.js 14** with App Router and TypeScript
- **Azure OpenAI Integration** for GPT and Embeddings
- **Vector Similarity Search** using cosine similarity
- **MongoDB Integration** for persistent user data storage
- **Clerk Authentication** with Google OAuth
- **Responsive Design** with mobile-first approach
- **Real-time Processing** with loading states

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **Animations**: Framer Motion for smooth interactions
- **Icons**: React Icons (Feather Icons)
- **State Management**: React hooks with local state

### Backend
- **API Routes**: Next.js API routes with TypeScript
- **AI Services**: Azure OpenAI (GPT-4o, Text Embeddings)
- **Data Processing**: PapaParse for CSV parsing
- **Database**: MongoDB for user data persistence
- **Authentication**: Clerk with Google OAuth
- **External APIs**: RapidAPI for LinkedIn scraping

### AI Pipeline
1. **Mission Parsing**: GPT extracts structured attributes
2. **Embedding Generation**: Text embeddings for semantic matching
3. **Similarity Calculation**: Cosine similarity for profile ranking
4. **Recommendation Generation**: GPT creates personalized advice

## 📁 Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── upload-csv/         # CSV file processing
│   │   ├── scrape-profile/     # LinkedIn URL scraping
│   │   ├── parse-mission/      # Mission statement analysis
│   │   └── match-profiles/     # Profile matching & recommendations
│   ├── components/             # Reusable UI components
│   ├── dashboard/              # Main dashboard page
│   └── page.tsx               # Landing page
├── lib/
│   ├── utils.ts               # Core business logic
│   └── storage.ts             # Persistent storage system
├── data/                      # Profile storage directory
└── public/                    # Static assets
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Azure OpenAI account
- MongoDB account (MongoDB Atlas recommended)
- Clerk account for authentication
- RapidAPI account (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gitroll_assignment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create `.env.local` file:
   ```bash
   # Azure OpenAI Configuration
   AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key
   AZURE_OPENAI_DEPLOYMENT=gpt-4o
   AZURE_OPENAI_EMBEDDINGS=text-embedding-3-large
   
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/linkedin_network_analysis?retryWrites=true&w=majority
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   
   # RapidAPI Configuration (optional)
   RAPIDAPI_KEY=your-rapidapi-key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📊 Usage Guide

### 1. Data Import
- **CSV Upload**: Export your LinkedIn connections and upload the CSV file
- **URL Scraping**: Enter individual LinkedIn profile URLs for enrichment

### 2. Mission Definition
- Enter your networking goals in natural language
- Examples:
  - "I'm looking for tech entrepreneurs in San Francisco"
  - "Find HR professionals for hiring software developers"
  - "Connect with marketing experts in the healthcare industry"

### 3. AI Analysis
- The system automatically:
  - Parses your mission to extract key attributes
  - Generates embeddings for semantic matching
  - Finds the most relevant profiles
  - Creates personalized recommendations

### 4. Results & Actions
- Review top matches with similarity scores
- Read AI-generated networking strategies
- Connect directly via LinkedIn URLs

## 🔧 API Endpoints

### POST `/api/upload-csv`
Upload and process LinkedIn connections CSV file.

**Request**: FormData with CSV file
**Response**: 
```json
{
  "success": true,
  "message": "Successfully imported X profiles",
  "totalCount": 150
}
```

### POST `/api/scrape-profile`
Scrape individual LinkedIn profile data.

**Request**: 
```json
{
  "url": "https://linkedin.com/in/username"
}
```

### POST `/api/parse-mission`
Analyze mission statement and extract attributes.

**Request**: 
```json
{
  "mission": "I'm looking for tech entrepreneurs..."
}
```

**Response**:
```json
{
  "success": true,
  "attributes": {
    "industry": "Technology",
    "location": "San Francisco",
    "role": "Entrepreneurs",
    "description": "Seeking tech entrepreneurs..."
  }
}
```

### POST `/api/match-profiles`
Find matching profiles and generate recommendations.

**Request**: 
```json
{
  "mission": "I'm looking for...",
  "attributes": { ... }
}
```

## 🧠 AI Implementation Details

### Mission Parsing
- Uses GPT-4o with structured prompting
- Extracts industry, location, role, and description
- Handles various mission statement formats
- Provides fallback values for missing information

### Vector Similarity
- Text embeddings using Azure OpenAI Embeddings API
- Cosine similarity calculation for profile ranking
- Caching of embeddings for performance
- Batch processing optimization

### Recommendation Generation
- Context-aware prompting with mission and matches
- Professional tone and actionable advice
- Personalized strategies for each connection
- Industry-specific networking tips

## 📈 Performance Optimizations

- **Embedding Caching**: Profiles are cached after first embedding generation
- **Batch Processing**: Efficient handling of multiple profiles
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Real-time feedback during processing
- **Responsive Design**: Optimized for all device sizes

## 🔒 Security & Privacy

- **Environment Variables**: Sensitive data stored in environment variables
- **Input Validation**: Comprehensive validation of all inputs
- **Error Handling**: Secure error messages without sensitive data exposure
- **File Validation**: CSV file type and format validation

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- Ensure Node.js 18+ support
- Configure environment variables
- Set up file storage for profile data

## 🧪 Testing

### Manual Testing
1. Upload sample CSV file
2. Test mission parsing with various inputs
3. Verify profile matching accuracy
4. Check recommendation quality

### API Testing
```bash
# Test mission parsing
curl -X POST http://localhost:3000/api/parse-mission \
  -H "Content-Type: application/json" \
  -d '{"mission": "I am looking for tech entrepreneurs"}'
```

## 📝 Future Enhancements

- **Database Integration**: Replace file storage with PostgreSQL/MongoDB
- **User Authentication**: Add user accounts and profile management
- **Advanced Analytics**: Networking insights and trends
- **Bulk Operations**: Batch processing for large datasets
- **Export Features**: Export matches and recommendations
- **Integration APIs**: Connect with CRM systems

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Azure OpenAI** for AI capabilities
- **Next.js Team** for the excellent framework
- **Tailwind CSS** for the utility-first CSS framework
- **Framer Motion** for smooth animations

---

**Built with ❤️ for professional networking**