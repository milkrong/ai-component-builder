import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface PropEditorProps {
  onPropsChange: (props: Record<string, any>) => void;
  schema?: string;
}

const PropEditor: React.FC<PropEditorProps> = ({ onPropsChange, schema }) => {
  // 创建 zod schema
  const zodSchema = React.useMemo(() => {
    if (!schema) return null;
    try {
      const schemaObj = JSON.parse(schema);
      // 处理嵌套的 schema 结构
      const properties =
        schemaObj.type === 'object' && schemaObj.properties
          ? schemaObj.properties
          : schemaObj;

      const schemaMap: Record<string, z.ZodType> = {};

      Object.entries(properties).forEach(([key, value]: [string, any]) => {
        switch (value.type) {
          case 'string':
            schemaMap[key] = z.string().default('');
            break;
          case 'number':
            schemaMap[key] = z.number().default(0);
            break;
          case 'boolean':
            schemaMap[key] = z.boolean().default(false);
            break;
          case 'object':
            schemaMap[key] = z.object({}).passthrough();
            break;
          case 'array':
            schemaMap[key] = z.array(z.any());
            break;
          case 'function':
            schemaMap[key] = z.any();
            break;
          default:
            schemaMap[key] = z.any();
        }
      });

      return z.object(schemaMap);
    } catch (error) {
      console.error('Error parsing schema:', error);
      return null;
    }
  }, [schema]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodSchema ? zodResolver(zodSchema) : undefined,
  });

  const onSubmit = (data: any) => {
    onPropsChange(data);
  };

  // 监听所有字段变化并触发更新
  React.useEffect(() => {
    if (!schema) return;

    const subscription = watch((value) => {
      onPropsChange(value);
    });

    return () => subscription.unsubscribe();
  }, [watch, onPropsChange, schema]);

  if (!schema) {
    return (
      <div className="p-4 flex justify-center items-center">
        No schema provided
      </div>
    );
  }

  const schemaObj = JSON.parse(schema);
  // 处理嵌套的 schema 结构
  const properties =
    schemaObj.type === 'object' && schemaObj.properties
      ? schemaObj.properties
      : schemaObj;

  return (
    <div className="p-4">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Properties</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {Object.entries(properties).map(([key, value]: [string, any]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700">
              {key}
              <span className="text-gray-500 text-xs ml-2">({value.type})</span>
            </label>
            {renderInput(key, value.type, register, errors[key])}
          </div>
        ))}
        <div className="flex space-x-4">
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

const renderInput = (
  name: string,
  type: string,
  register: any,
  error?: any
) => {
  switch (type) {
    case 'string':
      return (
        <>
          <input
            type="text"
            {...register(name)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {error && (
            <p className="text-red-500 text-xs mt-1">{error.message}</p>
          )}
        </>
      );

    case 'number':
      return (
        <>
          <input
            type="number"
            {...register(name, { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {error && (
            <p className="text-red-500 text-xs mt-1">{error.message}</p>
          )}
        </>
      );

    case 'boolean':
      return (
        <>
          <input
            type="checkbox"
            {...register(name)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {error && (
            <p className="text-red-500 text-xs mt-1">{error.message}</p>
          )}
        </>
      );

    case 'object':
    case 'array':
      return (
        <>
          <textarea
            {...register(name)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
            rows={5}
            onChange={(e) => {
              try {
                JSON.parse(e.target.value);
                register(name).onChange(e);
              } catch (error) {
                // Invalid JSON, don't update
              }
            }}
          />
          {error && (
            <p className="text-red-500 text-xs mt-1">{error.message}</p>
          )}
        </>
      );

    default:
      return null;
  }
};

export default PropEditor;
