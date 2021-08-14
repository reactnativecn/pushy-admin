import { observable, runInAction } from "mobx";
import request from "../../request";

const state = observable.object({
  apps: observable.array<App>(),
  loading: false,
});

export default state;

export function fetchApps() {
  runInAction(() => (state.loading = true));
  request("get", "app/list").then(({ data }) =>
    runInAction(() => {
      state.apps = data;
      state.loading = false;
    })
  );
}
