import React, { useState, useRef, useEffect } from 'react';
import { Message, CodeBlock } from '../types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  extractCodeBlocks,
  parseComponentResponse,
  ParsedComponent,
} from '@/lib/utils/xmlParser';

interface ChatProps {
  onPreviewCode: (code: string, schema?: string) => void;
}

interface ApiResponse {
  content: string;
  conversation_id?: string;
  codeBlocks?: ParsedComponent[];
  usage?: {
    token_count: number;
    output_count: number;
    input_count: number;
  };
  error?: string;
}

interface SaveResponse {
  success: boolean;
  component?: {
    id: number;
    name: string;
    code: string;
    schema: string;
  };
  error?: string;
}

const Chat: React.FC<ChatProps> = ({ onPreviewCode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((msgs) => [...msgs, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          ...(conversationId ? { conversation_id: conversationId } : {}),
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate component');
      }

      console.log('data>>>>>>>', data);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.content,
        codeBlocks: data.codeBlocks,
        timestamp: Date.now(),
        usage: data.usage,
      };

      setMessages((msgs) => [...msgs, assistantMessage]);
      setConversationId(data.conversation_id);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${
          error instanceof Error
            ? error.message
            : 'Failed to generate component'
        }`,
        timestamp: Date.now(),
      };
      setMessages((msgs) => [...msgs, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeClick = (code: string, schema?: string) => {
    onPreviewCode(code, schema);
  };

  const handleSaveComponent = async (code: string, schema: string) => {
    try {
      const response = await fetch('/api/save-component', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name:
            'Component_' +
            new Date().toISOString().slice(0, 19).replace(/[-:]/g, ''),
          code,
          schema,
        }),
      });

      const data: SaveResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save component');
      }

      alert('Component saved successfully!');
    } catch (error) {
      alert(
        `Error saving component: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  };

  const renderMessage = (message: Message) => {
    console.log('message>>>>>>>', message);
    return (
      <div
        key={message.id}
        className={`flex items-start ${
          message.type === 'user' ? 'justify-end' : 'justify-start'
        } mb-4`}
      >
        {message.type === 'assistant' && (
          <div className="w-8 h-8 flex-1 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-2">
            A
          </div>
        )}
        <div
          className={`max-w-3/4 p-4 rounded-lg min-w-0 ${
            message.type === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.codeBlocks?.map((block: ParsedComponent, index: number) => (
            <div key={index} className="mt-2">
              <div className="relative overflow-hidden">
                <div className="overflow-x-auto">
                  <SyntaxHighlighter
                    language="tsx"
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      cursor: 'pointer',
                      padding: '1rem',
                    }}
                    onClick={() => handleCodeClick(block.code, block.schema)}
                  >
                    {block.code}
                  </SyntaxHighlighter>
                  <SyntaxHighlighter
                    language="json"
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      cursor: 'pointer',
                      padding: '1rem',
                    }}
                  >
                    {block.schema || ''}
                  </SyntaxHighlighter>
                </div>
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    className="p-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => handleCodeClick(block.code, block.schema)}
                  >
                    预览
                  </button>
                  <button
                    className="p-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    onClick={() => navigator.clipboard.writeText(block.code)}
                  >
                    复制
                  </button>
                  <button
                    className="p-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                    onClick={() =>
                      handleSaveComponent(block.code, block.schema || '')
                    }
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {message.type === 'user' && (
          <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-medium ml-2">
            U
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(renderMessage)}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="描述你想要的组件..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 bg-blue-500 text-white rounded-lg ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
