// Imports
import AppContext from "../structure/AppContext.ts";

export class Strategy {
  #writers = new Set<WritableStreamDefaultWriter<AppContext>>();

  protected async dispatch(ctx: AppContext) {
    for (const writer of this.#writers) {
      await writer.write(ctx);
    }
  }

  public close() {
    for (const writer of this.#writers) {
      if (!writer.closed) {
        writer.close();
      }
    }
    this.#writers.clear();
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<AppContext> {
    const { readable, writable } = new TransformStream<
      AppContext,
      AppContext
    >();
    const reader = readable[Symbol.asyncIterator]();
    const writer = writable.getWriter();
    this.#writers.add(writer);
    return reader as AsyncIterableIterator<AppContext>;
  }
}

export default Strategy;
