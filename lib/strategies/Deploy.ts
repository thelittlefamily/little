// Imports
import Strategy from "../structure/Strategy.ts";
import AppContext from "../structure/AppContext.ts";

// #region deploy types.

type FetchEventListenerOrFetchEventListenerObject =
  | FetchEventListener
  | FetchEventListenerObject;

interface FetchEventListener {
  (evt: FetchEvent): void | Promise<void>;
}

interface FetchEventListenerObject {
  handleEvent(evt: FetchEvent): void | Promise<void>;
}

declare function addEventListener(
  type: "fetch",
  callback: FetchEventListenerOrFetchEventListenerObject | null,
  options?: boolean | AddEventListenerOptions | undefined,
): void;

interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Response | Promise<Response>): Promise<Response>;
}

// #endregion

export class DeployContext extends AppContext {
  #event: FetchEvent;
  public constructor(event: FetchEvent) {
    super(event.request);
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

export class Deploy extends Strategy {
  #listener?: (event: FetchEvent) => Promise<void>;

  protected getListener(): (event: FetchEvent) => Promise<void> {
    return this.#listener ??= async (event) => {
      const context = new DeployContext(event);
      await this.dispatch(context);
    };
  }

  public unhook() {
    removeEventListener(
      "fetch",
      this.getListener() as unknown as () => void,
    );
    this.close();
    return;
  }

  public hook() {
    addEventListener("fetch", this.getListener());
    return this;
  }
}

export default Deploy;
