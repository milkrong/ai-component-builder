import express from 'express';
import { apiGenerateHandler } from './src/handlers/chat';
import { htmlHandler, cssHandler, tsOrTsxHandler } from './src/handlers/file';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const PORT = 3000;

const prisma = new PrismaClient();

// Express middleware
app.use(express.json());

// API route
app.post('/api/generate', async (req, res) => {
  try {
    const result = await apiGenerateHandler.POST(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      })
    );

    if (!result) {
      throw new Error('No response from handler');
    }

    const responseData = await result.json();
    res.status(result.status).json(responseData);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Update error handling in route handlers
app.get('/', async (req, res) => {
  try {
    const htmlResponse = await htmlHandler.GET(
      new Request(`http://localhost/index.html`)
    );
    if (htmlResponse.success) {
      res.writeHead(200, {
        'Content-Type': htmlResponse.contentType,
      });
      res.end(htmlResponse.data);
    } else {
      res.status(404).send('Not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('*.css', async (req, res) => {
  try {
    const cssResponse = await cssHandler.GET(
      new Request(`http://localhost${req.path}`)
    );
    if (cssResponse.success) {
      res.writeHead(200, {
        'Content-Type': cssResponse.contentType,
      });
      res.end(cssResponse.data);
    } else {
      res.status(500);
    }
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

app.get(['*.ts', '*.tsx'], async (req, res) => {
  try {
    const tsResponse = await tsOrTsxHandler.GET(
      new Request(`http://localhost${req.path}`)
    );
    if (tsResponse.success) {
      res.writeHead(200, {
        'Content-Type': tsResponse.contentType,
      });
      res.end(tsResponse.data);
    } else {
      res.status(500).send(tsResponse.error);
    }
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

// Updated save component route
app.post('/api/save-component', async (req, res) => {
  try {
    const { code, schema, name } = req.body;
    if (!code || !schema || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const savedComponent = await prisma.savedComponent.create({
      data: {
        name,
        code,
        schema: JSON.stringify(schema), // Convert schema object to string for storage
      },
    });

    res.status(200).json({ success: true, component: savedComponent });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Updated get saved components route
app.get('/api/saved-components', async (req, res) => {
  try {
    const components = await prisma.savedComponent.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Parse schema back to object before sending to client
    const formattedComponents = components.map((component) => ({
      ...component,
      schema: JSON.parse(component.schema),
    }));

    res.status(200).json(formattedComponents);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Development server running at http://localhost:${PORT}`);
});

// Add cleanup when server shuts down
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
