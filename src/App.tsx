import React, { useState, useRef, useEffect } from 'react';
import { ComponentRenderer } from './renderer/component-renderer';
import PropEditor from './components/PropEditor';
import Chat from './components/Chat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SavedComponentsList from './components/SavedComponentsList';

const App: React.FC = () => {
  const [error, setError] = useState<string | undefined>();
  const [schema, setSchema] = useState<string | undefined>();
  const [code, setCode] = useState<string | undefined>();
  const rendererRef = useRef<ComponentRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !rendererRef.current) {
      rendererRef.current = new ComponentRenderer(containerRef.current, {
        height: '100%',
      });
    }

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  const handlePreviewCode = async (code: string, schema?: string) => {
    if (!rendererRef.current) return;
    if (schema) {
      setSchema(schema);
    }
    try {
      const result = await rendererRef.current.render(code, {});
      setCode(code);
      if (!result.success) {
        setError(result.error);
      } else {
        setError(undefined);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to render component'
      );
    }
  };

  const handleApplyProps = (props: Record<string, any>) => {
    if (!rendererRef.current) return;
    if (!code) return;
    try {
      rendererRef.current.render(code, props);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to render component'
      );
    }
  };

  return (
    <div className="h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-full mx-auto px-4 py-3">
          <h1 className="text-xl font-semibold text-gray-900">
            AI Component Builder
          </h1>
          <p className="text-sm text-gray-500">
            2024 Build React components with AI, No DSL, No Code
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 py-4">
        <div className="flex gap-4 h-[calc(100vh-8rem)]">
          {/* Chat and Saved Components */}
          <div className="w-1/3 bg-white rounded-lg shadow">
            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="saved">Saved Components</TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-hidden">
                <TabsContent value="chat" className="h-full m-0 p-0">
                  <Chat onPreviewCode={handlePreviewCode} />
                </TabsContent>
                <TabsContent value="saved" className="h-full m-0 p-0">
                  <SavedComponentsList onPreviewCode={handlePreviewCode} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Preview */}
          <div className="w-1/3 flex flex-col bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-medium text-gray-900">Preview</h2>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div ref={containerRef} className="h-full w-full" />
            </div>
            {error && (
              <div className="p-4 mt-4 bg-red-50 border-l-4 border-red-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-1 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Props Editor */}
          <div className="w-1/3 bg-white rounded-lg shadow overflow-auto">
            <PropEditor onPropsChange={handleApplyProps} schema={schema} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
