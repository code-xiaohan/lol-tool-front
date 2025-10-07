import React, { useState } from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import {
  HomeOutlined,
  UserOutlined,
  SearchOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import MainPage from './MainPage';
import PersonalInfo from './PersonalInfo';
import SearchPage from './Search';
import InGame from './InGame';

const { Sider, Content } = AntLayout;

const Layout = () => {
  const [selectedKey, setSelectedKey] = useState('main');

  const menuItems = [
    {
      key: 'main',
      icon: <HomeOutlined />,
      label: '主界面',
    },
    {
      key: 'personal',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      key: 'search',
      icon: <SearchOutlined />,
      label: '搜索',
    },
    {
      key: 'ingame',
      icon: <PlayCircleOutlined />,
      label: '游戏中',
    },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case 'main':
        return <MainPage />;
      case 'personal':
        return <PersonalInfo />;
      case 'search':
        return <SearchPage />;
      case 'ingame':
        return <InGame />;
      default:
        return <MainPage />;
    }
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        width={200}
        style={{
          background: '#001529',
        }}
      >
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          borderBottom: '1px solid #1890ff'
        }}>
          英雄联盟助手
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => setSelectedKey(key)}
          style={{ marginTop: '20px' }}
        />
      </Sider>
      <AntLayout>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 48px)',
          }}
        >
          {renderContent()}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
