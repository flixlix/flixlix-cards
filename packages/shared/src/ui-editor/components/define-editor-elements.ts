import { ButtonsEditor } from "./buttons-editor";
import { IndividualDevicesEditor } from "./individual-devices-editor";
import { IndividualRowEditor } from "./individual-row-editor";
import { LinkSubpage } from "./link-subpage";
import { SubpageHeader } from "./subpage-header";

const editorElements: Record<string, CustomElementConstructor> = {
  "buttons-editor": ButtonsEditor,
  "individual-devices-editor": IndividualDevicesEditor,
  "individual-row-editor": IndividualRowEditor,
  "link-subpage": LinkSubpage,
  "subpage-header": SubpageHeader,
};

/** Both flow cards ship these elements, so whichever card loads second must skip them. */
export function defineEditorElements(): void {
  for (const [tag, element] of Object.entries(editorElements)) {
    if (!customElements.get(tag)) {
      customElements.define(tag, element);
    }
  }
}
