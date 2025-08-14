export type SSEEvent = { event: string; [k: string]: any };

export class SSEStream {
  private url: string;
  private onEvent: (e: SSEEvent) => void;
  private es?: EventSource;
  private aborted = false;
  private backoff = 800;

  constructor(url: string, onEvent: (e: SSEEvent)=>void) {
    this.url = url;
    this.onEvent = onEvent;
  }

  start() {
    this.aborted = false;
    this.connect();
  }

  private connect() {
    if (this.aborted) return;
    this.es = new EventSource(this.url, { withCredentials: true });
    this.es.onmessage = (msg) => {
      const line = msg.data;
      try {
        const obj = JSON.parse(line);
        this.onEvent(obj);
      } catch { /* ignore */ }
    };
    this.es.onerror = () => {
      this.es?.close();
      if (this.aborted) return;
      setTimeout(()=>this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 1.5, 6000);
    };
  }

  stop() {
    this.aborted = true;
    this.es?.close();
  }
}
