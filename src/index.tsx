import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
// import { DndProvider } from "react-dnd";
// import { HTML5Backend } from "react-dnd-html5-backend";
import './index.scss';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { queryClient } from './utils/queryClient';

const root = document.getElementById('main');
if (root) {
  createRoot(root).render(
    <ConfigProvider locale={zhCN}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>
  );
}
