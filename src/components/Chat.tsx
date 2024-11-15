import React, { useState, useRef, useEffect } from 'react';
import { Message, CodeBlock } from '../types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { claudeService } from '@/service/claude';
import { extractCodeBlocks, parseComponentResponse } from '@/utils/xmlParser';

interface ChatProps {
  onPreviewCode: (code: string) => void;
}

const Chat: React.FC<ChatProps> = ({ onPreviewCode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
      const response = await claudeService.generateComponent(input);

      if (response.error) {
        throw new Error(response.error);
      }

      const parsedComponent = parseComponentResponse(response.content);
      if (!parsedComponent) {
        throw new Error('Failed to parse component response');
      }

      const codeBlocks = extractCodeBlocks(parsedComponent);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: parsedComponent.description,
        codeBlocks,
        timestamp: Date.now(),
      };

      setMessages((msgs) => [...msgs, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `错误: ${
          error instanceof Error ? error.message : '生成组件失败'
        }`,
        timestamp: Date.now(),
      };
      setMessages((msgs) => [...msgs, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeClick = (code: string) => {
    onPreviewCode(code);
  };

  const renderMessage = (message: Message) => {
    return (
      <div
        key={message.id}
        className={`flex ${
          message.type === 'user' ? 'justify-end' : 'justify-start'
        } mb-4`}
      >
        <div
          className={`max-w-3/4 p-4 rounded-lg ${
            message.type === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.codeBlocks?.map((block: CodeBlock, index: number) => (
            <div key={index} className="mt-2">
              <div className="relative">
                <SyntaxHighlighter
                  language={block.language}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    cursor: 'pointer',
                    padding: '1rem',
                  }}
                  onClick={() => handleCodeClick(block.code)}
                >
                  {block.code}
                </SyntaxHighlighter>
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    className="p-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => handleCodeClick(block.code)}
                  >
                    预览
                  </button>
                  <button
                    className="p-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    onClick={() => navigator.clipboard.writeText(block.code)}
                  >
                    复制
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
