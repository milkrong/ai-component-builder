export interface Package {
  package: string; // 包名
  version?: string; // 版本号
  path?: string; // 包内路径
}

export interface RenderMessage {
  type: 'RENDER_COMPONENT';
  code: string;
  props: Record<string, any>;
}

export interface RenderResult {
  type: 'RENDER_RESULT';
  success: boolean;
  error?: string;
}

export type IframeMessage = RenderMessage;
export type MainMessage = RenderResult;

export interface CodeBlock {
  code: string;
  language: string;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  codeBlocks?: CodeBlock[];
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  loading: boolean;
}
