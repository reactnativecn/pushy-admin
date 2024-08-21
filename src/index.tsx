// import * as React from "react";
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
// eslint-disable-next-line import/no-extraneous-dependencies
import { QueryClientProvider } from 'react-query';
import { queryClient } from './utils';
// import { DndProvider } from "react-dnd";
// import { HTML5Backend } from "react-dnd-html5-backend";
import './index.css';
import Main from './main';

// window.React = React;
const root = document.getElementById('main');
if (root) {
  createRoot(root).render(
    <ConfigProvider locale={zhCN}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Main />
        </Router>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
