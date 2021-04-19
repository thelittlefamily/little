export class AppContext extends Request {
  #done = false;
  #response?: Response;
  public get done() {
    return this.#done;
  }
  public get response() {
    return this.#response;
  }
  public constructor(...args: ConstructorParameters<typeof Request>) {
    super(...args);
    if (this.respond === AppContext.prototype.respond) {
      throw new Error("Missing implementation for respond!");
    }
  }
  public respond(response: Response): Promise<void> {
    this.completed(response);
    return Promise.resolve();
  }
  protected completed(response: Response) {
    if (this.done) {
      throw new Error("Already completed!");
    }
    this.#done = true;
    this.#response = response;
    return this;
  }
}

export default AppContext;
