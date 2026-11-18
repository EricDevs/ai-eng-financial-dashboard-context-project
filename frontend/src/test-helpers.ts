import { createRoot } from "react-dom/client";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Promise resolved by hand, to control the order of responses. */
export function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Sets an input value so React's onChange fires (native setter + input event). */
export function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Throws when missing, so vi.waitFor retries until the input renders. */
export function inputByLabel(container: HTMLElement, text: string): HTMLInputElement {
  const label = [...container.querySelectorAll("label")].find((l) => l.textContent === text);
  const input = label ? document.getElementById(label.htmlFor) : null;
  if (!(input instanceof HTMLInputElement)) throw new Error(`No input labelled "${text}"`);
  return input;
}

/** Throws when missing, so vi.waitFor retries until the button renders. */
export function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === text,
  );
  if (!button) throw new Error(`No button "${text}"`);
  return button;
}

export function mountRoot() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  return {
    container,
    root,
    cleanup: () => {
      root.unmount();
      container.remove();
    },
  };
}
