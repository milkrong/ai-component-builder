// src/api/chat.ts
import { claudeService } from '../service/coze';
import {
  parseComponentResponse,
  extractCodeBlocks,
} from '../../lib/utils/xmlParser';

export const apiGenerateHandler = {
  async POST(req: Request) {
    try {
      const { input } = await req.json();

      if (!input || typeof input !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid input' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      const response = await claudeService.generateComponent(input);

      if (!response) {
        throw new Error('Failed to generate component');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      const parsedComponent = parseComponentResponse(response.content);
      if (!parsedComponent) {
        throw new Error('Failed to parse component response');
      }

      const codeBlocks = extractCodeBlocks(parsedComponent);

      return new Response(
        JSON.stringify({
          content: parsedComponent.description,
          codeBlocks,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : 'Internal server error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};
