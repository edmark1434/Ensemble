import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";

export function dispatchGroupEdit(ids: string[], details: Record<string, unknown>) {
  const payload: Record<string, { details: Record<string, unknown> }> = {};
  ids.forEach((id) => {
    payload[id] = { details };
  });
  dispatch(EDIT_OBJECT, { payload });
}