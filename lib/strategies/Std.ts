// Imports
import forever from "https://deno.land/x/forever@1.0.0/mod.ts";
import {
  HTTPOptions,
  HTTPSOptions,
  serve,
  Server,
  ServerRequest,
  serveTLS,
} from "https://deno.land/std@0.93.0/http/server.ts";
import { readAll } from "https://deno.land/std@0.93.0/io/util.ts";
import Strategy from "../structure/Strategy.ts";
import AppContext from "../structure/AppContext.ts";

export class StdContext extends AppContext {
  #req: ServerRequest;
  public constructor(req: ServerRequest, body: Uint8Array | null) {
    // Must be a complete URL.
    const r = new Request("http://a" + req.url, {
      body,
      method: req.method,
      headers: req.headers,
    });
    Object.defineProperty(r, "url", {
      value: r.url.substring(8, r.url.length),
    });
    super(r);
    this.#req = req;
  }
  public async respond(response: Response) {
    if (this.done) {
      throw new Error("Has already responded to request.");
    }
    await this.#req.respond({
      status: response.status,
      headers: response.headers,
      body: response.body ? await response.text() : undefined,
    });
    this.completed(response);
  }
}

export class Std extends Strategy {
  #listener?: Server;
  #cancel?: () => unknown;

  public hook(options: HTTPOptions | HTTPSOptions) {
    if (this.#listener !== undefined) return this;
    if (
      typeof (options as HTTPSOptions).keyFile === "string" &&
      typeof (options as HTTPSOptions).certFile === "string"
    ) {
      this.#listener = serveTLS(options as HTTPSOptions);
    } else {
      this.#listener = serve(options);
    }
    const { cancel } = forever(async (cancel) => {
      let brk = false;
      const listener = () => brk = true;
      cancel.subscribeOnce(listener);
      for await (const request of this.#listener!) {
        if (brk) {
          request.conn.close();
          break;
        }
        const body = request.contentLength !== null
          ? await readAll(request.body)
          : null;
        const ctx = new StdContext(
          request,
          body,
        );
        await this.dispatch(ctx);
      }
      cancel.unsubscribe(listener);
    });
    this.#cancel = cancel;
    return this;
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

export default Std;
