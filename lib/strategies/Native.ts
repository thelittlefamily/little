// Imports
import forever from "https://deno.land/x/forever@1.0.0/mod.ts";
import Strategy from "../structure/Strategy.ts";
import AppContext from "../structure/AppContext.ts";

export interface RequestEvent {
  request: Request;
  respondWith(r: Response | Promise<Response>): Promise<void>;
}

export class NativeContext extends AppContext {
  #event: RequestEvent;
  public constructor(event: RequestEvent, secure: boolean) {
    const req = new Request(event.request);
    if (req.headers.has("host")) {
      let url = "http";
      if (secure) url += "s";
      url += "://" + req.headers.get("host") + req.url;
      Object.defineProperty(req, "url", {
        value: url,
        writable: false,
      });
    }
    super(req);
    this.#event = event;
  }
  public async respond(response: Response) {
    if (this.done) {
      throw new Error("Has already responded to request.");
    }
    await this.#event.respondWith(response);
    this.completed(response);
  }
}

export class Native extends Strategy {
  #listener?: Deno.Listener;
  #cancel?: () => unknown;
  #secure = false;

  public constructor() {
    super();
    if (!("serveHttp" in Deno)) {
      throw new Error(
        "The native strategy is not supported without --unstable!",
      );
    }
  }

  public hook(options: Deno.ListenOptions | Deno.ListenTlsOptions) {
    if (this.#listener !== undefined) return this;
    if (
      typeof (options as Deno.ListenTlsOptions).keyFile === "string" &&
      typeof (options as Deno.ListenTlsOptions).certFile === "string"
    ) {
      this.#listener = Deno.listenTls(options as Deno.ListenTlsOptions);
      this.#secure = true;
    } else {
      this.#listener = Deno.listen(options);
      this.#secure = false;
    }
    const { cancel } = forever(async (cancel) => {
      let brk = false;
      const listener = () => brk = true;
      cancel.subscribeOnce(listener);
      for await (const conn of this.#listener!) {
        if (brk) {
          conn.close();
          break;
        }
        this.serveHttp(conn).catch(console.error);
      }
      cancel.unsubscribe(listener);
    });
    this.#cancel = cancel;
    return this;
  }
  private async serveHttp(conn: Deno.Conn) {
    // deno-lint-ignore no-explicit-any
    const http = (Deno as any).serveHttp(conn);
    for await (const event of http) {
      const ctx = new NativeContext(event, this.#secure);
      await this.dispatch(ctx);
    }
  }
  public unhook() {
    if (this.#listener) {
      this.#cancel!();
      this.#cancel = undefined;
      this.#listener = this.#listener.close() as undefined;
    }
    this.close();
    return this;
  }
}

export default Native;
