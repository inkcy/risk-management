export type ChatVisual = { id: string; label: string; kind?: 'images' | 'pages' };
export type ChatSource = { number: number; label: string; id?: string; kind?: 'images' | 'pages' };
export type ChatMessage = { role: 'user' | 'assistant'; text: string; images?: ChatVisual[]; sources?: ChatSource[] };
const key = (scope: string) => `risk-chat-history-v1:${scope}`;
function validVisual(item: ChatVisual) {
  return item && typeof item.id === 'string' && /^[a-f0-9]{24}$/.test(item.id) && typeof item.label === 'string' && item.label.length <= 1000 && (item.kind === undefined || item.kind === 'images' || item.kind === 'pages');
}
function validSource(item: ChatSource) {
  return item && Number.isInteger(item.number) && item.number >= 1 && item.number <= 8 && typeof item.label === 'string' && item.label.length <= 1000 && (item.id === undefined || /^[a-f0-9]{24}$/.test(item.id)) && (item.kind === undefined || item.kind === 'images' || item.kind === 'pages');
}
function validMessages(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.length <= 20 && value.length % 2 === 0 && value.every((item,index)=>item && item.role === (index % 2 ? 'assistant' : 'user') && typeof item.text === 'string' && item.text.trim().length > 0 && item.text.length <= 4000 && (item.images === undefined || (Array.isArray(item.images) && item.images.length <= 4 && item.images.every(validVisual))) && (item.sources === undefined || (Array.isArray(item.sources) && item.sources.length <= 8 && item.sources.every(validSource))));
}
export function loadChatHistory(storage: Storage, scope: string): ChatMessage[] {
  try { const raw=storage.getItem(key(scope)); if(!raw || raw.length>150000)return []; const value=JSON.parse(raw); return validMessages(value)?value:[]; } catch { return []; }
}
export function saveChatHistory(storage: Storage, scope: string, messages: ChatMessage[]) {
  try { const value=messages.slice(-20); if (!validMessages(value)) return; if (value.length) storage.setItem(key(scope),JSON.stringify(value)); else storage.removeItem(key(scope)); } catch { /* Storage may be disabled or full. */ }
}
