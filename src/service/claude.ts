import { ChatMessage, OpenAIResponse } from '../types/openai';

const CLAUDE_API_URL = 'YOUR_CLAUDE_API_ENDPOINT';
const CLAUDE_API_KEY = 'YOUR_CLAUDE_API_KEY';

export class ClaudeService {
  private static instance: ClaudeService;
  private apiKey: string;
  private baseURL: string;

  private constructor() {
    this.apiKey = CLAUDE_API_KEY;
    this.baseURL = CLAUDE_API_URL;
  }

  static getInstance(): ClaudeService {
    if (!ClaudeService.instance) {
      ClaudeService.instance = new ClaudeService();
    }
    return ClaudeService.instance;
  }

  async generateComponent(prompt: string): Promise<OpenAIResponse> {
    try {
      const systemPrompt = `You are a React component generator. Create modern, reusable React components based on user requirements.
      
Requirements for generated components:
- Use TypeScript for better type safety
- Use Tailwind CSS for styling
- Follow React best practices
- Use functional components with hooks
- Include proper prop types and validation
- Add JSDoc comments for better documentation
- Focus on reusability and customization
- Components should be well-structured and maintainable

When generating components:
- Only use Tailwind's core utility classes (no custom classes or arbitrary values)
- Ensure all props have proper TypeScript types
- Include default prop values where appropriate
- Add error handling where needed
- Support common use cases and variations

Please wrap your response in XML tags like this:
<component>
  <description>Brief description of the component</description>
  <code>
    // Component code here...
  </code>
</component>

DO NOT add any other explanation or text outside these tags.`;

      const messages = [
        {
          role: 'user',
          content: systemPrompt + '\n\n' + prompt,
        },
      ];

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 2000,
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return {
        content: data.content[0].text,
      };
    } catch (error) {
      return {
        content: '',
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const claudeService = ClaudeService.getInstance();
