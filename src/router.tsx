import { Alert } from "antd";
import { createHashRouter, Navigate, redirect } from "react-router-dom";
import { ErrorBoundary } from "./components/error-boundary";
import MainLayout from "./components/main-layout";
import { getToken } from "./services/request";
import "./utils/notice";

export const rootRouterPath = {
  user: "/user",
  apps: "/apps",
  versions: (id: string) => `/apps/${id}`,
  resetPassword: (step: string) => `/reset-password/${step}`,
  activate: "/activate",
  inactivated: "/inactivated",
  login: "/login",
  welcome: "/welcome",
  register: "/register",
};

export const needAuthLoader = ({ request }: { request: Request }) => {
  if (!getToken()) {
    const { pathname, search } = new URL(request.url);
    if (pathname === rootRouterPath.login) {
      return null;
    }
    if (pathname === "/") {
      return redirect(rootRouterPath.login);
    }
    return redirect(
      `${rootRouterPath.login}?loginFrom=${encodeURIComponent(pathname + search)}`
    );
  }
  return null;
};

export const router = createHashRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "",
        element: <Navigate to={rootRouterPath.user} />,
      },
      {
        path: "welcome",
        lazy: () => import("./pages/welcome"),
      },
      {
        path: "reset-password/:step",
        lazy: () => import("./pages/reset-password"),
      },
      {
        path: "activate",
        lazy: () => import("./pages/activate"),
      },
      {
        path: "inactivated",
        lazy: () => import("./pages/inactivated"),
      },
      {
        path: "register",
        lazy: () => import("./pages/register"),
      },
      {
        path: "login",
        lazy: () => import("./pages/login"),
      },
      {
        path: "apps",
        loader: needAuthLoader,
        element: <Alert message="请选择应用" showIcon />,
      },
      {
        path: "apps/:id",
        loader: needAuthLoader,
        lazy: () => import("./pages/manage"),
      },
      {
        path: "user",
        loader: needAuthLoader,
        lazy: () => import("./pages/user"),
      },
    ],
  },
]);
