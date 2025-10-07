import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Button, Alert, Spin, Avatar, Tag, Statistic, Tabs } from 'antd';
import { PlayCircleOutlined, UserOutlined, TrophyOutlined, TeamOutlined, FireOutlined } from '@ant-design/icons';
import axios from 'axios';

const InGame = () => {
  const [loading, setLoading] = useState(false);
  const [gameInfo, setGameInfo] = useState(null);
  const [players, setPlayers] = useState([]);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 获取游戏中信息
  const fetchGameInfo = async () => {
    setLoading(true);
    setAlertMessage(null);
    try {
      const response = await axios.get('http://localhost:8080/game/current');
      if (response.data.code === 200) {
        const gameData = response.data.data;
        setGameInfo(gameData);
        setPlayers(gameData.players || []);
        setAlertMessage('游戏信息加载成功！');
        setAlertType('success');
      } else {
        setAlertMessage('当前不在游戏中或获取游戏信息失败！');
        setAlertType('error');
        setGameInfo(null);
        setPlayers([]);
      }
    } catch (error) {
      console.error('获取游戏信息失败:', error);
      setAlertMessage('获取游戏信息失败！请确保已连接LCU客户端且正在游戏中。');
      setAlertType('error');
      setGameInfo(null);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  // 自动刷新
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchGameInfo, 5000); // 每5秒刷新一次
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  // 玩家表格列定义
  const playerColumns = [
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
      render: (position) => {
        const positionColors = {
          'TOP': 'red',
          'JUNGLE': 'orange',
          'MID': 'blue',
          'ADC': 'green',
          'SUPPORT': 'purple'
        };
        return <Tag color={positionColors[position] || 'default'}>{position}</Tag>;
      }
    },
    {
      title: '英雄',
      dataIndex: 'champion',
      key: 'champion',
      render: (champion) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar size="small" src={`/champions/${champion}.png`} />
          <span style={{ marginLeft: 8 }}>{champion}</span>
        </div>
      )
    },
    {
      title: '召唤师',
      dataIndex: 'summonerName',
      key: 'summonerName',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{name}</div>
          {record.isCurrentPlayer && (
            <Tag color="gold" size="small">当前玩家</Tag>
          )}
        </div>
      )
    },
    {
      title: '段位',
      dataIndex: 'tier',
      key: 'tier',
      render: (tier, record) => (
        <div>
          <div>{tier || '未定级'}</div>
          {record.rank && <div style={{ fontSize: '12px', color: '#666' }}>{record.rank}</div>}
        </div>
      )
    },
    {
      title: '胜点',
      dataIndex: 'leaguePoints',
      key: 'leaguePoints',
      render: (lp) => lp ? `${lp} LP` : '-'
    },
    {
      title: '胜率',
      dataIndex: 'winRate',
      key: 'winRate',
      render: (rate) => rate ? `${rate.toFixed(1)}%` : '-'
    }
  ];

  // 按队伍分组显示玩家
  const renderTeamPlayers = (teamId, teamName) => {
    const teamPlayers = players.filter(player => player.teamId === teamId);
    
    return (
      <div>
        <h4 style={{ marginBottom: '16px', color: teamId === 100 ? '#1890ff' : '#f5222d' }}>
          {teamName} ({teamPlayers.length}人)
        </h4>
        <Table
          columns={playerColumns}
          dataSource={teamPlayers}
          rowKey="summonerId"
          pagination={false}
          size="small"
          locale={{
            emptyText: '暂无玩家信息'
          }}
        />
      </div>
    );
  };

  // 游戏统计信息
  const renderGameStats = () => {
    if (!gameInfo) return null;

    const blueTeamPlayers = players.filter(p => p.teamId === 100);
    const redTeamPlayers = players.filter(p => p.teamId === 200);

    return (
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" title="蓝队统计" style={{ borderColor: '#1890ff' }}>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic
                  title="平均段位"
                  value={blueTeamPlayers.length > 0 ? 
                    blueTeamPlayers.reduce((sum, p) => sum + (p.leaguePoints || 0), 0) / blueTeamPlayers.length : 0
                  }
                  precision={0}
                  suffix="LP"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="平均胜率"
                  value={blueTeamPlayers.length > 0 ? 
                    blueTeamPlayers.reduce((sum, p) => sum + (p.winRate || 0), 0) / blueTeamPlayers.length : 0
                  }
                  precision={1}
                  suffix="%"
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="红队统计" style={{ borderColor: '#f5222d' }}>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic
                  title="平均段位"
                  value={redTeamPlayers.length > 0 ? 
                    redTeamPlayers.reduce((sum, p) => sum + (p.leaguePoints || 0), 0) / redTeamPlayers.length : 0
                  }
                  precision={0}
                  suffix="LP"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="平均胜率"
                  value={redTeamPlayers.length > 0 ? 
                    redTeamPlayers.reduce((sum, p) => sum + (p.winRate || 0), 0) / redTeamPlayers.length : 0
                  }
                  precision={1}
                  suffix="%"
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        {/* 游戏信息卡片 */}
        <Col span={24}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PlayCircleOutlined style={{ marginRight: 8 }} />
                当前游戏信息
              </div>
            }
            extra={
              <div>
                <Button 
                  type="primary" 
                  onClick={fetchGameInfo}
                  loading={loading}
                  style={{ marginRight: 8 }}
                >
                  刷新
                </Button>
                <Button 
                  type={autoRefresh ? 'primary' : 'default'}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? '停止自动刷新' : '自动刷新'}
                </Button>
              </div>
            }
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

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <p style={{ marginTop: '16px' }}>正在获取游戏信息...</p>
              </div>
            ) : gameInfo ? (
              <div>
                {/* 游戏基本信息 */}
                <Card size="small" title="游戏详情" style={{ marginBottom: '24px' }}>
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic
                        title="游戏模式"
                        value={gameInfo.gameMode || '未知'}
                        prefix={<TeamOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="地图"
                        value={gameInfo.mapName || '未知'}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="游戏时长"
                        value={gameInfo.gameTime || '00:00'}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="玩家数量"
                        value={players.length}
                        suffix="/10"
                      />
                    </Col>
                  </Row>
                </Card>

                {/* 队伍统计 */}
                {renderGameStats()}

                {/* 玩家信息 */}
                <Card size="small" title="玩家信息" style={{ marginTop: '24px' }}>
                  <Tabs defaultActiveKey="all">
                    <Tabs.TabPane tab="全部玩家" key="all">
                      <Table
                        columns={playerColumns}
                        dataSource={players}
                        rowKey="summonerId"
                        pagination={false}
                        locale={{
                          emptyText: '暂无玩家信息'
                        }}
                      />
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="蓝队" key="blue">
                      {renderTeamPlayers(100, '蓝队')}
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="红队" key="red">
                      {renderTeamPlayers(200, '红队')}
                    </Tabs.TabPane>
                  </Tabs>
                </Card>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <PlayCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <p>当前不在游戏中</p>
                <p style={{ fontSize: '14px' }}>请确保已连接LCU客户端且正在游戏中</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InGame;