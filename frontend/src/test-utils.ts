/** Sets an input value the way a user does, so React's onChange fires on a controlled input. */
export function changeInput(input: HTMLInputElement, value: string): void {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setValue?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Lets React commit pending renders and pending fetch callbacks run; consecutive renders in one tick are batched. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

/** Input associated with the label whose text is `text`, or null. */
export function inputByLabel(root: ParentNode, text: string): HTMLInputElement | null {
  const label = [...root.querySelectorAll("label")].find((item) => item.textContent === text);
  return label ? (root.querySelector(`[id="${label.htmlFor}"]`) as HTMLInputElement | null) : null;
}
