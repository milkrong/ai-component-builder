import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    tabSize: 2,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on' as const,
    suggestOnTriggerCharacters: true,
    lineNumbers: 'on' as const,
  };

  return (
    <div style={{ height: '500px', border: '1px solid #ccc' }}>
      <Editor
        height="100%"
        defaultLanguage="typescript"
        defaultValue={code}
        theme="vs-dark"
        options={editorOptions}
        onChange={(value) => onChange(value || '')}
        beforeMount={(monaco) => {
          // 配置 TypeScript 编译器选项
          monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.Latest,
            allowNonTsExtensions: true,
            moduleResolution:
              monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            allowJs: true,
            jsx: monaco.languages.typescript.JsxEmit.React,
          });

          // 添加 React 类型定义
          monaco.languages.typescript.typescriptDefaults.addExtraLib(
            `
            declare module 'react' {
              export = React;
            }
            
            declare namespace React {
              export interface ReactElement<P = any> {
                type: string | React.ComponentType<P>;
                props: P;
                key: string | number | null;
              }
              
              export interface ComponentType<P = {}> {
                (props: P): ReactElement | null;
              }
              
              export function useState<T>(initialState: T): [T, (newState: T) => void];
              export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
            }
            `,
            'react.d.ts'
          );
        }}
      />
    </div>
  );
};

export default CodeEditor;
