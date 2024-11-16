import { CodeBlock } from '../../src/types';

export interface ParsedComponent {
  description: string;
  code: string;
  schema?: string;
}

export const parseComponentResponse = (
  content: string
): ParsedComponent | null => {
  try {
    const codeMatch = content.match(/<code>(.*?)<\/code>/s);
    const schemaMatch = content.match(/<schema>(.*?)<\/schema>/s);

    if (!codeMatch) {
      return null;
    }

    return {
      description: '',
      code: codeMatch[1].trim(),
      schema: schemaMatch ? schemaMatch[1].trim() : undefined,
    };
  } catch (error) {
    console.error('Error parsing XML:', error);
    return null;
  }
};

export const extractCodeBlocks = (
  parsedComponent: ParsedComponent
): CodeBlock[] => {
  if (!parsedComponent) return [];

  return [
    {
      language: 'tsx',
      code: parsedComponent.code,
    },
  ];
};

export const cleanCodeBlock = (content: string): string => {
  return content
    .replace(/^```[a-z]*\n/, '')
    .replace(/\n```$/, '')
    .trim();
};
