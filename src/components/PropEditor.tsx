import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

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

  const form = useForm({
    resolver: zodSchema ? zodResolver(zodSchema) : undefined,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = form;

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
      <h2 className="text-lg font-medium mb-4">Properties</h2>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {Object.entries(properties).map(([key, value]: [string, any]) => (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {key}
                    <span className="text-muted-foreground text-xs ml-2">
                      ({value.type})
                    </span>
                  </FormLabel>
                  <FormControl>
                    {renderInput(key, value.type, field)}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <div className="flex space-x-4">
            <Button type="submit">Apply</Button>
            <Button type="button" variant="outline" onClick={() => reset()}>
              Reset
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

const renderInput = (name: string, type: string, field: any) => {
  switch (type) {
    case 'string':
      return <Input {...field} />;

    case 'number':
      return (
        <Input
          type="number"
          {...field}
          onChange={(e) => field.onChange(Number(e.target.value))}
        />
      );

    case 'boolean':
      return (
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      );

    case 'object':
    case 'array':
      return (
        <Textarea
          {...field}
          rows={5}
          className="font-mono"
          onChange={(e) => {
            try {
              JSON.parse(e.target.value);
              field.onChange(e);
            } catch (error) {
              // Invalid JSON, don't update
            }
          }}
        />
      );

    default:
      return null;
  }
};

export default PropEditor;
