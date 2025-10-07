import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="App">
        <Layout />
      </div>
    </ConfigProvider>
  );
}

export default App;
