import React from 'react';

const SavedComponentsList: React.FC<{
  onPreviewCode: (code: string, schema?: string) => void;
}> = ({ onPreviewCode }) => {
  const [components, setComponents] = React.useState<
    Array<{
      id: number;
      name: string;
      code: string;
      schema: string;
      createdAt: string;
    }>
  >([]);

  React.useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      const response = await fetch('/api/saved-components');
      const data = await response.json();
      setComponents(data);
    } catch (error) {
      console.error('Failed to fetch components:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        {components.map((component) => (
          <div
            key={component.id}
            className="p-4 border-b hover:bg-gray-50 cursor-pointer"
            onClick={() => onPreviewCode(component.code, component.schema)}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">{component.name}</h3>
              <span className="text-xs text-gray-500">
                {new Date(component.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedComponentsList;
