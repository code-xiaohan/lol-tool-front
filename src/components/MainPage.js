import React, { useState } from 'react';
import { Button, Card, Alert } from 'antd';
import { LinkOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const MainPage = () => {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('success');

  const handleConnect = async () => {
    setLoading(true);
    setAlertMessage(null); // 清除之前的提示
    try {
      const response = await axios.get('http://localhost:8080/player/connect');
      
      if (response.data.code === 200) {
        setAlertMessage('连接LCU客户端成功！');
        setAlertType('success');
        setConnected(true);
      } else {
        setAlertMessage('连接LCU客户端失败!');
        setAlertType('error');
        setConnected(false);
      }
    } catch (error) {
      console.error('连接失败:', error);
      
      if (error.response?.status === 500) {
        setAlertMessage('服务器内部错误：后端服务器处理请求时出现错误');
      } else if (error.response?.status === 404) {
        setAlertMessage('接口不存在：请求的接口路径不存在');
      } else if (error.code === 'ECONNREFUSED') {
        setAlertMessage('连接被拒绝：无法连接到后端服务');
      } else {
        setAlertMessage('网络请求失败：请检查网络连接和后端服务状态');
      }
      setAlertType('error');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px'
    }}>
      <Card 
        title="LCU客户端连接" 
        style={{ 
          width: '100%', 
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        {alertMessage && (
          <Alert
            message={alertMessage}
            type={alertType}
            showIcon
            closable
            onClose={() => setAlertMessage(null)}
            style={{ marginBottom: '20px' }}
          />
        )}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            color: connected ? '#52c41a' : '#1890ff'
          }}>
            {connected ? <CheckCircleOutlined /> : <LinkOutlined />}
          </div>
          <h2 style={{ marginBottom: '10px', color: '#262626' }}>
            {connected ? '已连接到LCU客户端' : '连接LCU客户端'}
          </h2>
          <p style={{ color: '#8c8c8c', fontSize: '14px' }}>
            {connected 
              ? 'LCU客户端连接成功，您现在可以使用其他功能了' 
              : '点击下方按钮连接到英雄联盟客户端，以便查询战绩信息'
            }
          </p>
        </div>
        
        <Button
          type="primary"
          size="large"
          icon={<LinkOutlined />}
          onClick={handleConnect}
          loading={loading}
          disabled={connected}
          style={{
            height: '50px',
            fontSize: '16px',
            padding: '0 30px',
            borderRadius: '6px'
          }}
        >
          {loading ? '连接中...' : connected ? '已连接' : '连接LCU客户端'}
        </Button>

        {connected && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            color: '#52c41a'
          }}>
            <CheckCircleOutlined style={{ marginRight: '8px' }} />
            连接状态：正常
          </div>
        )}
      </Card>

      <div style={{ 
        marginTop: '40px', 
        textAlign: 'center',
        color: '#8c8c8c',
        fontSize: '14px'
      }}>
        <p>💡 提示：请确保英雄联盟客户端正在运行，并且已登录游戏</p>
      </div>
    </div>
  );
};

export default MainPage;
