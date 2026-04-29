import { css } from "lit";

export const nodeBaseStyles = css`
  :host {
    display: inline-flex;
    cursor: var(--clickable-cursor, default);
  }

  .bubble {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--flixlix-node-accent) 2%, transparent);
    color: var(--flixlix-node-accent);
  }

  :host([active]) .bubble {
    box-shadow: 0 0 4px 1.5px color-mix(in srgb, var(--flixlix-node-accent) 10%, transparent);
  }
`;
