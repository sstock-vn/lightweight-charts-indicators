import type { IndicatorRegistryEntry } from '@lib/index';

interface IndicatorInputsProps {
  indicator: IndicatorRegistryEntry;
  inputs: Record<string, unknown>;
  onInputChange: (id: string, value: unknown) => void;
}

export default function IndicatorInputs({ indicator, inputs, onInputChange }: IndicatorInputsProps) {
  const inputConfigArray = Array.isArray(indicator.inputConfig) ? indicator.inputConfig : [];

  return (
    <div className="indicator-inputs">
      <h4>{indicator.metadata.title} Settings</h4>
      {inputConfigArray.map((config) => {
        const c = config as unknown as Record<string, unknown>;
        const id = c.id as string;
        const title = c.title as string;
        const type = c.type as string;
        const value = inputs[id] ?? c.defval;

        switch (type) {
          case 'int':
          case 'float':
            return (
              <div className="input-group" key={id}>
                <label htmlFor={`input-${id}`}>{title}:</label>
                <input
                  type="number"
                  id={`input-${id}`}
                  value={value as number}
                  min={(c.min as number) ?? undefined}
                  max={(c.max as number) ?? undefined}
                  step={(c.step as number) ?? (type === 'float' ? 0.1 : 1)}
                  onChange={(e) => {
                    const parsed = type === 'int'
                      ? parseInt(e.target.value, 10)
                      : parseFloat(e.target.value);
                    if (!isNaN(parsed)) {
                      onInputChange(id, parsed);
                    }
                  }}
                />
              </div>
            );

          case 'source': {
            const sourceOptions = (c.options as string[]) || [
              'open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4', 'hlcc4'
            ];
            return (
              <div className="input-group" key={id}>
                <label htmlFor={`input-${id}`}>{title}:</label>
                <select
                  id={`input-${id}`}
                  value={value as string}
                  onChange={(e) => onInputChange(id, e.target.value)}
                >
                  {sourceOptions.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          }

          case 'bool':
            return (
              <div className="input-group" key={id}>
                <label htmlFor={`input-${id}`}>{title}:</label>
                <input
                  type="checkbox"
                  id={`input-${id}`}
                  checked={value as boolean}
                  onChange={(e) => onInputChange(id, e.target.checked)}
                />
              </div>
            );

          case 'string': {
            const options = c.options as string[] | undefined;
            if (options) {
              return (
                <div className="input-group" key={id}>
                  <label htmlFor={`input-${id}`}>{title}:</label>
                  <select
                    id={`input-${id}`}
                    value={value as string}
                    onChange={(e) => onInputChange(id, e.target.value)}
                  >
                    {options.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              );
            }
            return (
              <div className="input-group" key={id}>
                <label htmlFor={`input-${id}`}>{title}:</label>
                <input
                  type="text"
                  id={`input-${id}`}
                  value={value as string}
                  onChange={(e) => onInputChange(id, e.target.value)}
                />
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
