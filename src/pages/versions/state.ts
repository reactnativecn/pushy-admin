import { observable, runInAction } from "mobx";
import request from "../../request";
import { getApp } from "../apps/state";

const initState = {
  id: "",
  loading: false,
  packages: observable.array<Package>(),
  unused: observable.array<Package>(),
};

const state = observable.object<typeof initState & { app?: App }>(initState);

export default state;

export function init(id: string) {
  if (state.id == id) return;

  runInAction(() => {
    state.id = id;
    state.loading = true;
    state.packages.clear();
  });
  getApp(id).then((app) => runInAction(() => (state.app = app)));
  request("get", `app/${id}/package/list?limit=1000`).then(({ data }) =>
    runInAction(() => {
      state.packages = data;
      state.loading = false;
    })
  );
  request("get", `app/${id}/package/list?limit=1000&noVersion=1`).then(({ data }) =>
    runInAction(() => (state.unused = data))
  );
}
