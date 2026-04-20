import { html, nothing } from "lit";

export const alertConfigError = (errors: Array<string>) => {
  if (errors.length === 0) return nothing;
  return html`
    <ha-alert alert-type="error">
      <div>
        <p>
          <strong>Error:</strong>
          <span>${errors[0]}</span>
        </p>
      </div>
    </ha-alert>
  `;
};
