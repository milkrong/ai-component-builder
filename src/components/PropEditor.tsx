import React, { useState } from 'react';

interface PropEditorProps {
  onPropsChange: (props: Record<string, any>) => void;
}

interface PropConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
}

const defaultProps: PropConfig[] = [
  { name: 'title', type: 'string', defaultValue: 'Hello' },
  { name: 'count', type: 'number', defaultValue: 0 },
  { name: 'showHeader', type: 'boolean', defaultValue: true },
  {
    name: 'style',
    type: 'object',
    defaultValue: { color: 'black', fontSize: '16px' },
  },
];

const PropEditor: React.FC<PropEditorProps> = ({ onPropsChange }) => {
  const [props, setProps] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    defaultProps.forEach((prop) => {
      initial[prop.name] = prop.defaultValue;
    });
    return initial;
  });

  const handlePropChange = (name: string, value: any) => {
    const newProps = { ...props, [name]: value };
    setProps(newProps);
    onPropsChange(newProps);
  };

  const renderPropInput = (prop: PropConfig) => {
    switch (prop.type) {
      case 'string':
        return (
          <input
            type="text"
            value={props[prop.name] || ''}
            onChange={(e) => handlePropChange(prop.name, e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={props[prop.name] || 0}
            onChange={(e) =>
              handlePropChange(prop.name, Number(e.target.value))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        );

      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={props[prop.name] || false}
            onChange={(e) => handlePropChange(prop.name, e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        );

      case 'object':
      case 'array':
        return (
          <textarea
            value={JSON.stringify(props[prop.name], null, 2)}
            onChange={(e) => {
              try {
                const value = JSON.parse(e.target.value);
                if (prop.type === 'array' && !Array.isArray(value)) return;
                handlePropChange(prop.name, value);
              } catch (error) {
                // 输入的JSON无效时不更新
              }
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
            rows={5}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Properties</h2>
      <div className="space-y-6">
        {defaultProps.map((prop) => (
          <div key={prop.name}>
            <label className="block text-sm font-medium text-gray-700">
              {prop.name}
              <span className="text-gray-500 text-xs ml-2">({prop.type})</span>
            </label>
            {renderPropInput(prop)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropEditor;
