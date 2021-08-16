import { observable, runInAction } from "mobx";
import request from "../../request";

const state = observable.object({
  apps: observable.array<App>(),
  loading: false,
});

export default state;

export function init() {
  runInAction(() => (state.loading = true));
  request("get", "app/list").then(({ data }) =>
    runInAction(() => {
      state.apps = data;
      state.loading = false;
    })
  );
}

export async function getApp(id: number | string) {
  if (!state.apps.length) {
    const { data } = await request("get", "app/list");
    runInAction(() => (state.apps = data));
  }
  return state.apps.find((i) => i.id == id);
}
