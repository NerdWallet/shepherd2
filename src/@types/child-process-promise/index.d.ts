declare module 'child-process-promise' {
  export function exec(command: string, options: any): Promise<any>;
}
