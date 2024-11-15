import { CodeBlock } from '../types/chat';

export interface ParsedComponent {
  description: string;
  code: string;
}

export const parseComponentResponse = (
  content: string
): ParsedComponent | null => {
  try {
    // 使用简单的正则表达式解析XML
    const descriptionMatch = content.match(
      /<description>(.*?)<\/description>/s
    );
    const codeMatch = content.match(/<code>(.*?)<\/code>/s);

    if (!descriptionMatch || !codeMatch) {
      return null;
    }

    return {
      description: descriptionMatch[1].trim(),
      code: codeMatch[1].trim(),
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
