type Listener<T> = (payload: T) => void;

/** Minimal typed emitter: works the same in Node and browsers, no dependency. */
export class Emitter<Events> {
  private listeners = new Map<keyof Events, Set<Listener<unknown>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return this;
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): this {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
    return this;
  }

  protected emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        listener(payload);
      } catch {
        // A listener's bug must not break the media loop.
      }
    }
  }
}
