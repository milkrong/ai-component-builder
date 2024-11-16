import express from 'express';
import { apiGenerateHandler } from './src/handlers/chat';
import { htmlHandler, cssHandler, tsOrTsxHandler } from './src/handlers/file';
const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
  console.log(`Development server running at http://localhost:${PORT}`);
});

// Remove the standalone apiGenerateHandler function at the bottom since it's now handled by the Express route
