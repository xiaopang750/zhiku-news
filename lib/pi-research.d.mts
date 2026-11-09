import type {HistoryMessage} from './zhiku-agent.mjs';
export interface PiResearchOptions {
 question:string; history?:HistoryMessage[]; evidence:unknown;
 apiKey:string; endpoint:string; model?:'glm-5.3'|'glm-5.3-flash'; authorized?:boolean;
 tools?:Array<{name:string;description?:string;inputSchema:Record<string,unknown>}>;
 invokeTool?:(name:string,args:Record<string,unknown>)=>Promise<unknown>;
 fetchImpl?:typeof fetch; signal?:AbortSignal; maxRounds?:number; reasoningEffort?:'low'|'high'|'max'; maxOutputTokens?:number;
 onEvent?:(event:any)=>void; onTrace?:(event:any)=>void;
}
export function answerWithPi(options:PiResearchOptions):Promise<{answer:string;rounds:number;limitations:string[];metrics:{elapsedMs:number;modelMs:number;toolCalls:number;evidenceChars:number;historyMessages:number;engine:string}}>;
