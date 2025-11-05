const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { COMPANIES } = require('./companies');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Load OAuth credentials from environment variables or fallback to file
let oauthCredentials;
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI) {
  oauthCredentials = {
    web: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [process.env.GOOGLE_REDIRECT_URI],
      javascript_origins: [process.env.JAVASCRIPT_ORIGIN || 'http://localhost:3000']
    }
  };
  console.log('OAuth credentials loaded from environment variables');
} else {
  try {
    const credPath = path.join(__dirname, 'client_secret_908130487315-hcc75unf1r42u9b34eme7eflotpr7hvn.apps.googleusercontent.com.json');
    if (fs.existsSync(credPath)) {
      oauthCredentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      console.log('OAuth credentials loaded from file');
    } else {
      console.error('OAuth credentials not found in environment variables or file');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error loading OAuth credentials:', err.message);
    process.exit(1);
  }
}

// Load service account credentials from environment or file
let serviceAccountCredentials;
if (process.env.SERVICE_ACCOUNT_KEY) {
  try {
    const decoded = Buffer.from(process.env.SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
    serviceAccountCredentials = JSON.parse(decoded);
    console.log('Service account credentials loaded from environment variables');
  } catch (err) {
    console.error('Error decoding SERVICE_ACCOUNT_KEY:', err.message);
    process.exit(1);
  }
} else {
  try {
    serviceAccountCredentials = require('./applications-form-testing-5a1cfd770b20.json');
    console.log('Service account credentials loaded from file');
  } catch (err) {
    console.error('Service account credentials not found:', err.message);
    process.exit(1);
  }
}

// Google API Configuration for Sheets (Service Account)
const SCOPES_SHEETS = ['https://www.googleapis.com/auth/spreadsheets'];

const sheetsAuth = new google.auth.GoogleAuth({
  credentials: serviceAccountCredentials,
  scopes: SCOPES_SHEETS,
});

// Google API Configuration for Drive (OAuth)
const SCOPES_DRIVE = ['https://www.googleapis.com/auth/drive.file'];

const oauth2Client = new google.auth.OAuth2(
  oauthCredentials.web.client_id,
  oauthCredentials.web.client_secret,
  oauthCredentials.web.redirect_uris[0]
);

// Token storage path
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Load saved tokens from environment variable or file
if (process.env.OAUTH_TOKENS) {
  try {
    const tokens = JSON.parse(process.env.OAUTH_TOKENS);
    oauth2Client.setCredentials(tokens);
    console.log('OAuth tokens loaded from environment variable');
  } catch (err) {
    console.error('Error parsing OAUTH_TOKENS from environment:', err.message);
  }
} else if (fs.existsSync(TOKEN_PATH)) {
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oauth2Client.setCredentials(token);
  console.log('OAuth tokens loaded from file');
} else {
  console.warn('⚠️  No OAuth tokens found! Please visit /auth to authorize the application.');
}

// Helper function to get company name from ID
function getCompanyName(companyId) {
  const company = COMPANIES.find(c => c.id === parseInt(companyId));
  return company ? company.name : '';
}

// Helper function to get position names from position IDs
function getPositionNames(companyId, positionIds) {
  if (!companyId || !positionIds || positionIds.length === 0) return '';
  
  const company = COMPANIES.find(c => c.id === parseInt(companyId));
  if (!company) return '';
  
  const positionNames = positionIds.map(posId => {
    const position = company.positions.find(p => p.id === posId);
    return position ? position.name : '';
  }).filter(name => name !== '');
  
  return positionNames.join(', ');
}

// Middleware
app.use(cors());
app.use(express.json());

// Multer configuration for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC files are allowed!'));
    }
  }
});

// Google Sheets ID (extract from your sheet URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1DK4xiaXtQ6FDSVZd0mBpgFwrcXVOQjXDbgNiXoVF1uA';
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1BMM2yhq7vsehgxfsZTRPVuuvmsPuKPgO';

// OAuth authorization route
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent screen to always get a fresh refresh token
    scope: SCOPES_DRIVE,
  });
  res.redirect(authUrl);
});

// OAuth callback route
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Save tokens to file
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Tokens saved to file successfully');
    
    // Display tokens for adding to environment variable
    res.send(`
      <html>
        <head><title>Authorization Successful</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
          <h2>✅ Authorization Successful!</h2>
          <p>The application has been authorized to access Google Drive.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>⚠️ IMPORTANT: For Render Deployment</h3>
            <p>To persist this authorization on Render, add the following environment variable:</p>
            <p><strong>Variable Name:</strong> <code>OAUTH_TOKENS</code></p>
            <p><strong>Value:</strong></p>
            <textarea readonly style="width: 100%; height: 100px; font-family: monospace; font-size: 12px; padding: 10px;">${JSON.stringify(tokens)}</textarea>
            <button onclick="navigator.clipboard.writeText('${JSON.stringify(tokens).replace(/'/g, "\\'")}'); alert('Copied to clipboard!');" 
                    style="margin-top: 10px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Copy to Clipboard
            </button>
          </div>
          
          <p>Steps to add to Render:</p>
          <ol>
            <li>Go to your Render dashboard</li>
            <li>Open your backend service</li>
            <li>Go to "Environment" tab</li>
            <li>Add new environment variable: <code>OAUTH_TOKENS</code></li>
            <li>Paste the value from above</li>
            <li>Save changes (this will redeploy your service)</li>
          </ol>
          
          <p style="margin-top: 30px;">You can close this window now.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send('Authorization failed: ' + error.message);
  }
});

// Check OAuth status
app.get('/api/auth-status', (req, res) => {
  const isAuthorized = fs.existsSync(TOKEN_PATH);
  res.json({ 
    isAuthorized,
    authUrl: isAuthorized ? null : `http://localhost:${PORT}/auth`
  });
});

