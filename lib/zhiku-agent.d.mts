export type HistoryMessage={role:'user'|'assistant';content:string};
export function normalizeHistory(history:unknown):HistoryMessage[];
export function answer(options:any):Promise<{answer:string;rounds:number;limitations:string[];metrics:{elapsedMs:number;toolCalls:number;evidenceChars:number;historyMessages:number}}>;
export function mcpClient(options:any):any;

export function readProviderMessage(response:Response,signal?:AbortSignal,onActivity?:()=>void):Promise<any>;
