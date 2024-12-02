import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { PrismaClient } from '@prisma/client';
import { cozeService } from '@/service/coze';
import { parseComponentResponse } from '@/lib/utils/xmlParser';

const app = new Hono().basePath('/api');
const prisma = new PrismaClient();

// Generate component route
app.post('/generate', async (c) => {
  try {
    const { input, conversation_id } = await c.req.json();

    if (!input || typeof input !== 'string') {
      return c.json({ error: 'Invalid input' }, 400);
    }

    const response = await cozeService.generateComponent(
      input,
      conversation_id
    );

    if (!response) {
      throw new Error('Failed to generate component');
    }

    if (response.error) {
      throw new Error(response.error);
    }

    const parsedComponent = parseComponentResponse(response.content);
    if (!parsedComponent) {
      throw new Error(`Failed to parse component response ${response.content}`);
    }

    const codeBlocks = [parsedComponent];

    return c.json({
      content: parsedComponent.description,
      codeBlocks,
      usage: response.usage,
      conversation_id: response.conversation_id,
    });
  } catch (error) {
    console.error('Generate component error:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
});

// Save component route
app.post('/save-component', async (c) => {
  try {
    const { code, schema, name } = await c.req.json();
    if (!code || !schema || !name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const savedComponent = await prisma.savedComponent.create({
      data: {
        name,
        code,
        schema: JSON.stringify(schema),
      },
    });

    return c.json({ success: true, component: savedComponent });
  } catch (error) {
    console.error('Error saving component:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
});

// Get saved components route
app.get('/saved-components', async (c) => {
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

    return c.json(formattedComponents);
  } catch (error) {
    console.error('Error fetching components:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
});

export const GET = handle(app);
export const POST = handle(app);