// Upload file to Google Drive using OAuth
async function uploadToDrive(filePath, fileName, mimeType) {
  try {
    // Check if we have valid credentials
    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
      throw new Error('OAuth not configured. Please visit the /auth endpoint to authorize');
    }
    
    // Set up token refresh
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // Store the new refresh token
        const currentTokens = oauth2Client.credentials;
        const updatedTokens = { ...currentTokens, ...tokens };
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedTokens));
        console.log('🔄 Tokens refreshed and saved to file');
        console.log('⚠️  IMPORTANT: Update OAUTH_TOKENS environment variable in Render with:', JSON.stringify(updatedTokens));
      }
    });
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    console.log('Uploading file to Drive:', { fileName, mimeType, filePath });
    
    const fileMetadata = {
      name: fileName,
      parents: [DRIVE_FOLDER_ID]
    };
    
    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath)
    };
    
    console.log('Creating file in Drive folder:', DRIVE_FOLDER_ID);
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink'
    });
    
    console.log('File created with ID:', file.data.id);
    
    // Make file publicly viewable
    console.log('Setting file permissions...');
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    console.log('File uploaded successfully:', file.data.webViewLink);
    return file.data.webViewLink;
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('Drive API response error:', error.response.data);
    }
    throw error;
  }
}

// Append data to Google Sheets
async function appendToSheet(data) {
  try {
    const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
    
    // Parse positions if they're strings
    const parsePositionIds = (positions) => {
      if (!positions) return [];
      if (typeof positions === 'string') {
        try {
          return JSON.parse(positions);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(positions) ? positions : [];
    };
    
    // Get company names and position names
    const company1Name = data.company1 ? getCompanyName(data.company1) : '';
    const company1Positions = getPositionNames(data.company1, parsePositionIds(data.company1Positions));
    
    const company2Name = data.company2 ? getCompanyName(data.company2) : '';
    const company2Positions = getPositionNames(data.company2, parsePositionIds(data.company2Positions));
    
    const company3Name = data.company3 ? getCompanyName(data.company3) : '';
    const company3Positions = getPositionNames(data.company3, parsePositionIds(data.company3Positions));
    
    const values = [[
      new Date().toISOString(),
      data.name || '',
      data.contact || '',
      data.email || '',
      data.rollNo || '',
      data.branch || '',
      data.year || '',
      company1Name,
      company1Positions,
      company2Name,
      company2Positions,
      company3Name,
      company3Positions,
      data.resumeLink || ''
    ]];
    
    console.log('Prepared sheet data:', values);
    
    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:N', // Adjusted range to include rollNo
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: values
      }
    };
    
    const response = await sheets.spreadsheets.values.append(request);
    console.log('Sheet append response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error appending to sheet:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('API response error:', error.response.data);
    }
    throw error;
  }
}

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Test Google API connection
app.get('/api/test-connection', async (req, res) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    res.json({
      success: true,
      message: 'Google API connection successful',
      sheetTitle: response.data.properties.title
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Google API connection failed',
      error: error.message
    });
  }
});

// Submit form endpoint
app.post('/api/submit', upload.single('resume'), async (req, res) => {
  try {
    console.log('Received form submission:', {
      body: req.body,
      file: req.file ? { name: req.file.originalname, size: req.file.size } : 'No file'
    });
    
    let resumeLink = '';
    let resumeFileName = '';
    
    // Upload resume to Google Drive if file exists
    if (req.file) {
      resumeFileName = req.file.originalname;
      console.log('Uploading resume to Drive...');
      const fileName = `${req.body.name}_${Date.now()}${path.extname(req.file.originalname)}`;
      
      try {
        resumeLink = await uploadToDrive(req.file.path, fileName, req.file.mimetype);
        console.log('Resume uploaded:', resumeLink);
        
        // Delete temporary file
        fs.unlinkSync(req.file.path);
      } catch (driveError) {
        console.error('Drive upload failed:', driveError.message);
        // Clean up temporary file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        // Return error to client
        return res.status(500).json({
          success: false,
          message: 'Failed to upload resume to Google Drive. Please try again or contact support.',
          error: driveError.message,
          hint: 'The server may need to be re-authorized. Contact the administrator.'
        });
      }
    }
    
    // Prepare data for Google Sheets
    const formData = {
      ...req.body,
      resumeLink: resumeLink || resumeFileName
    };
    
    console.log('Appending to Google Sheets...');
    // Append to Google Sheets
    await appendToSheet(formData);
    console.log('Data appended to sheet successfully');
    
    res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
      resumeLink,
      note: resumeLink.startsWith('Local') ? 'Resume saved locally, Drive upload unavailable' : undefined
    });
  } catch (error) {
    console.error('Error processing form:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error submitting form',
      error: error.message
    });
  }
});

// Upload resume only endpoint
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const fileName = `resume_${Date.now()}${path.extname(req.file.originalname)}`;
    const resumeLink = await uploadToDrive(req.file.path, fileName, req.file.mimetype);
    
    // Delete temporary file
    fs.unlinkSync(req.file.path);
    
    res.status(200).json({
      success: true,
      resumeLink
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading resume',
      error: error.message
    });
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Spreadsheet ID: ${SPREADSHEET_ID}`);
  console.log(`Drive Folder ID: ${process.env.DRIVE_FOLDER_ID || 'root'}`);
});
