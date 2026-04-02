export interface ServiceToken<T> {
  readonly id: symbol;
  readonly description: string;
}

export function defineToken<T>(description: string): ServiceToken<T> {
  return {
    id: Symbol(description),
    description,
  };
}
