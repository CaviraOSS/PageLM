const { GoogleSpreadsheet } = require('google-spreadsheet');

// This function will run on the serverless Netlify environment
exports.handler = async (event, context) => {
    try {
        // --- 1. Get Credentials from Netlify Environment Variables ---
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'); // Handle newline characters
        const sheetId = process.env.SPREADSHEET_ID;
        const sheetTitle = process.env.SHEET_TITLE || "Laptops"; // Default to "Laptops" tab

        if (!serviceAccountEmail || !privateKey || !sheetId) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Missing required environment variables for Google Sheet API." }),
            };
        }

        // --- 2. Authenticate and Load Sheet ---
        const doc = new GoogleSpreadsheet(sheetId);
        await doc.useServiceAccountAuth({
            client_email: serviceAccountEmail,
            private_key: privateKey,
        });

        await doc.loadInfo(); // Loads document properties and worksheets
        const sheet = doc.sheetsByTitle[sheetTitle];

        if (!sheet) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Sheet titled "${sheetTitle}" not found.` }),
            };
        }

        // --- 3. Fetch Data ---
        const rows = await sheet.getRows();

        // --- 4. Transform Data to Nested JSON Structure ---
        const laptopData = rows.map(row => {
            // Note: Data is mapped flat from the sheet (e.g., row.ram) and must be converted to the nested React structure (specs: { ram: ... })
            return {
                id: Number(row.id), // Ensure id is a number
                brand: row.brand,
                model: row.model,
                price: Number(row.price), // Ensure price is a number
                category: row.category,
                rating: Number(row.rating),
                image: row.image,
                specs: {
                    processor: row.processor,
                    ram: Number(row.ram), // Assumes sheet has a 'ram' column
                    storage: row.storage,
                    display: row.display,
                    gpu: row.gpu,
                    battery: row.battery,
                    weight: row.weight,
                }
            };
        });

        // --- 5. Return JSON Response ---
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(laptopData),
        };

    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch data from Google Sheet.", details: error.message }),
        };
    }
};
import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';

// Note: Ensure the following environment variables are set in Netlify:
// GOOGLE_SERVICE_ACCOUNT_EMAIL
// GOOGLE_PRIVATE_KEY
// SPREADSHEET_ID
// SHEET_TITLE

interface SheetRowData {
  [key: string]: string | number;
}

const handler: Handler = async (event, context) => {
  // 1. Setup Authentication
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Handle escaped newlines
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheetTitle = process.env.SHEET_TITLE || 'Laptops';

  if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
    console.error('Missing environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing credentials.' }),
    };
  }

  try {
    const serviceAccountAuth = new JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);

    // 2. Load the document and sheet
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[sheetTitle];

    if (!sheet) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Sheet with title "${sheetTitle}" not found.` }),
      };
    }

    // 3. Fetch Rows
    const rows = await sheet.getRows();

    // 4. Map Data to Laptop Interface
    // Assumes headers like: id, brand, model, price, image, specs_ram, specs_processor, etc.
    const laptops = rows.map((row) => {
      const rawData = row.toObject() as SheetRowData;

      // Helper to safely get string
      const getStr = (key: string) => String(rawData[key] || '');

      return {
        id: getStr('id') || row.rowNumber.toString(),
        brand: getStr('brand'),
        model: getStr('model'),
        price: Number(rawData['price']) || 0,
        image: getStr('image') || `https://picsum.photos/400/300?random=${row.rowNumber}`,
        specs: {
          processor: getStr('specs_processor'),
          ram: getStr('specs_ram'),
          storage: getStr('specs_storage'),
          display: getStr('specs_display'),
          graphics: getStr('specs_graphics'),
          battery: getStr('specs_battery'),
          weight: getStr('specs_weight'),
          os: getStr('specs_os'),
        },
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // CORS for development if needed
      },
      body: JSON.stringify(laptops),
    };

  } catch (error: any) {
    console.error('Error fetching from Google Sheets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data.', details: error.message }),
    };
  }
};

export { handler };
