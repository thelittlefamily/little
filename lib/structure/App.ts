// Imports
import Flow from "https://deno.land/x/flow@2.0.0/mod.ts";
import Strategy from "./Strategy.ts";
import AppContext from "./AppContext.ts";
import Deploy from "../strategies/Deploy.ts";
import Native from "../strategies/Native.ts";
import Std from "../strategies/Std.ts";

export class App extends Flow<
  (ctx: AppContext) => unknown
> {
  public constructor() {
    super();
  }
  protected async run(ctx: AppContext) {
    await super.run(ctx);
    if (!ctx.done) {
      await ctx.respond(new Response("", { status: 200, statusText: "OK" }));
    }
  }

  public strategy(strategy: Strategy): this {
    this._strategy(strategy);
    return this;
  }

  private async _strategy(strategy: Strategy) {
    try {
      for await (const ctx of strategy) {
        await this.run(ctx);
      }
    } catch (error) {
      console.error(error);
      await this._strategy(strategy);
    }
  }

  /**
   * Automatically detect and use strategy.
   * 
   * If no options are passed the only valid strategy is deploy, and the
   * function will throw if no suitable strategy is found!
   * 
   * Detect strategy order:
   * 1. Deno Deploy
   * 2. Deno.serveHttp
   * 3. https://deno.land/std/http/server.ts
   */
  public detect(opts?: Deno.ListenOptions | Deno.ListenTlsOptions) {
    try {
      if (Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined) {
        this.strategy(new Deploy().hook());
        return "deploy";
      }
    } catch { /* Ignore */ }
    if (!opts) {
      throw new Error("No suitable strategy!");
    }
    if ("serveHttp" in Deno) {
      this.strategy(new Native().hook(opts));
      return "native";
    }
    this.strategy(new Std().hook(opts));
    return "std";
  }
}

export default App;
