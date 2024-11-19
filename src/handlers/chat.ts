import { parseComponentResponse } from '@/lib/utils/xmlParser';
import { cozeService } from '../service/coze';

export const apiGenerateHandler = {
  async POST(req: Request) {
    try {
      const { input, conversation_id } = await req.json();

      if (!input || typeof input !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid input' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        });
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
        throw new Error('Failed to parse component response');
      }

      // const codeBlocks = extractCodeBlocks(parsedComponent);
      const codeBlocks = [parsedComponent];

      return new Response(
        JSON.stringify({
          content: parsedComponent.description,
          codeBlocks,
          usage: response.usage, // 添加 usage 信息到响应中
          conversation_id: response.conversation_id,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Generate component error:', error); // 添加错误日志
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
