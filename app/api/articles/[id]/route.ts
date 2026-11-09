import { env } from 'cloudflare:workers';
export async function GET(req:Request,{params}:any){const {id}=await params;const row=await env.DB!.prepare('SELECT payload FROM articles WHERE id=?').bind(id).first();return row?Response.json(JSON.parse(row.payload as string)):Response.json({error:'Not found'},{status:404});}
